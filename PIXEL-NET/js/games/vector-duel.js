/*
 * Vector Duel
 *
 * A minimalist one‑on‑one space duel. Pilot your wireframe ship with
 * thrust and rotation keys, and fire lasers at the enemy. The enemy
 * uses a simple AI to turn and shoot back. Dodge the incoming fire and
 * land a hit to earn points. Survive as long as you can; getting
 * hit ends the match. This script uses raw Canvas APIs and avoids
 * external libraries, making it lightweight and easy to integrate into
 * PIXEL‑NET.
 */

(function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const WIDTH = 640;
  const HEIGHT = 480;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // Ship constructor
  function Ship(x, y, color) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2; // facing up
    this.velX = 0;
    this.velY = 0;
    this.color = color;
    this.alive = true;
    this.reload = 0;
  }
  Ship.prototype.update = function(dt) {
    // apply velocity
    this.x += this.velX;
    this.y += this.velY;
    // wrap around edges
    if (this.x < 0) this.x += WIDTH;
    if (this.x > WIDTH) this.x -= WIDTH;
    if (this.y < 0) this.y += HEIGHT;
    if (this.y > HEIGHT) this.y -= HEIGHT;
    // friction
    this.velX *= 0.99;
    this.velY *= 0.99;
    if (this.reload > 0) this.reload -= dt;
  };
  Ship.prototype.draw = function() {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const ang = this.angle + i * (2 * Math.PI / 3);
      const px = this.x + Math.cos(ang) * 12;
      const py = this.y + Math.sin(ang) * 12;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  };
  Ship.prototype.thrust = function(amount) {
    this.velX += Math.cos(this.angle) * amount;
    this.velY += Math.sin(this.angle) * amount;
  };
  Ship.prototype.rotate = function(dir) {
    this.angle += dir;
  };
  Ship.prototype.fire = function(bullets) {
    if (this.reload <= 0) {
      const speed = 5;
      bullets.push({
        x: this.x + Math.cos(this.angle) * 14,
        y: this.y + Math.sin(this.angle) * 14,
        dx: Math.cos(this.angle) * speed,
        dy: Math.sin(this.angle) * speed,
        color: this.color
      });
      this.reload = 500; // milliseconds between shots
    }
  };

  const player = new Ship(WIDTH * 0.3, HEIGHT / 2, '#00ff7f');
  const enemy = new Ship(WIDTH * 0.7, HEIGHT / 2, '#ff5555');
  const bullets = [];
  let score = 0;
  let gameOver = false;

  // Input handling
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') {
      player.fire(bullets);
    } else if (gameOver && e.code === 'Enter') {
      restart();
    }
  });
  window.addEventListener('keyup', e => {
    keys[e.code] = false;
  });

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.dx;
      b.y += b.dy;
      // wrap
      if (b.x < 0) b.x += WIDTH;
      if (b.x > WIDTH) b.x -= WIDTH;
      if (b.y < 0) b.y += HEIGHT;
      if (b.y > HEIGHT) b.y -= HEIGHT;
      // Check collision with ships
      if (player.alive && b.color === enemy.color && Math.hypot(b.x - player.x, b.y - player.y) < 12) {
        gameOver = true;
        player.alive = false;
      }
      if (enemy.alive && b.color === player.color && Math.hypot(b.x - enemy.x, b.y - enemy.y) < 12) {
        // Enemy destroyed, increment score and respawn
        score += 1;
        enemy.x = WIDTH * 0.7;
        enemy.y = Math.random() * HEIGHT;
        enemy.velX = 0;
        enemy.velY = 0;
        bullets.splice(i, 1);
        continue;
      }
    }
  }

  function updateEnemy(dt) {
    if (!enemy.alive || gameOver) return;
    // Rotate towards player
    const desired = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    let delta = desired - enemy.angle;
    // Wrap to [-π, π]
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    enemy.rotate(delta * 0.03);
    // Thrust slowly
    enemy.thrust(0.04);
    // Fire occasionally
    if (Math.random() < 0.02) {
      enemy.fire(bullets);
    }
  }

  let lastTime = performance.now();
  function loop(time) {
    const dt = time - lastTime;
    lastTime = time;
    // Clear background
    ctx.fillStyle = '#010016';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (!gameOver) {
      // Update player movement
      if (keys['ArrowLeft'] || keys['KeyA']) player.rotate(-0.05);
      if (keys['ArrowRight'] || keys['KeyD']) player.rotate(0.05);
      if (keys['ArrowUp'] || keys['KeyW']) player.thrust(0.1);
      player.update(dt);
      enemy.update(dt);
      updateBullets(dt);
      updateEnemy(dt);
    }
    // Draw ships and bullets
    if (player.alive) player.draw();
    if (enemy.alive) enemy.draw();
    bullets.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
    });
    // Draw score
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 24);
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('You Lose', WIDTH / 2, HEIGHT / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillText(`Final Score: ${score}`, WIDTH / 2, HEIGHT / 2 + 10);
      ctx.fillText('Press Enter to Restart', WIDTH / 2, HEIGHT / 2 + 40);
    }
    requestAnimationFrame(loop);
  }

  function restart() {
    // Reset ships
    player.x = WIDTH * 0.3;
    player.y = HEIGHT / 2;
    player.velX = 0;
    player.velY = 0;
    player.angle = -Math.PI / 2;
    player.alive = true;
    enemy.x = WIDTH * 0.7;
    enemy.y = HEIGHT / 2;
    enemy.velX = 0;
    enemy.velY = 0;
    enemy.angle = Math.PI / 2;
    enemy.alive = true;
    bullets.length = 0;
    score = 0;
    gameOver = false;
  }

  requestAnimationFrame(loop);
})();