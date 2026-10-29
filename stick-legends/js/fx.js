'use strict';
// Partikel und Effekte
(function () {
  const SL = window.SL;
  const U = SL.U;
  const MAX = 1400;

  class FX {
    constructor() {
      this.p = [];
      this.bolts = [];
      this.rings = [];
      this.texts = [];
      this.shake = 0;
    }

    add(x, y, vx, vy, life, size, color, opts) {
      if (this.p.length >= MAX) this.p.shift();
      const o = opts || {};
      this.p.push({ x, y, vx, vy, life, max: life, size, color, grav: o.grav || 0, drag: o.drag || 0, shape: o.shape || 'dot', grow: o.grow || 0, spin: o.spin || 0, a: Math.random() * 6 });
    }

    burst(x, y, n, color, speed, life, size, opts) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
        this.add(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.6), color, opts);
      }
    }

    debris(x, y, color) {
      for (let i = 0; i < 6; i++) {
        this.add(x + U.rand(-10, 10), y + U.rand(-10, 10), U.rand(-220, 220), U.rand(-380, -60), U.rand(0.6, 1.1), U.rand(3, 7), color, { grav: 1, shape: 'square', spin: U.rand(-8, 8) });
      }
    }

    dust(x, y, n, color) {
      for (let i = 0; i < n; i++) {
        this.add(x + U.rand(-8, 8), y, U.rand(-120, 120), U.rand(-80, -10), U.rand(0.3, 0.6), U.rand(3, 6), color || 'rgba(235,225,200,0.9)', { drag: 3, grow: 6 });
      }
    }

    spark(x, y, color, n) {
      this.burst(x, y, n || 8, color || '#fff6c8', 420, 0.25, 3, { drag: 4 });
    }

    ring(x, y, r, color, life, width) {
      this.rings.push({ x, y, r, color, life, max: life, width: width || 4 });
    }

    bolt(pts, color, life) {
      this.bolts.push({ pts, color, life, max: life });
    }

    text(x, y, str, color) {
      this.texts.push({ x, y, str, color: color || '#ffffff', life: 1.2, max: 1.2 });
    }

    addShake(v) { this.shake = Math.min(18, this.shake + v); }

    update(dt) {
      const g = SL.G;
      for (let i = this.p.length - 1; i >= 0; i--) {
        const p = this.p[i];
        p.life -= dt;
        if (p.life <= 0) { this.p.splice(i, 1); continue; }
        p.vy += g * p.grav * dt;
        if (p.drag) { const f = Math.max(0, 1 - p.drag * dt); p.vx *= f; p.vy *= f; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.size += p.grow * dt;
        p.a += p.spin * dt;
      }
      for (let i = this.rings.length - 1; i >= 0; i--) { this.rings[i].life -= dt; if (this.rings[i].life <= 0) this.rings.splice(i, 1); }
      for (let i = this.bolts.length - 1; i >= 0; i--) { this.bolts[i].life -= dt; if (this.bolts[i].life <= 0) this.bolts.splice(i, 1); }
      for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.life -= dt; t.y -= 40 * dt; if (t.life <= 0) this.texts.splice(i, 1); }
      this.shake = Math.max(0, this.shake - dt * 40);
    }

    draw(ctx) {
      for (const p of this.p) {
        const a = Math.min(1, p.life / p.max * 1.5);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.shape === 'square') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.a);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      for (const r of this.rings) {
        const t = 1 - r.life / r.max;
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.width * (1 - t) + 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r * (0.3 + 0.7 * t), 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const b of this.bolts) {
        ctx.globalAlpha = Math.min(1, b.life / b.max * 2);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        b.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px system-ui, sans-serif';
      for (const t of this.texts) {
        ctx.globalAlpha = Math.min(1, t.life / t.max * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.strokeText(t.str, t.x, t.y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Zackige Blitzlinie von A nach B
  FX.jagged = function (ax, ay, bx, by, seg) {
    const pts = [{ x: ax, y: ay }];
    const n = seg || Math.max(3, Math.floor(U.dist(ax, ay, bx, by) / 24));
    const nx = -(by - ay), ny = bx - ax, l = U.hypot(nx, ny) || 1;
    for (let i = 1; i < n; i++) {
      const t = i / n, off = U.rand(-12, 12);
      pts.push({ x: ax + (bx - ax) * t + nx / l * off, y: ay + (by - ay) * t + ny / l * off });
    }
    pts.push({ x: bx, y: by });
    return pts;
  };

  SL.FX = FX;
})();
