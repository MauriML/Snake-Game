export class InputManager {
  constructor() {
    // Queue holds pending direction changes. Max length = 2 to prevent
    // "buffering around corners" exploit where players queue 5 moves ahead.
    this._queue = [];
    this._MAX_BUFFER = 2;

    // Track last confirmed direction to validate new inputs
    // (prevents reversing into yourself from buffered inputs)
    this._lastDirection = { x: 0, y: 0 };

    // Touch tracking for swipe detection
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._SWIPE_THRESHOLD = 30; // min px movement to count as swipe

    this._bindEvents();
  }

  _bindEvents() {
    document.addEventListener('keydown', e => this._handleKey(e));

    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.addEventListener('touchstart', e => this._handleTouchStart(e), { passive: false });
      canvas.addEventListener('touchend',   e => this._handleTouchEnd(e),   { passive: true });
    }

    // Fallback: listen on document too but WITHOUT preventDefault
    document.addEventListener('touchstart', e => {
      this._touchStartX = e.touches[0].clientX;
      this._touchStartY = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', e => this._handleTouchEnd(e), { passive: true });

    document.querySelectorAll('.controls i').forEach(btn => {
      btn.addEventListener('click', () => {
        this._handleKey({ key: btn.dataset.key });
      });
    });
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

    // Prevent page scrolling with arrow keys during gameplay
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }

    this._enqueue(dir);
  }

  _handleTouchStart(e) {
    this._touchStartX = e.touches[0].clientX;
    this._touchStartY = e.touches[0].clientY;
    e.preventDefault(); // kill 300ms tap delay
  }

  _handleTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - this._touchStartX;
    const dy = e.changedTouches[0].clientY - this._touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < this._SWIPE_THRESHOLD) return;

    const dir = absDx > absDy
      ? (dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 })
      : (dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });

    this._enqueue(dir);
  }

  _enqueue(dir) {
    // Check against the LAST item in the buffer (not current velocity)
    // so that a RIGHT → DOWN sequence doesn't get filtered out
    const lastQueued = this._queue[this._queue.length - 1] || this._lastDirection;

    // Reject 180° reversal — you can't go right if heading left, etc.
    if (dir.x !== 0 && dir.x === -lastQueued.x) return;
    if (dir.y !== 0 && dir.y === -lastQueued.y) return;

    // Reject duplicate consecutive inputs (holding a key floods events)
    if (dir.x === lastQueued.x && dir.y === lastQueued.y) return;

    // Enforce buffer cap
    if (this._queue.length >= this._MAX_BUFFER) return;

    this._queue.push(dir);
  }

  // Called by Game.js once per tick to consume the next buffered direction.
  // Returns the direction object or null if nothing is queued.
  consume() {
    if (this._queue.length === 0) return null;
    const dir = this._queue.shift();
    this._lastDirection = dir;
    return dir;
  }

  // Called by Game.js when a new game starts to reset state
  reset() {
    this._queue = [];
    this._lastDirection = { x: 0, y: 0 };
  }
}