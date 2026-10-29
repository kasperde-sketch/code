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
  const WOUT = '#2b2420';
  function rod(ctx, x0, y0, x1, y1, w, col) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = WOUT; ctx.lineWidth = w + 3;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fs(ctx, fill, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = WOUT; ctx.lineWidth = lw || 1.6; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function wraps(ctx, x0, x1, half) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 2.5) { ctx.moveTo(x, -half); ctx.lineTo(x + 1.5, half); }
    ctx.stroke();
  }
  function orb(ctx, x, r, inner, mid, glow) {
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, 0, r * 1.9, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, -r * 0.3, 0.5, x, 0, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, inner); g.addColorStop(1, mid);
    ctx.beginPath(); ctx.arc(x, 0, r, 0, Math.PI * 2);
    fs(ctx, g, 1.6);
  }
  function blade(ctx, x0, x1, tip, w, light, dark) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x0, -w); ctx.lineTo(x1, -w * 0.8); ctx.quadraticCurveTo(tip - 3, -w * 0.5, tip, 0);
      ctx.quadraticCurveTo(tip - 3, w * 0.5, x1, w * 0.8); ctx.lineTo(x0, w); ctx.closePath();
    };
    path(); ctx.fillStyle = light; ctx.fill();
    ctx.save(); path(); ctx.clip();
    ctx.fillStyle = dark; ctx.fillRect(x0 - 1, 0.4, tip - x0 + 2, w + 1);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(x0 + 2, -w * 0.45); ctx.lineTo(x1 - 2, -w * 0.4); ctx.stroke();
    path(); fs(ctx, null, 1.6);
  }

  SL.drawWeapon = function (ctx, id, x, y, ang, s, o) {
    if (!id || id === 'fists') return;
    const opt = o || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(s, s);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    switch (id) {
      case 'sword':
        rod(ctx, -7, 0, 2, 0, 3.6, '#5a3a22');
        wraps(ctx, -6, 1, 1.8);
        ctx.beginPath(); ctx.arc(-9, 0, 2.8, 0, Math.PI * 2); fs(ctx, '#e3b440', 1.4);
        blade(ctx, 4, 30, 39, 3.4, '#eef3f8', '#c3cdd8');
        rrect(ctx, 1, -7.5, 4.5, 15, 2); fs(ctx, '#e3b440', 1.5);
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(3.25, 0, 1.4, 0, 7); ctx.fill();
        break;
      case 'spear':
        rod(ctx, -24, 0, 48, 0, 3.4, '#b37b45');
        ctx.strokeStyle = 'rgba(255,230,190,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-22, -0.8); ctx.lineTo(46, -0.8); ctx.stroke();
        rrect(ctx, -3, -2.6, 9, 5.2, 2); fs(ctx, '#4a3426', 1.2);
        wraps(ctx, -2, 5, 2.2);
        blade(ctx, 48, 58, 68, 4.6, '#eef3f8', '#c3cdd8');
        rrect(ctx, 44, -3, 5, 6, 1.5); fs(ctx, '#3f6fb5', 1.3);
        break;
      case 'hammer':
        rod(ctx, -9, 0, 26, 0, 4.4, '#8a5a33');
        wraps(ctx, -8, 2, 2.2);
        rrect(ctx, 22, -12, 21, 24, 5); fs(ctx, '#8f9cab', 1.8);
        ctx.save(); rrect(ctx, 22, -12, 21, 24, 5); ctx.clip();
        ctx.fillStyle = '#b8c3cf'; ctx.fillRect(22, -12, 21, 7);
        ctx.fillStyle = '#727f8f'; ctx.fillRect(22, 7, 21, 6);
        ctx.restore();
        rrect(ctx, 30, -12.5, 5, 25, 1.5); fs(ctx, '#e3b440', 1.4);
        ctx.strokeStyle = '#8fe0ff'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(39, -6); ctx.lineTo(37, -1); ctx.lineTo(40, 1); ctx.lineTo(38, 6); ctx.stroke();
        rrect(ctx, 22, -12, 21, 24, 5); fs(ctx, null, 1.8);
        break;
      case 'firestaff':
      case 'lightstaff': {
        const fire = id === 'firestaff';
        ctx.lineCap = 'round';
        ctx.strokeStyle = WOUT; ctx.lineWidth = 6.5;
        ctx.beginPath(); ctx.moveTo(-15, 1); ctx.bezierCurveTo(0, -2, 14, 2, 32, 0); ctx.stroke();
        ctx.strokeStyle = fire ? '#8a5530' : '#465074'; ctx.lineWidth = 3.6; ctx.stroke();
        ctx.strokeStyle = fire ? 'rgba(255,220,170,0.45)' : 'rgba(200,215,255,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-13, 0); ctx.bezierCurveTo(0, -3, 14, 1, 30, -1); ctx.stroke();
        const prong = fire ? '#c98b4c' : '#c9d3df';
        for (const sgn of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(31, sgn * 1); ctx.quadraticCurveTo(36, sgn * 10, 44, sgn * 6);
          ctx.strokeStyle = WOUT; ctx.lineWidth = 4.2; ctx.stroke();
          ctx.strokeStyle = prong; ctx.lineWidth = 2; ctx.stroke();
        }
        const pulse = 1 + 0.08 * Math.sin((opt.time || 0) * 8);
        if (fire) orb(ctx, 40, 6.5 * pulse, '#ffd166', '#ff6b1a', 'rgba(255,140,40,0.28)');
        else orb(ctx, 40, 6.5 * pulse, '#fff6a8', '#6fa8ff', 'rgba(140,190,255,0.3)');
        break;
      }
      case 'frostbow': {
        const pull = opt.charge || 0;
        const limb = () => { ctx.beginPath(); ctx.moveTo(-7, -21); ctx.quadraticCurveTo(10, -14, 7, 0); ctx.quadraticCurveTo(10, 14, -7, 21); };
        ctx.strokeStyle = '#e8f7ff'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-7, -21); ctx.lineTo(1 - pull * 16, 0); ctx.lineTo(-7, 21); ctx.stroke();
        limb(); ctx.strokeStyle = WOUT; ctx.lineWidth = 6.5; ctx.stroke();
        limb(); ctx.strokeStyle = '#6cc6f2'; ctx.lineWidth = 3.6; ctx.stroke();
        limb(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.stroke();
        rrect(ctx, 4, -4.5, 6, 9, 2); fs(ctx, '#4a3426', 1.3);
        for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(-7, sgn * 21, 2.2, 0, 7); fs(ctx, '#dff6ff', 1.2); }
        if (pull > 0) {
          rod(ctx, 1 - pull * 16, 0, 22, 0, 1.6, '#bfe9ff');
          ctx.beginPath(); ctx.moveTo(21, -3.2); ctx.lineTo(29, 0); ctx.lineTo(21, 3.2); ctx.closePath(); fs(ctx, '#e8fbff', 1.2);
        }
        break;
      }
      case 'bombs': {
        ctx.beginPath(); ctx.arc(5, 0, 7.5, 0, Math.PI * 2); fs(ctx, '#3a4047', 1.8);
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(5, 0, 4.8, 3.6, 4.6); ctx.stroke();
        ctx.save(); ctx.translate(9.5, -5.5); ctx.rotate(0.7);
        rrect(ctx, -2.5, -2, 5, 4, 1); fs(ctx, '#9aa3ad', 1.2);
        ctx.restore();
        ctx.strokeStyle = '#a58a6c'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(11, -7.5); ctx.quadraticCurveTo(14, -12, 12, -14); ctx.stroke();
        ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(12, -14.5, 2.4, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff3c0'; ctx.beginPath(); ctx.arc(12, -14.5, 1, 0, 7); ctx.fill();
        break;
      }
      case 'rockets':
        rrect(ctx, -2, 3, 6, 9, 2); fs(ctx, '#4a3426', 1.3);
        rrect(ctx, -15, -5.5, 49, 11, 4); fs(ctx, '#6f8259', 1.8);
        ctx.save(); rrect(ctx, -15, -5.5, 49, 11, 4); ctx.clip();
        ctx.fillStyle = '#8ea374'; ctx.fillRect(-15, -5.5, 49, 3.5);
        ctx.fillStyle = '#56663f'; ctx.fillRect(-15, 2.5, 49, 3);
        ctx.restore();
        rrect(ctx, -7, -6.5, 4, 13, 1.5); fs(ctx, '#e3b440', 1.2);
        rrect(ctx, 30, -7, 6, 14, 2.5); fs(ctx, '#4b5a3a', 1.5);
        rrect(ctx, 8, -10, 6, 4.5, 1.5); fs(ctx, '#3b4148', 1.2);
        break;
      case 'gravity': {
        rrect(ctx, -1, 3, 6, 9, 2); fs(ctx, '#3b3f55', 1.3);
        rrect(ctx, -8, -7, 30, 14, 6); fs(ctx, '#55597a', 1.8);
        ctx.save(); rrect(ctx, -8, -7, 30, 14, 6); ctx.clip();
        ctx.fillStyle = '#6f74a0'; ctx.fillRect(-8, -7, 30, 4);
        ctx.restore();
        const pulse = 0.65 + 0.35 * Math.sin((opt.time || 0) * 10);
        rrect(ctx, -2, -2, 18, 4, 2); ctx.fillStyle = 'rgba(180,165,255,' + pulse + ')'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(26, 0, 4.5, 10, 0, 0, Math.PI * 2);
        ctx.strokeStyle = WOUT; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = 'rgba(180,165,255,' + (0.6 + pulse * 0.4) + ')'; ctx.lineWidth = 2.6; ctx.stroke();
        break;
      }
    }
    ctx.restore();
  };

  // ---------- Rüstung: glänzendes Metall mit dicker Kontur ----------
  function metal(ctx, x0, y0, r) {
    const g = ctx.createRadialGradient(x0, y0, 0.5, x0, y0, r);
    g.addColorStop(0, '#eef1f5');
    g.addColorStop(0.35, '#a9b2bd');
    g.addColorStop(1, '#4e5661');
    return g;
  }
  function drawHelmet(ctx, hx, hy, ang, facing, accent) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    ctx.scale(facing, 1);
    const shell = () => {
      ctx.beginPath();
      ctx.arc(0, 0, 11.8, 2.4, 6.12);
      ctx.lineTo(9.5, -5);
      ctx.quadraticCurveTo(1, -7.5, -5.5, 2.5);
      ctx.quadraticCurveTo(-6.5, 6.5, -8.7, 7.9);
      ctx.closePath();
    };
    shell();
    ctx.fillStyle = metal(ctx, -3, -7, 15); ctx.fill();
    ctx.save(); shell(); ctx.clip();
    ctx.strokeStyle = accent; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.arc(0, 0, 9.6, 3.7, 5.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-1, -1, 7.2, 3.9, 4.5); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = WOUT; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    shell(); ctx.stroke();
    // Ohrschutz
    ctx.beginPath(); ctx.ellipse(-4, 3, 2.6, 3.4, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#5c6570'; ctx.fill(); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }
  function drawChest(ctx, pts, facing, accent) {
    const n = pts[P.NECK], pv = pts[P.PELVIS];
    const ang = Math.atan2(pv.y - n.y, pv.x - n.x) - Math.PI / 2;
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(ang);
    ctx.scale(facing, 1);
    const plate = () => {
      ctx.beginPath();
      ctx.moveTo(-6.5, 1.5);
      ctx.quadraticCurveTo(0, -1, 7.5, 1.5);
      ctx.quadraticCurveTo(9.5, 9, 6, 16.5);
      ctx.quadraticCurveTo(0, 19, -5, 16.5);
      ctx.quadraticCurveTo(-8, 9, -6.5, 1.5);
      ctx.closePath();
    };
    plate();
    ctx.fillStyle = metal(ctx, 3, 4, 16); ctx.fill();
    ctx.save(); plate(); ctx.clip();
    ctx.strokeStyle = 'rgba(43,36,32,0.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-8, 10); ctx.quadraticCurveTo(0, 12, 9, 10);
    ctx.moveTo(-8, 14); ctx.quadraticCurveTo(0, 16, 9, 14);
    ctx.stroke();
    ctx.fillStyle = accent; ctx.fillRect(-1.3, 0, 2.6, 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(4.5, 3.5); ctx.quadraticCurveTo(6.5, 6, 6, 8.5); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = WOUT; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    plate(); ctx.stroke();
    ctx.restore();
  }
  function drawShoulder(ctx, pts, facing) {
    const n = pts[P.NECK], e = pts[P.ELBOW_R];
    const x = n.x + (e.x - n.x) * 0.3, y = n.y + (e.y - n.y) * 0.3 - 1;
    const a = Math.atan2(e.y - n.y, e.x - n.x);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = metal(ctx, -1, -2.5, 8); ctx.fill();
    ctx.strokeStyle = WOUT; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, 3.6, 3.6, 4.6); ctx.stroke();
    ctx.restore();
  }

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
      ctx.strokeStyle = SL.Art.OUT; ctx.lineWidth = 2; ctx.stroke();
    }
    // Jetpack
    if (o.jetpack) {
      const n = pts[P.NECK], pv = pts[P.PELVIS];
      const mx = (n.x + pv.x) / 2 - f * 8, my = (n.y + pv.y) / 2;
      ctx.fillStyle = '#7f8c8d'; ctx.fillRect(mx - 5, my - 10, 10, 18);
      ctx.fillStyle = '#e67e22'; ctx.fillRect(mx - 5, my + 6, 10, 3);
    }
    // dunkle Umrisse wie gezeichnet
    const OUTC = SL.Art.OUT;
    line(P.PELVIS, P.KNEE_L, P.FOOT_L, OUTC, 5.6);
    line(P.NECK, P.ELBOW_L, P.HAND_L, OUTC, 5.2);
    line(P.NECK, P.PELVIS, null, OUTC, 6);
    line(P.PELVIS, P.KNEE_R, P.FOOT_R, OUTC, 5.6);
    line(P.NECK, P.ELBOW_R, P.HAND_R, OUTC, 5.2);
    ctx.fillStyle = OUTC;
    ctx.beginPath(); ctx.arc(pts[P.HEAD].x, pts[P.HEAD].y, 10.2, 0, Math.PI * 2); ctx.fill();
    line(P.PELVIS, P.KNEE_L, P.FOOT_L, back, 3.4);
    line(P.NECK, P.ELBOW_L, P.HAND_L, back, 3);
    line(P.NECK, P.PELVIS, null, color, 3.8);
    if (o.chest) drawChest(ctx, pts, f, o.color);
    line(P.PELVIS, P.KNEE_R, P.FOOT_R, color, 3.4);
    // Kopf
    const h = pts[P.HEAD], nk = pts[P.NECK];
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(h.x, h.y, 9, 0, Math.PI * 2); ctx.fill();
    const headAng = Math.atan2(h.y - nk.y, h.x - nk.x) + Math.PI / 2;
    drawFace(ctx, o.face, h.x, h.y, f, o.dead);
    if (o.helmet) drawHelmet(ctx, h.x, h.y, headAng, f, o.color);
    drawHat(ctx, o.hat, h.x, h.y, headAng, f);
    // Waffe und vorderer Arm
    if (o.weapon) {
      const hr = pts[P.HAND_R];
      SL.drawWeapon(ctx, o.weapon, hr.x, hr.y, o.weaponAng, 1, o.weaponOpt);
    }
    line(P.NECK, P.ELBOW_R, P.HAND_R, color, 3);
    if (o.chest) drawShoulder(ctx, pts, f);
    ctx.restore();
  };
})();
