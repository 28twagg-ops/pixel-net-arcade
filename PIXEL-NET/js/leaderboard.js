// Home / shared leaderboard helpers (Top Dogs)
const BACKEND_BASE =
  (window.PixelNet && PixelNet.config && PixelNet.config.BACKEND_URL) ||
  "https://pixel-net-backend.onrender.com";


function prettyGameName(slug){
  if(!slug) return '';
  const map={
    'millipede-react':'Millipede Chaos',
    'neon-maze-chase':'Neon Maze Chase',
    'neon-chase':'Neon Chase',
    'robo-arena':'Robo Arena',
    'neon-arena-assault':'Neon Arena Assault',
    'neon-trail-riders':'Neon Trail Riders',
    'cyber-python':'Cyber Python'
  };
  if(map[slug]) return map[slug];
  // fallback: slug -> Title Case
  return String(slug)
    .replace(/[-_]+/g,' ')
    .replace(/\w/g, m => m.toUpperCase());
}

async function fetchTopDogs() {
  const res = await fetch(`${BACKEND_BASE}/api/topdogs`, { cache: "no-store" });
  if (!res.ok) throw new Error("TopDogs fetch failed");
  return res.json();
}

function _safeEl(id){ return document.getElementById(id); }

async function renderTopDogs(containerId) {
  try {
    const data = await fetchTopDogs();
    const el = _safeEl(containerId);
    if (!el) return;

    const totals = Array.isArray(data?.totals) ? data.totals : [];
    if (!totals.length) { el.innerHTML = "<div class='muted'>No leaders yet.</div>"; return; }

    el.innerHTML = totals.map((row, i) => {
      const hrs = ((row.seconds_as_top1 || 0) / 3600).toFixed(1);
      return `
        <div class="px-dog">
          <span class="px-dog-badge">${i===0?"👑":"⚡"}</span>
          <span class="rank">#${i + 1}</span>
          <span class="name">${row.initials}</span>
          <span class="time">${hrs} hrs</span>
        </div>
      `;
    }).join("");
  } catch (e) { console.error(e); }
}

async function renderCurrentHolders(containerId) {
  try {
    const data = await fetchTopDogs();
    const el = _safeEl(containerId);
    if (!el) return;

    const cur = Array.isArray(data?.current) ? data.current : [];
    if (!cur.length) { el.innerHTML = "<div class='muted'>No current #1 holders.</div>"; return; }

    el.innerHTML = cur.map((row, i) => {
      const mins = Math.floor((row.seconds_held || 0) / 60);
      return `
        <div class="px-dog">
          <span class="px-dog-badge">${i===0?"👑":"⚡"}</span>
          <span class="name">${prettyGameName(row.game_slug)}</span>
          <span class="name">${row.initials}</span>
          <span class="time">${mins} min</span>
        </div>
      `;
    }).join("");
  } catch (e) { console.error(e); }
}
