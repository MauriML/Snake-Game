import { InputManager }   from './InputManager.js';
import { SkinManager }    from './SkinManager.js';
import { Leaderboard }    from './Leaderboard.js';
import { Game }           from './Game.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Renderer }       from './Renderer.js';
import { UIManager }      from './UIManager.js';

const canvas = document.getElementById('gameCanvas');

const inputManager   = new InputManager();
const skinManager    = new SkinManager();
const leaderboard    = new Leaderboard();
const game           = new Game(inputManager, skinManager);
const particleSystem = new ParticleSystem(canvas, canvas.getContext('2d'));
const renderer       = new Renderer(canvas, game, particleSystem, skinManager);
const ui             = new UIManager(game, skinManager, leaderboard);

// Cross-module event bridges
game.addEventListener('foodEaten', e => {
  const { x, y } = e.detail.foodPos;
  const px = renderer.gridToPixel(x, y);
  particleSystem.spawnFoodParticles(px.x, px.y, e.detail.skin.particle);
});

game.addEventListener('gameOver', () => {
  particleSystem.triggerScreenShake();
});