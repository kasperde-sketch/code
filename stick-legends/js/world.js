'use strict';
// Level: Kacheln, Zerstörung, herabfallende Teile, Hintergrund
(function () {
  const SL = window.SL;
  const U = SL.U;
  const T = SL.T, COLS = SL.COLS, ROWS = SL.ROWS;

  const TILES = SL.TILES = {
    1: { destr: false, color: '#8b5a3c' }, // Erde
    2: { destr: false, color: '#9aa3ad' }, // Stein
    3: { destr: true, hp: 60, color: '#c58b4e' }, // Holz
    4: { destr: true, hp: 40, color: '#d29b5a' }, // Kiste
    5: { destr: true, hp: 25, color: '#5fb84a' }, // Blätter
    6: { destr: true, hp: 110, color: '#8a5a35' }, // Baumstamm
    7: { destr: true, hp: 50, color: '#8d7b68' }, // Erdwall (temporär)
  };
  const CH = { '#': 1, S: 2, W: 3, C: 4, L: 5, B: 6, E: 7 };

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  class World {
    constructor(map) {
      this.map = map;
      this.grid = new Uint8Array(COLS * ROWS);
      this.hp = new Float32Array(COLS * ROWS);
      this.life = new Float32Array(COLS * ROWS);
      this.chunks = [];
      this.needAnchor = false;
      this.anchorCause = null;
      this.dirty = true;
      const self = this;
      map.build({
        rect(ch, c0, r0, c1, r1) {
          for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) self.set(c, r, CH[ch]);
        },
        clear(c0, r0, c1, r1) {
          for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) self.set(c, r, 0);
        },
        ground(heights) {
          heights.forEach((h, c) => { if (h != null) for (let r = h; r < ROWS; r++) self.set(c, r, 1); });
        },
        // Baum mit Stamm und runder Krone, steht auf der Oberkante "top"
        tree(c, top, size) {
          const trunkTop = top - 5;
          for (let r = trunkTop; r < top; r++) self.set(c, r, 6);
          const cr = trunkTop - 1;
          for (let r = cr - size + 1; r <= cr; r++) {
            const half = r === cr - size + 1 ? size - 2 : size - 1 + (r === cr ? 0 : 1);
            for (let k = -half; k <= half; k++) self.set(c + k, r, 5);
          }
        },
      });
      this.spawns = map.spawns ? map.spawns.map(([c, r]) => this.dropPoint(c, r)) : this.autoSpawns();
      this.tileCanvas = canvas(SL.W, SL.H);
    }

    inB(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }
    get(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS ? this.grid[r * COLS + c] : 0; }
    set(c, r, t) {
      if (!this.inB(c, r)) return;
      const i = r * COLS + c;
      this.grid[i] = t;
      this.hp[i] = t && TILES[t].hp ? TILES[t].hp : 0;
      this.life[i] = 0;
      this.dirty = true;
    }
    solidAt(x, y) { return this.get(Math.floor(x / T), Math.floor(y / T)) > 0; }
    boxFree(l, t, r, b) {
      const c0 = Math.floor(l / T), c1 = Math.floor((r - 0.01) / T), r0 = Math.floor(t / T), r1 = Math.floor((b - 0.01) / T);
      for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) if (this.get(cc, rr)) return false;
      return true;
    }
    // Startpunkte gleichmäßig über begehbare Spalten verteilen
    autoSpawns() {
      const cols = [];
      for (let c = 1; c < COLS - 1; c++) {
        for (let r = 2; r < ROWS; r++) {
          if (this.get(c, r)) { if (!this.get(c, r - 1) && !this.get(c, r - 2) && !this.get(c - 1, r - 1) && !this.get(c + 1, r - 1)) cols.push({ x: c * T + T / 2, y: r * T }); break; }
        }
      }
      const out = [];
      for (let i = 0; i < 8; i++) out.push(cols[Math.round((i + 0.5) / 8 * (cols.length - 1))]);
      return out;
    }
    dropPoint(c, r) {
      for (let rr = r; rr < ROWS; rr++) if (this.get(c, rr)) return { x: c * T + T / 2, y: rr * T };
      return { x: c * T + T / 2, y: r * T + T };
    }
    // Erster fester Boden unter einem Punkt (oder null)
    groundBelow(x, y, maxRows) {
      const c = Math.floor(x / T);
      const r0 = Math.max(0, Math.floor(y / T));
      for (let r = r0; r < Math.min(ROWS, r0 + maxRows); r++) if (this.get(c, r)) return r * T;
      return null;
    }
    // Sichtlinie zwischen zwei Punkten frei?
    lineFree(ax, ay, bx, by) {
      const d = U.dist(ax, ay, bx, by), n = Math.ceil(d / 12);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        if (this.solidAt(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
      }
      return true;
    }

    damageTile(c, r, amt, cause, game) {
      const t = this.get(c, r);
      if (!t || !TILES[t].destr) return false;
      const i = r * COLS + c;
      this.hp[i] -= amt;
      this.dirty = true;
      if (this.hp[i] <= 0) {
        this.grid[i] = 0;
        this.hp[i] = 0;
        this.life[i] = 0;
        if (game) game.fx.debris(c * T + T / 2, r * T + T / 2, TILES[t].color);
        this.needAnchor = true;
        if (cause) this.anchorCause = cause;
      }
      return true;
    }

    damageCircle(x, y, rad, amt, cause, game) {
      const c0 = Math.floor((x - rad) / T), c1 = Math.floor((x + rad) / T);
      const r0 = Math.floor((y - rad) / T), r1 = Math.floor((y + rad) / T);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const d = U.dist(x, y, c * T + T / 2, r * T + T / 2);
          if (d < rad + T * 0.5) this.damageTile(c, r, amt * (1 - 0.6 * U.clamp(d / rad, 0, 1)), cause, game);
        }
      }
    }

    addTemp(c, r, type, life) {
      if (!this.inB(c, r) || this.get(c, r)) return false;
      this.set(c, r, type);
      this.life[r * COLS + c] = life;
      return true;
    }

    update(dt, game) {
      for (let i = 0; i < this.grid.length; i++) {
        if (this.life[i] > 0) {
          this.life[i] -= dt;
          if (this.life[i] <= 0 && this.grid[i]) {
            const c = i % COLS, r = (i / COLS) | 0;
            if (game) game.fx.debris(c * T + T / 2, r * T + T / 2, TILES[this.grid[i]].color);
            this.grid[i] = 0;
            this.life[i] = 0;
            this.dirty = true;
            this.needAnchor = true;
          }
        }
      }
      if (this.needAnchor) {
        this.needAnchor = false;
        this.checkAnchors();
      }
      this.updateChunks(dt, game);
    }

    // Zerstörbare Teile ohne Verbindung zu festem Gelände fallen herunter
    checkAnchors() {
      const N = COLS * ROWS;
      const seen = new Uint8Array(N);
      const q = [];
      for (let i = 0; i < N; i++) {
        const t = this.grid[i];
        if (t && !TILES[t].destr) { seen[i] = 1; q.push(i); }
      }
      const nb = (i, fn) => {
        const c = i % COLS, r = (i / COLS) | 0;
        if (c > 0) fn(i - 1);
        if (c < COLS - 1) fn(i + 1);
        if (r > 0) fn(i - COLS);
        if (r < ROWS - 1) fn(i + COLS);
      };
      while (q.length) {
        const i = q.pop();
        nb(i, (j) => { if (!seen[j] && this.grid[j]) { seen[j] = 1; q.push(j); } });
      }
      for (let i = 0; i < N; i++) {
        if (!this.grid[i] || seen[i]) continue;
        const comp = [];
        const st = [i];
        seen[i] = 1;
        while (st.length) {
          const k = st.pop();
          comp.push(k);
          nb(k, (j) => { if (!seen[j] && this.grid[j]) { seen[j] = 1; st.push(j); } });
        }
        let c0 = COLS, r0 = ROWS;
        for (const k of comp) { c0 = Math.min(c0, k % COLS); r0 = Math.min(r0, (k / COLS) | 0); }
        const tiles = comp.map((k) => ({ dc: (k % COLS) - c0, dr: ((k / COLS) | 0) - r0, type: this.grid[k], hp: this.hp[k], life: this.life[k] }));
        for (const k of comp) { this.grid[k] = 0; this.hp[k] = 0; this.life[k] = 0; }
        this.chunks.push({ tiles, c0, r0, oy: 0, vy: 0, cause: this.anchorCause, hitSet: new Set() });
        this.dirty = true;
      }
      this.anchorCause = null;
    }

    updateChunks(dt, game) {
      for (let n = this.chunks.length - 1; n >= 0; n--) {
        const ch = this.chunks[n];
        ch.vy = Math.min(ch.vy + SL.G * dt, 1500);
        const newOy = ch.oy + ch.vy * dt;
        const k0 = Math.floor(ch.oy / T), k1 = Math.floor(newOy / T);
        let land = null;
        for (let k = k0; k <= k1 && land === null; k++) {
          for (const tl of ch.tiles) {
            const r = ch.r0 + tl.dr + k + 1;
            if (r >= 0 && this.get(ch.c0 + tl.dc, r)) { land = k; break; }
          }
        }
        if (land === null) {
          ch.oy = newOy;
          if (ch.r0 * T + ch.oy > SL.H + 300) this.chunks.splice(n, 1);
          continue;
        }
        for (const tl of ch.tiles) {
          const c = ch.c0 + tl.dc, r = ch.r0 + tl.dr + land;
          if (this.inB(c, r) && !this.get(c, r)) {
            const i = r * COLS + c;
            this.grid[i] = tl.type; this.hp[i] = tl.hp; this.life[i] = tl.life;
          }
        }
        if (game) {
          const bottom = (ch.r0 + land + 1) * T;
          game.fx.dust((ch.c0 + 0.5) * T, bottom, 6);
          if (ch.vy > 500) game.fx.addShake(3);
        }
        this.chunks.splice(n, 1);
        this.dirty = true;
        this.needAnchor = true;
      }
    }

    // ---------- Zeichnen ----------
    renderTiles() {
      const ctx = this.tileCanvas.getContext('2d');
      ctx.clearRect(0, 0, SL.W, SL.H);
      // Durchgänge: Blöcke, weiche Innenecken, Blätter, Deko
      for (const stage of [1, 0, 2, 3]) {
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const i = r * COLS + c, t = this.grid[i];
            const get = (dc, dr) => this.get(c + dc, r + dr);
            if (stage === 0) { if (!t) SL.Art.fillets(ctx, c, r, get); }
            else if (t) SL.Art.drawTile(ctx, t, c, r, this.hp[i], this.life[i], get, stage);
          }
        }
      }
      this.dirty = false;
    }

    drawTiles(ctx) {
      if (this.dirty) this.renderTiles();
      ctx.drawImage(this.tileCanvas, 0, 0);
      for (const ch of this.chunks) {
        const map = new Map();
        for (const tl of ch.tiles) map.set(tl.dc + ',' + tl.dr, tl.type);
        ctx.save();
        ctx.translate(0, ch.oy);
        for (let stage = 1; stage <= 2; stage++) {
          for (const tl of ch.tiles) {
            const get = (dc, dr) => map.get((tl.dc + dc) + ',' + (tl.dr + dr)) || 0;
            SL.Art.drawTile(ctx, tl.type, ch.c0 + tl.dc, ch.r0 + tl.dr, tl.hp, tl.life, get, stage);
          }
        }
        ctx.restore();
      }
    }
  }

  SL.World = World;
})();
