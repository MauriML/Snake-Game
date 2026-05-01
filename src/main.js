// main.js — Composition root
// This is the ONLY file that knows about all the other modules.
// It wires them together and sets up cross-module communication.
//
// Dependency graph (no circular dependencies):
//   config ← Game, Renderer, ParticleSystem, SkinManager, InputManager, UIManager
//   InputManager ← Game
//   SkinManager  ← Game, UIManager
//   Game         ← Renderer, UIManager
//   ParticleSystem ← Renderer, main.js (event bridge)

import { CONFIG } from './config.js';
import { InputManager } from './InputManager.js';
import { SkinManager } from './SkinManager.js';
import { Game } from './Game.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Renderer } from './Renderer.js';
import { UIManager } from './UIManager.js';

// ─── BOOTSTRAP ─────────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');

const inputManager   = new InputManager();
const skinManager    = new SkinManager();
const game           = new Game(inputManager, skinManager);
const particleSystem = new ParticleSystem(canvas, canvas.getContext('2d'));
const renderer       = new Renderer(canvas, game, particleSystem, skinManager);
const ui             = new UIManager(game, skinManager);

// ─── CROSS-MODULE EVENT BRIDGES ────────────────────────────────────────────
// Game emits domain events; here we connect them to visual effects.
// This keeps Game.js and ParticleSystem.js decoupled from each other.

game.addEventListener('foodEaten', e => {
  // Convert grid position to canvas pixels for particle spawn point
  const { x, y } = e.detail.foodPos;
  const px = renderer.gridToPixel(x, y);
  const skin = e.detail.skin;
  particleSystem.spawnFoodParticles(px.x, px.y, skin.particle);
});

game.addEventListener('gameOver', () => {
  particleSystem.triggerScreenShake();
});

// ─── DEV HELPERS (remove in production) ────────────────────────────────────
// Expose game to browser console for debugging:
//   game.start(), game.pause(), etc.
if (import.meta.env?.DEV || location.hostname === 'localhost') {
  window._game = game;
  window._skins = skinManager;
  console.log('[Snake] Dev mode — window._game and window._skins exposed');
}