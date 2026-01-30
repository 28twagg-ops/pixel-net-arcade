const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve your game files

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- API ROUTES ---

// 1. Get Leaderboard
app.get('/api/leaderboard/:game', async (req, res) => {
  const { game } = req.params;
  try {
    const result = await pool.query(
      'SELECT initials, score FROM scores WHERE game_slug = $1 ORDER BY score DESC LIMIT 10',
      [game]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Submit Score
app.post('/api/score', async (req, res) => {
  const { game_slug, initials, score } = req.body;
  try {
    await pool.query(
      'INSERT INTO scores (game_slug, initials, score) VALUES ($1, $2, $3)',
      [game_slug, initials, score]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Save failed' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
