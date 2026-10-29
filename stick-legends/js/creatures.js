'use strict';
// Kreaturen für die Computergegner – gemalt mit Volumen und Licht von oben rechts
(function () {
  const SL = window.SL;
  const U = SL.U;
  const P = SL.P;
  const TAU = Math.PI * 2;
  const LX = 0.55, LY = -0.83; // Lichtrichtung

  SL.SPECIES = {
    dragon: { wings: 1, tail: 'spade', body: [16, 14, 11], limb: [10, 7, 7.5, 5.5], horns: 'big', spikes: true, smoke: true },
    lizard: { wings: 0, tail: 'long', body: [10.5, 9.5, 8], limb: [7.5, 5, 6, 4.5], frill: true, stripes: true, tongue: true },
    wyvern: { wings: 1.4, tail: 'spade', body: [11, 10, 8.5], limb: [8, 5.5, 6, 4.5], horns: 'long', runes: '#7ff6ff', spikes: true },
    golem: { golem: true },
  };
  SL.SPECIES_OF_TYPE = { brawler: 'dragon', gunner: 'lizard', mage: 'wyvern', tank: 'golem' };

  function pal(col, seed) {
    const hue = U.hash(seed, 3);
    return {
      hi: U.mix(col, '#fff6d8', 0.38),
      base: col,
      mid: U.shade(col, 0.8),
      dark: U.shade(col, 0.55),
      deep: U.shade(col, 0.32),
      belly: U.mix(col, hue < 0.5 ? '#ffe9b0' : '#f3f0d0', 0.6),
      accent: U.mix(col, hue < 0.5 ? '#ffcc33' : '#ff6b9a', 0.65),
    };
  }

  // Gliedmaße: sich verjüngende Kapsel mit Licht auf einer Seite
  function limb(ctx, a, b, w0, w1, p, dark) {
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l, ny = dx / l;
    if (nx * LX + ny * LY < 0) { nx = -nx; ny = -ny; }
    // Kapsel = Trapez + zwei Kreise (einzeln gefüllt, damit keine Löcher entstehen)
    const fillCapsule = (e, style) => {
      ctx.fillStyle = style;
      ctx.beginPath();
      ctx.moveTo(a.x + nx * (w0 / 2 + e), a.y + ny * (w0 / 2 + e));
      ctx.lineTo(b.x + nx * (w1 / 2 + e), b.y + ny * (w1 / 2 + e));
      ctx.lineTo(b.x - nx * (w1 / 2 + e), b.y - ny * (w1 / 2 + e));
      ctx.lineTo(a.x - nx * (w0 / 2 + e), a.y - ny * (w0 / 2 + e));
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(a.x, a.y, w0 / 2 + e, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x, b.y, w1 / 2 + e, 0, TAU); ctx.fill();
    };
    fillCapsule(1.3, p.deep);
    const g = ctx.createLinearGradient(a.x + nx * w0 / 2, a.y + ny * w0 / 2, a.x - nx * w0 / 2, a.y - ny * w0 / 2);
    if (dark) { g.addColorStop(0, p.mid); g.addColorStop(1, p.deep); }
    else { g.addColorStop(0, p.hi); g.addColorStop(0.45, p.base); g.addColorStop(1, p.dark); }
    fillCapsule(0, g);
  }
  function ball(ctx, x, y, r, p, rim) {
    ctx.beginPath(); ctx.arc(x, y, r + 1.3, 0, TAU); ctx.fillStyle = p.deep; ctx.fill();
    const g = ctx.createRadialGradient(x + r * LX * 0.5, y + r * LY * 0.5, r * 0.1, x, y, r);
    g.addColorStop(0, p.hi); g.addColorStop(0.5, p.base); g.addColorStop(1, rim || p.dark);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
  }
  function claws(ctx, from, to, f, col, deep, n) {
    const a = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.fillStyle = col; ctx.strokeStyle = deep; ctx.lineWidth = 0.9;
    for (let i = 0; i < (n || 3); i++) {
      const aa = a + (i - 1) * 0.45;
      ctx.beginPath();
      ctx.moveTo(to.x + Math.cos(aa + 1.5) * 1.8, to.y + Math.sin(aa + 1.5) * 1.8);
      ctx.quadraticCurveTo(to.x + Math.cos(aa) * 7, to.y + Math.sin(aa) * 7, to.x + Math.cos(aa + 0.4 * f) * 7.5, to.y + Math.sin(aa + 0.4 * f) * 7.5);
      ctx.lineTo(to.x + Math.cos(aa - 1.5) * 1.8, to.y + Math.sin(aa - 1.5) * 1.8);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  // Fuß mit Zehen nach vorne
  function foot(ctx, knee, ft, f, p) {
    const toe = { x: ft.x + f * 7, y: ft.y + 1 };
    limb(ctx, ft, toe, 5, 3.5, p);
    claws(ctx, ft, { x: toe.x + f * 1, y: toe.y }, f, '#efe3c2', p.deep, 3);
  }

  // Rumpf im lokalen Körperraum: +y zum Becken, +x nach vorne
  function torso(ctx, nk, pv, f, sp, p, o) {
    const L = Math.hypot(pv.x - nk.x, pv.y - nk.y) || 20;
    const ang = Math.atan2(pv.y - nk.y, pv.x - nk.x) - Math.PI / 2;
    const [wT, wM, wB] = sp.body;
    ctx.save();
    ctx.translate(nk.x, nk.y); ctx.rotate(ang); ctx.scale(f, 1);
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-wT * 0.55, -3);
      ctx.bezierCurveTo(-wT * 0.85, L * 0.35, -wB * 0.8, L * 0.8, -wB * 0.35, L + 5);
      ctx.quadraticCurveTo(wB * 0.2, L + 8, wB * 0.62, L + 2);
      ctx.bezierCurveTo(wM * 1.0, L * 0.65, wT * 1.05, L * 0.2, wT * 0.45, -5);
      ctx.quadraticCurveTo(0, -9, -wT * 0.55, -3);
      ctx.closePath();
    };
    // Rückenstacheln
    if (sp.spikes) {
      const n = 4 + Math.floor(U.hash(o.seed, 5) * 3);
      for (let i = 0; i < n; i++) {
        const t = 0.05 + i / n * 0.85, bx = -U.lerp(wT * 0.8, wB * 0.65, t), by = L * t;
        const s = 5 + (1 - Math.abs(t - 0.35)) * 3;
        ctx.beginPath(); ctx.moveTo(bx + 1, by - 3); ctx.lineTo(bx - s, by - s * 0.4); ctx.lineTo(bx + 1, by + 3); ctx.closePath();
        ctx.fillStyle = p.accent; ctx.fill(); ctx.strokeStyle = p.deep; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    ctx.lineWidth = 2.6; ctx.strokeStyle = p.deep; path(); ctx.stroke();
    const g = ctx.createLinearGradient(wT, -6, -wB, L + 4);
    g.addColorStop(0, p.hi); g.addColorStop(0.45, p.base); g.addColorStop(1, p.dark);
    path(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); path(); ctx.clip();
    // Bauchplatten
    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.ellipse(wM * 0.55, L * 0.5, wM * 0.42, L * 0.62, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = U.shade(p.belly, 0.7); ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) { const yy = L * (0.05 + i * 0.17); ctx.beginPath(); ctx.moveTo(wM * 0.15, yy); ctx.quadraticCurveTo(wM * 0.55, yy + 2.5, wM * 1.0, yy); ctx.stroke(); }
    // Muster
    if (sp.stripes || U.hash(o.seed, 9) < 0.4) {
      ctx.strokeStyle = p.deep; ctx.globalAlpha = 0.45; ctx.lineWidth = 2.4;
      for (let i = 0; i < 4; i++) { const yy = L * (0.1 + i * 0.23); ctx.beginPath(); ctx.moveTo(-wT, yy); ctx.quadraticCurveTo(-wT * 0.3, yy + 3, wT * 0.05, yy + 1); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = p.dark; ctx.globalAlpha = 0.5;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-wT * 0.4 + U.hash(o.seed, i) * wT * 0.5, L * (0.1 + U.hash(i, o.seed) * 0.8), 1.4 + U.hash(i, 3) * 1.4, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    if (sp.runes) {
      ctx.strokeStyle = sp.runes; ctx.lineWidth = 1.5; ctx.shadowColor = sp.runes; ctx.shadowBlur = 8;
      const pulse = 0.6 + 0.4 * Math.sin(o.time * 3 + o.seed);
      ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.arc(-wT * 0.1, L * 0.35, 3.5, 0, TAU);
      ctx.moveTo(-wT * 0.1, L * 0.35 - 6); ctx.lineTo(-wT * 0.1, L * 0.35 + 6);
      ctx.moveTo(-wT * 0.45, L * 0.7); ctx.lineTo(-wT * 0.1, L * 0.62); ctx.lineTo(wT * 0.1, L * 0.78);
      ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.restore();
  }

  function wing(ctx, root, ang, size, flap, p, back, runes) {
    ctx.save();
    ctx.translate(root.x, root.y); ctx.rotate(ang);
    const L = 34 * size, sp = 0.3 + flap * 0.6;
    const elbow = [-L * 0.42, -L * (0.38 + sp * 0.35)];
    const tips = [[-L * 0.95, -L * (0.55 + sp * 0.5)], [-L * 1.18, -L * 0.12 - sp * L * 0.25], [-L * 0.82, L * 0.28 - sp * 8]];
    const mem = () => {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(elbow[0], elbow[1]); ctx.lineTo(tips[0][0], tips[0][1]);
      ctx.quadraticCurveTo((tips[0][0] + tips[1][0]) / 2 + 7, (tips[0][1] + tips[1][1]) / 2 + 3, tips[1][0], tips[1][1]);
      ctx.quadraticCurveTo((tips[1][0] + tips[2][0]) / 2 + 9, (tips[1][1] + tips[2][1]) / 2, tips[2][0], tips[2][1]);
      ctx.quadraticCurveTo(-L * 0.35, L * 0.18, 0, 7); ctx.closePath();
    };
    mem();
    const g = ctx.createLinearGradient(0, -L * 0.3, -L, L * 0.2);
    g.addColorStop(0, back ? p.dark : p.mid); g.addColorStop(1, back ? p.deep : p.dark);
    ctx.fillStyle = g; ctx.globalAlpha = 0.95; ctx.fill(); ctx.globalAlpha = 1;
    // Adern
    ctx.save(); mem(); ctx.clip();
    ctx.strokeStyle = runes || U.shade(p.base, 0.42); ctx.globalAlpha = runes ? 0.5 : 0.35; ctx.lineWidth = 1;
    for (const t of tips) { ctx.beginPath(); ctx.moveTo(elbow[0] * 0.6, elbow[1] * 0.6); ctx.quadraticCurveTo((elbow[0] + t[0]) / 2 + 4, (elbow[1] + t[1]) / 2 + 6, t[0] * 0.9, t[1] * 0.9 + 6); ctx.stroke(); }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p.deep; ctx.lineWidth = 1.6; mem(); ctx.stroke();
    ctx.lineCap = 'round';
    ctx.strokeStyle = p.deep; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(elbow[0], elbow[1]); for (const t of tips) { ctx.moveTo(elbow[0], elbow[1]); ctx.lineTo(t[0], t[1]); } ctx.stroke();
    ctx.strokeStyle = back ? p.dark : p.base; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = '#efe3c2';
    ctx.beginPath(); ctx.moveTo(elbow[0], elbow[1]); ctx.lineTo(elbow[0] - 2, elbow[1] - 6); ctx.lineTo(elbow[0] + 2, elbow[1] - 1); ctx.fill();
    ctx.restore();
  }

  function tail(ctx, pts, root, sp, p, o) {
    if (!pts || !pts.length) return;
    const chain = [root].concat(pts), n = chain.length;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const a = chain[Math.max(0, i - 1)], b = chain[Math.min(n - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
      const w = (sp.tail === 'long' ? 6 : 8) * (1 - i / n) + 1.2;
      left.push([chain[i].x - dy / l * w, chain[i].y + dx / l * w]);
      right.push([chain[i].x + dy / l * w, chain[i].y - dx / l * w]);
    }
    const path = () => {
      ctx.beginPath(); ctx.moveTo(left[0][0], left[0][1]);
      for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
      for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
      ctx.closePath();
    };
    ctx.lineJoin = 'round';
    ctx.strokeStyle = p.deep; ctx.lineWidth = 2.6; path(); ctx.stroke();
    const g = ctx.createLinearGradient(chain[0].x, chain[0].y - 8, chain[0].x, chain[0].y + 8);
    g.addColorStop(0, p.base); g.addColorStop(1, p.dark);
    ctx.fillStyle = g; path(); ctx.fill();
    if (sp.tail === 'long') {
      ctx.strokeStyle = p.deep; ctx.globalAlpha = 0.5; ctx.lineWidth = 3;
      for (let i = 2; i < n - 1; i += 2) { ctx.beginPath(); ctx.moveTo(left[i][0], left[i][1]); ctx.lineTo(right[i][0], right[i][1]); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    if (sp.tail === 'spade') {
      const e = chain[n - 1], q = chain[n - 2], a = Math.atan2(e.y - q.y, e.x - q.x);
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(3, -9, 15, 0); ctx.quadraticCurveTo(3, 9, -3, 0); ctx.closePath();
      ctx.fillStyle = p.accent; ctx.fill(); ctx.strokeStyle = p.deep; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
      ctx.fillStyle = p.accent;
      for (let i = 1; i < n - 1; i++) {
        const l = left[i];
        ctx.beginPath(); ctx.moveTo(l[0] - 2.5, l[1]); ctx.lineTo(l[0], l[1] - 6); ctx.lineTo(l[0] + 2.5, l[1]); ctx.closePath();
        ctx.fill(); ctx.strokeStyle = p.deep; ctx.lineWidth = 0.9; ctx.stroke();
      }
    }
  }

  // Kopf im lokalen Raum (+x nach vorne, -y nach oben)
  function dragonHead(ctx, h, ang, f, sp, p, o) {
    ctx.save();
    ctx.translate(h.x, h.y); ctx.rotate(ang); ctx.scale(f * 1.15, 1.15);
    ctx.lineJoin = 'round';
    const hornLen = 1 + U.hash(o.seed, 7) * 0.4;
    if (sp.frill) {
      const pulse = 0.85 + 0.15 * Math.sin(o.time * 2 + o.seed);
      ctx.beginPath(); ctx.moveTo(-3, 3);
      for (let i = 0; i <= 7; i++) {
        const a = Math.PI * 0.5 + i / 7 * Math.PI * 0.95, rr = 18 * pulse;
        ctx.lineTo(-3 + Math.cos(a) * rr, 1 - Math.sin(a) * rr);
        ctx.lineTo(-3 + Math.cos(a + 0.11) * rr * 0.62, 1 - Math.sin(a + 0.11) * rr * 0.62);
      }
      ctx.closePath();
      const fg = ctx.createRadialGradient(-3, 1, 2, -3, 1, 18);
      fg.addColorStop(0, p.accent); fg.addColorStop(1, U.shade(p.accent, 0.6));
      ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = p.deep; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.strokeStyle = U.shade(p.accent, 0.5); ctx.lineWidth = 1;
      for (let i = 0; i <= 7; i++) { const a = Math.PI * 0.5 + i / 7 * Math.PI * 0.95; ctx.beginPath(); ctx.moveTo(-3, 1); ctx.lineTo(-3 + Math.cos(a) * 16, 1 - Math.sin(a) * 16); ctx.stroke(); }
    }
    if (sp.horns) {
      const long = sp.horns === 'long';
      for (const [off, back] of [[3, true], [0, false]]) {
        ctx.beginPath(); ctx.moveTo(-2 + off, -7);
        if (long) {
          ctx.bezierCurveTo(-10 + off, -16 * hornLen, -20 + off, -15 * hornLen, -26 * hornLen + off, -6);
          ctx.bezierCurveTo(-19 + off, -11 * hornLen, -11 + off, -11 * hornLen, -6 + off, -2);
        } else {
          ctx.bezierCurveTo(-6 + off, -13, -11 + off, -17 * hornLen, -17 * hornLen + off, -17 * hornLen);
          ctx.bezierCurveTo(-12 + off, -13 * hornLen, -9 + off, -9, -6 + off, -2);
        }
        ctx.closePath();
        const hg = ctx.createLinearGradient(0, -6, -20, -16);
        hg.addColorStop(0, back ? '#b9a679' : '#f6ead0'); hg.addColorStop(1, back ? '#8a7650' : '#cdb98a');
        ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = p.deep; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.strokeStyle = 'rgba(80,60,30,0.4)'; ctx.lineWidth = 0.8;
        for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-5 - k * 3 + off, -6 - k * 2); ctx.lineTo(-2 - k * 3 + off, -4 - k * 2.6); ctx.stroke(); }
      }
    }
    const skull = () => {
      ctx.beginPath();
      ctx.moveTo(-10, 3);
      ctx.bezierCurveTo(-12, -9, 1, -12, 7, -7);
      ctx.bezierCurveTo(12, -6, 17, -5, 20, -2);
      ctx.quadraticCurveTo(23, 2, 19, 5);
      ctx.lineTo(5, 9);
      ctx.bezierCurveTo(-3, 11, -9, 9, -10, 3);
      ctx.closePath();
    };
    ctx.strokeStyle = p.deep; ctx.lineWidth = 2.6; skull(); ctx.stroke();
    const g = ctx.createLinearGradient(8, -10, -6, 9);
    g.addColorStop(0, p.hi); g.addColorStop(0.5, p.base); g.addColorStop(1, p.dark);
    ctx.fillStyle = g; skull(); ctx.fill();
    ctx.save(); skull(); ctx.clip();
    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.moveTo(4, 9); ctx.quadraticCurveTo(13, 7, 20, 4); ctx.lineTo(18, 2); ctx.quadraticCurveTo(10, 4, 2, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    // Brauenwulst
    ctx.fillStyle = p.dark;
    ctx.beginPath(); ctx.moveTo(-1, -8); ctx.quadraticCurveTo(5, -10, 10, -6); ctx.quadraticCurveTo(5, -7, -1, -6); ctx.closePath(); ctx.fill();
    // Nüstern, Maul, Zähne
    ctx.fillStyle = p.deep; ctx.beginPath(); ctx.ellipse(18.5, -1.8, 1.5, 1, 0.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = p.deep; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(5, 5); ctx.quadraticCurveTo(12, 5.5, 19, 3.5); ctx.stroke();
    ctx.fillStyle = '#fffaf0';
    for (const tx of [9, 13, 16]) { ctx.beginPath(); ctx.moveTo(tx, 4.8); ctx.lineTo(tx + 1, 7.3); ctx.lineTo(tx + 2, 4.6); ctx.closePath(); ctx.fill(); }
    if (sp.tongue && !o.dead && Math.sin(o.time * 2.2 + o.seed) > 0.85) {
      ctx.strokeStyle = '#e8476a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(19, 3); ctx.lineTo(26, 3.5); ctx.lineTo(28, 2); ctx.moveTo(26, 3.5); ctx.lineTo(28, 5); ctx.stroke();
    }
    // Auge
    if (o.dead) {
      ctx.strokeStyle = p.deep; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(1, -5); ctx.lineTo(6, 0); ctx.moveTo(6, -5); ctx.lineTo(1, 0); ctx.stroke();
    } else {
      const eye = sp.runes || (sp.tongue ? '#ffd23f' : '#ffb347');
      ctx.shadowColor = eye; ctx.shadowBlur = sp.runes ? 10 : 4;
      ctx.fillStyle = eye; ctx.beginPath(); ctx.ellipse(4, -3.4, 3.4, 2.5, -0.15, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1a120c'; ctx.beginPath(); ctx.ellipse(4.6, -3.4, 0.9, 2.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(3.2, -4.4, 0.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // Rauch aus den Nüstern
    if (sp.smoke && !o.dead) {
      const t = (o.time * 0.8 + U.hash(o.seed, 2)) % 1;
      const nx = h.x + f * 22, ny = h.y - 3;
      ctx.fillStyle = 'rgba(200,200,190,' + (0.35 * (1 - t)) + ')';
      ctx.beginPath(); ctx.arc(nx + f * t * 8, ny - t * 14, 2 + t * 4, 0, TAU); ctx.fill();
    }
  }

  function golem(ctx, pts, o, p) {
    const f = o.facing;
    const stone = { hi: '#c9cfc3', base: U.mix('#8c968a', o.color, 0.18), mid: '#717b6f', dark: '#4e584d', deep: '#2b322a' };
    const crystal = o.color;
    const nk = pts[P.NECK], pv = pts[P.PELVIS], hd = pts[P.HEAD];
    const glow = (x, y, r) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, U.mix(crystal, '#ffffff', 0.5)); g.addColorStop(0.4, crystal); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    };
    // hinteres Bein und Arm
    ball(ctx, pts[P.KNEE_L].x, pts[P.KNEE_L].y, 6, { ...stone, hi: stone.mid }, stone.deep);
    ball(ctx, pts[P.FOOT_L].x + f * 2, pts[P.FOOT_L].y - 2, 6.5, { ...stone, hi: stone.mid }, stone.deep);
    ball(ctx, pts[P.ELBOW_L].x, pts[P.ELBOW_L].y, 5.5, { ...stone, hi: stone.mid }, stone.deep);
    ball(ctx, pts[P.HAND_L].x, pts[P.HAND_L].y, 6.5, { ...stone, hi: stone.mid }, stone.deep);
    // Rumpf: großer Felsbrocken
    const cx = (nk.x + pv.x) / 2, cy = (nk.y + pv.y) / 2 + 1;
    SL.Art.blob(ctx, cx, cy, 20, o.seed * 7 + 3, 8, 1.0);
    ctx.fillStyle = stone.deep; ctx.lineWidth = 3; ctx.strokeStyle = stone.deep; ctx.stroke();
    const g = ctx.createRadialGradient(cx + 7, cy - 9, 2, cx, cy, 23);
    g.addColorStop(0, stone.hi); g.addColorStop(0.5, stone.base); g.addColorStop(1, stone.dark);
    ctx.fillStyle = g; ctx.fill();
    // glühende Risse und Kristall
    const pulse = 0.65 + 0.35 * Math.sin(o.time * 2.5 + o.seed);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = U.mix(crystal, '#ffffff', 0.3); ctx.lineWidth = 1.6; ctx.shadowColor = crystal; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(cx - 9, cy - 5); ctx.lineTo(cx - 3, cy); ctx.lineTo(cx - 6, cy + 8); ctx.moveTo(cx + 3, cy - 10); ctx.lineTo(cx + 7, cy - 4); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    glow(cx + f * 4, cy + 2, 12 * pulse + 5);
    ctx.fillStyle = U.mix(crystal, '#ffffff', 0.35);
    ctx.beginPath(); ctx.moveTo(cx + f * 4, cy - 4); ctx.lineTo(cx + f * 7, cy + 2); ctx.lineTo(cx + f * 4, cy + 7); ctx.lineTo(cx + f * 1, cy + 2); ctx.closePath(); ctx.fill();
    // Moos, Gras und Blume auf den Schultern
    ctx.fillStyle = '#4c9a2f';
    ctx.beginPath(); ctx.ellipse(cx - f * 3, cy - 15, 12, 5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#79c447';
    ctx.beginPath(); ctx.ellipse(cx - f * 1, cy - 16, 7, 3, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#5aa83a'; ctx.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) { const bx = cx - f * 10 + k * f * 4; ctx.beginPath(); ctx.moveTo(bx, cy - 17); ctx.lineTo(bx + f, cy - 23 - (k % 2) * 3); ctx.stroke(); }
    ctx.fillStyle = U.hash(o.seed, 1) < 0.5 ? '#ffd166' : '#ff7eb6';
    ctx.beginPath(); ctx.arc(cx - f * 9, cy - 21, 2.4, 0, TAU); ctx.fill();
    // Ranke
    ctx.strokeStyle = '#2f6b22'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx - f * 12, cy - 12); ctx.quadraticCurveTo(cx - f * 16, cy, cx - f * 12, cy + 12); ctx.stroke();
    SL.Art.leaf(ctx, cx - f * 15, cy + 2, 6, f > 0 ? 2.4 : 0.7, '#4c9a2f');
    // Kopf: kantiger Stein mit Augenschlitz
    ctx.save(); ctx.translate(hd.x + f * 2, hd.y + 8); ctx.scale(f, 1);
    ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(6, -10); ctx.lineTo(11, -2); ctx.lineTo(9, 7); ctx.lineTo(-7, 8); ctx.lineTo(-11, 1); ctx.closePath();
    ctx.lineWidth = 2.6; ctx.strokeStyle = stone.deep; ctx.stroke();
    const hg = ctx.createLinearGradient(8, -9, -8, 8);
    hg.addColorStop(0, stone.hi); hg.addColorStop(1, stone.dark);
    ctx.fillStyle = hg; ctx.fill();
    ctx.fillStyle = stone.deep; ctx.fillRect(-6, -4, 15, 4.5);
    if (!o.dead) {
      ctx.shadowColor = crystal; ctx.shadowBlur = 10;
      ctx.fillStyle = U.mix(crystal, '#ffffff', 0.4);
      ctx.fillRect(1, -3, 6, 2.4); ctx.fillRect(-4, -3, 3.5, 2.4);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    // vorderes Bein
    ball(ctx, pts[P.KNEE_R].x, pts[P.KNEE_R].y, 7, stone, stone.dark);
    ctx.save(); ctx.translate(pts[P.FOOT_R].x + f * 2, pts[P.FOOT_R].y - 3);
    ctx.beginPath(); ctx.roundRect(-8, -4, 16, 8, 3); ctx.fillStyle = stone.deep; ctx.fill();
    ctx.beginPath(); ctx.roundRect(-7, -3.2, 14, 6, 2.5); ctx.fillStyle = stone.base; ctx.fill();
    ctx.restore();
    // Schulter + vorderer Arm (Waffe dazwischen)
    ball(ctx, nk.x + f * 8, nk.y + 6, 7, stone, stone.dark);
    if (o.weapon) SL.drawWeapon(ctx, o.weapon, pts[P.HAND_R].x, pts[P.HAND_R].y, o.weaponAng, 1, o.weaponOpt);
    ball(ctx, pts[P.ELBOW_R].x, pts[P.ELBOW_R].y, 6, stone, stone.dark);
    ball(ctx, pts[P.HAND_R].x, pts[P.HAND_R].y, 7, stone, stone.dark);
  }

  SL.drawCreature = function (ctx, pts, o) {
    const sp = SL.SPECIES[o.species];
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const p = pal(o.flash ? '#ffffff' : o.color, o.seed);
    if (sp.golem) { golem(ctx, pts, o, p); ctx.restore(); return; }
    const f = o.facing;
    const nk = pts[P.NECK], pv = pts[P.PELVIS], hd = pts[P.HEAD];
    const [l0, l1, a0, a1] = sp.limb;
    if (sp.runes && !o.dead) {
      const ag = ctx.createRadialGradient((nk.x + pv.x) / 2, (nk.y + pv.y) / 2, 4, (nk.x + pv.x) / 2, (nk.y + pv.y) / 2, 46);
      ag.addColorStop(0, 'rgba(127,246,255,0.22)'); ag.addColorStop(1, 'rgba(127,246,255,0)');
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc((nk.x + pv.x) / 2, (nk.y + pv.y) / 2, 46, 0, TAU); ctx.fill();
    }
    // Flügel hinten
    if (sp.wings) {
      const root = { x: nk.x + (pv.x - nk.x) * 0.22 - f * 4, y: nk.y + (pv.y - nk.y) * 0.22 };
      const flap = o.dead ? 0.05 : o.airborne ? 0.5 + 0.5 * Math.sin(o.time * 12) : 0.12 + 0.08 * Math.sin(o.time * 2.5);
      const a = (Math.atan2(pv.y - nk.y, pv.x - nk.x) - Math.PI / 2) * 0.6 * f;
      ctx.save(); ctx.scale(f, 1);
      const rx = { x: root.x * f, y: root.y };
      wing(ctx, { x: rx.x - 4, y: rx.y + 1 }, a - 0.2, sp.wings * 0.88, flap * 0.85, p, true, sp.runes);
      wing(ctx, rx, a, sp.wings, flap, p, false, sp.runes);
      ctx.restore();
    }
    if (sp.tail) tail(ctx, o.tailPts, { x: pv.x - f * 3, y: pv.y - 1 }, sp, p, o);
    // hinteres Bein und Arm (dunkler)
    limb(ctx, pv, pts[P.KNEE_L], l0, l1 + 1, p, true);
    limb(ctx, pts[P.KNEE_L], pts[P.FOOT_L], l1 + 1, l1 * 0.7, p, true);
    foot(ctx, pts[P.KNEE_L], pts[P.FOOT_L], f, { ...p, hi: p.mid, base: p.dark });
    limb(ctx, nk, pts[P.ELBOW_L], a0, a1, p, true);
    limb(ctx, pts[P.ELBOW_L], pts[P.HAND_L], a1, a1 * 0.85, p, true);
    claws(ctx, pts[P.ELBOW_L], pts[P.HAND_L], f, '#d9cba6', p.deep);
    torso(ctx, nk, pv, f, sp, p, o);
    // vorderes Bein
    limb(ctx, pv, pts[P.KNEE_R], l0 + 1, l1 + 1, p);
    limb(ctx, pts[P.KNEE_R], pts[P.FOOT_R], l1 + 1, l1 * 0.7, p);
    foot(ctx, pts[P.KNEE_R], pts[P.FOOT_R], f, p);
    // Hals und Kopf
    const headBase = { x: hd.x - f * 4, y: hd.y + 4 };
    limb(ctx, { x: nk.x, y: nk.y + 2 }, headBase, sp.body[0] * 0.7, sp.body[0] * 0.5, p);
    const headAng = Math.atan2(hd.y - nk.y, hd.x - nk.x) + Math.PI / 2;
    dragonHead(ctx, hd, headAng * 0.6, f, sp, p, o);
    // Waffe und vorderer Arm
    if (o.weapon) SL.drawWeapon(ctx, o.weapon, pts[P.HAND_R].x, pts[P.HAND_R].y, o.weaponAng, 1, o.weaponOpt);
    limb(ctx, nk, pts[P.ELBOW_R], a0 + 1, a1, p);
    limb(ctx, pts[P.ELBOW_R], pts[P.HAND_R], a1, a1 * 0.85, p);
    claws(ctx, pts[P.ELBOW_R], pts[P.HAND_R], f, '#efe3c2', p.deep);
    ctx.restore();
  };
})();
