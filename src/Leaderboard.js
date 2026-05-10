// Leaderboard.js — Global leaderboard via Supabase
// Handles saving scores and fetching the top 10.
// Falls back to localStorage if Supabase is unreachable.

const SUPABASE_URL = 'https://tbgkljfazbkjsigeqdyj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ2tsamZhemJranNpZ2VxZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjU0NzAsImV4cCI6MjA5MzUwMTQ3MH0.DiOu1t3XQYaI0jEbBQfBJHRf1GodWHypiBECItb7ESc';

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

export class Leaderboard {

  // ─── SAVE SCORE ────────────────────────────────────────────────────────────

  // Called from UIManager when game ends with a score > 0
  // Returns { success: true } or { success: false, error }
  async saveScore(name, score, skinId = 'default') {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
        method: 'POST',
        headers: {
          ...HEADERS,
          'Prefer': 'return=minimal', // don't return the inserted row (faster)
        },
        body: JSON.stringify({ name, score, skin_id: skinId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { success: true };

    } catch (err) {
      console.warn('[Leaderboard] Save failed, falling back to localStorage:', err);
      this._saveToLocalFallback(name, score);
      return { success: false, error: err.message };
    }
  }

  // ─── FETCH TOP 10 ──────────────────────────────────────────────────────────

  async getTopScores(limit = 10) {
    try {
      const url = new URL(`${SUPABASE_URL}/rest/v1/leaderboard`);
      url.searchParams.set('select', 'name,score,skin_id,created_at');
      url.searchParams.set('order', 'score.desc');
      url.searchParams.set('limit', limit);

      const res = await fetch(url, { headers: HEADERS });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      return { success: true, scores: data };

    } catch (err) {
      console.warn('[Leaderboard] Fetch failed, using localStorage fallback:', err);
      return { success: false, scores: this._getLocalFallback() };
    }
  }

  // ─── LOCALHOST FALLBACK ────────────────────────────────────────────────────
  // If Supabase is unreachable, scores are stored locally so the game
  // still shows a leaderboard (local only, not global)

  _saveToLocalFallback(name, score) {
    const scores = this._getLocalFallback();
    scores.push({ name, score, created_at: new Date().toISOString() });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('snake-local-scores', JSON.stringify(scores.slice(0, 10)));
  }

  _getLocalFallback() {
    try {
      return JSON.parse(localStorage.getItem('snake-local-scores')) || [];
    } catch {
      return [];
    }
  }
}