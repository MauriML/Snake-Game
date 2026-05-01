// config.js — Single source of truth for all game constants
// Changing a value here propagates everywhere. No magic numbers in logic files.

export const CONFIG = {
  // Board
  GRID_SIZE: 20,       // number of cells per row/column
  CELL_SIZE: 20,       // pixels per cell (canvas = GRID_SIZE * CELL_SIZE)

  // Speed progression
  // interval in ms between game ticks — lower = faster
  BASE_INTERVAL: 150,
  MIN_INTERVAL: 60,    // speed cap (never faster than this)
  SPEED_INCREMENT: 5,  // ms reduction per food eaten

  // Scoring
  POINTS_PER_FOOD: 10,

  // Skins — unlocked by reaching a score threshold
  SKINS: [
    {
      id: 'default',
      name: 'Classic',
      unlockScore: 0,
      head: '#4ade80',
      body: '#22c55e',
      bodyAlt: '#16a34a',   // alternating segment color for visual depth
      food: '#f43f5e',
      foodGlow: 'rgba(244, 63, 94, 0.6)',
      particle: '#4ade80',
    },
    {
      id: 'ocean',
      name: 'Ocean',
      unlockScore: 50,
      head: '#38bdf8',
      body: '#0ea5e9',
      bodyAlt: '#0284c7',
      food: '#fb923c',
      foodGlow: 'rgba(251, 146, 60, 0.6)',
      particle: '#38bdf8',
    },
    {
      id: 'fire',
      name: 'Inferno',
      unlockScore: 150,
      head: '#fb923c',
      body: '#ef4444',
      bodyAlt: '#dc2626',
      food: '#facc15',
      foodGlow: 'rgba(250, 204, 21, 0.7)',
      particle: '#fb923c',
    },
    {
      id: 'neon',
      name: 'Neon',
      unlockScore: 300,
      head: '#e879f9',
      body: '#a855f7',
      bodyAlt: '#7c3aed',
      food: '#34d399',
      foodGlow: 'rgba(52, 211, 153, 0.7)',
      particle: '#e879f9',
    },
    {
      id: 'gold',
      name: 'Legendary',
      unlockScore: 500,
      head: '#fde68a',
      body: '#fbbf24',
      bodyAlt: '#f59e0b',
      food: '#f0abfc',
      foodGlow: 'rgba(240, 171, 252, 0.7)',
      particle: '#fde68a',
    },
  ],

  // Screen shake
  SHAKE_DURATION: 400,   // ms
  SHAKE_INTENSITY: 8,    // max pixel offset

  // Particles
  PARTICLE_COUNT: 12,    // particles spawned per food eaten
  PARTICLE_LIFETIME: 600, // ms
};