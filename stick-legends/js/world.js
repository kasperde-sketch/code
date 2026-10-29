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
  const FLOWER = ['#ff7eb6', '#ffe066', '#ffffff', '#b48cff', '#ff9f43'];

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
      });
      this.spawns = map.spawns.map(([c, r]) => this.dropPoint(c, r));
      this.clouds = [];
      for (let i = 0; i < 7; i++) this.clouds.push({ x: U.rand(-100, SL.W), y: U.rand(40, 300), s: U.rand(0.6, 1.4), v: U.rand(8, 22) });
      this.bg = canvas(SL.W, SL.H);
      this.tileCanvas = canvas(SL.W, SL.H);
      this.renderBg();
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
      for (const cl of this.clouds) {
        cl.x += cl.v * dt;
        if (cl.x > SL.W + 150) { cl.x = -200; cl.y = U.rand(40, 300); }
      }
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
    renderBg() {
      const ctx = this.bg.getContext('2d');
      const W = SL.W, H = SL.H;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#7cc8f2');
      g.addColorStop(0.6, '#bfe6fa');
      g.addColorStop(1, '#e8f7ff');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Sonne
      const sg = ctx.createRadialGradient(1340, 130, 10, 1340, 130, 160);
      sg.addColorStop(0, 'rgba(255,250,210,1)');
      sg.addColorStop(0.25, 'rgba(255,240,170,0.9)');
      sg.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(1100, -100, 500, 460);
      // Hügel
      const hill = (base, amp, freq, phase, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 16) {
          const y = base + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.fill();
      };
      hill(560, 40, 0.004, 1.2, '#cdeccb');
      hill(620, 50, 0.006, 0.3, '#b3e0ab');
      // ferne Bäume
      ctx.fillStyle = '#9fd394';
      for (let i = 0; i < 26; i++) {
        const x = U.hash(i, 3) * W, y = 600 + Math.sin(x * 0.006 + 0.3) * 50 + 10;
        const r = 10 + U.hash(i, 7) * 14;
        ctx.beginPath(); ctx.arc(x, y - r, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - 2, y - r, 4, r + 8);
      }
      hill(700, 35, 0.005, 2.1, '#98d38c');
    }

    renderTiles() {
      const ctx = this.tileCanvas.getContext('2d');
      ctx.clearRect(0, 0, SL.W, SL.H);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = this.grid[r * COLS + c];
          if (t) this.drawTile(ctx, t, c * T, r * T, c, r, this.hp[r * COLS + c], !this.get(c, r - 1), this.life[r * COLS + c]);
        }
      }
      this.dirty = false;
    }

    drawTile(ctx, t, x, y, c, r, hp, topOpen, life) {
      const h = U.hash(c, r);
      switch (t) {
        case 1: {
          ctx.fillStyle = '#8b5a3c';
          ctx.fillRect(x, y, T, T);
          ctx.fillStyle = '#7a4d33';
          for (let i = 0; i < 3; i++) ctx.fillRect(x + U.hash(c * 3 + i, r) * 26 + 2, y + U.hash(c, r * 3 + i) * 24 + 6, 4, 3);
          if (topOpen) {
            ctx.fillStyle = '#6cc24a';
            ctx.fillRect(x, y, T, 9);
            ctx.fillStyle = '#86d65f';
            ctx.fillRect(x, y, T, 3);
            ctx.fillStyle = '#5aae3c';
            for (let i = 0; i < 4; i++) {
              const bx = x + 3 + i * 8 + U.hash(c + i, r) * 3;
              ctx.beginPath(); ctx.moveTo(bx, y + 1); ctx.lineTo(bx + 2, y - 5 - U.hash(c, r + i) * 3); ctx.lineTo(bx + 4, y + 1); ctx.fill();
            }
            if (h > 0.72) {
              const fx = x + 6 + U.hash(c, r + 9) * 20;
              ctx.strokeStyle = '#4c9a34'; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx, y - 9); ctx.stroke();
              ctx.fillStyle = FLOWER[Math.floor(U.hash(r, c) * FLOWER.length)];
              ctx.beginPath(); ctx.arc(fx, y - 11, 3.5, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#fff3a0';
              ctx.beginPath(); ctx.arc(fx, y - 11, 1.4, 0, Math.PI * 2); ctx.fill();
            }
          }
          break;
        }
        case 2:
          ctx.fillStyle = '#7d8792'; ctx.fillRect(x, y, T, T);
          ctx.fillStyle = '#9aa3ad'; ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
          ctx.fillStyle = '#b4bcc5'; ctx.fillRect(x + 2, y + 2, T - 4, 4);
          if (topOpen) { ctx.fillStyle = '#7fcf5a'; ctx.fillRect(x, y, T, 4); }
          break;
        case 3:
          ctx.fillStyle = '#a8723d'; ctx.fillRect(x, y, T, T);
          ctx.fillStyle = '#c58b4e'; ctx.fillRect(x, y + 2, T, 12); ctx.fillRect(x, y + 17, T, 12);
          ctx.fillStyle = '#6e4a26';
          ctx.fillRect(x + 4, y + 6, 2, 2); ctx.fillRect(x + T - 6, y + 6, 2, 2);
          ctx.fillRect(x + 4, y + 22, 2, 2); ctx.fillRect(x + T - 6, y + 22, 2, 2);
          break;
        case 4:
          ctx.fillStyle = '#9c6b35'; ctx.fillRect(x, y, T, T);
          ctx.fillStyle = '#d29b5a'; ctx.fillRect(x + 3, y + 3, T - 6, T - 6);
          ctx.strokeStyle = '#9c6b35'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + T - 4, y + T - 4); ctx.moveTo(x + T - 4, y + 4); ctx.lineTo(x + 4, y + T - 4); ctx.stroke();
          break;
        case 5:
          ctx.fillStyle = '#4ea23c';
          ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2, T * 0.62, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#5fb84a';
          ctx.beginPath(); ctx.arc(x + T / 2 - 4, y + T / 2 - 4, T * 0.45, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#74c95c';
          ctx.beginPath(); ctx.arc(x + 9, y + 9, 5, 0, Math.PI * 2); ctx.fill();
          break;
        case 6:
          ctx.fillStyle = '#8a5a35'; ctx.fillRect(x + 4, y, T - 8, T);
          ctx.fillStyle = '#6f4527'; ctx.fillRect(x + 10, y, 3, T); ctx.fillRect(x + 19, y + 4, 2, T - 8);
          break;
        case 7: {
          const a = life > 0 && life < 1.5 ? 0.5 + 0.5 * Math.sin(life * 20) : 1;
          ctx.globalAlpha = a;
          ctx.fillStyle = '#75655a'; ctx.fillRect(x, y, T, T);
          ctx.fillStyle = '#8d7b68'; ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
          ctx.fillStyle = '#a69380'; ctx.fillRect(x + 6, y + 6, 6, 5); ctx.fillRect(x + 18, y + 16, 7, 6);
          ctx.globalAlpha = 1;
          break;
        }
      }
      const info = TILES[t];
      if (info.destr && hp < info.hp) {
        const dmg = 1 - hp / info.hp;
        ctx.strokeStyle = 'rgba(40,25,10,' + (0.35 + dmg * 0.5) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 16, y + 16);
        ctx.lineTo(x + 6, y + 6 + h * 8);
        ctx.moveTo(x + 16, y + 16);
        ctx.lineTo(x + 28, y + 10);
        if (dmg > 0.5) { ctx.moveTo(x + 16, y + 16); ctx.lineTo(x + 20, y + 29); ctx.moveTo(x + 16, y + 16); ctx.lineTo(x + 4, y + 24); }
        ctx.stroke();
      }
    }

    drawBack(ctx) {
      ctx.drawImage(this.bg, 0, 0);
      for (const cl of this.clouds) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        const s = cl.s;
        ctx.beginPath();
        ctx.arc(cl.x, cl.y, 26 * s, 0, Math.PI * 2);
        ctx.arc(cl.x + 30 * s, cl.y - 12 * s, 32 * s, 0, Math.PI * 2);
        ctx.arc(cl.x + 64 * s, cl.y, 24 * s, 0, Math.PI * 2);
        ctx.arc(cl.x + 32 * s, cl.y + 8 * s, 26 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawTiles(ctx) {
      if (this.dirty) this.renderTiles();
      ctx.drawImage(this.tileCanvas, 0, 0);
      for (const ch of this.chunks) {
        for (const tl of ch.tiles) {
          const c = ch.c0 + tl.dc, r = ch.r0 + tl.dr;
          this.drawTile(ctx, tl.type, c * T, r * T + ch.oy, c, r, tl.hp, false, tl.life);
        }
      }
    }
  }

  SL.World = World;
})();
