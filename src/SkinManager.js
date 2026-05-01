import { CONFIG } from './config.js';

export class SkinManager {
  constructor() {
    this._unlockedIds = this._loadUnlocked();
    this._activeSkinId = localStorage.getItem('snake-active-skin') || 'default';

    // Ensure active skin is actually unlocked (edge case: localStorage tamper)
    if (!this._unlockedIds.has(this._activeSkinId)) {
      this._activeSkinId = 'default';
    }
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  get activeSkin() {
    return CONFIG.SKINS.find(s => s.id === this._activeSkinId) || CONFIG.SKINS[0];
  }

  get allSkins() {
    return CONFIG.SKINS.map(skin => ({
      ...skin,
      unlocked: this._unlockedIds.has(skin.id),
      active: skin.id === this._activeSkinId,
    }));
  }

  // Called every time score changes — returns newly unlocked skin or null
  checkUnlocks(score) {
    const newlyUnlocked = [];
    for (const skin of CONFIG.SKINS) {
      if (!this._unlockedIds.has(skin.id) && score >= skin.unlockScore) {
        this._unlockedIds.add(skin.id);
        newlyUnlocked.push(skin);
      }
    }
    if (newlyUnlocked.length > 0) {
      this._saveUnlocked();
      // Auto-equip the highest-tier unlocked skin
      const highest = newlyUnlocked[newlyUnlocked.length - 1];
      this.setActive(highest.id);
    }
    return newlyUnlocked;
  }

  setActive(skinId) {
    if (this._unlockedIds.has(skinId)) {
      this._activeSkinId = skinId;
      localStorage.setItem('snake-active-skin', skinId);
    }
  }

  // ─── PRIVATE ───────────────────────────────────────────────────────────────

  _loadUnlocked() {
    try {
      const raw = localStorage.getItem('snake-unlocked-skins');
      return raw ? new Set(JSON.parse(raw)) : new Set(['default']);
    } catch {
      return new Set(['default']);
    }
  }

  _saveUnlocked() {
    localStorage.setItem('snake-unlocked-skins', JSON.stringify([...this._unlockedIds]));
  }
}