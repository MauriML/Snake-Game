import { CONFIG } from './config.js';

export class Renderer {
  constructor(canvas, game, particleSystem, skinManager) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._game = game;
    this._particles = particleSystem;
    this._skins = skinManager;

    this._setupCanvas();

    // Listen to every animation frame from Game
    game.addEventListener('frame', e => this._draw(e.detail.now));

    // Draw a frozen frame when game ends (so player sees final state)
    game.addEventListener('gameOver', e => this._draw(e.detail.now));
  }

  // ─── CANVAS SETUP ──────────────────────────────────────────────────────────

  _setupCanvas() {
    const size = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE;
    this._canvas.width = size;
    this._canvas.height = size;

    // Make canvas crisp on high-DPI (Retina) screens
    const dpr = window.devicePixelRatio || 1;
    if (dpr > 1) {
      this._canvas.width = size * dpr;
      this._canvas.height = size * dpr;
      this._canvas.style.width = size + 'px';
      this._canvas.style.height = size + 'px';
      this._ctx.scale(dpr, dpr);
    }
  }

  // ─── MAIN DRAW CALL ────────────────────────────────────────────────────────

  _draw(now) {
    const ctx = this._ctx;
    const size = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE;
    const skin = this._skins.activeSkin;

    ctx.save();

    // Apply screen shake transform
    const [sx, sy] = this._particles.getShakeOffset(now);
    ctx.translate(sx, sy);

    // Background
    ctx.fillStyle = '#0f1923';
    ctx.fillRect(0, 0, size, size);

    this._drawGrid(ctx, size);
    this._drawFood(ctx, skin, now);
    this._drawSnake(ctx, skin);

    // Particles drawn on top of everything (no shake translation — they float free)
    ctx.restore();
    this._particles.update(now);
  }

  // ─── INDIVIDUAL DRAW METHODS ───────────────────────────────────────────────

  _drawGrid(ctx, size) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;

    for (let i = 0; i <= CONFIG.GRID_SIZE; i++) {
      const pos = i * CONFIG.CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }
  }

  _drawFood(ctx, skin, now) {
    const { x, y } = this._game.food;
    const cx = x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
    const cy = y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;

    // Pulsing glow — food breathes to draw attention
    const pulse = 0.6 + 0.4 * Math.sin(now / 300);
    const radius = (CONFIG.CELL_SIZE / 2 - 2) * pulse;

    // Outer glow
    ctx.save();
    ctx.shadowColor = skin.foodGlow;
    ctx.shadowBlur = 15 * pulse;
    ctx.fillStyle = skin.food;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Specular highlight — makes food look like a glossy orb
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawSnake(ctx, skin) {
    const snake = this._game.snake;
    const cell = CONFIG.CELL_SIZE;
    const padding = 2;

    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const x = seg.x * cell + padding;
      const y = seg.y * cell + padding;
      const w = cell - padding * 2;
      const h = cell - padding * 2;

      if (i === 0) {
        // Head — brighter, slightly larger, with subtle glow
        ctx.save();
        ctx.shadowColor = skin.head;
        ctx.shadowBlur = 8;
        ctx.fillStyle = skin.head;
        this._roundRect(ctx, x - 1, y - 1, w + 2, h + 2, 4);
        ctx.fill();
        ctx.restore();

        // Eyes
        this._drawEyes(ctx, seg, this._game.velocity, cell);
      } else {
        // Body — alternating colors give a segmented look
        ctx.fillStyle = i % 2 === 0 ? skin.body : skin.bodyAlt;
        // Corner radius decreases toward the tail for a tapered look
        const radius = Math.max(1, 4 - i * 0.05);
        this._roundRect(ctx, x, y, w, h, radius);
        ctx.fill();
      }
    }
  }

  _drawEyes(ctx, headSeg, velocity, cell) {
    // Eye positions rotate based on movement direction
    const cx = headSeg.x * cell + cell / 2;
    const cy = headSeg.y * cell + cell / 2;
    const eyeOffset = cell * 0.22;
    const eyeRadius = cell * 0.1;

    // Perpendicular to velocity for eye spread
    const perp = { x: -velocity.y, y: velocity.x };

    const positions = [
      { x: cx + perp.x * eyeOffset + velocity.x * eyeOffset * 0.5,
        y: cy + perp.y * eyeOffset + velocity.y * eyeOffset * 0.5 },
      { x: cx - perp.x * eyeOffset + velocity.x * eyeOffset * 0.5,
        y: cy - perp.y * eyeOffset + velocity.y * eyeOffset * 0.5 },
    ];

    for (const pos of positions) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(pos.x + velocity.x * 1.5, pos.y + velocity.y * 1.5, eyeRadius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── UTILITY ───────────────────────────────────────────────────────────────

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Convert grid position to canvas pixel coordinates (cell center)
  gridToPixel(gridX, gridY) {
    return {
      x: gridX * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
      y: gridY * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
    };
  }
}