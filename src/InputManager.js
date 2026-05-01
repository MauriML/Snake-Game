// InputManager.js — All input handling lives here, Game.js never touches events

export class InputManager {
  constructor() {
    this._queue = [];
    this._MAX_BUFFER = 2;
    this._lastDirection = { x: 0, y: 0 };

    this._touchStartX = 0;
    this._touchStartY = 0;
    this._SWIPE_THRESHOLD = 30;

    // Canvas se asigna después via setCanvas()
    // No podemos bindear touch al document o Safari cancela los clicks de botones
    this._canvas = null;

    this._bindKeyboard();
    this._bindButtons();
  }

  // Llamado desde main.js después de crear el canvas
  // Así los eventos touch quedan SOLO sobre el área de juego
  setCanvas(canvas) {
    this._canvas = canvas;
    this._bindTouch(canvas);
  }

  // ─── KEYBOARD ──────────────────────────────────────────────────────────────

  _bindKeyboard() {
    document.addEventListener('keydown', e => this._handleKey(e));
  }

  _handleKey(e) {
    const keyToDir = {
      ArrowUp:    { x: 0,  y: -1 },
      ArrowDown:  { x: 0,  y:  1 },
      ArrowLeft:  { x: -1, y:  0 },
      ArrowRight: { x: 1,  y:  0 },
      w:          { x: 0,  y: -1 },
      s:          { x: 0,  y:  1 },
      a:          { x: -1, y:  0 },
      d:          { x: 1,  y:  0 },
    };

    const dir = keyToDir[e.key];
    if (!dir) return;

    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }

    this._enqueue(dir);
  }

  // ─── TOUCH — solo sobre el canvas ─────────────────────────────────────────
  // Clave: escuchar en canvas en vez de document evita que preventDefault()
  // cancele los clicks sobre el botón START en Safari iOS

  _bindTouch(canvas) {
    canvas.addEventListener('touchstart', e => {
      this._touchStartX = e.touches[0].clientX;
      this._touchStartY = e.touches[0].clientY;
      e.preventDefault(); // seguro acá — solo cancela scroll sobre el canvas
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - this._touchStartX;
      const dy = e.changedTouches[0].clientY - this._touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) < this._SWIPE_THRESHOLD) return;

      const dir = absDx > absDy
        ? (dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 })
        : (dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });

      this._enqueue(dir);
    }, { passive: true });
  }

  // ─── BOTONES MOBILE ────────────────────────────────────────────────────────

  _bindButtons() {
    document.querySelectorAll('.controls i').forEach(btn => {
      btn.addEventListener('click', () => {
        this._handleKey({ key: btn.dataset.key });
      });
    });
  }

  // ─── BUFFER ────────────────────────────────────────────────────────────────

  _enqueue(dir) {
    const lastQueued = this._queue[this._queue.length - 1] || this._lastDirection;

    if (dir.x !== 0 && dir.x === -lastQueued.x) return;
    if (dir.y !== 0 && dir.y === -lastQueued.y) return;
    if (dir.x === lastQueued.x && dir.y === lastQueued.y) return;
    if (this._queue.length >= this._MAX_BUFFER) return;

    this._queue.push(dir);
  }

  consume() {
    if (this._queue.length === 0) return null;
    const dir = this._queue.shift();
    this._lastDirection = dir;
    return dir;
  }

  reset() {
    this._queue = [];
    this._lastDirection = { x: 0, y: 0 };
  }
}