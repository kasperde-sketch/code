'use strict';
// Geschosse, Explosionen, Fähigkeiten, Ausrüstung und Helfer-Objekte
(function () {
  const SL = window.SL;
  const U = SL.U;
  const T = SL.T;
  const FX = SL.FX;

  function enemies(a, b) { return a && b && a !== b && a.team !== b.team; }

  // ---------- Explosion ----------
  SL.explode = function (g, x, y, r, dmg, knock, owner, tileDmg, color) {
    g.fx.ring(x, y, r, color || '#ffd166', 0.35, 8);
    g.fx.burst(x, y, 26, '#ffb347', r * 4, 0.45, 6, { drag: 3, grow: -6 });
    g.fx.burst(x, y, 14, 'rgba(90,90,90,0.6)', r * 2, 0.9, 8, { drag: 2, grow: 10 });
    g.fx.addShake(Math.min(14, r / 7));
    for (const f of g.fighters) {
      const d = U.dist(x, y, f.cx, f.cy);
      if (d > r + 20) continue;
      const fall = 1 - d / (r + 20);
      let dx = f.cx - x, dy = f.cy - y - 20;
      const l = U.hypot(dx, dy) || 1;
      const k = knock * (0.4 + 0.6 * fall);
      if (f.state === 'dead') { f.hit({ kx: dx / l * k, ky: dy / l * k }); continue; }
      if (owner && f !== owner && f.team === owner.team) continue;
      f.hit({ dmg: dmg * fall * (f === owner ? 0.5 : 1), kx: dx / l * k, ky: dy / l * k, from: owner, kind: 'explosion', x, y, heavy: true });
    }
    for (const e of g.entities) {
      if (e.hittable && U.dist(x, y, e.x, e.y) < r + e.r) e.damage(dmg, owner);
    }
    if (tileDmg) g.world.damageCircle(x, y, r * 0.75, tileDmg, owner, g);
  };

  // ---------- Geschosse ----------
  class Projectile {
    constructor(kind, x, y, dx, dy, owner, opt) {
      const o = opt || {};
      this.kind = kind; this.x = x; this.y = y; this.owner = owner;
      this.age = 0; this.dead = false; this.deflected = null; this.stuck = false;
      let sp = 700;
      this.grav = 0; this.r = 6; this.life = 2;
      switch (kind) {
        case 'fireball': sp = 760; this.r = 7; this.life = 1.6; break;
        case 'rocket': sp = 520; this.r = 6; this.life = 3; break;
        case 'bomb': sp = 700; this.r = 7; this.life = 1.6; this.grav = 1; break;
        case 'arrow': this.power = o.power || 0.3; sp = 700 + this.power * 900; this.r = 4; this.life = 3; this.grav = 0.35; break;
        case 'bullet': sp = 950; this.r = 3; this.life = 1.2; break;
      }
      this.vx = dx * sp; this.vy = dy * sp;
      if (kind === 'bomb') { this.vy -= 140; this.vx += (o.inheritVx || 0) * 0.3; }
    }

    impact(g, f) {
      const o = this.owner;
      switch (this.kind) {
        case 'fireball':
          if (f) {
            f.hit({ dmg: 10, kx: this.vx * 0.35, ky: -150, from: o, kind: 'fire', x: this.x });
            if (f.alive && f.bubbleT <= 0) { f.burnT = 2.5; f.burnBy = o; }
          }
          SL.explode(g, this.x, this.y, 36, 4, 220, o, 22, '#ff9f43');
          break;
        case 'rocket':
          SL.explode(g, this.x, this.y, 85, 28, 820, o, 75, '#ffd166');
          break;
        case 'bomb':
          SL.explode(g, this.x, this.y, 78, 26, 760, o, 70, '#ffd166');
          break;
        case 'arrow':
          if (f) {
            const l = U.hypot(this.vx, this.vy) || 1, k = 200 + this.power * 320;
            f.hit({ dmg: 8 + this.power * 24, kx: this.vx / l * k, ky: this.vy / l * k - 80, from: o, kind: 'arrow', x: this.x });
            if (f.alive) f.slowT = 2.2;
            g.fx.burst(this.x, this.y, 8, '#bdefff', 200, 0.4, 3);
          }
          break;
        case 'bullet':
          if (f) {
            const l = U.hypot(this.vx, this.vy) || 1;
            f.hit({ dmg: 5, kx: this.vx / l * 140, ky: -60, from: o, kind: 'bullet', x: this.x });
          }
          g.fx.spark(this.x, this.y, '#ffe9a8', 4);
          break;
      }
      this.dead = true;
    }

    update(dt, g) {
      this.age += dt; this.life -= dt;
      if (this.stuck) { if (this.life <= 0) this.dead = true; return; }
      const px = this.x, py = this.y;
      if (this.kind === 'rocket') {
        const sp = U.hypot(this.vx, this.vy), ns = Math.min(1150, sp + 1400 * dt);
        this.vx *= ns / sp; this.vy *= ns / sp;
        g.fx.add(this.x, this.y, U.rand(-30, 30), U.rand(-30, 30), 0.5, 4, 'rgba(200,200,200,0.7)', { grow: 10 });
      }
      if (this.grav) this.vy += SL.G * this.grav * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.kind === 'fireball' && Math.random() < 0.8) g.fx.add(this.x, this.y, U.rand(-20, 20), U.rand(-20, 20), 0.3, U.rand(3, 6), U.pick(['#ff9f43', '#ffd166', '#ff6b35']), { grow: -10 });
      if (this.kind === 'bomb' && Math.random() < 0.5) g.fx.add(this.x, this.y - 8, 0, -30, 0.25, 2, '#ffd166');

      const w = g.world;
      if (w.solidAt(this.x, this.y)) {
        if (this.kind === 'bomb') {
          if (w.solidAt(this.x, py)) { this.vx = -this.vx * 0.45; this.x = px; }
          else { this.vy = -this.vy * 0.45; this.y = py; this.vx *= 0.8; }
          if (w.solidAt(this.x, this.y)) { this.x = px; this.y = py; }
        } else if (this.kind === 'arrow') {
          this.stuck = true; this.life = 1.2;
          w.damageTile(Math.floor(this.x / T), Math.floor(this.y / T), 6, this.owner, g);
          return;
        } else {
          this.x = px; this.y = py;
          if (this.kind === 'bullet') w.damageTile(Math.floor((px + this.vx * dt) / T), Math.floor((py + this.vy * dt) / T), 3, this.owner, g);
          this.impact(g, null);
          return;
        }
      }
      for (const f of g.fighters) {
        if (f === this.owner || f.state === 'dead' || !enemies(f, this.owner) && this.owner) continue;
        if (f.bodyNear(this.x, this.y, this.r + 3)) {
          if (this.kind === 'bomb') {
            if (this.age > 0.1) { this.vx = -this.vx * 0.4; this.vy = -Math.abs(this.vy) * 0.3; }
            continue;
          }
          this.impact(g, f);
          return;
        }
      }
      for (const e of g.entities) {
        if (e.hittable && !e.dead && enemies(e.owner, this.owner) && U.dist(this.x, this.y, e.x, e.y) < e.r + this.r) {
          e.damage(this.kind === 'bullet' ? 5 : 15, this.owner);
          if (this.kind !== 'bomb') { this.impact(g, null); return; }
        }
      }
      if (this.life <= 0) {
        if (this.kind === 'bomb' || this.kind === 'rocket' || this.kind === 'fireball') this.impact(g, null);
        else this.dead = true;
      }
      if (this.y > SL.H + 120 || this.x < -150 || this.x > SL.W + 150 || this.y < -600) this.dead = true;
    }

    draw(ctx, g) {
      const ang = Math.atan2(this.vy, this.vx);
      switch (this.kind) {
        case 'fireball': {
          const gr = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, 12);
          gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.4, '#ffb347'); gr.addColorStop(1, 'rgba(255,90,0,0)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(this.x, this.y, 12, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'rocket':
          ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(ang);
          ctx.fillStyle = '#dfe6e9'; ctx.fillRect(-10, -3.5, 16, 7);
          ctx.fillStyle = '#e17055'; ctx.beginPath(); ctx.moveTo(6, -3.5); ctx.lineTo(12, 0); ctx.lineTo(6, 3.5); ctx.fill();
          ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(-12, 0, 3 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        case 'bomb': {
          ctx.fillStyle = '#2d3436'; ctx.beginPath(); ctx.arc(this.x, this.y, 7, 0, Math.PI * 2); ctx.fill();
          const blink = this.life < 0.5 && Math.floor(this.life * 16) % 2 === 0;
          ctx.fillStyle = blink ? '#ff4757' : '#636e72';
          ctx.beginPath(); ctx.arc(this.x - 2, this.y - 2, 2.2, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'arrow':
          ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.stuck ? this.stuckAng || ang : ang);
          if (!this.stuck) this.stuckAng = ang;
          ctx.strokeStyle = '#bdefff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(2, 0); ctx.stroke();
          ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(8, 0); ctx.lineTo(2, 3); ctx.fill();
          ctx.restore();
          break;
        case 'bullet':
          ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - this.vx * 0.012, this.y - this.vy * 0.012); ctx.stroke();
          break;
      }
    }
  }
  SL.spawnProjectile = function (g, kind, x, y, dx, dy, owner, opt) {
    const p = new Projectile(kind, x, y, dx, dy, owner, opt);
    g.projectiles.push(p);
    return p;
  };

  // ---------- Blitzstab ----------
  SL.castLightning = function (g, f, w, ox, oy, dx, dy) {
    let x = ox, y = oy, hitF = null, dist = 0;
    while (dist < w.range) {
      x += dx * 8; y += dy * 8; dist += 8;
      if (g.world.solidAt(x, y)) { g.world.damageTile(Math.floor(x / T), Math.floor(y / T), 14, f, g); break; }
      for (const o of g.fighters) {
        if (o.state !== 'dead' && enemies(o, f) && o.bodyNear(x, y, 8)) { hitF = o; break; }
      }
      if (hitF) break;
    }
    g.fx.bolt(FX.jagged(ox, oy, x, y), '#fff38a', 0.18);
    g.fx.spark(x, y, '#fff38a', 8);
    let cur = hitF, dmg = w.dmg;
    const seen = new Set([f]);
    for (let n = 0; n <= w.chain && cur; n++) {
      seen.add(cur);
      cur.hit({ dmg, kx: Math.sign(cur.x - f.x) * 260, ky: -180, from: f, kind: 'lightning', x: f.x });
      let next = null, bd = 190;
      for (const o of g.fighters) {
        if (seen.has(o) || o.state === 'dead' || !enemies(o, f)) continue;
        const d = U.dist(cur.cx, cur.cy, o.cx, o.cy);
        if (d < bd) { bd = d; next = o; }
      }
      if (next) g.fx.bolt(FX.jagged(cur.cx, cur.cy, next.cx, next.cy), '#fff38a', 0.2);
      dmg *= 0.7;
      cur = next;
    }
  };

  // ---------- Gravitationskanone ----------
  SL.updateGravWell = function (g, f, dt) {
    const wl = f.gravWell;
    for (const o of g.fighters) {
      if (o === f || (o.state !== 'dead' && !enemies(o, f))) continue;
      const dx = wl.x - o.cx, dy = wl.y - o.cy, d = U.hypot(dx, dy);
      if (d > 210 || d < 1) continue;
      const s = 2800 * (1 - d / 210) * dt;
      if (o.state === 'normal') { o.vx += dx / d * s; o.vy += dy / d * s - SL.G * dt * 0.5; o.knockT = 0.1; }
      else o.skel.impulse(dx / d * s * 0.6, dy / d * s * 0.6);
    }
    for (const p of g.projectiles) {
      if (p.owner === f || p.stuck) continue;
      const dx = wl.x - p.x, dy = wl.y - p.y, d = U.hypot(dx, dy);
      if (d < 200 && d > 1) { p.vx += dx / d * 1800 * dt; p.vy += dy / d * 1800 * dt; }
    }
    if (Math.random() < 0.7) {
      const a = Math.random() * Math.PI * 2, r = U.rand(60, 120);
      g.fx.add(wl.x + Math.cos(a) * r, wl.y + Math.sin(a) * r, -Math.cos(a) * r * 3, -Math.sin(a) * r * 3, 0.3, 2.5, '#a29bfe');
    }
  };
  SL.gravBlast = function (g, f) {
    const wl = f.gravWell;
    if (!wl) return;
    const pw = Math.min(1, wl.t / 1.0);
    g.fx.ring(wl.x, wl.y, 150, '#a29bfe', 0.4, 8);
    g.fx.burst(wl.x, wl.y, 20, '#a29bfe', 500, 0.4, 4, { drag: 3 });
    g.fx.addShake(4 + pw * 4);
    for (const o of g.fighters) {
      if (o === f) continue;
      const dx = o.cx - wl.x, dy = o.cy - wl.y - 10, d = U.hypot(dx, dy) || 1;
      if (d > 150) continue;
      const k = 600 + pw * 500;
      if (o.state === 'dead') { o.hit({ kx: dx / d * k, ky: dy / d * k }); continue; }
      if (!enemies(o, f)) continue;
      o.hit({ dmg: 6 + pw * 12, kx: dx / d * k, ky: dy / d * k - 150, from: f, kind: 'gravity', x: wl.x, stun: pw > 0.4 });
    }
    g.world.damageCircle(wl.x, wl.y, 50, 20 * pw, f, g);
  };
  SL.drawGravWell = function (ctx, f) {
    const wl = f.gravWell, t = f.game.time;
    const gr = ctx.createRadialGradient(wl.x, wl.y, 2, wl.x, wl.y, 34);
    gr.addColorStop(0, 'rgba(30,20,60,0.9)'); gr.addColorStop(0.5, 'rgba(108,92,231,0.6)'); gr.addColorStop(1, 'rgba(162,155,254,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(wl.x, wl.y, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(200,195,255,0.8)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = t * 6 + i * 2.1;
      ctx.beginPath(); ctx.arc(wl.x, wl.y, 20 + i * 5, a, a + 1.4); ctx.stroke();
    }
  };

  // ---------- Bodenstampfer ----------
  SL.groundSlam = function (g, f, w) {
    const x = f.x, y = f.y;
    g.fx.ring(x, y - 6, 110, '#cfe8ff', 0.35, 6);
    g.fx.dust(x - 20, y, 8); g.fx.dust(x + 20, y, 8);
    g.fx.addShake(8);
    for (const o of g.fighters) {
      if (o === f) continue;
      const d = U.dist(x, y - 20, o.cx, o.cy);
      if (d > 115) continue;
      if (o.state === 'dead') { o.hit({ kx: Math.sign(o.cx - x) * 400, ky: -500 }); continue; }
      if (!enemies(o, f)) continue;
      o.hit({ dmg: 20, kx: Math.sign(o.cx - x) * 420, ky: -650, from: f, kind: 'melee', heavy: true, x, stun: true });
    }
    g.world.damageCircle(x, y + 16, 52, 40, f, g);
  };

  // ---------- Fähigkeiten ----------
  SL.useAbility = function (f, id) {
    const g = f.game, w = g.world;
    switch (id) {
      case 'teleport': {
        let dx = f.aimX - f.x, dy = f.aimY - (f.y - 34);
        let l = U.hypot(dx, dy);
        if (l < 1) { dx = f.facing; dy = 0; l = 1; }
        const max = Math.min(l, 260);
        for (let t = max; t >= 20; t -= 12) {
          const tx = f.x + dx / l * t, ty = f.y + dy / l * t;
          if (tx > -40 && tx < SL.W + 40 && ty < SL.H + 40 && w.boxFree(tx - 11, ty - 62, tx + 11, ty)) {
            g.fx.burst(f.cx, f.cy, 16, '#b48cff', 260, 0.4, 3);
            const ox = f.x, oy = f.y;
            f.x = tx; f.y = ty;
            for (const p of f.skel.p) { p.x += tx - ox; p.y += ty - oy; }
            f.vy = Math.min(f.vy, 0) * 0.3; f.vx *= 0.4;
            f.jumpsLeft = Math.max(f.jumpsLeft, 1);
            g.fx.burst(f.cx, f.cy, 16, '#b48cff', 260, 0.4, 3);
            g.fx.ring(f.cx, f.cy, 30, '#b48cff', 0.3, 3);
            return true;
          }
        }
        return false;
      }
      case 'wind': {
        const d = f.aimDir(), s = f.shoulder();
        const dirA = Math.atan2(d.y, d.x);
        for (const o of g.fighters) {
          if (o === f) continue;
          const vx = o.cx - s.x, vy = o.cy - s.y, dist = U.hypot(vx, vy);
          if (dist > 240 || Math.abs(U.angDiff(dirA, Math.atan2(vy, vx))) > 0.7) continue;
          if (o.state === 'dead') { o.hit({ kx: d.x * 700, ky: d.y * 700 - 200 }); continue; }
          if (!enemies(o, f)) continue;
          o.hit({ dmg: 4, kx: d.x * 820, ky: d.y * 820 - 260, from: f, kind: 'wind', x: f.x, stun: true });
        }
        for (const p of g.projectiles) {
          if (p.owner === f || p.stuck) continue;
          const vx = p.x - s.x, vy = p.y - s.y, dist = U.hypot(vx, vy);
          if (dist < 260 && Math.abs(U.angDiff(dirA, Math.atan2(vy, vx))) < 0.8) {
            const sp = Math.max(500, U.hypot(p.vx, p.vy));
            p.vx = d.x * sp; p.vy = d.y * sp; p.owner = f;
          }
        }
        for (let i = 0; i < 26; i++) {
          const a = dirA + U.rand(-0.6, 0.6), sp = U.rand(500, 900);
          g.fx.add(s.x, s.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.3, U.rand(2, 4), 'rgba(230,248,255,0.9)', { drag: 4 });
        }
        return true;
      }
      case 'earthwall': {
        const c = Math.floor((f.x + f.facing * 60) / T);
        const gy = w.groundBelow(c * T + T / 2, f.y - 40, 8);
        const base = gy != null ? gy / T - 1 : Math.floor((f.y - 1) / T);
        let placed = 0;
        for (let k = 0; k < 3; k++) {
          const r = base - k;
          const x0 = c * T, y0 = r * T;
          let blocked = false;
          for (const o of g.fighters) {
            if (o.state === 'dead') continue;
            if (o.x + 11 > x0 && o.x - 11 < x0 + T && o.y > y0 && o.y - 62 < y0 + T) blocked = true;
          }
          if (!blocked && w.addTemp(c, r, 7, 8)) { placed++; g.fx.dust(x0 + T / 2, y0 + T, 3, 'rgba(160,140,120,0.9)'); }
        }
        if (placed) g.fx.addShake(3);
        return placed > 0;
      }
      case 'bubble':
        f.bubbleT = 2.6;
        g.fx.ring(f.cx, f.cy, 46, '#9fe3ff', 0.35, 4);
        return true;
      case 'thunder': {
        const x = U.clamp(f.aimX, 0, SL.W);
        const gy = w.groundBelow(x, Math.max(0, f.aimY - 40), SL.ROWS);
        g.entities.push(new ThunderStrike(f, x, gy == null ? SL.H : gy));
        return true;
      }
      case 'spirit':
        g.entities.push(new Spirit(f));
        return true;
      case 'slowmo':
        g.slowmo = { caster: f, t: 3.2 };
        g.fx.ring(f.cx, f.cy, 300, '#ffb36b', 0.6, 5);
        return true;
      case 'invis':
        f.invisT = 4;
        g.fx.burst(f.cx, f.cy, 18, 'rgba(220,225,230,0.8)', 160, 0.6, 5, { grow: 6 });
        return true;
    }
    return false;
  };

  // ---------- Ausrüstung ----------
  SL.useExtra = function (f, id) {
    const g = f.game;
    switch (id) {
      case 'grapple':
        if (f.hook) { f.hook.dead = true; f.hook = null; return false; }
        f.hook = new Hook(f);
        g.entities.push(f.hook);
        return true;
      case 'turret':
        if (!f.grounded) return false;
        g.entities.push(new Turret(f, f.x + f.facing * 26, f.y));
        return true;
    }
    return false;
  };

  class Hook {
    constructor(f) {
      const d = f.aimDir(), h = f.skel.p[SL.P.HAND_R];
      this.owner = f; this.x = h.x; this.y = h.y; this.vx = d.x * 1600; this.vy = d.y * 1600;
      this.attached = false; this.t = 0; this.dead = false;
    }
    update(dt, g) {
      const f = this.owner;
      this.t += dt;
      if (f.state !== 'normal' || f.hook !== this) { this.dead = true; if (f.hook === this) f.hook = null; return; }
      if (this.attached) {
        if (!g.world.solidAt(this.x, this.y)) { this.dead = true; f.hook = null; }
        return;
      }
      for (let s = 0; s < 3; s++) {
        this.x += this.vx * dt / 3; this.y += this.vy * dt / 3;
        if (g.world.solidAt(this.x, this.y)) { this.attached = true; this.t = 0; g.fx.spark(this.x, this.y, '#dddddd', 5); return; }
        for (const o of g.fighters) {
          if (o.state === 'dead' || !enemies(o, f) || !o.bodyNear(this.x, this.y, 8)) continue;
          const dx = f.x - o.x, dy = f.y - o.y, l = U.hypot(dx, dy) || 1;
          o.hit({ dmg: 4, kx: dx / l * 760, ky: dy / l * 300 - 320, from: f, kind: 'hook', x: this.x, stun: true });
          this.dead = true; f.hook = null;
          return;
        }
      }
      if (U.dist(this.x, this.y, f.x, f.y - 40) > 430) { this.dead = true; f.hook = null; }
    }
    draw(ctx) {
      const h = this.owner.skel.p[SL.P.HAND_R];
      ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(this.x, this.y); ctx.stroke();
      ctx.fillStyle = '#b2bec3'; ctx.beginPath(); ctx.arc(this.x, this.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  class Turret {
    constructor(f, x, y) {
      this.owner = f; this.x = x; this.y = y - 18; this.feet = y; this.life = 12; this.hp = 40; this.r = 14;
      this.cd = 0.6; this.ang = f.facing === 1 ? 0 : Math.PI; this.hittable = true; this.dead = false; this.vy = 0;
    }
    damage(n, src) {
      if (src && src.team === this.owner.team) return;
      this.hp -= n;
      if (this.hp <= 0 && !this.dead) { this.dead = true; this.owner.game.fx.debris(this.x, this.y, '#7f8c8d'); }
    }
    update(dt, g) {
      this.life -= dt;
      if (this.life <= 0) { this.dead = true; g.fx.burst(this.x, this.y, 10, '#b2bec3', 150, 0.4, 3); return; }
      if (!g.world.solidAt(this.x, this.feet + 2)) {
        this.vy = Math.min(1200, this.vy + SL.G * dt);
        this.feet += this.vy * dt; this.y = this.feet - 18;
        const gy = g.world.groundBelow(this.x, this.feet - 2, 1);
        if (gy != null && this.feet >= gy) { this.feet = gy; this.y = gy - 18; this.vy = 0; }
        if (this.feet > SL.H + 100) this.dead = true;
      }
      let best = null, bd = 520;
      for (const o of g.fighters) {
        if (o.state === 'dead' || !enemies(o, this.owner) || o.invisT > 0) continue;
        const d = U.dist(this.x, this.y, o.cx, o.cy);
        if (d < bd && g.world.lineFree(this.x, this.y - 4, o.cx, o.cy)) { bd = d; best = o; }
      }
      if (best) {
        const ta = Math.atan2(best.cy - this.y, best.cx - this.x);
        this.ang += U.angDiff(this.ang, ta) * Math.min(1, dt * 10);
        this.cd -= dt;
        if (this.cd <= 0 && Math.abs(U.angDiff(this.ang, ta)) < 0.2) {
          this.cd = 0.45;
          SL.spawnProjectile(g, 'bullet', this.x + Math.cos(this.ang) * 18, this.y - 4 + Math.sin(this.ang) * 18, Math.cos(this.ang), Math.sin(this.ang), this.owner);
        }
      }
    }
    draw(ctx) {
      const x = this.x, y = this.y;
      ctx.strokeStyle = '#636e72'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x - 10, this.feet); ctx.moveTo(x, y + 4); ctx.lineTo(x + 10, this.feet); ctx.stroke();
      ctx.save(); ctx.translate(x, y - 4); ctx.rotate(this.ang);
      ctx.fillStyle = '#2d3436'; ctx.fillRect(4, -3, 18, 6);
      ctx.restore();
      ctx.fillStyle = this.owner.color;
      ctx.beginPath(); ctx.arc(x, y - 4, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x + Math.cos(this.ang) * 4, y - 4 + Math.sin(this.ang) * 4, 2.5, 0, Math.PI * 2); ctx.fill();
      if (this.life < 2 && Math.floor(this.life * 8) % 2) { ctx.globalAlpha = 0.4; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - 4, 10, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    }
  }

  class Spirit {
    constructor(f) {
      this.owner = f; this.x = f.cx; this.y = f.cy - 30; this.vx = 0; this.vy = -100;
      this.life = 7; this.hitCd = 0; this.dead = false;
    }
    update(dt, g) {
      this.life -= dt; this.hitCd -= dt;
      if (this.life <= 0 || this.owner.state === 'dead') { this.dead = true; g.fx.burst(this.x, this.y, 12, '#d8f3ff', 120, 0.5, 3); return; }
      let best = null, bd = 900;
      for (const o of g.fighters) {
        if (o.state === 'dead' || !enemies(o, this.owner) || o.invisT > 0) continue;
        const d = U.dist(this.x, this.y, o.cx, o.cy);
        if (d < bd) { bd = d; best = o; }
      }
      const tx = best ? best.cx : this.owner.cx, ty = best ? best.cy : this.owner.cy - 60;
      const dx = tx - this.x, dy = ty - this.y, l = U.hypot(dx, dy) || 1;
      this.vx += (dx / l * 340 - this.vx) * Math.min(1, dt * 3);
      this.vy += (dy / l * 340 - this.vy) * Math.min(1, dt * 3) + Math.sin(g.time * 6) * 20 * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (best && bd < 24 && this.hitCd <= 0) {
        this.hitCd = 0.55;
        best.hit({ dmg: 5, kx: this.vx * 0.6, ky: -150, from: this.owner, kind: 'spirit', x: this.x });
      }
      if (Math.random() < 0.6) g.fx.add(this.x, this.y, U.rand(-15, 15), U.rand(-15, 15), 0.45, 3, 'rgba(216,243,255,0.8)', { grow: -4 });
    }
    draw(ctx) {
      const gr = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, 16);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(200,240,255,0.7)'); gr.addColorStop(1, 'rgba(200,240,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(this.x, this.y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.owner.color;
      ctx.beginPath(); ctx.arc(this.x - 3, this.y - 1, 1.8, 0, Math.PI * 2); ctx.arc(this.x + 3, this.y - 1, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  class ThunderStrike {
    constructor(f, x, gy) { this.owner = f; this.x = x; this.gy = gy; this.t = 0.55; this.dead = false; }
    update(dt, g) {
      this.t -= dt;
      if (this.t > 0) return;
      this.dead = true;
      g.fx.bolt(FX.jagged(this.x + U.rand(-20, 20), -10, this.x, this.gy, 14), '#fff38a', 0.3);
      g.fx.bolt(FX.jagged(this.x, -10, this.x + U.rand(-10, 10), this.gy, 12), '#ffffff', 0.2);
      g.fx.ring(this.x, this.gy - 10, 70, '#fff38a', 0.35, 6);
      g.fx.spark(this.x, this.gy, '#fff38a', 18);
      g.fx.addShake(7);
      for (const o of g.fighters) {
        if (U.dist(this.x, this.gy - 30, o.cx, o.cy) > 62) continue;
        if (o.state === 'dead') { o.hit({ kx: 0, ky: -600 }); continue; }
        if (!enemies(o, this.owner)) continue;
        o.hit({ dmg: 30, kx: Math.sign(o.cx - this.x || 1) * 220, ky: -700, from: this.owner, kind: 'thunder', x: this.x, stun: true });
      }
      g.world.damageCircle(this.x, this.gy + 8, 40, 40, this.owner, g);
    }
    draw(ctx, g) {
      if (this.t <= 0) return;
      const a = 0.3 + 0.4 * Math.abs(Math.sin(g.time * 30));
      ctx.strokeStyle = 'rgba(255,243,138,' + a + ')';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.beginPath(); ctx.moveTo(this.x, 0); ctx.lineTo(this.x, this.gy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.ellipse(this.x, this.gy - 2, 46, 10, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
})();
