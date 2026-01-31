// Use PixelNet's configured backend if available, otherwise fallback to the default
const BACKEND_BASE =
  (window.PixelNet && PixelNet.config && PixelNet.config.BACKEND_URL) ||
  "https://pixel-net-backend.onrender.com";

/**
 * Fetch Top 10 for a game
 */
async function fetchLeaderboard(gameSlug) {
  const res = await fetch(`${BACKEND_BASE}/api/leaderboard/${gameSlug}`, {
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Leaderboard fetch failed");
  return res.json();
}

/**
 * Fetch Top Dogs (time held at #1)
 */
async function fetchTopDogs() {
  const res = await fetch(`${BACKEND_BASE}/api/topdogs`, {
    cache: "no-store"
  });
  if (!res.ok) throw new Error("TopDogs fetch failed");
  return res.json();
}

/**
 * Render Top Dogs panel
 */
async function renderTopDogs(containerId) {
  try {
    const data = await fetchTopDogs();
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!data.totals.length) {
      el.innerHTML = "<div class='muted'>No leaders yet.</div>";
      return;
    }

    el.innerHTML = data.totals.map((row, i) => {
      const hrs = (row.seconds_as_top1 / 3600).toFixed(1);
      return `
        <div class="px-dog">
          <span class="rank">#${i + 1}</span>
          <span class="name">${row.initials}</span>
          <span class="time">${hrs} hrs</span>
        </div>
      `;
    }).join("");
  } catch (e) {
    console.error(e);
  }
}

/**
 * Utility for games to submit scores
 */
async function submitScore(gameSlug, score) {
  const initials =
    localStorage.getItem("px_player_initials") ||
    sessionStorage.getItem("playerInitials");

  if (!initials) return;

  await fetch(`${BACKEND_BASE}/api/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      game_slug: gameSlug,
      initials,
      score
    })
  });
}
