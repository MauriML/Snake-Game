import { CONFIG } from './config.js';

export class ParticleSystem {
  constructor(canvas, ctx) {
    this._canvas = canvas;
    this._ctx = ctx;
    this._particles = [];

    // Screen shake state
    this._shakeEndTime = 0;
    this._shakeIntensity = 0;
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  // Called when snake eats food
  // cx, cy = canvas pixel coordinates of the food cell center
  spawnFoodParticles(cx, cy, color) {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / CONFIG.PARTICLE_COUNT;
      // Add random spread so particles fan out organically
      const spread = angle + (Math.random() - 0.5) * 0.8;
      const speed = 1.5 + Math.random() * 3;

      this._particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(spread) * speed,
        vy: Math.sin(spread) * speed,
        radius: 2 + Math.random() * 3,
        color,
        alpha: 1,
        // How fast this specific particle fades — slight variation = organic feel
        decay: 0.025 + Math.random() * 0.02,
      });
    }
  }

  // Called when snake hits a wall or its own body
  triggerScreenShake(intensity = CONFIG.SHAKE_INTENSITY) {
    this._shakeEndTime = performance.now() + CONFIG.SHAKE_DURATION;
    this._shakeIntensity = intensity;
  }

  // ─── INTERNAL: called from Renderer every frame ────────────────────────────

  // Returns [offsetX, offsetY] for the current shake frame
  // Renderer applies this as a canvas transform before drawing
  getShakeOffset(now) {
    if (now >= this._shakeEndTime) return [0, 0];

    // Progress from 1 → 0 as shake timer runs out
    const progress = (this._shakeEndTime - now) / CONFIG.SHAKE_DURATION;
    // Exponential ease-out makes shake feel like real momentum, not jitter
    const magnitude = this._shakeIntensity * (progress * progress);

    return [
      (Math.random() * 2 - 1) * magnitude,
      (Math.random() * 2 - 1) * magnitude,
    ];
  }

  // Updates and draws all live particles
  // Called once per animation frame by Renderer
  update(now) {
    // Filter dead particles first (avoids drawing them one extra frame)
    this._particles = this._particles.filter(p => p.alpha > 0.01);

    this._ctx.save();
    for (const p of this._particles) {
      // Physics update
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;    // gravity — makes particles arc downward naturally
      p.vx *= 0.96;    // air resistance — slows horizontal spread over time
      p.alpha -= p.decay;
      p.radius *= 0.97; // particles shrink as they age

      // Draw
      this._ctx.globalAlpha = Math.max(0, p.alpha);
      this._ctx.fillStyle = p.color;
      this._ctx.beginPath();
      this._ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this._ctx.fill();
    }
    this._ctx.restore();
  }

  get hasActiveParticles() {
    return this._particles.length > 0;
  }
}