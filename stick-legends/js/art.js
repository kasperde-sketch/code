'use strict';
// Gezeichneter Cartoon-Stil: Umrisse, wackelige Linien, Landschaft, Blöcke
(function () {
  const SL = window.SL;
  const U = SL.U;
  const T = SL.T;
  const OUT = '#2b2420';

  function nz(x, y, s) { return U.hash(Math.round(x) + (s || 0) * 131, Math.round(y) - (s || 0) * 71) * 2 - 1; }
  // weiche, unregelmäßige Rundform
  function blob(ctx, cx, cy, r, seed, k, squash) {
    const n = k || 9, pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const rr = r * (1 + (U.hash(seed, i) - 0.5) * 0.28);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (squash || 1)]);
    }
    ctx.beginPath();
    const m0 = [(pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2];
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  }
  function fillStroke(ctx, fill, lw, stroke) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.strokeStyle = stroke || OUT; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }

  // ---------- Hintergrund ----------
  function mountain(ctx, bx, base, w, top, seed, tint) {
    const h = base - top;
    const L = [], R = [];
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const j = i === 0 || i === steps ? 0 : (U.hash(seed, i) - 0.5) * 22;
      L.push([bx - w / 2 + w / 2 * t + j * 0.6, base - h * t + Math.abs(j) * 0.4]);
      const j2 = i === 0 || i === steps ? 0 : (U.hash(seed + 9, i) - 0.5) * 22;
      R.push([bx + w / 2 - w / 2 * t + j2 * 0.6, base - h * t + Math.abs(j2) * 0.4]);
    }
    const peak = [bx, top];
    const outline = () => {
      ctx.beginPath();
      ctx.moveTo(L[0][0], L[0][1]);
      for (let i = 1; i < L.length - 1; i++) ctx.lineTo(L[i][0], L[i][1]);
      ctx.lineTo(peak[0], peak[1]);
      for (let i = R.length - 2; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
      ctx.closePath();
    };
    outline();
    ctx.fillStyle = tint ? '#c4cdd8' : '#b4bfcc';
    ctx.fill();
    // Schattenseite
    ctx.save();
    outline(); ctx.clip();
    ctx.fillStyle = tint ? '#a8b3c2' : '#93a0b2';
    ctx.beginPath();
    ctx.moveTo(peak[0], peak[1]);
    ctx.lineTo(bx + w * 0.08, base - h * 0.55);
    ctx.lineTo(bx - w * 0.02, base - h * 0.25);
    ctx.lineTo(bx + w * 0.05, base);
    ctx.lineTo(bx + w, base);
    ctx.lineTo(bx + w, top - 10);
    ctx.closePath();
    ctx.fill();
    // Schneekappe
    const sh = h * 0.36;
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.5, top - 20);
    ctx.lineTo(bx + w * 0.5, top - 20);
    ctx.lineTo(bx + w * 0.5, top + sh * 0.7);
    const zig = 7;
    for (let i = zig; i >= 0; i--) {
      const x = bx - w * 0.36 + w * 0.72 * i / zig;
      const y = top + sh * (i % 2 ? 1.0 : 0.62) + (U.hash(seed, i + 30) - 0.5) * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(bx - w * 0.5, top + sh * 0.7);
    ctx.closePath();
    ctx.fillStyle = '#f6f9fd';
    ctx.fill();
    ctx.fillStyle = 'rgba(160,185,215,0.55)';
    ctx.beginPath();
    ctx.moveTo(peak[0], peak[1]);
    ctx.lineTo(bx + w * 0.3, top + sh);
    ctx.lineTo(bx + w * 0.06, top + sh * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    outline();
    fillStroke(ctx, null, 2.6);
    // Felsrillen
    ctx.strokeStyle = 'rgba(43,36,32,0.45)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const sx = bx + (U.hash(seed, i + 50) - 0.5) * w * 0.4, sy = base - h * (0.15 + U.hash(seed, i + 60) * 0.3);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 8, sy - 14); ctx.lineTo(sx + 4, sy - 26); ctx.stroke();
    }
  }

  function tree(ctx, x, base, s, seed) {
    ctx.beginPath();
    ctx.moveTo(x - 3 * s, base);
    ctx.quadraticCurveTo(x - 1 * s, base - 20 * s, x - 2 * s, base - 34 * s);
    ctx.lineTo(x + 2 * s, base - 34 * s);
    ctx.quadraticCurveTo(x + 1 * s, base - 20 * s, x + 3 * s, base);
    ctx.closePath();
    fillStroke(ctx, '#8a5a33', 2);
    blob(ctx, x, base - 44 * s, 16 * s, seed, 9, 1.05);
    fillStroke(ctx, '#a9d65a', 2.2);
    blob(ctx, x - 4 * s, base - 48 * s, 9 * s, seed + 3, 7);
    fillStroke(ctx, '#c4e874', 0);
    ctx.strokeStyle = 'rgba(70,110,30,0.6)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x + 5 * s, base - 40 * s, 4 * s, 0.3, 2.4); ctx.stroke();
  }

  function bush(ctx, x, y, s, seed, col) {
    blob(ctx, x, y, 14 * s, seed, 8, 0.75);
    fillStroke(ctx, col || '#8cc548', 2.2);
    blob(ctx, x - 4 * s, y - 4 * s, 7 * s, seed + 1, 6, 0.8);
    fillStroke(ctx, '#b7df66', 0);
  }

  function hillBand(ctx, base, amp, f, ph, fill, hi, seed, W, H) {
    const pts = [];
    for (let x = -20; x <= W + 20; x += 20) {
      pts.push([x, base + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.6 + ph * 1.9) * amp * 0.35 + nz(x, base, seed) * 2]);
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], H + 10);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(W + 20, H + 10);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = hi; ctx.lineWidth = 10;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + 7) : ctx.moveTo(p[0], p[1] + 7))); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    return pts;
  }

  function renderBg(ctx, seed) {
    const W = SL.W, H = SL.H;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a66ad');
    g.addColorStop(0.42, '#4e95d6');
    g.addColorStop(0.75, '#93cdef');
    g.addColorStop(1, '#c9e9f8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Windstreifen
    for (let i = 0; i < 7; i++) {
      const y0 = 40 + i * 62 + U.hash(seed, i) * 20;
      const f = 0.003 + U.hash(seed, i + 10) * 0.003, ph = U.hash(seed, i + 20) * 6;
      const thick = 10 + U.hash(seed, i + 30) * 14;
      const x0 = -100 + U.hash(seed, i + 40) * 500, x1 = x0 + 700 + U.hash(seed, i + 50) * 900;
      const top = [], bot = [];
      for (let x = x0; x <= x1; x += 24) {
        const t = (x - x0) / (x1 - x0), taper = Math.sin(t * Math.PI);
        const y = y0 + Math.sin(x * f + ph) * 26;
        top.push([x, y - thick * taper * 0.5]);
        bot.push([x, y + thick * taper * 0.5]);
      }
      ctx.beginPath();
      top.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      for (let k = bot.length - 1; k >= 0; k--) ctx.lineTo(bot[k][0], bot[k][1]);
      ctx.closePath();
      ctx.fillStyle = i < 3 ? 'rgba(150,200,240,0.5)' : 'rgba(200,232,250,0.55)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(25,70,130,0.35)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); top.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    }
    // Berge
    const ms = [[90, 560, 300, 330], [320, 560, 340, 250], [600, 570, 280, 330], [930, 560, 360, 230], [1200, 570, 300, 300], [1440, 560, 360, 240], [1640, 570, 260, 320]];
    ms.forEach((m, i) => mountain(ctx, m[0] + (U.hash(seed, i + 70) - 0.5) * 60, m[1], m[2], m[3], seed * 10 + i, i % 2));
    // Hügel mit Bäumen
    const far = hillBand(ctx, 560, 18, 0.004, seed, '#a5d35e', '#c4e57c', 3, W, H);
    for (let i = 0; i < 16; i++) {
      const p = far[Math.floor(U.hash(seed, i + 80) * far.length)];
      if (U.hash(seed, i + 90) < 0.55) tree(ctx, p[0], p[1] + 4, 0.75 + U.hash(seed, i + 95) * 0.4, seed + i);
      else bush(ctx, p[0], p[1] + 2, 0.8, seed + i, '#93cb4c');
    }
    const near = hillBand(ctx, 665, 18, 0.006, seed + 2, '#8cc548', '#ade064', 4, W, H);
    for (let i = 0; i < 12; i++) {
      const p = near[Math.floor(U.hash(seed, i + 120) * near.length)];
      bush(ctx, p[0], p[1] + 3, 1 + U.hash(seed, i + 130) * 0.4, seed + 40 + i);
    }
    ctx.strokeStyle = 'rgba(60,110,30,0.5)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 60; i++) {
      const x = U.hash(seed, i + 200) * W, y = 700 + U.hash(seed, i + 210) * 180;
      ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x - 1, y - 6); ctx.moveTo(x + 1, y); ctx.lineTo(x + 3, y - 7); ctx.stroke();
    }
  }

  function cloud(ctx, x, y, s) {
    const parts = [[0, 0, 24], [26, -12, 30], [56, -2, 24], [30, 8, 24], [-18, 6, 16], [76, 8, 16]];
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(30,70,120,0.75)';
    ctx.lineWidth = 5;
    for (const p of parts) { ctx.beginPath(); ctx.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, Math.PI * 2); ctx.stroke(); }
    for (const p of parts) { ctx.beginPath(); ctx.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(190,220,245,0.9)';
    ctx.beginPath(); ctx.ellipse(x + 30 * s, y + 20 * s, 46 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ---------- Blöcke (runde Formen) ----------
  function radii(open, R) {
    return { tl: open.u && open.l ? R : 0, tr: open.u && open.r ? R : 0, br: open.d && open.r ? R : 0, bl: open.d && open.l ? R : 0 };
  }
  function seg(ctx, x, y, w, h, rd, side, cont) {
    switch (side) {
      case 'u': if (!cont) ctx.moveTo(x + rd.tl, y); ctx.lineTo(x + w - rd.tr, y); if (rd.tr) ctx.arcTo(x + w, y, x + w, y + rd.tr, rd.tr); break;
      case 'r': if (!cont) ctx.moveTo(x + w, y + rd.tr); ctx.lineTo(x + w, y + h - rd.br); if (rd.br) ctx.arcTo(x + w, y + h, x + w - rd.br, y + h, rd.br); break;
      case 'd': if (!cont) ctx.moveTo(x + w - rd.br, y + h); ctx.lineTo(x + rd.bl, y + h); if (rd.bl) ctx.arcTo(x, y + h, x, y + h - rd.bl, rd.bl); break;
      case 'l': if (!cont) ctx.moveTo(x, y + h - rd.bl); ctx.lineTo(x, y + rd.tl); if (rd.tl) ctx.arcTo(x, y, x + rd.tl, y, rd.tl); break;
    }
  }
  // Form eines Blocks; geschlossene Seiten leicht überlappend, damit keine Fugen entstehen
  function shape(ctx, x, y, open, R) {
    const e = 0.7;
    const x0 = x - (open.l ? 0 : e), y0 = y - (open.u ? 0 : e);
    const w = T + (open.l ? 0 : e) + (open.r ? 0 : e), h = T + (open.u ? 0 : e) + (open.d ? 0 : e);
    const rd = radii(open, R);
    ctx.beginPath();
    seg(ctx, x0, y0, w, h, rd, 'u');
    seg(ctx, x0, y0, w, h, rd, 'r', true);
    seg(ctx, x0, y0, w, h, rd, 'd', true);
    seg(ctx, x0, y0, w, h, rd, 'l', true);
    ctx.closePath();
  }
  function outlineOpen(ctx, x, y, open, R, lw) {
    const rd = radii(open, R);
    ctx.strokeStyle = OUT; ctx.lineWidth = lw || 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const s of ['u', 'r', 'd', 'l']) if (open[s]) seg(ctx, x, y, T, T, rd, s);
    ctx.stroke();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // weiche Grasdecke oben auf einem Block (innerhalb der Blockform)
  function grassTop(ctx, x, y, c, r, thick) {
    const by = (k) => y + thick + nz(x + k * 8, y, 6) * 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 2);
    ctx.lineTo(x + T + 2, y - 2);
    ctx.lineTo(x + T + 2, by(4));
    ctx.quadraticCurveTo(x + 28, by(3) + 6, x + 24, by(3));
    ctx.quadraticCurveTo(x + 20, by(2) + 6, x + 16, by(2));
    ctx.quadraticCurveTo(x + 12, by(1) + 6, x + 8, by(1));
    ctx.quadraticCurveTo(x + 4, by(0) + 6, x - 2, by(0));
    ctx.closePath();
    ctx.fillStyle = '#7fbf3d'; ctx.fill();
    ctx.strokeStyle = '#4c8424'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = '#ade05e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 2, y + 3.5); ctx.lineTo(x + T + 2, y + 3.5); ctx.stroke();
  }

  // Erdfarbe nach Höhe: oben heller, unten dunkler (keine Kachelstreifen)
  function dirt(py) {
    const t = U.clamp((py - 300) / 600, 0, 1);
    return U.mix('#a5713f', '#77502f', t);
  }

  function rock(py) {
    const t = U.clamp((py - 300) / 600, 0, 1);
    return U.mix('#b2b9c1', '#7f8791', t);
  }

  // get(dc, dr) → Typ des Nachbarn (0 = leer)
  function drawTile(ctx, t, c, r, hp, life, get, stage) {
    const x = c * T, y = r * T;
    const open = { u: !get(0, -1), d: !get(0, 1), l: !get(-1, 0), r: !get(1, 0) };
    const h = U.hash(c, r);
    if (stage === 2) { if (t === 5) leaves(ctx, x, y, c, r, open); return; }
    if (stage === 3) { if ((t === 1 || t === 2) && open.u) topDecor(ctx, x, y, c, r, t, get); return; }
    switch (t) {
      case 1: {
        ctx.save();
        shape(ctx, x, y, open, 16);
        const dg = ctx.createLinearGradient(0, y, 0, y + T);
        dg.addColorStop(0, dirt(y)); dg.addColorStop(1, dirt(y + T));
        ctx.fillStyle = dg;
        ctx.fill();
        ctx.clip();
        if (h > 0.72) {
          ctx.strokeStyle = 'rgba(80,45,18,0.22)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
          const sy = y + 14 + U.hash(r, c) * 10;
          ctx.beginPath(); ctx.moveTo(x - 2, sy); ctx.bezierCurveTo(x + 10, sy - 4, x + 22, sy + 4, x + T + 2, sy + nz(x + T, sy, 4) * 2); ctx.stroke();
        }
        for (let k = 0; k < 2; k++) {
          if (U.hash(c * 3 + k, r * 7) < 0.82) continue;
          const px = x + 6 + U.hash(c + k, r * 5) * 20, py = y + (open.u ? 17 : 6) + U.hash(c * 9, r + k) * 12;
          ctx.beginPath(); ctx.ellipse(px, py, 3.6, 2.6, U.hash(c, k) * 3, 0, Math.PI * 2);
          fillStroke(ctx, '#c39566', 1.2, 'rgba(60,32,12,0.7)');
        }
        if (open.u) grassTop(ctx, x, y, c, r, 10);
        ctx.restore();
        outlineOpen(ctx, x, y, open, 16);
        if (open.d && h > 0.55) {
          ctx.strokeStyle = 'rgba(70,40,15,0.85)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x + 12, y + T); ctx.bezierCurveTo(x + 8, y + T + 5, x + 15, y + T + 8, x + 12, y + T + 12); ctx.stroke();
        }
        break;
      }
      case 2: {
        // natürlicher Fels: ruhige Fläche, Farbe nach Höhe, vereinzelt Risse
        ctx.save();
        shape(ctx, x, y, open, 14);
        const rg = ctx.createLinearGradient(0, y, 0, y + T);
        rg.addColorStop(0, rock(y)); rg.addColorStop(1, rock(y + T));
        ctx.fillStyle = rg; ctx.fill();
        ctx.clip();
        if (open.u) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - 1, y, T + 2, 8); }
        if (h > 0.78) {
          ctx.strokeStyle = 'rgba(43,36,32,0.4)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x + 6 + h * 12, y + 6); ctx.quadraticCurveTo(x + 14 + h * 6, y + 16, x + 9 + h * 12, y + 28); ctx.stroke();
        } else if (h < 0.12) {
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          ctx.beginPath(); ctx.ellipse(x + 16, y + 16, 10, 5, -0.3, 0, 7); ctx.fill();
        }
        if (open.u) grassTop(ctx, x, y, c, r, 6);
        ctx.restore();
        outlineOpen(ctx, x, y, open, 14);
        break;
      }
      case 3: {
        // umgestürzter Baumstamm
        const top = y + 1, bot = y + T - 2, cy = (top + bot) / 2, ry = (bot - top) / 2;
        const lx = open.l ? x + 6 : x - 0.7, rx = open.r ? x + T - 6 : x + T + 0.7;
        ctx.beginPath(); ctx.rect(lx, top, rx - lx, bot - top);
        const bg = ctx.createLinearGradient(0, top, 0, bot);
        bg.addColorStop(0, '#a8723f'); bg.addColorStop(0.5, '#8d5b33'); bg.addColorStop(1, '#6c4425');
        ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = 'rgba(55,30,12,0.55)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lx, top + 8); ctx.bezierCurveTo(x + 10, top + 6, x + 20, top + 10, rx, top + 8);
        ctx.moveTo(lx, cy + 2); ctx.bezierCurveTo(x + 12, cy + 4, x + 22, cy, rx, cy + 2);
        ctx.moveTo(lx, bot - 6); ctx.bezierCurveTo(x + 8, bot - 4, x + 20, bot - 8, rx, bot - 6);
        ctx.stroke();
        if (h > 0.7) { ctx.beginPath(); ctx.ellipse(x + 16, cy - 2, 3.5, 2.5, 0, 0, 7); fillStroke(ctx, '#6c4425', 1.3); }
        ctx.strokeStyle = 'rgba(255,220,170,0.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lx, top + 3); ctx.lineTo(rx, top + 3); ctx.stroke();
        if (h < 0.35) {
          ctx.beginPath(); ctx.ellipse(x + 10 + h * 20, top + 1, 7, 3, 0, Math.PI, 0); ctx.closePath();
          fillStroke(ctx, '#7fbf3d', 1.2, '#4c8424');
        }
        ctx.strokeStyle = OUT; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(rx, top); ctx.moveTo(lx, bot); ctx.lineTo(rx, bot); ctx.stroke();
        // Schnittflächen mit Jahresringen
        for (const [isOpen, ex] of [[open.l, x + 6], [open.r, x + T - 6]]) {
          if (!isOpen) continue;
          ctx.beginPath(); ctx.ellipse(ex, cy, 6.5, ry, 0, 0, Math.PI * 2);
          fillStroke(ctx, '#e2b97c', 2.4);
          ctx.strokeStyle = 'rgba(150,100,50,0.8)'; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.ellipse(ex, cy, 4, ry * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(ex, cy, 1.8, ry * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
        }
        break;
      }
      case 4: {
        // Felsbrocken mit Moos
        const cx = x + T / 2 + nz(c, r, 9) * 1.5, cy = y + T / 2 + 1;
        const rock = () => blob(ctx, cx, cy, 15.5, c * 7 + r * 3, 8, 0.92);
        rock();
        const g = ctx.createRadialGradient(cx - 5, cy - 6, 2, cx, cy, 18);
        g.addColorStop(0, '#c2bbae'); g.addColorStop(1, '#7a7368');
        ctx.fillStyle = g; ctx.fill();
        ctx.save(); rock(); ctx.clip();
        ctx.fillStyle = 'rgba(60,52,44,0.25)';
        ctx.beginPath(); ctx.ellipse(cx + 5, cy + 8, 12, 6, 0, 0, 7); ctx.fill();
        if (open.u) {
          blob(ctx, cx - 2, cy - 15, 13, c + r * 5, 7, 0.55);
          fillStroke(ctx, '#7fbf3d', 1.3, '#4c8424');
        }
        if (h > 0.5) {
          ctx.strokeStyle = 'rgba(43,36,32,0.5)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(cx + 3, cy - 2); ctx.quadraticCurveTo(cx + 7, cy + 3, cx + 5, cy + 9); ctx.stroke();
        }
        ctx.restore();
        rock(); fillStroke(ctx, null, 2.4);
        break;
      }
      case 6: {
        ctx.beginPath();
        ctx.moveTo(x + 6, y); ctx.bezierCurveTo(x + 4, y + 10, x + 7, y + 22, x + 6, y + T);
        ctx.lineTo(x + T - 6, y + T); ctx.bezierCurveTo(x + T - 5, y + 22, x + T - 8, y + 10, x + T - 6, y);
        ctx.closePath();
        ctx.fillStyle = '#8d5b33'; ctx.fill();
        ctx.fillStyle = '#a46d40'; ctx.fillRect(x + 9, y, 4, T);
        ctx.strokeStyle = 'rgba(60,35,15,0.6)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + 17, y + 2); ctx.bezierCurveTo(x + 14, y + 12, x + 19, y + 20, x + 17, y + T - 2);
        if (h > 0.6) { ctx.moveTo(x + 21, y + 18); ctx.arc(x + 19, y + 18, 2.2, 0, 6.3); }
        ctx.stroke();
        ctx.strokeStyle = OUT; ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(x + 6, y); ctx.bezierCurveTo(x + 4, y + 10, x + 7, y + 22, x + 6, y + T);
        ctx.moveTo(x + T - 6, y + T); ctx.bezierCurveTo(x + T - 5, y + 22, x + T - 8, y + 10, x + T - 6, y);
        ctx.stroke();
        break;
      }
      case 7: {
        const a = life > 0 && life < 1.5 ? 0.5 + 0.5 * Math.sin(life * 20) : 1;
        ctx.globalAlpha = a;
        roundRect(ctx, x + 1.5, y + 1.5, T - 3, T - 3, 8);
        ctx.fillStyle = '#a58c70'; ctx.fill();
        ctx.save(); ctx.clip();
        ctx.fillStyle = '#c2a989'; ctx.beginPath(); ctx.ellipse(x + 11, y + 10, 10, 7, -0.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#88725c'; ctx.beginPath(); ctx.ellipse(x + 23, y + 26, 12, 7, -0.4, 0, 7); ctx.fill();
        ctx.restore();
        roundRect(ctx, x + 1.5, y + 1.5, T - 3, T - 3, 8);
        fillStroke(ctx, null, 2.4);
        ctx.globalAlpha = 1;
        break;
      }
    }
    const info = SL.TILES[t];
    if (info && info.destr && hp < info.hp) {
      const dmg = 1 - hp / info.hp;
      ctx.strokeStyle = 'rgba(43,36,32,' + (0.45 + dmg * 0.5) + ')';
      ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 16, y + 16); ctx.quadraticCurveTo(x + 10, y + 12, x + 6, y + 7);
      ctx.moveTo(x + 16, y + 16); ctx.quadraticCurveTo(x + 24, y + 13, x + 27, y + 6);
      if (dmg > 0.5) { ctx.moveTo(x + 16, y + 16); ctx.quadraticCurveTo(x + 20, y + 23, x + 17, y + 28); ctx.moveTo(x + 16, y + 16); ctx.quadraticCurveTo(x + 9, y + 20, x + 6, y + 24); }
      ctx.stroke();
    }
  }

  function leaves(ctx, x, y, c, r, open) {
    const cx = x + T / 2 + nz(c, r, 3) * 8, cy = y + T / 2 + nz(c, r, 4) * 7 - (open.u ? 3 : 0);
    blob(ctx, cx, cy, 19 + U.hash(c * 3, r * 5) * 8, c * 13 + r * 7, 9);
    fillStroke(ctx, '#78bb3a', 2.5);
    blob(ctx, cx - 4, cy - 5, 13, c * 5 + r, 7);
    fillStroke(ctx, '#98cf4c', 0);
    blob(ctx, cx - 8, cy - 9, 5, c + r * 3, 6);
    fillStroke(ctx, '#c5e97a', 0);
    ctx.strokeStyle = 'rgba(55,100,25,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx + 6, cy + 5, 5, 0.2, 2.2); ctx.stroke();
    if (U.hash(c, r + 3) > 0.75) {
      ctx.fillStyle = '#e8473c';
      ctx.beginPath(); ctx.arc(cx + 7, cy - 4, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }

  function topDecor(ctx, x, y, c, r, t, get) {
    if (get(0, -1) || get(0, -2)) return;
    // Grashalme
    if (t === 1) {
      for (let k = 0; k < 4; k++) {
        if (U.hash(c * 4 + k, r) < 0.35) continue;
        const bx = x + 3 + k * 8 + nz(c * 4 + k, r, 7) * 2, hh = 5 + U.hash(c + k, r * 3) * 6, lean = nz(k, c, 8) * 3;
        ctx.beginPath(); ctx.moveTo(bx - 2.5, y + 2); ctx.lineTo(bx + lean, y - hh); ctx.lineTo(bx + 2.5, y + 2); ctx.closePath();
        fillStroke(ctx, '#8ccb46', 1.3);
      }
    }
    const h = U.hash(r * 17, c * 3);
    const px = x + 8 + U.hash(c, r * 11) * 16;
    if (h < 0.11) {
      // Blume
      const col = ['#ff6fa8', '#ffe066', '#ffffff', '#b78cff', '#ff9f43'][Math.floor(U.hash(c, r + 5) * 5)];
      ctx.strokeStyle = '#3f7a1f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, y + 1); ctx.quadraticCurveTo(px - 2, y - 6, px, y - 11); ctx.stroke();
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * Math.PI * 2;
        ctx.beginPath(); ctx.arc(px + Math.cos(a) * 3.6, y - 13 + Math.sin(a) * 3.6, 2.8, 0, 7);
        fillStroke(ctx, col, 1.1);
      }
      ctx.beginPath(); ctx.arc(px, y - 13, 2.2, 0, 7); fillStroke(ctx, '#ffcf3a', 1);
    } else if (h < 0.17) {
      // Pilz
      ctx.beginPath(); ctx.moveTo(px - 2.5, y + 1); ctx.lineTo(px - 2, y - 7); ctx.lineTo(px + 2, y - 7); ctx.lineTo(px + 2.5, y + 1); ctx.closePath();
      fillStroke(ctx, '#f3e9d2', 1.3);
      ctx.beginPath(); ctx.ellipse(px, y - 8, 7, 5, 0, Math.PI, 0); ctx.closePath();
      fillStroke(ctx, '#e8473c', 1.5);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(px - 3, y - 10, 1.2, 0, 7); ctx.arc(px + 2, y - 11, 1.1, 0, 7); ctx.fill();
    } else if (h < 0.23) {
      blob(ctx, px, y - 2, 5, c * 7 + r, 6, 0.7);
      fillStroke(ctx, '#aab3be', 1.5);
    } else if (h < 0.3 && t === 1) {
      ctx.strokeStyle = '#3f7a1f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px - 3, y + 1); ctx.quadraticCurveTo(px - 6, y - 8, px - 8, y - 14); ctx.moveTo(px, y + 1); ctx.lineTo(px + 1, y - 16); ctx.moveTo(px + 3, y + 1); ctx.quadraticCurveTo(px + 6, y - 7, px + 9, y - 12); ctx.stroke();
    }
  }

  // weiche Innenecken zwischen Erde/Fels in einer leeren Zelle
  function fillets(ctx, c, r, get) {
    const x = c * T, y = r * T, R = 26;
    const nat = (t) => t === 1 || t === 2;
    const C = [
      // Wand, Boden/Decke, Diagonale, Ecke P, A (Wand), B (Boden), Mittelpunkt, Winkel, Boden unten?
      [[-1, 0], [0, 1], [-1, 1], [x, y + T], [x, y + T - R], [x + R, y + T], [x + R, y + T - R], Math.PI, Math.PI / 2, true, true],
      [[1, 0], [0, 1], [1, 1], [x + T, y + T], [x + T, y + T - R], [x + T - R, y + T], [x + T - R, y + T - R], 0, Math.PI / 2, false, true],
      [[-1, 0], [0, -1], [-1, -1], [x, y], [x, y + R], [x + R, y], [x + R, y + R], Math.PI, Math.PI * 1.5, false, false],
      [[1, 0], [0, -1], [1, -1], [x + T, y], [x + T, y + R], [x + T - R, y], [x + T - R, y + R], 0, -Math.PI / 2, true, false],
    ];
    for (const k of C) {
      const tw = get(k[0][0], k[0][1]), tf = get(k[1][0], k[1][1]), td = get(k[2][0], k[2][1]);
      if (!nat(tw) || !nat(tf) || !nat(td)) continue;
      const P = k[3], A = k[4], B = k[5], M = k[6];
      const sx = Math.sign(P[0] - M[0]) * 2, sy = Math.sign(P[1] - M[1]) * 2;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(P[0] + sx, P[1] + sy);
        ctx.lineTo(A[0] + sx, A[1]);
        ctx.lineTo(A[0], A[1]);
        ctx.arc(M[0], M[1], R, k[7], k[8], k[9]);
        ctx.lineTo(B[0], B[1] + sy);
        ctx.closePath();
      };
      path();
      ctx.fillStyle = tf === 1 ? dirt(P[1]) : rock(P[1]);
      ctx.fill();
      if (k[10]) {
        ctx.save(); path(); ctx.clip();
        ctx.strokeStyle = '#7fbf3d'; ctx.lineWidth = tf === 1 ? 21 : 13;
        ctx.beginPath(); ctx.arc(M[0], M[1], R, k[7], k[8], k[9]); ctx.stroke();
        ctx.strokeStyle = '#ade05e'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(M[0], M[1], R + 3.5, k[7], k[8], k[9]); ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = OUT; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(M[0], M[1], R, k[7], k[8], k[9]); ctx.stroke();
    }
  }

  SL.Art = { OUT, nz, blob, fillStroke, renderBg, cloud, drawTile, fillets };
})();
