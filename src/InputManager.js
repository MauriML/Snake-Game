// InputManager.js — All input handling lives here, Game.js never touches events
//
// WHY AN INPUT BUFFER?
// Your original code applied direction changes immediately to velocityX/Y.
// Problem: if the player presses RIGHT then DOWN between two game ticks,
// only DOWN registers. The RIGHT input is silently lost.
// A buffer stores a queue of intended directions; the game consumes one
// per tick — so no input is ever dropped, even from fast players.

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
    // Keyboard — keydown fires repeatedly when held; keyup was your original
    // choice but keydown feels more responsive for games
    document.addEventListener('keydown', e => this._handleKey(e));

    // Touch events for mobile swipe support
    // { passive: true } tells browser we won't call preventDefault on touchmove
    // which allows smooth scrolling on non-game areas, but we DO preventDefault
    // on touchstart to stop the 300ms tap delay
    document.addEventListener('touchstart', e => this._handleTouchStart(e), { passive: false });
    document.addEventListener('touchend', e => this._handleTouchEnd(e), { passive: true });

    // On-screen arrow buttons (your existing .controls buttons)
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

    // Only register if swipe was long enough
    if (Math.max(absDx, absDy) < this._SWIPE_THRESHOLD) return;

    // Determine dominant axis — prevents diagonal confusion
    const dir = absDx > absDy
      ? (dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 })  // horizontal swipe
      : (dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 }); // vertical swipe

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