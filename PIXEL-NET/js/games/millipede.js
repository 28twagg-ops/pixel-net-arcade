/**
 * MILLIPEDE CHAOS - Final Version
 */

const MillipedeGame = {
    canvas: null, ctx: null, reqId: null,
    cols: 20, rows: 32, gridSize: 20,
    playerZone: 24, // ROWS - 8
    
    // Core State
    state: { active: false, score: 0, level: 0, gameOver: false, initials: "", inputMode: false },
    
    // Entities
    player: { x: 10, y: 30 },
    bullets: [], mushrooms: [], millipedes: [], 
    spiders: [], bees: [], earwigs: [], ddtBombs: [], explosions: [],
    
    // Config
    tick: 0, lastFire: 0, palette: null, keys: {},
    
    PALETTES: [
        { mushroom: '#FFCC00', millipede: '#FF0000', spider: '#FFFFFF', laser: '#FFFFFF', poisoned: '#00FF00', bg: '#000' },
        { mushroom: '#00FFFF', millipede: '#00FF00', spider: '#FFFF00', laser: '#00FFFF', poisoned: '#FF00FF', bg: '#050005' },
        { mushroom: '#FF00FF', millipede: '#FFFFFF', spider: '#00FFFF', laser: '#FF00FF', poisoned: '#FFFF00', bg: '#000505' },
    ],

    init: function(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if(!this.canvas) {
            console.error("CANVAS NOT FOUND: " + canvasId);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        
        // Input Handling
        const handleKey = (e, isDown) => {
            this.keys[e.key] = isDown;
            if(this.state.inputMode && isDown) this.handleInitials(e);
        };
        
        // Remove old listeners to prevent stacking
        window.onkeydown = (e) => handleKey(e, true);
        window.onkeyup = (e) => handleKey(e, false);

        console.log("Millipede Initialized!");
        this.resetGame(0);
        this.loop();
    },

    handleInitials: function(e) {
        if (e.key === 'Enter') this.submitAndClose();
        else if (e.key === 'Backspace') this.state.initials = this.state.initials.slice(0, -1);
        else if (e.key.length === 1 && this.state.initials.length < 3) this.state.initials += e.key.toUpperCase();
    },

    resetGame: function(level) {
        this.state.active = true;
        this.state.gameOver = false;
        this.state.inputMode = false;
        this.tick = 0;
        this.state.level = level;
        this.palette = this.PALETTES[level % this.PALETTES.length];
        
        // Clear Entities
        this.bullets = []; this.spiders = []; this.bees = []; 
        this.earwigs = []; this.explosions = []; this.ddtBombs = [];
        this.player = { x: this.cols / 2, y: this.rows - 4 };

        // Generate Mushrooms (Only on level 0)
        if (level === 0) {
            this.mushrooms = [];
            this.state.score = 0;
            for(let i=0; i<55; i++) {
                this.mushrooms.push({
                    x: Math.floor(Math.random() * this.cols),
                    y: Math.floor(Math.random() * (this.rows - 10)) + 1,
                    health: 4, poisoned: false
                });
            }
        }
        
        // Spawn DDT Bombs
        for(let i=0; i<3; i++) {
            this.ddtBombs.push({
                x: Math.floor(Math.random() * (this.cols - 2)) + 1,
                y: Math.floor(Math.random() * 18) + 5,
                active: true
            });
        }

        // Spawn Millipede
        let segments = [];
        for(let i=0; i<12; i++) segments.push({ x: 10-i, y: 0, dir: 1, diving: false });
        this.millipedes = [segments];
    },

    update: function() {
        if (!this.state.active || this.state.gameOver) return;
        this.tick++;

        // 1. Player Movement
        const speed = 0.35;
        if (this.keys['ArrowLeft'] && this.player.x > 0) this.player.x -= speed;
        if (this.keys['ArrowRight'] && this.player.x < this.cols - 1) this.player.x += speed;
        if (this.keys['ArrowUp'] && this.player.y > this.playerZone) this.player.y -= speed;
        if (this.keys['ArrowDown'] && this.player.y < this.rows - 1) this.player.y += speed;

        // 2. Fire
        if ((this.keys[' '] || this.keys['Spacebar']) && Date.now() - this.lastFire > 120) {
            this.bullets.push({ x: this.player.x + 0.5, y: this.player.y });
            this.lastFire = Date.now();
        }

        // 3. Bullets & Collisions
        this.bullets = this.bullets.filter(b => {
            b.y -= 1.0;
            let hit = false;
            
            // Vs DDT Bombs
            this.ddtBombs.forEach(d => {
                if (d.active && Math.abs(b.x - (d.x+0.5)) < 0.8 && Math.abs(b.y - (d.y+0.5)) < 0.8) {
                    d.active = false;
                    hit = true;
                    // Massive Explosion
                    for(let ox = -2; ox <= 2; ox++) {
                        for(let oy = -2; oy <= 2; oy++) {
                            this.explosions.push({ 
                                x: d.x + ox + 0.5, y: d.y + oy + 0.5, 
                                color: '#FFFF00', life: 45, isGas: true 
                            });
                        }
                    }
                    this.state.score += 800;
                }
            });

            // Vs Mushrooms
            if(!hit) {
                this.mushrooms.forEach(m => {
                    if (!hit && Math.floor(b.x) === m.x && Math.floor(b.y) === m.y) {
                        m.health--;
                        hit = true;
                        this.state.score += 1;
                        this.explosions.push({ x: m.x+0.5, y: m.y+0.5, color: m.poisoned ? '#0F0':'#F0F', life: 8 });
                    }
                });
                this.mushrooms = this.mushrooms.filter(m => m.health > 0);
            }
            
            // Vs Enemies
            if(!hit) {
                this.spiders.forEach((s, idx) => {
                    if(Math.abs(b.x - s.x) < 1 && Math.abs(b.y - s.y) < 1) {
                        hit = true; this.state.score += 600;
                        this.spiders.splice(idx, 1);
                        this.explosions.push({x:s.x, y:s.y, color: '#FFF', life: 15});
                    }
                });
            }

            // Vs Millipede
            if (!hit) {
                this.millipedes.forEach(milli => {
                    milli.forEach((seg, idx) => {
                        if (!hit && Math.abs(b.x - (seg.x+0.5)) < 0.7 && Math.abs(b.y - (seg.y+0.5)) < 0.7) {
                            hit = true;
                            this.state.score += 10;
                            this.mushrooms.push({ x: Math.floor(seg.x), y: Math.floor(seg.y), health: 4 });
                            const tail = milli.splice(idx + 1);
                            milli.splice(idx, 1);
                            if (tail.length > 0) this.millipedes.push(tail);
                        }
                    });
                });
            }
            return !hit && b.y > -1;
        });

        // 4. Millipede Movement
        const moveFreq = Math.max(1, 4 - this.state.level);
        if (this.tick % moveFreq === 0) {
            this.millipedes.forEach(milli => {
                if (milli.length === 0) return;
                const head = milli[0];
                let nextX = head.x + head.dir;
                let turnDown = false;

                if (head.diving) {
                    head.y += 1;
                    if (head.y >= this.rows - 1) head.diving = false;
                } else {
                    if (nextX < 0 || nextX >= this.cols) turnDown = true;
                    else {
                         this.mushrooms.forEach(m => {
                            if(m.x === nextX && m.y === head.y) {
                                turnDown = true;
                                if(m.poisoned) head.diving = true;
                            }
                         });
                    }

                    if (turnDown) {
                        head.y++; head.dir *= -1;
                        if(head.y >= this.rows) head.y = this.playerZone;
                    } else {
                        head.x = nextX;
                    }
                }
                
                // Body Follow
                for (let i = milli.length - 1; i > 0; i--) {
                   milli[i].x = milli[i-1].x;
                   milli[i].y = milli[i-1].y;
                }
                
                // Player Collision
                if (Math.abs(milli[0].x - this.player.x) < 1 && Math.abs(milli[0].y - this.player.y) < 1) {
                    this.triggerGameOver();
                }
            });
            this.millipedes = this.millipedes.filter(m => m.length > 0);
            if (this.millipedes.length === 0) this.resetGame(this.state.level + 1);
        }

        // 5. Spiders
        if (this.tick % 600 === 0 && this.spiders.length < 1) {
            this.spiders.push({ x: 0, y: this.playerZone+1, vx: 0.1, vy: 0.1, timer: 0 });
        }
        this.spiders.forEach(s => {
            s.x += s.vx; s.y += s.vy; s.timer++;
            if(s.x < 0 || s.x > this.cols-1) s.vx *= -1;
            if(s.y < this.playerZone || s.y > this.rows-1) s.vy *= -1;
            if(s.timer % 50 === 0 && Math.random() > 0.5) s.vy *= -1;
            
            if (Math.abs(s.x - this.player.x) < 1 && Math.abs(s.y - this.player.y) < 1) this.triggerGameOver();
        });

        // 6. Explosions
        this.explosions.forEach(e => {
            if(e.isGas) {
                this.millipedes.forEach(m => {
                    for(let i=m.length-1; i>=0; i--) {
                        if(Math.abs(m[i].x - e.x) < 1 && Math.abs(m[i].y - e.y) < 1) {
                            m.splice(i, 1); this.state.score += 10;
                        }
                    }
                });
            }
            e.life--;
        });
        this.explosions = this.explosions.filter(e => e.life > 0);
    },

    draw: function() {
        if(!this.ctx) return;
        this.ctx.fillStyle = this.palette.bg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Entities
        this.ddtBombs.forEach(d => {
            if(!d.active) return;
            this.ctx.fillStyle = '#FFDD00';
            this.ctx.fillRect(d.x*this.gridSize+2, d.y*this.gridSize+2, 16, 16);
            this.ctx.fillStyle = '#000'; this.ctx.font = '10px monospace';
            this.ctx.fillText("DDT", d.x*this.gridSize+1, d.y*this.gridSize+13);
        });

        this.mushrooms.forEach(m => {
            this.ctx.fillStyle = m.poisoned ? this.palette.poisoned : this.palette.mushroom;
            this.ctx.fillRect(m.x*this.gridSize+2, m.y*this.gridSize+2, 16, 16);
        });

        this.millipedes.forEach(m => {
            this.ctx.fillStyle = this.palette.millipede;
            m.forEach((seg, idx) => {
                this.ctx.beginPath();
                this.ctx.arc(seg.x*this.gridSize+10, seg.y*this.gridSize+10, 8, 0, Math.PI*2);
                this.ctx.fill();
                if(idx===0) { // Head
                    this.ctx.fillStyle = '#000';
                    this.ctx.fillRect(seg.x*this.gridSize+6, seg.y*this.gridSize+6, 2, 2);
                    this.ctx.fillRect(seg.x*this.gridSize+12, seg.y*this.gridSize+6, 2, 2);
                    this.ctx.fillStyle = this.palette.millipede;
                }
            });
        });

        this.ctx.fillStyle = this.palette.spider;
        this.spiders.forEach(s => {
            this.ctx.beginPath(); this.ctx.arc(s.x*this.gridSize+10, s.y*this.gridSize+10, 8, 0, Math.PI*2);
            this.ctx.fill();
        });

        this.ctx.fillStyle = '#0FF';
        this.ctx.fillRect(this.player.x*this.gridSize + 4, this.player.y*this.gridSize + 10, 12, 6);
        this.ctx.fillStyle = '#FFF';
        this.ctx.fillRect(this.player.x*this.gridSize + 8, this.player.y*this.gridSize + 2, 4, 8);

        this.ctx.fillStyle = this.palette.laser;
        this.bullets.forEach(b => this.ctx.fillRect(b.x*this.gridSize, b.y*this.gridSize, 2, 10));

        this.explosions.forEach(e => {
            this.ctx.fillStyle = e.color;
            if(e.isGas) {
                this.ctx.globalAlpha = e.life / 45;
                this.ctx.beginPath(); this.ctx.arc(e.x*this.gridSize, e.y*this.gridSize, 12, 0, Math.PI*2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
            } else {
                for(let k=0; k<4; k++) this.ctx.fillRect(e.x*this.gridSize + (Math.random()-0.5)*20, e.y*this.gridSize + (Math.random()-0.5)*20, 2, 2);
            }
        });

        // UI
        this.ctx.fillStyle = '#FFF'; this.ctx.font = '20px monospace';
        this.ctx.fillText("SCORE: " + this.state.score, 10, 20);

        if (this.state.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ff003c'; this.ctx.font = '40px monospace';
            this.ctx.fillText("GAME OVER", 90, 250);
            this.ctx.fillStyle = '#fff'; this.ctx.font = '20px monospace';
            this.ctx.fillText("ENTER INITIALS:", 110, 300);
            this.ctx.fillStyle = '#ffff00'; this.ctx.font = '30px monospace';
            this.ctx.fillText(this.state.initials + "_", 170, 340);
        }
    },

    loop: function() {
        this.update();
        this.draw();
        this.reqId = requestAnimationFrame(() => this.loop());
    },

    triggerGameOver: function() {
        this.state.gameOver = true;
        this.state.inputMode = true;
    },

    submitAndClose: function() {
        // Just reload the page to close - simple arcade style
        location.reload(); 
    }
};

// Start immediately
MillipedeGame.init('gameCanvas');