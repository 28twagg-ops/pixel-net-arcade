/*
 * Robo‑Arena
 *
 * A simple top‑down shooter where you control a robot in an arena filled
 * with hostile enemies. Use the arrow keys to move and the spacebar to
 * fire bolts. Survive as long as you can and rack up points by
 * eliminating enemies. If an enemy touches you the game ends. This
 * implementation is intentionally compact and self contained so it can be
 * loaded via the PIXEL‑NET game loader. It does not rely on any
 * external libraries beyond the native browser Canvas API.
 */

(function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Set a sensible default size for the canvas.  The overlay in
  // PIXEL‑NET scales the canvas down to fit the page, so these values
  // provide an appropriate aspect ratio without clipping on most
  // screens.
  const WIDTH = 640;
  const HEIGHT = 480;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // Player state
  const player = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    size: 20,
    speed: 3,
    color: '#2b8fe1',
    dx: 0,
    dy: 0
  };

  // Arrays to store bullets and enemies
  const bullets = [];
  const enemies = [];

  let score = 0;
  let gameOver = false;
  let lastEnemySpawn = 0;

  // Key state tracking
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') {
      // Fire a bullet straight in the direction the player is moving or up
      fireBullet();
    }
  });
  window.addEventListener('keyup', e => {
    keys[e.code] = false;
  });

  function fireBullet() {
    const bulletSpeed = 5;
    // Determine direction based on last movement; default up
    let dx = 0;
    let dy = -1;
    if (player.dx !== 0 || player.dy !== 0) {
      const mag = Math.hypot(player.dx, player.dy);
      dx = player.dx / mag;
      dy = player.dy / mag;
    }
    bullets.push({
      x: player.x,
      y: player.y,
      dx: dx * bulletSpeed,
      dy: dy * bulletSpeed,
      size: 4,
      color: '#ffd93d'
    });
  }

  function spawnEnemy() {
    // Spawn at a random edge with a random position
    const size = 20;
    let x, y, dx, dy;
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0: // top
        x = Math.random() * WIDTH;
        y = -size;
        break;
      case 1: // bottom
        x = Math.random() * WIDTH;
        y = HEIGHT + size;
        break;
      case 2: // left
        x = -size;
        y = Math.random() * HEIGHT;
        break;
      case 3: // right
        x = WIDTH + size;
        y = Math.random() * HEIGHT;
        break;
    }
    enemies.push({ x, y, size, speed: 1.5, color: '#e14b3c' });
  }

  function updatePlayer() {
    player.dx = 0;
    player.dy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) player.dx = -player.speed;
    if (keys['ArrowRight'] || keys['KeyD']) player.dx = player.speed;
    if (keys['ArrowUp'] || keys['KeyW']) player.dy = -player.speed;
    if (keys['ArrowDown'] || keys['KeyS']) player.dy = player.speed;
    player.x += player.dx;
    player.y += player.dy;
    // Clamp to bounds
    player.x = Math.max(player.size / 2, Math.min(WIDTH - player.size / 2, player.x));
    player.y = Math.max(player.size / 2, Math.min(HEIGHT - player.size / 2, player.y));
  }

  function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.dx;
      b.y += b.dy;
      // Remove off‑screen bullets
      if (b.x < -10 || b.x > WIDTH + 10 || b.y < -10 || b.y > HEIGHT + 10) {
        bullets.splice(i, 1);
        continue;
      }
    }
  }

  function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      // Move towards the player
      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      e.x += Math.cos(angle) * e.speed;
      e.y += Math.sin(angle) * e.speed;
      // Check collision with player
      if (Math.hypot(e.x - player.x, e.y - player.y) < (e.size + player.size) / 2) {
        gameOver = true;
      }
      // Check bullet collisions
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.hypot(e.x - b.x, e.y - b.y) < (e.size + b.size) / 2) {
          enemies.splice(i, 1);
          bullets.splice(j, 1);
          score += 10;
          break;
        }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    // Draw arena background
    ctx.fillStyle = '#101820';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Draw player
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
    ctx.fill();
    // Draw bullets
    for (const b of bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Draw enemies
    for (const e of enemies) {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Draw score
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Score: ${score}`, 10, 24);
    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', WIDTH / 2, HEIGHT / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillText(`Final Score: ${score}`, WIDTH / 2, HEIGHT / 2 + 10);
      ctx.fillText('Press Enter to Restart', WIDTH / 2, HEIGHT / 2 + 40);
    }
  }

  function loop(timestamp) {
    if (!gameOver) {
      updatePlayer();
      updateBullets();
      updateEnemies();
      // Spawn new enemies every second
      if (timestamp - lastEnemySpawn > 1000) {
        spawnEnemy();
        lastEnemySpawn = timestamp;
      }
    }
    draw();
    requestAnimationFrame(loop);
  }

  // Restart functionality
  window.addEventListener('keydown', e => {
    if (gameOver && e.code === 'Enter') {
      // Reset state
      bullets.length = 0;
      enemies.length = 0;
      player.x = WIDTH / 2;
      player.y = HEIGHT / 2;
      score = 0;
      gameOver = false;
      lastEnemySpawn = 0;
    }
  });

  // Kick off the game loop
  requestAnimationFrame(loop);
})();