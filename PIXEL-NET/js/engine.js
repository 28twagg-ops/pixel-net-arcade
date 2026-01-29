/**
 * PIXEL-NET ENGINE
 * Connects the Frontend (GitHub) to the Backend (Render)
 */

const PixelNet = {
    // *** PASTE YOUR RENDER URL HERE ***
    // Example: "https://pixel-net-backend.onrender.com"
    config: {
        BACKEND_URL: "https://pixel-net-backend.onrender.com" 
    },

    player: {
        initials: "???",
        token: null
    },

    init: function() {
        // Load initials from session (saved by the login screen)
        const storedInitials = sessionStorage.getItem('playerInitials');
        if (storedInitials) {
            this.player.initials = storedInitials;
            console.log("Pixel-Net Linked. Player:", this.player.initials);
        }
    },

    // --- SUBMIT SCORE TO RENDER ---
    submitScore: async function(gameSlug, score) {
        console.log(`Sending Score... Game: ${gameSlug}, Score: ${score}`);
        
        try {
            const response = await fetch(`${this.config.BACKEND_URL}/api/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game_slug: gameSlug,
                    initials: this.player.initials,
                    score: score
                })
            });
            
            if (response.ok) {
                alert(`SCORE UPLOADED!\n${gameSlug.toUpperCase()}: ${score}`);
            } else {
                console.warn("Upload failed. Server might be sleeping.");
            }
        } catch (err) {
            console.error("Network Error:", err);
        }
    },

    // --- GET LEADERBOARD FROM RENDER ---
    getLeaderboard: async function(gameSlug) {
        try {
            const response = await fetch(`${this.config.BACKEND_URL}/api/leaderboard/${gameSlug}`);
            const data = await response.json();
            return data;
        } catch (err) {
            console.error("Could not fetch leaderboard", err);
            return [];
        }
    },

    // --- INPUT HANDLER (Standard Controls) ---
    Input: {
        keys: { up: false, down: false, left: false, right: false, action: false },
        
        startListening: function() {
            window.addEventListener('keydown', (e) => this.handleKey(e, true));
            window.addEventListener('keyup', (e) => this.handleKey(e, false));
        },

        handleKey: function(e, isPressed) {
            if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.up = isPressed;
            if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys.down = isPressed;
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = isPressed;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = isPressed;
            if (e.code === 'Space' || e.code === 'Enter') this.keys.action = isPressed;
        }
    }
};

// Start engine
PixelNet.init();
PixelNet.Input.startListening();