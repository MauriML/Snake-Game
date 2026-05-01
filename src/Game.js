// Game.js — Pure game logic. No DOM, no Canvas, no events.
// This class only knows about game rules and state.
// It emits events that other systems (Renderer, ParticleSystem) subscribe to.
//
// STATE MACHINE:
//   idle → playing → paused → gameOver → idle (new game)

import { CONFIG } from './config.js';

export class Game extends EventTarget {
  constructor(inputManager, skinManager) {
    super(); // EventTarget gives us dispatchEvent / addEventListener
    this._input = inputManager;
    this._skins = skinManager;

    // Game loop timing — using requestAnimationFrame + manual delta accumulation
    // This replaces setInterval and gives us frame-rate-independent speed control
    this._rafId = null;
    this._lastTickTime = 0;
    this._tickInterval = CONFIG.BASE_INTERVAL;

    this._state = 'idle';
    this._score = 0;
    this._highScore = parseInt(localStorage.getItem('snake-high-score')) || 0;

    this._snake = [];     // Array of {x, y} grid positions, head = [0]
    this._food = { x: 0, y: 0 };
    this._velocity = { x: 0, y: 0 };
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  get score() { return this._score; }
  get highScore() { return this._highScore; }
  get snake() { return this._snake; }
  get food() { return this._food; }
  get velocity() { return this._velocity; }
  get state() { return this._state; }
  get tickInterval() { return this._tickInterval; }

  start() {
    this._reset();
    this._state = 'playing';
    this._lastTickTime = performance.now();
    this._loop(performance.now());
    this._emit('stateChange', { state: 'playing' });
  }

  pause() {
    if (this._state !== 'playing') return;
    this._state = 'paused';
    cancelAnimationFrame(this._rafId);
    this._emit('stateChange', { state: 'paused' });
  }

  resume() {
    if (this._state !== 'paused') return;
    this._state = 'playing';
    this._lastTickTime = performance.now();
    this._loop(performance.now());
    this._emit('stateChange', { state: 'playing' });
  }

  stop() {
    cancelAnimationFrame(this._rafId);
  }

  // ─── GAME LOOP ─────────────────────────────────────────────────────────────

  // WHY requestAnimationFrame INSTEAD OF setInterval?
  // setInterval fires on its own schedule, independent of the display.
  // rAF syncs to the monitor's refresh rate (60/120Hz), eliminating visual
  // tearing. We manually accumulate time to fire game ticks at the right rate.
  _loop(now) {
    this._rafId = requestAnimationFrame(ts => this._loop(ts));

    const elapsed = now - this._lastTickTime;
    if (elapsed < this._tickInterval) {
      // Not time for a logic tick yet — but still emit 'frame' so Renderer
      // can update particles and screen shake at 60fps
      this._emit('frame', { now });
      return;
    }

    this._lastTickTime = now;
    this._tick(now);
  }

  _tick(now) {
    // 1. Consume buffered input
    const dir = this._input.consume();
    if (dir) {
      this._velocity = dir;
    }

    // 2. Move snake — can't move if velocity is still 0,0 (game not started)
    if (this._velocity.x === 0 && this._velocity.y === 0) {
      this._emit('frame', { now });
      return;
    }

    const newHead = {
      x: this._snake[0].x + this._velocity.x,
      y: this._snake[0].y + this._velocity.y,
    };

    // 3. Check wall collision
    if (
      newHead.x < 0 || newHead.x >= CONFIG.GRID_SIZE ||
      newHead.y < 0 || newHead.y >= CONFIG.GRID_SIZE
    ) {
      this._triggerGameOver(now);
      return;
    }

    // 4. Check self collision (skip tail since it will move away this tick)
    for (let i = 0; i < this._snake.length - 1; i++) {
      if (this._snake[i].x === newHead.x && this._snake[i].y === newHead.y) {
        this._triggerGameOver(now);
        return;
      }
    }

    // 5. Check food collision
    const ateFood = newHead.x === this._food.x && newHead.y === this._food.y;

    if (ateFood) {
      this._score += CONFIG.POINTS_PER_FOOD;
      this._updateHighScore();
      this._increaseSpeed();

      const newlyUnlocked = this._skins.checkUnlocks(this._score);

      // Place new food BEFORE updating snake so it can't spawn on new head
      this._placeFood();

      // Grow snake — don't pop the tail this tick
      this._snake.unshift(newHead);

      // Notify other systems
      this._emit('foodEaten', {
        score: this._score,
        highScore: this._highScore,
        foodPos: { ...this._food },       // position of old food (for particles)
        newlyUnlocked,
        skin: this._skins.activeSkin,
      });
    } else {
      // Normal move — add new head, remove tail
      this._snake.unshift(newHead);
      this._snake.pop();
    }

    this._emit('frame', { now });
  }

  // ─── PRIVATE HELPERS ───────────────────────────────────────────────────────

  _reset() {
    this._input.reset();

    const cx = Math.floor(CONFIG.GRID_SIZE / 2);
    const cy = Math.floor(CONFIG.GRID_SIZE / 2);

    // Snake starts as 3 segments facing right
    this._snake = [
      { x: cx,     y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];

    this._velocity = { x: 0, y: 0 };
    this._score = 0;
    this._tickInterval = CONFIG.BASE_INTERVAL;
    this._placeFood();
  }

  _placeFood() {
    // Keep trying until food doesn't overlap with snake body
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * CONFIG.GRID_SIZE),
        y: Math.floor(Math.random() * CONFIG.GRID_SIZE),
      };
    } while (this._snake.some(seg => seg.x === pos.x && seg.y === pos.y));
    this._food = pos;
  }

  _increaseSpeed() {
    // Each food reduces the tick interval (speeds up the game)
    // Math.max ensures we never go below the cap
    this._tickInterval = Math.max(
      CONFIG.MIN_INTERVAL,
      this._tickInterval - CONFIG.SPEED_INCREMENT
    );
  }

  _updateHighScore() {
    if (this._score > this._highScore) {
      this._highScore = this._score;
      localStorage.setItem('snake-high-score', this._highScore);
    }
  }

  _triggerGameOver(now) {
    this._state = 'gameOver';
    cancelAnimationFrame(this._rafId);
    this._emit('gameOver', {
      score: this._score,
      highScore: this._highScore,
      now,
    });
  }

  _emit(eventName, detail = {}) {
    this.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
}