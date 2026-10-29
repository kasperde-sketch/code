'use strict';
// Grundkonstanten und Hilfsfunktionen
window.SL = window.SL || {};
(function () {
  const SL = window.SL;
  SL.W = 1600;
  SL.H = 896;
  SL.T = 32;
  SL.COLS = 50;
  SL.ROWS = 28;
  SL.G = 2200;
  SL.GAME_SPEED = 0.75; // ruhigeres Spieltempo (1 = schnell)

  SL.U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    hypot: (x, y) => Math.sqrt(x * x + y * y),
    dist: (ax, ay, bx, by) => Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay)),
    sign: (v) => (v < 0 ? -1 : 1),
    segDist(px, py, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay;
      const l = dx * dx + dy * dy;
      let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = ax + dx * t - px, cy = ay + dy * t - py;
      return Math.sqrt(cx * cx + cy * cy);
    },
    angDiff(a, b) {
      let d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    },
    hash(a, b) {
      let h = (a * 374761393 + b * 668265263) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    },
    rgb(col) {
      if (col[0] !== '#') return col.replace(/[^\d,]/g, '').split(',').slice(0, 3).map(Number);
      const n = parseInt(col.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    },
    shade(hex, f) {
      const c = SL.U.rgb(hex).map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
      return 'rgb(' + c.join(',') + ')';
    },
    mix(hexA, hexB, t) {
      const a = SL.U.rgb(hexA), b = SL.U.rgb(hexB);
      return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
    },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    },
    esc(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
  };
})();
