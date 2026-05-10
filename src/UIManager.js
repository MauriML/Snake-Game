import { CONFIG } from './config.js';

export class UIManager {
  constructor(game, skinManager, leaderboard) {
    this._game = game;
    this._skins = skinManager;
    this._leaderboard = leaderboard;

    this._scoreEl        = document.querySelector('.score');
    this._highScoreEl    = document.querySelector('.high-score');
    this._overlay        = document.getElementById('game-overlay');
    this._overlayTitle   = document.getElementById('overlay-title');
    this._overlaySubtitle = document.getElementById('overlay-subtitle');
    this._startBtn       = document.getElementById('start-btn');
    this._skinPanel      = document.getElementById('skin-panel');
    this._unlockBanner   = document.getElementById('unlock-banner');
    this._speedFill      = document.getElementById('speed-fill');
    this._leaderboardEl  = document.getElementById('leaderboard');
    this._nameInput      = document.getElementById('player-name');

    this._bindGameEvents();
    this._bindUIEvents();
    this._updateHighScore(game.highScore);
    this._showStartScreen();
  }

  // ─── GAME EVENT LISTENERS ──────────────────────────────────────────────────

  _bindGameEvents() {
    this._game.addEventListener('stateChange', e => {
      const { state } = e.detail;
      if (state === 'playing') this._hideOverlay();
      if (state === 'paused') this._showPauseScreen();
    });

    this._game.addEventListener('foodEaten', e => {
      const { score, highScore, newlyUnlocked } = e.detail;
      this._updateScore(score);
      this._updateHighScore(highScore);
      this._updateSpeedBar();
      if (newlyUnlocked.length > 0) {
        this._showUnlockBanner(newlyUnlocked[newlyUnlocked.length - 1]);
        this._renderSkinPanel();
      }
    });

    this._game.addEventListener('gameOver', e => {
      this._showGameOverScreen(e.detail.score, e.detail.highScore);
    });
  }

  // ─── UI EVENT LISTENERS ────────────────────────────────────────────────────

  _bindUIEvents() {
    this._startBtn.addEventListener('click', () => {
      if (this._game.state === 'idle' || this._game.state === 'gameOver') {
        this._game.start();
      } else if (this._game.state === 'paused') {
        this._game.resume();
      }
    });

    document.addEventListener('keydown', e => {
      if (document.activeElement === this._nameInput) return;
      if (e.key === 'p' || e.key === 'P') {
        if (this._game.state === 'playing') this._game.pause();
        else if (this._game.state === 'paused') this._game.resume();
      }
      if (e.key === 'Escape' && this._game.state === 'playing') {
        this._game.pause();
      }
    });
  }

  // ─── OVERLAY SCREENS ───────────────────────────────────────────────────────

  _showStartScreen() {
    this._overlayTitle.textContent = 'SNAKE';
    this._overlaySubtitle.innerHTML = 'Use arrow keys or swipe to move<br><small>Press P to pause</small>';
    this._startBtn.textContent = 'START GAME';
    this._showNameInput(false);
    this._showOverlay();
    this._renderSkinPanel();
    this._renderLeaderboard();
  }

  async _showGameOverScreen(score, highScore) {
    const isNewRecord = score >= highScore && score > 0;
    this._overlayTitle.textContent = isNewRecord ? '🏆 NEW RECORD!' : 'GAME OVER';
    this._overlaySubtitle.innerHTML = `Score: <strong>${score}</strong> &nbsp;|&nbsp; Best: ${highScore}`;
    this._startBtn.textContent = 'PLAY AGAIN';
    this._showNameInput(score > 0);

    if (score > 0) {
      const saveBtn = document.getElementById('save-score-btn');
      const fresh = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(fresh, saveBtn);

      fresh.addEventListener('click', async () => {
        const name = (this._nameInput.value.trim() || 'Anonymous').slice(0, 20);
        fresh.textContent = 'Saving...';
        fresh.disabled = true;
        const skin = this._skins.activeSkin;
        await this._leaderboard.saveScore(name, score, skin.id);
        fresh.textContent = '✓ Saved!';
        this._renderLeaderboard();
      });
    }

    this._showOverlay();
    this._renderSkinPanel();
    this._renderLeaderboard();
  }

  _showPauseScreen() {
    this._overlayTitle.textContent = 'PAUSED';
    this._overlaySubtitle.innerHTML = 'Take a breather';
    this._startBtn.textContent = 'RESUME';
    this._showNameInput(false);
    this._showOverlay();
  }

  _showOverlay()  { this._overlay.classList.remove('hidden'); }
  _hideOverlay()  { this._overlay.classList.add('hidden'); }

  _showNameInput(visible) {
    const wrapper = document.getElementById('name-input-wrapper');
    if (wrapper) wrapper.style.display = visible ? 'flex' : 'none';
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  _updateScore(score) {
    this._scoreEl.textContent = `Score: ${score}`;
    this._scoreEl.classList.remove('score-pop');
    void this._scoreEl.offsetWidth;
    this._scoreEl.classList.add('score-pop');
  }

  _updateHighScore(hs) {
    this._highScoreEl.textContent = `Best: ${hs}`;
  }

  _updateSpeedBar() {
    if (!this._speedFill) return;
    const range = CONFIG.BASE_INTERVAL - CONFIG.MIN_INTERVAL;
    const current = this._game.tickInterval - CONFIG.MIN_INTERVAL;
    const pct = Math.round((1 - current / range) * 100);
    this._speedFill.style.width = pct + '%';
  }

  // ─── LEADERBOARD ───────────────────────────────────────────────────────────

  async _renderLeaderboard() {
    if (!this._leaderboardEl) return;
    this._leaderboardEl.innerHTML = '<div class="lb-loading">Loading scores…</div>';

    const { scores } = await this._leaderboard.getTopScores(10);

    if (!scores || scores.length === 0) {
      this._leaderboardEl.innerHTML = '<div class="lb-empty">No scores yet. Be the first!</div>';
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    this._leaderboardEl.innerHTML = `
      <table class="lb-table">
        <thead><tr><th></th><th>Player</th><th>Score</th></tr></thead>
        <tbody>
          ${scores.map((row, i) => `
            <tr class="${i < 3 ? 'lb-top' : ''}">
              <td>${medals[i] || i + 1}</td>
              <td class="lb-name">${this._escape(row.name)}</td>
              <td class="lb-score">${row.score}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ─── SKIN PANEL ────────────────────────────────────────────────────────────

  _renderSkinPanel() {
    if (!this._skinPanel) return;
    const buttons = this._skins.allSkins.map(skin => `
      <button
        class="skin-btn ${skin.active ? 'active' : ''} ${!skin.unlocked ? 'locked' : ''}"
        data-skin-id="${skin.id}"
        title="${skin.unlocked ? skin.name : `Unlock at ${skin.unlockScore} pts`}"
        ${!skin.unlocked ? 'disabled' : ''}
      >
        <span class="skin-swatch" style="background:${skin.head};box-shadow:0 0 6px ${skin.head}"></span>
        <span class="skin-label">${skin.unlocked ? skin.name : '🔒'}</span>
        ${skin.unlocked && skin.active ? '<span class="skin-active-dot"></span>' : ''}
      </button>
    `).join('');
    this._skinPanel.innerHTML = `
      <div class="skin-section-title">Skins</div>
      <div class="skins-grid">${buttons}</div>
    `;

    this._skinPanel.querySelectorAll('.skin-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        this._skins.setActive(btn.dataset.skinId);
        this._renderSkinPanel();
      });
    });
  }

  // ─── UNLOCK BANNER ─────────────────────────────────────────────────────────

  _showUnlockBanner(skin) {
    if (!this._unlockBanner) return;
    this._unlockBanner.innerHTML = `🎨 New skin unlocked: <strong>${skin.name}</strong>!`;
    this._unlockBanner.classList.add('visible');
    setTimeout(() => this._unlockBanner.classList.remove('visible'), 3000);
  }
}