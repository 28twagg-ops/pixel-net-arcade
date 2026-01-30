(function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const GS = 20; // Grid Size
    const COLS = 20;
    const ROWS = 32;

    // --- Game State ---
    let score = 0;
    let level = 1;
    let gameOver = false;
    let frame = 0;
    const player = { x: 10, y: 30, vx: 0, vy: 0 };
    const mushrooms = [];
    const segments = []; // Millipede segments
    const bullets = [];
    const ddtBombs = [];
    const explosions = []; // For gas clouds and hits
    const keys = {};

    // --- Initialization ---
    function init() {
        // Build Mushroom Forest
        for (let i = 0; i < 50; i++) {
            spawnMushroom(Math.floor(Math.random() * COLS), Math.floor(Math.random() * 26) + 2);
        }
        // Spawn Initial DDT
        for (let i = 0; i < 3; i++) {
            ddtBombs.push({ x: Math.floor(Math.random() * (COLS - 2)) + 1, y: Math.floor(Math.random() * 18) + 5, active: true });
        }
        spawnMillipede(12);
        requestAnimationFrame(gameLoop);
    }

    function spawnMushroom(x, y, poisoned = false) {
        if (!mushrooms.some(m => m.x === x && m.y === y)) {
            mushrooms.push({ x, y, hp: 4, poisoned });
        }
    }

    function spawnMillipede(len) {
        for (let i = 0; i < len; i++) {
            segments.push({ x: 10 - i, y: 0, dir: 1, isHead: i === 0, diving: false });
        }
    }

    // --- Input ---
    window.addEventListener('keydown', e => { keys[e.key] = true; if(e.key === ' ' || e.key.includes('Arrow')) e.preventDefault(); });
    window.addEventListener('keyup', e => keys[e.key] = false);

    // --- Update Logic ---
    function update() {
        if (gameOver) return;
        frame++;

        // 1. Player Movement (Smooth)
        const speed = 0.4;
        if (keys['ArrowLeft'] && player.x > 0) player.x -= speed;
        if (keys['ArrowRight'] && player.x < COLS - 1) player.x += speed;
        if (keys['ArrowUp'] && player.y > 24) player.y -= speed;
        if (keys['ArrowDown'] && player.y < ROWS - 1) player.y += speed;

        // 2. Shooting (Rapid Fire)
        if (keys[' '] && frame % 8 === 0) {
            bullets.push({ x: player.x + 0.5, y: player.y });
        }

        // 3. Bullet Collisions
        bullets.forEach((b, bi) => {
            b.y -= 0.8;
            if (b.y < 0) bullets.splice(bi, 1);

            // Hit DDT
            ddtBombs.forEach(d => {
                if (d.active && Math.abs(b.x - (d.x + 0.5)) < 0.8 && Math.abs(b.y - (d.y + 0.5)) < 0.8) {
                    d.active = false;
                    bullets.splice(bi, 1);
                    triggerDDT(d.x, d.y);
                }
            });

            // Hit Mushrooms
            mushrooms.forEach((m, mi) => {
                if (Math.floor(b.x) === m.x && Math.floor(b.y) === m.y) {
                    m.hp--;
                    bullets.splice(bi, 1);
                    if (m.hp <= 0) { mushrooms.splice(mi, 1); score += 5; }
                }
            });

            // Hit Millipede
            segments.forEach((s, si) => {
                if (Math.abs(b.x - (s.x + 0.5)) < 0.7 && Math.abs(b.y - (s.y + 0.5)) < 0.7) {
                    score += s.isHead ? 100 : 10;
                    spawnMushroom(Math.floor(s.x), Math.floor(s.y));
                    segments.splice(si, 1);
                    bullets.splice(bi, 1);
                    if (segments.length > 0 && si === 0) segments[0].isHead = true;
                }
            });
        });

        // 4. Millipede AI
        if (frame % Math.max(1, 5 - level) === 0) {
            segments.forEach((s, si) => {
                if (s.diving) {
                    s.y++;
                    if (s.y >= ROWS - 1) s.diving = false;
                } else {
                    let nextX = s.x + s.dir;
                    let turnDown = false;
                    if (nextX < 0 || nextX >= COLS) turnDown = true;
                    
                    const hitM = mushrooms.find(m => m.x === nextX && m.y === s.y);
                    if (hitM) {
                        turnDown = true;
                        if (hitM.poisoned) s.diving = true;
                    }

                    if (turnDown) {
                        s.y++;
                        s.dir *= -1;
                        if (s.y >= ROWS) s.y = 24; // Loop in player zone
                    } else {
                        s.x = nextX;
                    }
                }
                // Check Player Death
                if (Math.abs(s.x - player.x) < 0.7 && Math.abs(s.y - player.y) < 0.7) gameOver = true;
            });
        }

        // 5. DDT Gas Logic
        explosions.forEach((e, ei) => {
            e.life--;
            if (e.isGas) {
                segments.forEach((s, si) => {
                    if (Math.hypot(s.x - e.x, s.y - e.y) < 2) {
                        segments.splice(si, 1);
                        score += 50;
                    }
                });
            }
            if (e.life <= 0) explosions.splice(ei, 1);
        });

        if (segments.length === 0) { level++; spawnMillipede(12 + level); }
    }

    function triggerDDT(x, y) {
        for (let i = 0; i < 15; i++) {
            explosions.push({ 
                x: x + (Math.random() * 4 - 2), 
                y: y + (Math.random() * 4 - 2), 
                life: 60, isGas: true 
            });
        }
    }

    // --- Drawing ---
    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Mushrooms (Detailed)
        mushrooms.forEach(m => {
            ctx.fillStyle = m.poisoned ? '#0f0' : '#f0f';
            ctx.fillRect(m.x * GS + 2, m.y * GS + 2, GS - 4, GS / 2);
            ctx.fillStyle = '#fff';
            ctx.fillRect(m.x * GS + 8, m.y * GS + 10, 4, 8);
        });

        // Draw DDT
        ddtBombs.forEach(d => {
            if (!d.active) return;
            ctx.fillStyle = '#ff0';
            ctx.fillRect(d.x * GS, d.y * GS, GS, GS);
            ctx.fillStyle = '#000';
            ctx.font = '8px Arial';
            ctx.fillText("DDT", d.x * GS + 2, d.y * GS + 12);
        });

        // Draw Millipede (Animated Legs)
        segments.forEach((s, i) => {
            ctx.fillStyle = s.isHead ? '#fff' : '#0f0';
            ctx.beginPath();
            ctx.arc(s.x * GS + 10, s.y * GS + 10, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0f0';
            let leg = Math.sin(frame * 0.3 + i) * 5;
            ctx.beginPath();
            ctx.moveTo(s.x * GS + 2, s.y * GS + 10 + leg);
            ctx.lineTo(s.x * GS - 2, s.y * GS + 15 + leg);
            ctx.stroke();
        });

        // Draw Player (Arcade Blaster)
        ctx.fillStyle = '#0ff';
        ctx.fillRect(player.x * GS + 2, player.y * GS + 10, 16, 8);
        ctx.fillRect(player.x * GS + 8, player.y * GS + 2, 4, 12);

        // Draw Bullets
        ctx.fillStyle = '#fff';
        bullets.forEach(b => ctx.fillRect(b.x * GS - 1, b.y * GS, 2, 8));

        // Draw Gas Clouds
        explosions.forEach(e => {
            ctx.fillStyle = `rgba(255, 255, 0, ${e.life / 60})`;
            ctx.beginPath();
            ctx.arc(e.x * GS, e.y * GS, 10, 0, Math.PI * 2);
            ctx.fill();
        });

        // UI
        ctx.fillStyle = '#fff';
        ctx.font = '18px Courier New';
        ctx.fillText(`SCORE: ${score}`, 10, 25);

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, 400, 640);
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.font = '40px Courier New';
            ctx.fillText("GAME OVER", 200, 300);
            ctx.font = '20px Courier New';
            ctx.fillStyle = 'white';
            ctx.fillText("PRESS 'EJECT' TO EXIT", 200, 340);
        }
    }

    function gameLoop() {
        update();
        draw();
        if (!gameOver) requestAnimationFrame(gameLoop);
    }

    init();
})();
