const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const app = express();

/**
 * =========================
 * CONFIG
 * =========================
 * Render persistence:
 * - Add Persistent Disk mounted at /var/data
 * - Set DB_PATH=/var/data/pixelnet.sqlite
 *
 * Local dev fallback:
 * - DB_PATH=./pixelnet.sqlite
 */
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "pixelnet.sqlite");

// CORS: allow GitHub Pages + local dev. (Can tighten later.)
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "256kb" }));

// Ensure folder exists if using /var/data
try {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
} catch (_) {}

/**
 * =========================
 * DATABASE HELPERS
 * =========================
 */
const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_slug TEXT NOT NULL,
      initials TEXT NOT NULL,
      score INTEGER NOT NULL,
      achieved_at INTEGER NOT NULL
    )
  `);

  await run(`
    CREATE INDEX IF NOT EXISTS idx_scores_game_score
    ON scores (game_slug, score DESC, achieved_at ASC)
  `);

  // Tracks "who was #1 and for how long" per game
  await run(`
    CREATE TABLE IF NOT EXISTS top1_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_slug TEXT NOT NULL,
      initials TEXT NOT NULL,
      score INTEGER NOT NULL,
      start_at INTEGER NOT NULL,
      end_at INTEGER
    )
  `);

  await run(`
    CREATE INDEX IF NOT EXISTS idx_top1_game_open
    ON top1_history (game_slug, end_at)
  `);
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function normSlug(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");
}

function normInitials(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
}

/**
 * Get current #1 for a game (score desc, achieved_at asc)
 */
async function getCurrentLeader(gameSlug) {
  return await get(
    `SELECT initials, score, achieved_at
     FROM scores
     WHERE game_slug = ?
     ORDER BY score DESC, achieved_at ASC
     LIMIT 1`,
    [gameSlug]
  );
}

/**
 * Ensure top1_history correctly reflects current leader.
 * If new leader differs from open top1_history row, close old row and open new one.
 */
async function updateTop1History(gameSlug) {
  const leader = await getCurrentLeader(gameSlug);
  if (!leader) return;

  const openRow = await get(
    `SELECT id, initials, score, start_at
     FROM top1_history
     WHERE game_slug = ? AND end_at IS NULL
     LIMIT 1`,
    [gameSlug]
  );

  // If none open, create one
  if (!openRow) {
    await run(
      `INSERT INTO top1_history (game_slug, initials, score, start_at, end_at)
       VALUES (?, ?, ?, ?, NULL)`,
      [gameSlug, leader.initials, leader.score, leader.achieved_at]
    );
    return;
  }

  // If open row matches current leader, do nothing
  if (openRow.initials === leader.initials && openRow.score === leader.score) return;

  // Otherwise close old and open new
  const t = nowSec();
  await run(`UPDATE top1_history SET end_at = ? WHERE id = ?`, [t, openRow.id]);

  await run(
    `INSERT INTO top1_history (game_slug, initials, score, start_at, end_at)
     VALUES (?, ?, ?, ?, NULL)`,
    [gameSlug, leader.initials, leader.score, leader.achieved_at]
  );
}

/**
 * =========================
 * ROUTES
 * =========================
 */
app.get("/health", (req, res) => {
  res.json({ ok: true, db: DB_PATH, now: nowSec() });
});

/**
 * Submit score
 * Body: { game_slug, initials, score }
 */
app.post("/api/score", async (req, res) => {
  try {
    const game_slug = normSlug(req.body?.game_slug);
    const initials = normInitials(req.body?.initials);
    const scoreRaw = req.body?.score;

    const score = Number.isFinite(scoreRaw) ? scoreRaw : parseInt(scoreRaw, 10);

    if (!game_slug) return res.status(400).json({ ok: false, error: "Missing game_slug" });
    if (!initials) return res.status(400).json({ ok: false, error: "Missing initials" });
    if (!Number.isFinite(score) || score < 0) return res.status(400).json({ ok: false, error: "Invalid score" });

    const t = nowSec();

    await run(
      `INSERT INTO scores (game_slug, initials, score, achieved_at)
       VALUES (?, ?, ?, ?)`,
      [game_slug, initials, score, t]
    );

    // Update leader duration tracking
    await updateTop1History(game_slug);

    res.json({ ok: true, game_slug, initials, score, at: t });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

/**
 * Get Top 10 for a game
 */
app.get("/api/leaderboard/:gameSlug", async (req, res) => {
  try {
    const game_slug = normSlug(req.params.gameSlug);

    const rows = await all(
      `SELECT initials, score, achieved_at
       FROM scores
       WHERE game_slug = ?
       ORDER BY score DESC, achieved_at ASC
       LIMIT 10`,
      [game_slug]
    );

    const leader = rows.length ? rows[0] : null;

    res.json({
      ok: true,
      game_slug,
      top10: rows,
      leader
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

/**
 * Top Dogs:
 * - totals: top players by total seconds holding #1 across all games
 * - current: current leaders per game w/ how long they've held #1 so far
 */
app.get("/api/topdogs", async (req, res) => {
  try {
    const t = nowSec();

    const totals = await all(
      `
      SELECT initials,
             SUM(CASE WHEN end_at IS NULL THEN (? - start_at) ELSE (end_at - start_at) END) AS seconds_as_top1
      FROM top1_history
      GROUP BY initials
      ORDER BY seconds_as_top1 DESC
      LIMIT 10
      `,
      [t]
    );

    const current = await all(
      `
      SELECT game_slug, initials, score, start_at,
             (? - start_at) AS seconds_held
      FROM top1_history
      WHERE end_at IS NULL
      ORDER BY seconds_held DESC
      LIMIT 50
      `,
      [t]
    );

    res.json({ ok: true, totals, current });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

/**
 * =========================
 * START
 * =========================
 */
(async () => {
  await initDb();
  const port = process.env.PORT || 10000;
  app.listen(port, () => console.log("PIXEL-NET backend listening on", port, "DB:", DB_PATH));
})();
