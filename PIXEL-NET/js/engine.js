/**
 * PIXEL-NET ENGINE
 * Minimal, non-blocking, evidence-friendly submission + in-UI toast notifications.
 */
const PixelNet = {
  config: {
    BACKEND_URL: "https://pixel-net-backend.onrender.com"
  },

  player: {
    initials: "???",
    token: null
  },

  init: function () {
    const storedInitials = sessionStorage.getItem("playerInitials");
    if (storedInitials) this.player.initials = storedInitials;
    console.log("Pixel-Net Linked. Player:", this.player.initials);
  },

  // --- small in-UI toast (non-blocking) ---
  toast: function (msg, kind = "info", ms = 2200) {
    try {
      const id = "px-toast";
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.style.position = "fixed";
        el.style.zIndex = "99999";
        el.style.right = "14px";
        el.style.bottom = "14px";
        el.style.maxWidth = "320px";
        el.style.padding = "10px 12px";
        el.style.borderRadius = "14px";
        el.style.border = "1px solid rgba(255,255,255,.14)";
        el.style.background = "rgba(10,12,26,.82)";
        el.style.backdropFilter = "blur(8px)";
        el.style.color = "#e9ecff";
        el.style.font = '700 12px/1.25 "Orbitron", system-ui, sans-serif';
        el.style.letterSpacing = ".08em";
        el.style.boxShadow = "0 14px 40px rgba(0,0,0,.35)";
        el.style.display = "none";
        document.body.appendChild(el);
      }
      const prefix = kind === "ok" ? "✅ " : kind === "err" ? "⚠️ " : "ℹ️ ";
      el.textContent = prefix + String(msg || "");
      el.style.display = "block";
      el.style.opacity = "1";
      clearTimeout(el._px_to);
      el._px_to = setTimeout(() => {
        el.style.opacity = "0";
        setTimeout(() => (el.style.display = "none"), 180);
      }, ms);
    } catch (_) {}
  },

  _getInitialsNow: function () {
    const s =
      sessionStorage.getItem("playerInitials") ||
      localStorage.getItem("px_player_initials") ||
      this.player.initials ||
      "???";
    return (s || "???")
      .toString()
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 3) || "???";
  },

  submitScore: async function (gameSlug, score) {
    const initials = this._getInitialsNow();
    const safeScore = Number.isFinite(score) ? Math.floor(score) : 0;

    console.log("[PixelNet] submitScore()", { gameSlug, initials, score: safeScore });

    try {
      const response = await fetch(`${this.config.BACKEND_URL}/api/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_slug: gameSlug, initials, score: safeScore })
      });

      let bodyText = "";
      try { bodyText = await response.text(); } catch (_) {}

      if (!response.ok) {
        console.warn("[PixelNet] Score upload failed", {
          status: response.status, statusText: response.statusText, body: bodyText
        });
        this.toast("Score upload failed", "err");
        return { ok: false, status: response.status, body: bodyText };
      }

      console.log("[PixelNet] Score uploaded OK", { status: response.status, body: bodyText });
      this.toast("Added to leaderboard", "ok");
      return { ok: true, status: response.status, body: bodyText };
    } catch (err) {
      console.error("[PixelNet] Network error submitting score:", err);
      this.toast("Network error submitting score", "err");
      return { ok: false, error: String(err) };
    }
  },

  // Normalize backend response into an array for game UIs
  _normalizeLeaderboard: function (data) {
    if (Array.isArray(data)) return data;
    if (!data) return [];
    if (Array.isArray(data.top10)) return data.top10;
    if (Array.isArray(data.scores)) return data.scores;
    if (Array.isArray(data.leaderboard)) return data.leaderboard;
    return [];
  },

  getLeaderboard: async function (gameSlug) {
    try {
      const res = await fetch(`${this.config.BACKEND_URL}/api/leaderboard/${gameSlug}`, { cache: "no-store" });
      const data = await res.json();
      return this._normalizeLeaderboard(data);
    } catch (err) {
      console.error("[PixelNet] Could not fetch leaderboard", err);
      return [];
    }
  },

  Input: {
    keys: { up: false, down: false, left: false, right: false, action: false },

    startListening: function () {
      window.addEventListener("keydown", (e) => this.handleKey(e, true));
      window.addEventListener("keyup", (e) => this.handleKey(e, false));
    },

    handleKey: function (e, isPressed) {
      if (e.code === "ArrowUp" || e.code === "KeyW") this.keys.up = isPressed;
      if (e.code === "ArrowDown" || e.code === "KeyS") this.keys.down = isPressed;
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.keys.left = isPressed;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.keys.right = isPressed;
      if (e.code === "Space" || e.code === "Enter") this.keys.action = isPressed;
    }
  }
};

PixelNet.init();
PixelNet.Input.startListening();
window.PixelNet = PixelNet;


/* ===== UI INITIALS (HOME + WRAPPERS) =====
   - No alerts
   - Auto-prompts on first visit (if initials missing)
   - Badge opens modal to change initials
*/
PixelNet.uiInit = function(){
  const KEY = "px_player_initials";
  const modal = document.getElementById("px-init-modal");
  const input = document.getElementById("px-init-input");
  const btnSave = document.getElementById("px-init-save");
  const btnClose = document.getElementById("px-init-close");
  const backdrop = modal ? modal.querySelector(".px-init-backdrop") : null;

  // Badge(s)
  const badges = [
    document.getElementById("px-player-badge"),
    document.getElementById("px-badge"),
  ].filter(Boolean);

  const normalize = (s) => (s||"")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,"")
    .slice(0,3);

  const getStored = () => normalize(
    sessionStorage.getItem("playerInitials") ||
    localStorage.getItem(KEY) ||
    ""
  );

  const setStored = (s) => {
    const v = normalize(s);
    if(!v) return false;
    sessionStorage.setItem("playerInitials", v);
    localStorage.setItem(KEY, v);
    PixelNet.player.initials = v;
    badges.forEach(b=> b.textContent = v);
    return true;
  };

  const openModal = () => {
    if(!modal) return;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden","false");
    if(input){
      input.value = "";
      setTimeout(()=>{ try{ input.focus(); }catch(_){} }, 50);
    }
  };

  const closeModal = () => {
    if(!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden","true");
  };

  // Update badges immediately
  const current = getStored() || PixelNet._getInitialsNow();
  if(current && current !== "???"){
    badges.forEach(b=> b.textContent = current);
  }

  // Wire badge click -> open modal (only if modal exists on page)
  if(modal){
    badges.forEach(b=>{
      b.style.cursor = "pointer";
      b.addEventListener("click", (e)=>{ e.preventDefault(); openModal(); });
    });
    if(backdrop) backdrop.addEventListener("click", closeModal);
    if(btnClose) btnClose.addEventListener("click", closeModal);

    const doSave = () => {
      const v = normalize(input ? input.value : "");
      if(!v){
        // tiny shake via class if present, otherwise just keep open
        try{
          modal.classList.add("px-init-shake");
          setTimeout(()=>modal.classList.remove("px-init-shake"), 280);
        }catch(_){}
        return;
      }
      setStored(v);
      closeModal();
      PixelNet.toast && PixelNet.toast("Initials saved: " + v, 1400);
    };

    if(btnSave) btnSave.addEventListener("click", doSave);
    if(input){
      input.addEventListener("keydown", (e)=>{
        if(e.key === "Enter"){ e.preventDefault(); doSave(); }
        if(e.key === "Escape"){ e.preventDefault(); closeModal(); }
      });
      input.addEventListener("input", ()=>{ input.value = normalize(input.value); });
    }

    // Auto-prompt on first entry if initials missing
    const stored = getStored();
    if(!stored || stored === "???"){
      // delay so layout paints first
      setTimeout(openModal, 250);
    }
  }
};

document.addEventListener("DOMContentLoaded", ()=>{ 
  try{ PixelNet.uiInit(); }catch(e){ console.warn("[PixelNet] uiInit failed", e); }
});
