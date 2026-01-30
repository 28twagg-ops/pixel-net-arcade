/*
 * Neon Chase
 *
 * Race through a neon highway and dodge incoming traffic. The player
 * controls a car that can switch between three lanes to avoid
 * obstacles. Survive as long as possible and watch your score climb
 * over time. The visuals are intentionally simple to keep the file
 * size small while still providing a fast paced arcade experience.
 */

(function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const WIDTH = 640;
  const HEIGHT = 480;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // Define lane positions (center y positions)
  const laneCount = 3;
  const laneY = [];
  for (let i = 0; i < laneCount; i++) {
    laneY.push((i + 1) * HEIGHT / (laneCount + 1));
  }

  const player = {
    lane: 1, // start in middle lane
    width: 40,
    height: 20,
    x: 80,
    color: '#08f7fe'
  };

  // Obstacles array
  const obstacles = [];
  let lastObstacleSpawn = 0;
  let obstacleInterval = 1200; // spawn every 1.2 seconds initially
  let speed = 3; // obstacle speed

  let score = 0;
  let gameOver = false;

  // Key handling
  window.addEventListener('keydown', e => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      if (player.lane > 0) player.lane--;
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      if (player.lane < laneCount - 1) player.lane++;
    } else if (gameOver && e.code === 'Enter') {
      restart();
    }
  });

  function spawnObstacle() {
    const lane = Math.floor(Math.random() * laneCount);
    obstacles.push({
      lane,
      x: WIDTH + 40,
      width: 40,
      height: 20,
      color: '#fe53bb'
    });
  }

  function updateObstacles(delta) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      ob.x -= speed;
      // Remove off screen
      if (ob.x + ob.width < 0) {
        obstacles.splice(i, 1);
        score += 10;
      }
      // Collision check
      if (!gameOver &&
          ob.lane === player.lane &&
          ob.x < player.x + player.width &&
          ob.x + ob.width > player.x) {
        gameOver = true;
      }
    }
    // Increase difficulty over time
    if (!gameOver) {
      speed += delta * 0.0005;
      obstacleInterval = Math.max(600, obstacleInterval - delta * 0.05);
    }
  }

  function drawBackground(offset) {
    ctx.fillStyle = '#01012b';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Neon lane lines
    ctx.strokeStyle = '#08f7fe33';
    ctx.lineWidth = 2;
    for (let i = 0; i < laneCount; i++) {
      ctx.beginPath();
      ctx.moveTo(0, laneY[i]);
      ctx.lineTo(WIDTH, laneY[i]);
      ctx.stroke();
    }
    // Moving vertical lines to simulate motion
    ctx.strokeStyle = '#f5d30022';
    for (let x = (offset % 40) - 40; x < WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
  }

  let lastTime = performance.now();
  let lineOffset = 0;
  function loop(time) {
    const delta = time - lastTime;
    lastTime = time;
    lineOffset += speed;
    // Spawn obstacles
    if (time - lastObstacleSpawn > obstacleInterval) {
      spawnObstacle();
      lastObstacleSpawn = time;
    }
    updateObstacles(delta);
    drawBackground(lineOffset);
    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, laneY[player.lane] - player.height / 2, player.width, player.height);
    // Draw obstacles
    obstacles.forEach(ob => {
      ctx.fillStyle = ob.color;
      ctx.fillRect(ob.x, laneY[ob.lane] - ob.height / 2, ob.width, ob.height);
    });
    // Draw score
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Score: ${Math.floor(score)}`, 10, 24);
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Crash!', WIDTH / 2, HEIGHT / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillText(`Final Score: ${Math.floor(score)}`, WIDTH / 2, HEIGHT / 2 + 10);
      ctx.fillText('Press Enter to Restart', WIDTH / 2, HEIGHT / 2 + 40);
    }
    requestAnimationFrame(loop);
  }

  function restart() {
    obstacles.length = 0;
    lastObstacleSpawn = 0;
    obstacleInterval = 1200;
    speed = 3;
    score = 0;
    player.lane = 1;
    gameOver = false;
  }

  requestAnimationFrame(loop);
})();