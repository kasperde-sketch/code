'use strict';
// Ragdoll-Skelett (positionsbasierte Physik) und Zeichnen der Strichmännchen
(function () {
  const SL = window.SL;
  const U = SL.U;
  const T = SL.T;

  const P = SL.P = { HEAD: 0, NECK: 1, PELVIS: 2, KNEE_L: 3, FOOT_L: 4, KNEE_R: 5, FOOT_R: 6, ELBOW_L: 7, HAND_L: 8, ELBOW_R: 9, HAND_R: 10 };
  const STICKS = [[0, 1, 10], [1, 2, 20], [0, 2, 30], [2, 3, 14], [3, 4, 14], [2, 5, 14], [5, 6, 14], [1, 7, 12], [7, 8, 12], [1, 9, 12], [9, 10, 12]];
  const RAD = SL.P_RAD = [9, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3];
  // Feder [omega, Dämpfung] je Punkt – Hände und Kopf etwas wackeliger
  const SPRING = [[30, 0.62], [40, 0.85], [46, 0.95], [32, 0.72], [34, 0.78], [32, 0.72], [34, 0.78], [26, 0.6], [24, 0.55], [28, 0.62], [30, 0.62]];

  class Skeleton {
    constructor(x, y) {
      this.p = [];
      for (let i = 0; i < 11; i++) this.p.push({ x, y, vx: 0, vy: 0, ox: x, oy: y, ground: false });
    }
    snap(tg) {
      for (let i = 0; i < 11; i++) { const p = this.p[i]; p.x = tg[i].x; p.y = tg[i].y; p.vx = 0; p.vy = 0; }
    }
    follow(tg, dt) {
      for (let i = 0; i < 11; i++) {
        const p = this.p[i], s = SPRING[i], w = s[0], z = s[1];
        const ax = w * w * (tg[i].x - p.x) - 2 * z * w * p.vx;
        const ay = w * w * (tg[i].y - p.y) - 2 * z * w * p.vy;
        p.vx += ax * dt; p.vy += ay * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        // nicht zu weit vom Ziel wegschwingen
        const dx = p.x - tg[i].x, dy = p.y - tg[i].y, d = U.hypot(dx, dy);
        if (d > 18) { p.x = tg[i].x + dx / d * 18; p.y = tg[i].y + dy / d * 18; }
      }
    }
    impulse(vx, vy) {
      for (const p of this.p) { p.vx += vx * U.rand(0.8, 1.2); p.vy += vy * U.rand(0.8, 1.2); }
    }
    ragdoll(dt, world, pin) {
      if (dt <= 0) return;
      const g = SL.G;
      for (const p of this.p) {
        p.ox = p.x; p.oy = p.y;
        p.vy += g * dt;
        const sp = U.hypot(p.vx, p.vy);
        if (sp > 2200) { p.vx *= 2200 / sp; p.vy *= 2200 / sp; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.ground = false;
      }
      for (let it = 0; it < 6; it++) {
        for (const s of STICKS) {
          const a = this.p[s[0]], b = this.p[s[1]];
          const dx = b.x - a.x, dy = b.y - a.y, d = U.hypot(dx, dy) || 0.001;
          const diff = (d - s[2]) / d * 0.5;
          a.x += dx * diff; a.y += dy * diff;
          b.x -= dx * diff; b.y -= dy * diff;
        }
        if (pin) { const n = this.p[P.NECK]; n.x = pin.x; n.y = pin.y; }
        for (let i = 0; i < 11; i++) this.collide(this.p[i], RAD[i], world);
      }
      for (const p of this.p) {
        p.vx = (p.x - p.ox) / dt; p.vy = (p.y - p.oy) / dt;
        if (p.ground) p.vx *= 0.8;
      }
    }
    collide(p, r, world) {
      const c0 = Math.floor((p.x - r) / T), c1 = Math.floor((p.x + r) / T);
      const r0 = Math.floor((p.y - r) / T), r1 = Math.floor((p.y + r) / T);
      for (let rr = r0; rr <= r1; rr++) {
        for (let cc = c0; cc <= c1; cc++) {
          if (!world.get(cc, rr)) continue;
          const lx = cc * T, ty = rr * T;
          const nx = U.clamp(p.x, lx, lx + T), ny = U.clamp(p.y, ty, ty + T);
          const dx = p.x - nx, dy = p.y - ny, d2 = dx * dx + dy * dy;
          if (d2 > 0) {
            if (d2 < r * r) {
              const d = Math.sqrt(d2);
              p.x += dx / d * (r - d); p.y += dy / d * (r - d);
              if (dy < 0 && -dy > Math.abs(dx) * 0.5) p.ground = true;
            }
          } else {
            const opts = [
              [p.x - lx, -1, 0, !world.get(cc - 1, rr)],
              [lx + T - p.x, 1, 0, !world.get(cc + 1, rr)],
              [p.y - ty, 0, -1, !world.get(cc, rr - 1)],
              [ty + T - p.y, 0, 1, !world.get(cc, rr + 1)],
            ];
            let best = null;
            for (const o of opts) if (o[3] && (!best || o[0] < best[0])) best = o;
            if (!best) best = opts[2];
            p.x += best[1] * (best[0] + r); p.y += best[2] * (best[0] + r);
            if (best[2] < 0) p.ground = true;
          }
        }
      }
    }
    // Abstand eines Punktes zum Körper
    distTo(x, y) {
      let m = 1e9;
      for (const s of STICKS) {
        if (s[0] === 0 && s[1] === 2) continue;
        const a = this.p[s[0]], b = this.p[s[1]];
        m = Math.min(m, U.segDist(x, y, a.x, a.y, b.x, b.y) - 3);
      }
      const h = this.p[P.HEAD];
      m = Math.min(m, U.dist(x, y, h.x, h.y) - RAD[0]);
      return m;
    }
    distToSeg(ax, ay, bx, by) {
      let m = 1e9;
      for (let i = 0; i < 11; i++) {
        const p = this.p[i];
        m = Math.min(m, U.segDist(p.x, p.y, ax, ay, bx, by) - RAD[i]);
      }
      return m;
    }
  }
  SL.Skeleton = Skeleton;

  // ---------- Waffen zeichnen (entlang +x ab der Hand) ----------
  SL.drawWeapon = function (ctx, id, x, y, ang, s, o) {
    if (!id || id === 'fists') return;
    const opt = o || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(s, s);
    ctx.lineCap = 'round';
    switch (id) {
      case 'sword':
        ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(2, 0); ctx.stroke();
        ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(2, 6); ctx.stroke();
        ctx.fillStyle = '#dfe6ee';
        ctx.beginPath(); ctx.moveTo(3, -3); ctx.lineTo(30, -2.5); ctx.lineTo(36, 0); ctx.lineTo(30, 2.5); ctx.lineTo(3, 3); ctx.fill();
        ctx.strokeStyle = '#aab4c0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(31, 0); ctx.stroke();
        break;
      case 'spear':
        ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(50, 0); ctx.stroke();
        ctx.fillStyle = '#cfd8e3'; ctx.beginPath(); ctx.moveTo(48, -5); ctx.lineTo(64, 0); ctx.lineTo(48, 5); ctx.fill();
        ctx.fillStyle = '#e74c3c'; ctx.fillRect(44, -3, 3, 6);
        break;
      case 'hammer':
        ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(30, 0); ctx.stroke();
        ctx.fillStyle = '#6f7b88'; ctx.fillRect(24, -11, 16, 22);
        ctx.fillStyle = '#8d99a6'; ctx.fillRect(26, -11, 12, 5);
        ctx.fillStyle = '#f1c40f'; ctx.fillRect(30, -11, 3, 22);
        ctx.fillStyle = 'rgba(120,200,255,0.5)'; ctx.fillRect(40, -9, 2, 18);
        break;
      case 'firestaff':
      case 'lightstaff': {
        const fire = id === 'firestaff';
        ctx.strokeStyle = fire ? '#7a4a24' : '#3d3d5c'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(34, 0); ctx.stroke();
        ctx.strokeStyle = fire ? '#c0392b' : '#f1c40f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(32, -5); ctx.lineTo(36, 0); ctx.lineTo(32, 5); ctx.stroke();
        const gr = ctx.createRadialGradient(40, 0, 1, 40, 0, 12);
        gr.addColorStop(0, '#ffffff');
        gr.addColorStop(0.4, fire ? '#ffb347' : '#fff38a');
        gr.addColorStop(1, fire ? 'rgba(255,90,0,0)' : 'rgba(120,180,255,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(40, 0, 12, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'frostbow': {
        const pull = opt.charge || 0;
        ctx.strokeStyle = '#7fd3ff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(-6, 0, 20, -1.1, 1.1); ctx.stroke();
        const ex = -6 + Math.cos(1.1) * 20, ey = Math.sin(1.1) * 20;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ex, -ey); ctx.lineTo(2 - pull * 16, 0); ctx.lineTo(ex, ey); ctx.stroke();
        if (pull > 0) {
          ctx.strokeStyle = '#bdefff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(2 - pull * 16, 0); ctx.lineTo(24, 0); ctx.stroke();
          ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.moveTo(24, -3); ctx.lineTo(30, 0); ctx.lineTo(24, 3); ctx.fill();
        }
        break;
      }
      case 'bombs':
        ctx.fillStyle = '#2d3436'; ctx.beginPath(); ctx.arc(5, 0, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#636e72'; ctx.beginPath(); ctx.arc(3, -2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#b2967d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(12, -10); ctx.stroke();
        ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(12, -11, 2.2, 0, Math.PI * 2); ctx.fill();
        break;
      case 'rockets':
        ctx.fillStyle = '#5b6b4e'; ctx.fillRect(-14, -5, 48, 10);
        ctx.fillStyle = '#3e4a35'; ctx.fillRect(30, -6, 6, 12); ctx.fillRect(-4, 4, 5, 7);
        ctx.fillStyle = '#e17055'; ctx.fillRect(-14, -5, 4, 10);
        break;
      case 'gravity': {
        ctx.fillStyle = '#4b4e6d'; ctx.fillRect(-6, -6, 28, 12);
        ctx.fillStyle = '#6c5ce7'; ctx.fillRect(-2, -3, 18, 6);
        const pulse = 0.6 + 0.4 * Math.sin((opt.time || 0) * 10);
        ctx.strokeStyle = 'rgba(162,155,254,' + pulse + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(26, 0, 4, 9, 0, 0, Math.PI * 2); ctx.stroke();
        break;
      }
    }
    ctx.restore();
  };

  function drawHat(ctx, hat, hx, hy, ang, facing) {
    if (!hat || hat === 'none') return;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    ctx.scale(facing, 1);
    switch (hat) {
      case 'cap':
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.arc(0, -4, 9.5, Math.PI, 0); ctx.fill();
        ctx.fillRect(2, -5, 13, 3);
        break;
      case 'tophat':
        ctx.fillStyle = '#222';
        ctx.fillRect(-12, -9, 24, 3);
        ctx.fillRect(-8, -26, 16, 18);
        ctx.fillStyle = '#c0392b'; ctx.fillRect(-8, -12, 16, 3);
        break;
      case 'wizard':
        ctx.fillStyle = '#6c3fc9';
        ctx.beginPath(); ctx.moveTo(-13, -6); ctx.lineTo(13, -6); ctx.lineTo(-4, -34); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe066';
        ctx.beginPath(); ctx.arc(-1, -17, 2.5, 0, Math.PI * 2); ctx.fill();
        break;
      case 'viking':
        ctx.fillStyle = '#95a5a6';
        ctx.beginPath(); ctx.arc(0, -3, 10.5, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#f5f0e1';
        ctx.beginPath(); ctx.moveTo(-9, -6); ctx.quadraticCurveTo(-18, -10, -16, -22); ctx.lineTo(-11, -9); ctx.fill();
        ctx.beginPath(); ctx.moveTo(9, -6); ctx.quadraticCurveTo(18, -10, 16, -22); ctx.lineTo(11, -9); ctx.fill();
        break;
      case 'crown':
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-10, -18); ctx.lineTo(-4, -12); ctx.lineTo(0, -20); ctx.lineTo(4, -12); ctx.lineTo(10, -18); ctx.lineTo(9, -6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(0, -10, 1.8, 0, Math.PI * 2); ctx.fill();
        break;
    }
    ctx.restore();
  }

  function drawFace(ctx, face, hx, hy, facing, dead) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(facing, 1);
    ctx.fillStyle = '#1e1e1e';
    ctx.strokeStyle = '#1e1e1e';
    ctx.lineWidth = 1.6;
    if (dead) {
      ctx.beginPath();
      ctx.moveTo(1, -4); ctx.lineTo(5, 0); ctx.moveTo(5, -4); ctx.lineTo(1, 0);
      ctx.moveTo(-5, -4); ctx.lineTo(-1, 0); ctx.moveTo(-1, -4); ctx.lineTo(-5, 0);
      ctx.stroke();
      ctx.restore();
      return;
    }
    switch (face) {
      case 'cool':
        ctx.fillRect(-4, -4, 11, 4);
        ctx.fillRect(-1, -4, 3, 1.5);
        break;
      case 'happy':
        ctx.beginPath(); ctx.arc(1.5, -2, 1.8, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(6, -2, 1.8, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(4, 2.5, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
        break;
      case 'angry':
        ctx.beginPath(); ctx.arc(1.5, -1.5, 1.5, 0, Math.PI * 2); ctx.arc(6, -1.5, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-0.5, -6); ctx.lineTo(3.5, -4); ctx.moveTo(8, -6); ctx.lineTo(4.5, -4); ctx.stroke();
        break;
      case 'sleepy':
        ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(3.5, -2); ctx.moveTo(4.5, -2); ctx.lineTo(8, -2); ctx.stroke();
        break;
      default:
        ctx.beginPath(); ctx.arc(1.5, -2, 1.6, 0, Math.PI * 2); ctx.arc(6, -2, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Strichmännchen zeichnen. pts = Skelettpunkte
  SL.drawStick = function (ctx, pts, o) {
    const color = o.flash ? '#ffffff' : o.color;
    const back = o.flash ? '#e8e8e8' : U.shade(o.color, 0.72);
    const f = o.facing;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const line = (a, b, c, col, w) => {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y);
      if (c != null) ctx.lineTo(pts[c].x, pts[c].y);
      ctx.stroke();
    };
    // Umhang
    if (o.cape && o.capePts) {
      const cp = o.capePts;
      ctx.fillStyle = o.cape;
      ctx.beginPath();
      ctx.moveTo(pts[P.NECK].x - 4, pts[P.NECK].y);
      for (let i = 0; i < cp.length; i++) ctx.lineTo(cp[i].x - 4 + i, cp[i].y);
      for (let i = cp.length - 1; i >= 0; i--) ctx.lineTo(cp[i].x + 4 + i * 1.6, cp[i].y);
      ctx.lineTo(pts[P.NECK].x + 4, pts[P.NECK].y);
      ctx.fill();
    }
    // Jetpack
    if (o.jetpack) {
      const n = pts[P.NECK], pv = pts[P.PELVIS];
      const mx = (n.x + pv.x) / 2 - f * 8, my = (n.y + pv.y) / 2;
      ctx.fillStyle = '#7f8c8d'; ctx.fillRect(mx - 5, my - 10, 10, 18);
      ctx.fillStyle = '#e67e22'; ctx.fillRect(mx - 5, my + 6, 10, 3);
    }
    line(P.PELVIS, P.KNEE_L, P.FOOT_L, back, 5.5);
    line(P.NECK, P.ELBOW_L, P.HAND_L, back, 5);
    line(P.NECK, P.PELVIS, null, color, 6.5);
    if (o.chest) {
      ctx.strokeStyle = 'rgba(150,160,170,0.95)'; ctx.lineWidth = 9;
      const n = pts[P.NECK], pv = pts[P.PELVIS];
      ctx.beginPath(); ctx.moveTo(n.x + (pv.x - n.x) * 0.15, n.y + (pv.y - n.y) * 0.15); ctx.lineTo(n.x + (pv.x - n.x) * 0.7, n.y + (pv.y - n.y) * 0.7); ctx.stroke();
    }
    line(P.PELVIS, P.KNEE_R, P.FOOT_R, color, 5.5);
    // Kopf
    const h = pts[P.HEAD], nk = pts[P.NECK];
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(h.x, h.y, 9, 0, Math.PI * 2); ctx.fill();
    const headAng = Math.atan2(h.y - nk.y, h.x - nk.x) + Math.PI / 2;
    if (o.helmet) {
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(headAng);
      ctx.fillStyle = '#9aa5b1';
      ctx.beginPath(); ctx.arc(0, -1, 10.5, Math.PI, 0); ctx.fill();
      ctx.fillRect(-10.5, -2, 21, 3);
      ctx.restore();
    }
    drawFace(ctx, o.face, h.x, h.y, f, o.dead);
    drawHat(ctx, o.hat, h.x, h.y, headAng, f);
    // Waffe und vorderer Arm
    if (o.weapon) {
      const hr = pts[P.HAND_R];
      SL.drawWeapon(ctx, o.weapon, hr.x, hr.y, o.weaponAng, 1, o.weaponOpt);
    }
    line(P.NECK, P.ELBOW_R, P.HAND_R, color, 5);
    ctx.restore();
  };
})();
