/**
 * PIXEL-NET ENGINE
 * Connects the Frontend (GitHub Pages) to the Backend (Render)
 * Minimal, non-blocking, evidence-friendly submission.
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
    // Keep player initials synced from sessionStorage (set by homepage / wrappers)
    const storedInitials = sessionStorage.getItem("playerInitials");
    if (storedInitials) {
      this.player.initials = storedInitials;
    }
    console.log("Pixel-Net Linked. Player:", this.player.initials);
  },

  // Always get freshest initials at submit-time (prevents ??? submissions)
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

  // --- SUBMIT SCORE TO RENDER (non-blocking, no alerts) ---
  submitScore: async function (gameSlug, score) {
    const initials = this._getInitialsNow();
    const safeScore = Number.isFinite(score) ? Math.floor(score) : 0;

    // Helpful debug log (keeps your “evidence-based” requirement simple)
    console.log("[PixelNet] submitScore()", { gameSlug, initials, score: safeScore });

    try {
      const response = await fetch(`${this.config.BACKEND_URL}/api/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_slug: gameSlug,
          initials,
          score: safeScore
        })
      });

      // Try to read response body (for DevTools evidence)
      let bodyText = "";
      try {
        bodyText = await response.text();
      } catch (_) {}

      if (!response.ok) {
        console.warn("[PixelNet] Score upload failed", {
          status: response.status,
          statusText: response.statusText,
          body: bodyText
        });
        return { ok: false, status: response.status, body: bodyText };
      }

      console.log("[PixelNet] Score uploaded OK", {
        status: response.status,
        body: bodyText
      });
      return { ok: true, status: response.status, body: bodyText };
    } catch (err) {
      console.error("[PixelNet] Network error submitting score:", err);
      return { ok: false, error: String(err) };
    }
  },

  // --- GET LEADERBOARD FROM RENDER ---
  getLeaderboard: async function (gameSlug) {
    try {
      const response = await fetch(`${this.config.BACKEND_URL}/api/leaderboard/${gameSlug}`);
      const data = await response.json();
      return data?.top10 || (Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[PixelNet] Could not fetch leaderboard", err);
      return [];
    }
  },

  // --- INPUT HANDLER (Standard Controls) ---
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

// Start engine
PixelNet.init();
PixelNet.Input.startListening();

// Expose globally (required for inline scripts + game files)
window.PixelNet = PixelNet;