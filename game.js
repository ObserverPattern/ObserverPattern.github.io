const gameCanvas = document.querySelector("#game-canvas");
const scoreValue = document.querySelector("#score-value");
const bestValue = document.querySelector("#best-value");
const gameState = document.querySelector("#game-state");
const powerState = document.querySelector("#power-state");
const gameOverlay = document.querySelector("#game-overlay");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const touchControls = document.querySelector(".touch-controls");

if (gameCanvas && scoreValue && bestValue && gameState && powerState && gameOverlay) {
  const ctx = gameCanvas.getContext("2d");
  const GRID = 24;
  const CELL = 20;
  const BOARD_SIZE = GRID * CELL;
  const STEP_MS = 120;
  const SHIELD_MS = 3000;
  const DOUBLE_MS = 5000;
  const HIGH_SCORE_KEY = "dae-hwan-snake-high-score";

  let snake = [];
  let direction = { x: 1, y: 0 };
  let queuedDirection = { x: 1, y: 0 };
  let food = null;
  let shieldItem = null;
  let doubleItem = null;
  let pendingGrowth = 0;
  let score = 0;
  let bestScore = readBestScore();
  let running = false;
  let gameOver = false;
  let animationId = 0;
  let lastTick = 0;
  let accumulator = 0;
  let shieldUntil = 0;
  let doubleUntil = 0;

  gameCanvas.width = BOARD_SIZE;
  gameCanvas.height = BOARD_SIZE;

  function readBestScore() {
    try {
      const stored = window.localStorage.getItem(HIGH_SCORE_KEY);
      return stored ? Number.parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      window.localStorage.setItem(HIGH_SCORE_KEY, String(value));
    } catch {
      // Ignore storage failures in private or restricted environments.
    }
  }

  function updateBestScore(nextScore) {
    if (nextScore > bestScore) {
      bestScore = nextScore;
      saveBestScore(bestScore);
    }
  }

  function randomCell() {
    return {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  }

  function isSameCell(a, b) {
    return a && b && a.x === b.x && a.y === b.y;
  }

  function occupiesSnake(cell) {
    return snake.some((segment) => isSameCell(segment, cell));
  }

  function randomEmptyCell(extras = []) {
    let candidate = randomCell();
    let guard = 0;
    while (
      (occupiesSnake(candidate) || extras.some((extra) => isSameCell(extra, candidate))) &&
      guard < 200
    ) {
      candidate = randomCell();
      guard += 1;
    }
    return candidate;
  }

  function placeFood() {
    food = randomEmptyCell([shieldItem, doubleItem]);
  }

  function placeShield() {
    shieldItem = randomEmptyCell([food, doubleItem]);
  }

  function placeDouble() {
    doubleItem = randomEmptyCell([food, shieldItem]);
  }

  function resetGame() {
    snake = [
      { x: 10, y: 12 },
      { x: 9, y: 12 },
      { x: 8, y: 12 },
    ];
    direction = { x: 1, y: 0 };
    queuedDirection = { x: 1, y: 0 };
    pendingGrowth = 0;
    score = 0;
    running = false;
    gameOver = false;
    shieldUntil = 0;
    doubleUntil = 0;
    placeFood();
    placeShield();
    placeDouble();
    updateHud("Ready", "Idle", "Start 버튼을 눌러 게임을 시작하세요.");
    render();
  }

  function startGame() {
    if (gameOver) {
      resetGame();
    }
    lastTick = performance.now();
    accumulator = 0;
    running = true;
    updateHud("Running", boostLabel(), "게임이 시작되었습니다. 방향키나 WASD를 사용하세요.");
  }

  function pauseGame() {
    if (gameOver) return;
    running = !running;
    lastTick = performance.now();
    accumulator = 0;
    updateHud(running ? "Running" : "Paused", boostLabel(), running ? "게임이 다시 진행됩니다." : "일시정지 상태입니다.");
  }

  function restartGame() {
    resetGame();
    lastTick = performance.now();
    accumulator = 0;
    running = true;
    updateHud("Running", boostLabel(), "게임을 다시 시작했습니다.");
  }

  function endGame() {
    running = false;
    gameOver = true;
    updateBestScore(score);
    updateHud("Game Over", "Idle", "게임 오버입니다. Restart를 눌러 다시 시작하세요.");
    render();
  }

  function boostLabel() {
    const now = performance.now();
    const shieldRemaining = Math.max(0, shieldUntil - now);
    const doubleRemaining = Math.max(0, doubleUntil - now);

    if (shieldRemaining > 0 && doubleRemaining > 0) {
      return `Shield ${formatSeconds(shieldRemaining)} / x2 ${formatSeconds(doubleRemaining)}`;
    }

    if (shieldRemaining > 0) {
      return `Shield ${formatSeconds(shieldRemaining)}`;
    }

    if (doubleRemaining > 0) {
      return `x2 ${formatSeconds(doubleRemaining)}`;
    }

    return "Idle";
  }

  function formatSeconds(ms) {
    return `${Math.ceil(ms / 1000)}s`;
  }

  function updateHud(status, boost, overlayText) {
    gameState.textContent = status;
    powerState.textContent = boost;
    scoreValue.textContent = String(score);
    bestValue.textContent = String(bestScore);
    gameOverlay.textContent = overlayText;
  }

  function setDirection(next) {
    const isOpposite =
      (next.x === 1 && direction.x === -1) ||
      (next.x === -1 && direction.x === 1) ||
      (next.y === 1 && direction.y === -1) ||
      (next.y === -1 && direction.y === 1);

    const queuedOpposite =
      (next.x === 1 && queuedDirection.x === -1) ||
      (next.x === -1 && queuedDirection.x === 1) ||
      (next.y === 1 && queuedDirection.y === -1) ||
      (next.y === -1 && queuedDirection.y === 1);

    if (!isOpposite && !queuedOpposite) {
      queuedDirection = next;
    }
  }

  function handleMove() {
    direction = queuedDirection;
    const head = { ...snake[0] };
    head.x += direction.x;
    head.y += direction.y;

    const now = performance.now();
    const shieldActive = now < shieldUntil;
    const doubleActive = now < doubleUntil;

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      if (shieldActive) {
        head.x = (head.x + GRID) % GRID;
        head.y = (head.y + GRID) % GRID;
      } else {
        endGame();
        return;
      }
    }

    const hitBody = snake.some((segment) => isSameCell(segment, head));
    if (hitBody && !shieldActive) {
      endGame();
      return;
    }

    snake.unshift(head);

    const ateFood = isSameCell(head, food);
    const ateShield = isSameCell(head, shieldItem);
    const ateDouble = isSameCell(head, doubleItem);

    if (ateFood) {
      score += doubleActive ? 2 : 1;
      pendingGrowth += 1;
      updateBestScore(score);
      placeFood();
    }

    if (ateShield) {
      shieldUntil = performance.now() + SHIELD_MS;
      placeShield();
    }

    if (ateDouble) {
      doubleUntil = performance.now() + DOUBLE_MS;
      pendingGrowth += 2;
      placeDouble();
    }

    if (pendingGrowth > 0) {
      pendingGrowth -= 1;
    } else {
      snake.pop();
    }

    updateHud("Running", boostLabel(), "게임이 진행 중입니다.");
  }

  function drawCell(cell, fillStyle, glow = false) {
    const padding = 2;
    const size = CELL - padding * 2;
    ctx.save();
    if (glow) {
      ctx.shadowColor = fillStyle;
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = fillStyle;
    roundRect(cell.x * CELL + padding, cell.y * CELL + padding, size, size, 6);
    ctx.fill();
    ctx.restore();
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function drawBackground() {
    ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    ctx.fillStyle = "#f8fdff";
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    ctx.strokeStyle = "rgba(17, 118, 168, 0.08)";
    ctx.lineWidth = 1;

    for (let i = 0; i <= GRID; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(BOARD_SIZE, i * CELL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, BOARD_SIZE);
      ctx.stroke();
    }
  }

  function drawSnake() {
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      const fill = isHead ? "#1176a8" : "#39b9ef";
      drawCell(segment, fill, isHead && performance.now() < shieldUntil);
    });
  }

  function drawItems() {
    if (food) drawCell(food, "#ff8f6b", false);
    if (shieldItem) drawCell(shieldItem, "#5dc5ff", true);
    if (doubleItem) drawCell(doubleItem, "#ffd34d", true);
  }

  function render() {
    drawBackground();
    drawItems();
    drawSnake();
  }

  function frame(timestamp) {
    if (!lastTick) lastTick = timestamp;
    const elapsed = timestamp - lastTick;
    lastTick = timestamp;
    if (running && !gameOver) {
      accumulator += elapsed;
      while (accumulator >= STEP_MS) {
        handleMove();
        accumulator -= STEP_MS;
        if (gameOver) break;
      }
    } else {
      accumulator = 0;
    }

    updateHud(
      gameOver ? "Game Over" : running ? "Running" : "Paused",
      boostLabel(),
      gameOver
        ? "게임 오버입니다. Restart를 눌러 다시 시작하세요."
        : running
          ? "게임이 진행 중입니다."
          : "일시정지 상태입니다. Start 또는 Pause를 눌러 진행하세요."
    );
    render();
    animationId = window.requestAnimationFrame(frame);
  }

  function bindControls() {
    startButton?.addEventListener("click", startGame);
    pauseButton?.addEventListener("click", pauseGame);
    restartButton?.addEventListener("click", restartGame);

    touchControls?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-direction]");
      if (!button) return;
      const { direction: dir } = button.dataset;
      if (dir === "up") setDirection({ x: 0, y: -1 });
      if (dir === "down") setDirection({ x: 0, y: 1 });
      if (dir === "left") setDirection({ x: -1, y: 0 });
      if (dir === "right") setDirection({ x: 1, y: 0 });
      gameCanvas.focus?.();
    });

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();

      if (key === "arrowup" || key === "w") {
        event.preventDefault();
        setDirection({ x: 0, y: -1 });
      }
      if (key === "arrowdown" || key === "s") {
        event.preventDefault();
        setDirection({ x: 0, y: 1 });
      }
      if (key === "arrowleft" || key === "a") {
        event.preventDefault();
        setDirection({ x: -1, y: 0 });
      }
      if (key === "arrowright" || key === "d") {
        event.preventDefault();
        setDirection({ x: 1, y: 0 });
      }
      if (key === " " || key === "p") {
        event.preventDefault();
        pauseGame();
      }
      if (key === "enter") {
        event.preventDefault();
        startGame();
      }
      if (key === "r") {
        event.preventDefault();
        restartGame();
      }
    });
  }

  bindControls();
  resetGame();
  animationId = window.requestAnimationFrame(frame);

  window.addEventListener("beforeunload", () => {
    window.cancelAnimationFrame(animationId);
  });
}
