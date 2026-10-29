'use strict';
// Kreaturen für die Computergegner: Drache, Echse, Flügeldrachen-Magier, Steingolem
(function () {
  const SL = window.SL;
  const U = SL.U;
  const P = SL.P;

  SL.SPECIES = {
    dragon: { wings: 1, tail: 'spade', limb: 6.5, torso: 13, horns: 'short' },
    lizard: { wings: 0, tail: 'long', limb: 5.5, torso: 12, frill: true },
    wyvern: { wings: 1.35, tail: 'spade', limb: 5.5, torso: 12, horns: 'long', glow: '#7ff6ff' },
    golem: { wings: 0, tail: null, limb: 10, torso: 22, stone: true, glow: '#ffb347' },
  };
  SL.SPECIES_OF_TYPE = { brawler: 'dragon', gunner: 'lizard', mage: 'wyvern', tank: 'golem' };

  function seg(ctx, a, b, c, col, w) {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    if (c) ctx.lineTo(c.x, c.y);
    ctx.stroke();
  }
  function claws(ctx, from, to, col, out, dir) {
    const a = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.fillStyle = col; ctx.strokeStyle = out; ctx.lineWidth = 1.2;
    for (const off of [-0.5, 0, 0.5]) {
      const aa = a + off * (dir || 1);
      ctx.beginPath();
      ctx.moveTo(to.x + Math.cos(aa + 1.4) * 2, to.y + Math.sin(aa + 1.4) * 2);
      ctx.lineTo(to.x + Math.cos(aa) * 6, to.y + Math.sin(aa) * 6);
      ctx.lineTo(to.x + Math.cos(aa - 1.4) * 2, to.y + Math.sin(aa - 1.4) * 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  // Flügel mit drei Knochen und Flughaut
  function wing(ctx, root, ang, size, flap, col, dark, out) {
    ctx.save();
    ctx.translate(root.x, root.y);
    ctx.rotate(ang);
    const L = 34 * size, sp = 0.35 + flap * 0.55;
    const tips = [[-L * 0.95, -L * (0.55 + sp * 0.5)], [-L * 1.15, -L * 0.15 - sp * L * 0.25], [-L * 0.8, L * 0.25 - sp * 8]];
    const elbow = [-L * 0.45, -L * (0.35 + sp * 0.35)];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(elbow[0], elbow[1]);
    ctx.lineTo(tips[0][0], tips[0][1]);
    ctx.quadraticCurveTo((tips[0][0] + tips[1][0]) / 2 + 6, (tips[0][1] + tips[1][1]) / 2 + 2, tips[1][0], tips[1][1]);
    ctx.quadraticCurveTo((tips[1][0] + tips[2][0]) / 2 + 8, (tips[1][1] + tips[2][1]) / 2, tips[2][0], tips[2][1]);
    ctx.quadraticCurveTo(-L * 0.35, L * 0.15, 0, 6);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, -L, 0);
    g.addColorStop(0, col); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = out; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = out; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(elbow[0], elbow[1]);
    for (const t of tips) { ctx.moveTo(elbow[0], elbow[1]); ctx.lineTo(t[0], t[1]); }
    ctx.stroke();
    ctx.restore();
  }

  function tail(ctx, pts, root, sp, col, dark, belly, out) {
    if (!pts || !pts.length) return;
    const chain = [root].concat(pts);
    const n = chain.length;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const a = chain[Math.max(0, i - 1)], b = chain[Math.min(n - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, l = U.hypot(dx, dy) || 1;
      const w = (sp.tail === 'long' ? 5.5 : 6.5) * (1 - i / n) + 1;
      left.push([chain[i].x - dy / l * w, chain[i].y + dx / l * w]);
      right.push([chain[i].x + dy / l * w, chain[i].y - dx / l * w]);
    }
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = out; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    if (sp.tail === 'long') {
      ctx.strokeStyle = dark; ctx.lineWidth = 3;
      for (let i = 2; i < n - 1; i += 2) { ctx.beginPath(); ctx.moveTo(left[i][0], left[i][1]); ctx.lineTo(right[i][0], right[i][1]); ctx.stroke(); }
    }
    if (sp.tail === 'spade') {
      const e = chain[n - 1], p = chain[n - 2];
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(4, -6); ctx.lineTo(13, 0); ctx.lineTo(4, 6); ctx.closePath();
      ctx.fillStyle = dark; ctx.fill(); ctx.strokeStyle = out; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.restore();
      // Rückenstacheln
      ctx.fillStyle = belly;
      for (let i = 1; i < n - 1; i++) {
        const l = left[i];
        ctx.beginPath(); ctx.moveTo(l[0] - 2, l[1]); ctx.lineTo(l[0], l[1] - 5); ctx.lineTo(l[0] + 2, l[1]); ctx.closePath();
        ctx.fill(); ctx.strokeStyle = out; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }

  function head(ctx, h, ang, f, sp, o, col, dark, belly, out) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(ang);
    ctx.scale(f, 1);
    ctx.lineJoin = 'round';
    const angry = !o.dead;
    if (sp.stone) {
      // Steinkopf
      ctx.beginPath();
      ctx.moveTo(-11, -10); ctx.lineTo(8, -12); ctx.lineTo(13, -3); ctx.lineTo(11, 9); ctx.lineTo(-8, 11); ctx.lineTo(-13, 2); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = out; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(6, -10); ctx.lineTo(2, -4); ctx.lineTo(-7, -2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = sp.glow; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-2, 7); ctx.lineTo(1, 5); ctx.stroke();
      if (!o.dead) {
        ctx.fillStyle = sp.glow; ctx.shadowColor = sp.glow; ctx.shadowBlur = 8;
        ctx.fillRect(2, -4, 7, 3); ctx.fillRect(-4, -4, 4, 3);
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = '#5aa83a';
      ctx.beginPath(); ctx.arc(-5, -11, 4, Math.PI, 0); ctx.arc(1, -12, 3, Math.PI, 0); ctx.fill();
      ctx.restore();
      return;
    }
    // Hörner / Kragen hinter dem Kopf
    if (sp.frill) {
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      for (let i = 0; i <= 6; i++) {
        const a = Math.PI * 0.55 + i / 6 * Math.PI * 0.9;
        ctx.lineTo(-4 + Math.cos(a) * 17, -2 + Math.sin(a) * 17 * -1);
        ctx.lineTo(-4 + Math.cos(a + 0.12) * 11, -2 - Math.sin(a + 0.12) * 11);
      }
      ctx.closePath();
      ctx.fillStyle = belly; ctx.fill(); ctx.strokeStyle = out; ctx.lineWidth = 1.8; ctx.stroke();
    }
    if (sp.horns) {
      const long = sp.horns === 'long';
      for (const off of [0, 3]) {
        ctx.beginPath();
        ctx.moveTo(-3 + off, -7);
        if (long) ctx.bezierCurveTo(-12 + off, -16, -20 + off, -14, -24 + off, -6);
        else ctx.quadraticCurveTo(-10 + off, -14, -15 + off, -15);
        ctx.lineTo(-5 + off, -3);
        ctx.closePath();
        ctx.fillStyle = off ? '#f3e6c4' : '#d9c79c'; ctx.fill();
        ctx.strokeStyle = out; ctx.lineWidth = 1.8; ctx.stroke();
      }
    }
    // Schädel + Schnauze
    ctx.beginPath();
    ctx.moveTo(-10, 2);
    ctx.bezierCurveTo(-11, -10, 2, -12, 7, -6);
    ctx.lineTo(sp.frill ? 20 : 18, -3);
    ctx.quadraticCurveTo(22, 1, 18, 5);
    ctx.lineTo(4, 8);
    ctx.bezierCurveTo(-4, 10, -9, 8, -10, 2);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = out; ctx.lineWidth = 2.4; ctx.stroke();
    // Unterkiefer heller
    ctx.beginPath(); ctx.moveTo(4, 8); ctx.quadraticCurveTo(12, 6, 18, 5); ctx.lineTo(16, 3); ctx.quadraticCurveTo(10, 4, 3, 5); ctx.closePath();
    ctx.fillStyle = belly; ctx.fill();
    // Nüstern, Maul, Zähne
    ctx.fillStyle = out;
    ctx.beginPath(); ctx.ellipse(17, -1.5, 1.4, 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = out; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(5, 4.5); ctx.lineTo(17, 3.5); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(9, 4.2); ctx.lineTo(10, 6.5); ctx.lineTo(11, 4); ctx.closePath(); ctx.fill();
    // Auge
    if (o.dead) {
      ctx.strokeStyle = out; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(1, -5); ctx.lineTo(6, 0); ctx.moveTo(6, -5); ctx.lineTo(1, 0); ctx.stroke();
    } else {
      if (sp.glow) { ctx.shadowColor = sp.glow; ctx.shadowBlur = 10; }
      ctx.fillStyle = sp.glow || '#fff6c2';
      ctx.beginPath(); ctx.ellipse(3.5, -3, 3.4, 2.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = out; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = out;
      ctx.beginPath(); ctx.ellipse(4.2, -3, 0.9, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      if (angry) {
        ctx.strokeStyle = out; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-1, -7.5); ctx.lineTo(8, -5); ctx.stroke();
      }
    }
    ctx.restore();
  }

  SL.drawCreature = function (ctx, pts, o) {
    const sp = SL.SPECIES[o.species];
    const out = SL.Art.OUT;
    const base = sp.stone ? U.mix(o.color, '#8a8f96', 0.55) : o.color;
    const col = o.flash ? '#ffffff' : base;
    const dark = o.flash ? '#e8e8e8' : U.shade(sp.stone ? '#8a8f96' : o.color, 0.62);
    const belly = sp.stone ? '#b9b2a4' : U.mix(o.color, '#fff3c4', 0.55);
    const f = o.facing;
    const nk = pts[P.NECK], pv = pts[P.PELVIS], hd = pts[P.HEAD];
    const L = sp.limb;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const bodyAng = Math.atan2(pv.y - nk.y, pv.x - nk.x);
    // Flügel (hinten)
    if (sp.wings) {
      const root = { x: nk.x + (pv.x - nk.x) * 0.2 - f * 3, y: nk.y + (pv.y - nk.y) * 0.2 };
      const flap = o.dead ? 0.1 : o.airborne ? 0.5 + 0.5 * Math.sin(o.time * 14) : 0.15 + 0.1 * Math.sin(o.time * 3);
      const a = (bodyAng - Math.PI / 2) * 0.6;
      ctx.save(); ctx.scale(f, 1);
      const rx = { x: root.x * f, y: root.y };
      wing(ctx, { x: rx.x - 3, y: rx.y }, a * f - 0.15, sp.wings * 0.9, flap * 0.85, U.shade(o.color, 0.5), U.shade(o.color, 0.35), out);
      wing(ctx, rx, a * f, sp.wings, flap, U.shade(o.color, 0.75), U.shade(o.color, 0.45), out);
      ctx.restore();
    }
    // Schwanz
    if (sp.tail) tail(ctx, o.tailPts, { x: pv.x - f * 2, y: pv.y - 2 }, sp, col, dark, belly, out);
    // Umrisse
    seg(ctx, pv, pts[P.KNEE_L], pts[P.FOOT_L], out, L + 3.4);
    seg(ctx, nk, pts[P.ELBOW_L], pts[P.HAND_L], out, L + 2.4);
    seg(ctx, nk, pv, null, out, sp.torso + 3.4);
    seg(ctx, pv, pts[P.KNEE_R], pts[P.FOOT_R], out, L + 3.4);
    // Farben
    seg(ctx, pv, pts[P.KNEE_L], pts[P.FOOT_L], dark, L);
    seg(ctx, nk, pts[P.ELBOW_L], pts[P.HAND_L], dark, L - 1);
    seg(ctx, nk, pv, null, col, sp.torso);
    // Bauchschuppen
    const bx = Math.cos(bodyAng + Math.PI / 2) * f * -3, by = Math.sin(bodyAng + Math.PI / 2) * f * -3;
    ctx.strokeStyle = belly; ctx.lineWidth = sp.torso * 0.4;
    ctx.beginPath(); ctx.moveTo(nk.x + bx + (pv.x - nk.x) * 0.15, nk.y + by + (pv.y - nk.y) * 0.15); ctx.lineTo(pv.x + bx, pv.y + by); ctx.stroke();
    if (sp.stone) {
      ctx.strokeStyle = sp.glow; ctx.lineWidth = 1.6;
      const mx = (nk.x + pv.x) / 2, my = (nk.y + pv.y) / 2;
      ctx.beginPath(); ctx.moveTo(mx - 4, my - 6); ctx.lineTo(mx + 1, my - 1); ctx.lineTo(mx - 2, my + 5); ctx.stroke();
      ctx.fillStyle = '#5aa83a';
      ctx.beginPath(); ctx.arc(nk.x, nk.y - 1, 6, Math.PI, 0); ctx.fill();
    }
    seg(ctx, pv, pts[P.KNEE_R], pts[P.FOOT_R], col, L);
    claws(ctx, pts[P.KNEE_L], pts[P.FOOT_L], '#f3e6c4', out);
    claws(ctx, pts[P.KNEE_R], pts[P.FOOT_R], '#f3e6c4', out);
    // Kopf
    const headAng = Math.atan2(hd.y - nk.y, hd.x - nk.x) + Math.PI / 2;
    head(ctx, hd, headAng, f, sp, o, col, dark, belly, out);
    // Waffe und vorderer Arm
    if (o.weapon) SL.drawWeapon(ctx, o.weapon, pts[P.HAND_R].x, pts[P.HAND_R].y, o.weaponAng, 1, o.weaponOpt);
    seg(ctx, nk, pts[P.ELBOW_R], pts[P.HAND_R], out, L + 2.4);
    seg(ctx, nk, pts[P.ELBOW_R], pts[P.HAND_R], col, L - 1);
    claws(ctx, pts[P.ELBOW_R], pts[P.HAND_R], '#f3e6c4', out);
    ctx.restore();
  };
})();
