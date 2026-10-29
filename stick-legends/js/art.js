'use strict';
// Spielwelt im Stil des Urwald-Hintergrunds: Klippen mit Erdschichten, Moosteppich, gemauerte Ruinen
(function () {
  const SL = window.SL;
  const U = SL.U;
  const T = SL.T;
  const OUT = '#14211a';                    // Kontur der Spielfigur
  const EDGE = 'rgba(10,7,5,0.55)';         // weiche Kante des Geländes
  const TAU = Math.PI * 2;
  const MOSS = { light: '#9ad655', mid: '#4f9a2f', dark: '#22501c' };

  function nz(x, y, s) { return U.hash(Math.round(x) + (s || 0) * 131, Math.round(y) - (s || 0) * 71) * 2 - 1; }

  function blob(ctx, cx, cy, r, seed, k, squash) {
    const n = k || 9, pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      const rr = r * (1 + (U.hash(seed, i) - 0.5) * 0.28);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (squash || 1)]);
    }
    ctx.beginPath();
    ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  }
  function fillStroke(ctx, fill, lw, stroke) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.strokeStyle = stroke || EDGE; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  function leaf(ctx, x, y, len, ang, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.25, -len * 0.32, len * 0.7, -len * 0.3, len, 0);
    ctx.bezierCurveTo(len * 0.7, len * 0.26, len * 0.25, len * 0.28, 0, 0);
    ctx.fill(); ctx.restore();
  }

  // ---------- Blockformen mit runden Außenecken ----------
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
  function shape(ctx, x, y, open, R) {
    const e = 0.7;
    const x0 = x - (open.l ? 0 : e), y0 = y - (open.u ? 0 : e);
    const w = T + (open.l ? 0 : e) + (open.r ? 0 : e), h = T + (open.u ? 0 : e) + (open.d ? 0 : e);
    const rd = radii(open, R);
    ctx.beginPath();
    seg(ctx, x0, y0, w, h, rd, 'u'); seg(ctx, x0, y0, w, h, rd, 'r', true);
    seg(ctx, x0, y0, w, h, rd, 'd', true); seg(ctx, x0, y0, w, h, rd, 'l', true);
    ctx.closePath();
  }
  function outlineOpen(ctx, x, y, open, R) {
    const rd = radii(open, R);
    ctx.strokeStyle = EDGE; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const s of ['u', 'r', 'd', 'l']) if (open[s]) seg(ctx, x, y, T, T, rd, s);
    ctx.stroke();
  }
  // dunkle Innenkante an offenen Seiten (gibt Volumen wie bei den Klippen)
  function sideShade(ctx, x, y, open) {
    const sh = (x0, y0, x1, y1, rx, ry, rw, rh) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
    };
    if (open.l) sh(x, 0, x + 12, 0, x, y, 12, T);
    if (open.r) sh(x + T, 0, x + T - 12, 0, x + T - 12, y, 12, T);
    if (open.d) sh(0, y + T, 0, y + T - 10, x, y + T - 10, T, 10);
  }

  // ---------- Farben nach Welthöhe (durchgehend, ohne Kachelstreifen) ----------
  function soil(py) {
    const t = U.clamp((py - 330) / 560, 0, 1);
    return t < 0.4 ? U.mix('#4a3526', '#2b1f17', t / 0.4) : U.mix('#2b1f17', '#120c09', (t - 0.4) / 0.6);
  }
  function stoneCol(py) { return U.mix('#6a8072', '#3c4d43', U.clamp((py - 250) / 650, 0, 1)); }

  // Erdschichten: Bänder in Weltkoordinaten, laufen über Kachelgrenzen weiter
  const BANDS = ['rgba(120,86,56,0.35)', 'rgba(70,52,38,0.5)', 'rgba(140,110,70,0.25)', 'rgba(40,30,22,0.5)'];
  function strata(ctx, x, y) {
    for (let i = 0; i < 14; i++) {
      const base = 360 + i * 46;
      if (base > y + T + 12 || base + 30 < y - 12) continue;
      ctx.fillStyle = BANDS[i % BANDS.length];
      ctx.beginPath();
      const top = (px) => base + Math.sin(px * 0.012 + i) * 8;
      const bot = (px) => base + 16 + Math.sin(px * 0.01 + i * 2) * 6 + Math.sin(px * 0.07 + i) * 1.5;
      ctx.moveTo(x - 1, top(x - 1));
      for (let px = x + 7; px <= x + T + 1; px += 8) ctx.lineTo(px, top(px));
      for (let px = x + T + 1; px >= x - 1; px -= 8) ctx.lineTo(px, bot(px));
      ctx.closePath(); ctx.fill();
    }
  }

  // Moosteppich oben auf einer Klippe
  function mossTop(ctx, x, y, c, r, thick, open) {
    const by = (px) => y + thick + Math.sin(px * 0.35) * 1.5 + nz(px, y, 6) * 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 6);
    ctx.lineTo(x + T + 2, y - 6);
    ctx.lineTo(x + T + 2, by(x + T));
    for (let px = x + T; px > x; px -= 8) ctx.quadraticCurveTo(px - 4, by(px - 4) + 6, px - 8, by(px - 8));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y - 4, 0, y + thick + 6);
    g.addColorStop(0, MOSS.light); g.addColorStop(0.4, MOSS.mid); g.addColorStop(1, MOSS.dark);
    ctx.fillStyle = g; ctx.fill();
    for (let k = 0; k < 7; k++) {
      const px = x + U.hash(c * 7 + k, r) * T, py = y + U.hash(c, r * 7 + k) * thick;
      ctx.fillStyle = k % 2 ? 'rgba(190,240,130,0.55)' : 'rgba(30,70,20,0.45)';
      ctx.beginPath(); ctx.arc(px, py, 1.4 + U.hash(k, c) * 2.2, 0, TAU); ctx.fill();
    }
    // Schatten unter der Moosdecke
    const sh = ctx.createLinearGradient(0, y + thick, 0, y + thick + 22);
    sh.addColorStop(0, 'rgba(0,0,0,0.4)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.fillRect(x - 1, y + thick, T + 2, 22);
  }

  // get(dc, dr) → Typ des Nachbarn (0 = leer)
  function drawTile(ctx, t, c, r, hp, life, get, stage) {
    const x = c * T, y = r * T;
    const open = { u: !get(0, -1), d: !get(0, 1), l: !get(-1, 0), r: !get(1, 0) };
    const h = U.hash(c, r);
    if (stage === 2) { if (t === 5) leaves(ctx, x, y, c, r); return; }
    if (stage === 3) {
      if ((t === 1 || t === 2) && open.u) topDecor(ctx, x, y, c, r, t, get, open);
      if ((t === 1 || t === 2) && open.d && !get(0, 2)) hangingMoss(ctx, x, y, c, r);
      return;
    }
    switch (t) {
      case 1: { // Klippe aus Erde
        ctx.save();
        shape(ctx, x, y, open, 18);
        const g = ctx.createLinearGradient(0, y, 0, y + T);
        g.addColorStop(0, soil(y)); g.addColorStop(1, soil(y + T));
        ctx.fillStyle = g; ctx.fill();
        ctx.clip();
        strata(ctx, x, y);
        // Wurzeln, die von der Oberfläche herunterwachsen
        const surfDepth = open.u ? 0 : !get(0, -1) ? 0 : (get(0, -1) === 1 && !get(0, -2)) ? 1 : 2;
        if (surfDepth < 2 && h > 0.35) {
          ctx.strokeStyle = 'rgba(150,115,80,0.45)'; ctx.lineCap = 'round';
          ctx.lineWidth = 1.6 + h * 2.4;
          let px = x + U.hash(r, c) * T, py = y - 2;
          ctx.beginPath(); ctx.moveTo(px, py);
          for (let k = 0; k < 3; k++) { px += nz(c, r + k, 5) * 10; py += 12; ctx.lineTo(px, py); }
          ctx.stroke();
        }
        // eingebettete Steine
        if (h < 0.16) {
          const px = x + 6 + U.hash(c * 3, r) * 20, py = y + (open.u ? 18 : 6) + U.hash(c, r * 3) * 10, rr = 3 + U.hash(c, r + 1) * 6;
          const sg = ctx.createRadialGradient(px - rr * 0.3, py - rr * 0.3, 1, px, py, rr);
          sg.addColorStop(0, '#8a8f84'); sg.addColorStop(1, '#3a3d36');
          ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(px, py, rr, rr * 0.72, h * 20, 0, TAU); ctx.fill();
        }
        sideShade(ctx, x, y, open);
        if (open.u) mossTop(ctx, x, y, c, r, 10, open);
        ctx.restore();
        outlineOpen(ctx, x, y, open, 18);
        break;
      }
      case 2: { // gemauerter Ruinenstein
        ctx.save();
        shape(ctx, x, y, open, 10);
        ctx.fillStyle = '#18231d'; ctx.fill();
        ctx.clip();
        // Quader: versetzte Fugen pro Lage, in Weltkoordinaten
        const off = (r % 2) * 24;
        for (let j = -1; j < 2; j++) {
          const bx = Math.floor((x - off) / 48) * 48 + off + j * 48;
          if (bx + 48 < x || bx > x + T) continue;
          const v = (U.hash(Math.floor(bx / 48), r) - 0.5) * 0.18;
          ctx.fillStyle = stoneCol(y + 16);
          ctx.beginPath(); ctx.roundRect(bx + 1, y + 1, 46, T - 2, 2); ctx.fill();
          ctx.fillStyle = v > 0 ? 'rgba(255,255,255,' + v * 0.7 + ')' : 'rgba(0,0,0,' + (-v) + ')';
          ctx.fillRect(bx + 1, y + 1, 46, T - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fillRect(bx + 2, y + 2, 44, 2.5);
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(bx + 2, y + T - 4.5, 44, 2.5);
        }
        if (h > 0.8) {
          ctx.strokeStyle = 'rgba(10,18,14,0.5)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
          let px = x + 8 + h * 14, py = y + 3;
          ctx.beginPath(); ctx.moveTo(px, py);
          for (let k = 0; k < 4; k++) { px += nz(c, k, 2) * 6; py += 7; ctx.lineTo(px, py); }
          ctx.stroke();
        } else if (h < 0.18) {
          ctx.fillStyle = 'rgba(70,130,45,0.45)';
          ctx.beginPath(); ctx.ellipse(x + 10 + h * 40, y + T - 6, 10, 4, 0, 0, TAU); ctx.fill();
        }
        const lg = ctx.createLinearGradient(x, 0, x + T, 0);
        lg.addColorStop(0, 'rgba(0,0,0,0.12)'); lg.addColorStop(1, 'rgba(255,240,190,0.08)');
        ctx.fillStyle = lg; ctx.fillRect(x, y, T, T);
        sideShade(ctx, x, y, open);
        if (open.u) mossTop(ctx, x, y, c, r, 6, open);
        ctx.restore();
        outlineOpen(ctx, x, y, open, 10);
        break;
      }
      case 3: { // bemooster Baumstamm
        const top = y + 1, bot = y + T - 2, cy = (top + bot) / 2, ry = (bot - top) / 2;
        const lx = open.l ? x + 6 : x - 0.7, rx = open.r ? x + T - 6 : x + T + 0.7;
        ctx.beginPath(); ctx.rect(lx, top, rx - lx, bot - top);
        const bg = ctx.createLinearGradient(0, top, 0, bot);
        bg.addColorStop(0, '#5d4630'); bg.addColorStop(0.5, '#3e2e1f'); bg.addColorStop(1, '#1f160e');
        ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = 'rgba(20,12,6,0.5)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lx, cy - 4); ctx.bezierCurveTo(x + 12, cy - 2, x + 22, cy - 6, rx, cy - 4);
        ctx.moveTo(lx, bot - 6); ctx.bezierCurveTo(x + 8, bot - 4, x + 20, bot - 8, rx, bot - 6);
        ctx.stroke();
        ctx.save(); ctx.beginPath(); ctx.rect(lx, top - 4, rx - lx, 12); ctx.clip();
        for (let k = 0; k < 6; k++) {
          const px = lx + U.hash(c * 7 + k, r) * (rx - lx);
          const mg = ctx.createRadialGradient(px, top, 0.5, px, top + 2, 7);
          mg.addColorStop(0, MOSS.light); mg.addColorStop(1, MOSS.dark);
          ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(px, top + 2, 8, 4, 0, 0, TAU); ctx.fill();
        }
        ctx.restore();
        for (const [isOpen, ex] of [[open.l, x + 6], [open.r, x + T - 6]]) {
          if (!isOpen) continue;
          ctx.beginPath(); ctx.ellipse(ex, cy, 6.5, ry, 0, 0, TAU);
          fillStroke(ctx, '#b48a58', 1.4);
          ctx.strokeStyle = 'rgba(100,70,40,0.8)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(ex, cy, 4, ry * 0.62, 0, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(ex, cy, 1.8, ry * 0.28, 0, 0, TAU); ctx.stroke();
        }
        break;
      }
      case 4: { // bemooster Felsbrocken
        const cx = x + T / 2 + nz(c, r, 9) * 1.5, cy = y + T / 2 + 1;
        const rock = () => blob(ctx, cx, cy, 15.5, c * 7 + r * 3, 8, 0.92);
        rock();
        const g = ctx.createRadialGradient(cx - 5, cy - 7, 2, cx, cy, 18);
        g.addColorStop(0, '#a8b4a0'); g.addColorStop(1, '#3f4a3c');
        ctx.fillStyle = g; ctx.fill();
        ctx.save(); rock(); ctx.clip();
        if (open.u) {
          for (let k = 0; k < 8; k++) {
            const px = cx - 12 + U.hash(c * 9 + k, r) * 24, py = cy - 13 + U.hash(c, k) * 4;
            const mg = ctx.createRadialGradient(px, py - 2, 0.5, px, py, 6);
            mg.addColorStop(0, MOSS.light); mg.addColorStop(1, MOSS.dark);
            ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(px, py, 7, 3.5, 0, 0, TAU); ctx.fill();
          }
        }
        ctx.fillStyle = 'rgba(10,15,10,0.3)';
        ctx.beginPath(); ctx.ellipse(cx + 5, cy + 8, 12, 6, 0, 0, TAU); ctx.fill();
        ctx.restore();
        rock(); fillStroke(ctx, null, 1.4);
        break;
      }
      case 6: { // Baumstamm
        const g = ctx.createLinearGradient(x + 5, 0, x + T - 5, 0);
        g.addColorStop(0, '#0f1c16'); g.addColorStop(0.4, '#2a3b2a'); g.addColorStop(0.75, '#4d5e38'); g.addColorStop(1, '#0f1c16');
        ctx.beginPath();
        ctx.moveTo(x + 6, y); ctx.bezierCurveTo(x + 4, y + 10, x + 7, y + 22, x + 6, y + T);
        ctx.lineTo(x + T - 6, y + T); ctx.bezierCurveTo(x + T - 5, y + 22, x + T - 8, y + 10, x + T - 6, y);
        ctx.closePath();
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.bezierCurveTo(x + 12, y + 12, x + 16, y + 20, x + 14, y + T); ctx.stroke();
        ctx.fillStyle = 'rgba(64,122,44,0.5)';
        ctx.beginPath(); ctx.ellipse(x + 10, y + 10 + h * 12, 3, 9, 0, 0, TAU); ctx.fill();
        break;
      }
      case 7: { // Erdwall als Ruinenquader
        const a = life > 0 && life < 1.5 ? 0.5 + 0.5 * Math.sin(life * 20) : 1;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, T - 3, T - 3, 4);
        ctx.fillStyle = stoneCol(y + 16); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fillRect(x + 3, y + 3, T - 6, 2.5);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 3, y + T - 5, T - 6, 2.5);
        ctx.strokeStyle = 'rgba(10,18,14,0.55)'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
    }
    const info = SL.TILES[t];
    if (info && info.destr && hp < info.hp) {
      const dmg = 1 - hp / info.hp;
      ctx.strokeStyle = 'rgba(10,8,6,' + (0.45 + dmg * 0.5) + ')';
      ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 16, y + 16); ctx.quadraticCurveTo(x + 10, y + 12, x + 6, y + 7);
      ctx.moveTo(x + 16, y + 16); ctx.quadraticCurveTo(x + 24, y + 13, x + 27, y + 6);
      if (dmg > 0.5) { ctx.moveTo(x + 16, y + 16); ctx.quadraticCurveTo(x + 20, y + 23, x + 17, y + 28); ctx.moveTo(x + 16, y + 16); ctx.quadraticCurveTo(x + 9, y + 20, x + 6, y + 24); }
      ctx.stroke();
    }
  }

  // Laub wie im Hintergrund: dunkle Masse und viele beleuchtete Einzelblätter
  function leaves(ctx, x, y, c, r) {
    const cx = x + T / 2 + nz(c, r, 3) * 6, cy = y + T / 2 + nz(c, r, 4) * 5;
    ctx.fillStyle = '#0b2410';
    blob(ctx, cx, cy, 19, c * 13 + r * 7, 8); ctx.fill();
    for (let i = 0; i < 26; i++) {
      const a = U.hash(c * 31 + i, r) * TAU, d = Math.sqrt(U.hash(c, r * 31 + i)) * 23;
      const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.8;
      const shade = 0.45 + (px - cx) / 23 * 0.3 - (py - cy) / 23 * 0.45 + (U.hash(i, c + r) - 0.5) * 0.35;
      leaf(ctx, px, py, 8 + U.hash(i, r) * 7, U.hash(c + i, r * 3) * TAU, shade > 0.7 ? '#79bf48' : shade > 0.38 ? '#22622a' : '#0b2410');
    }
  }

  function fern(ctx, x, y, len, ang, colA, colB) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const pt = (t) => [len * t, -len * 0.16 * Math.sin(t * Math.PI) + len * 0.12 * t * t];
    ctx.strokeStyle = colB; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const p = pt(i / 10); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    ctx.stroke();
    for (let i = 1; i < 11; i++) {
      const t = i / 11, p = pt(t), l = len * 0.3 * (1 - t * 0.85);
      leaf(ctx, p[0], p[1], l, -1.15, i % 2 ? colA : colB);
      leaf(ctx, p[0], p[1], l * 0.95, 1.1, colB);
    }
    ctx.restore();
  }

  function hangingMoss(ctx, x, y, c, r) {
    if (U.hash(c * 7, r * 3) < 0.4) return;
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const px = x + 5 + U.hash(c + k, r) * 22, l = 10 + U.hash(c, r + k) * 30;
      ctx.strokeStyle = '#2f6b22'; ctx.lineWidth = 1.6 + U.hash(k, c) * 1.6;
      ctx.beginPath(); ctx.moveTo(px, y + T - 1); ctx.quadraticCurveTo(px + 4, y + T + l * 0.5, px - 1, y + T + l); ctx.stroke();
      for (let j = 1; j < 4; j++) leaf(ctx, px + 1, y + T + l * j / 4, 6, j % 2 ? 0.5 : 2.6, j % 2 ? '#3f8a2c' : '#5aa83a');
    }
  }

  function topDecor(ctx, x, y, c, r, t, get, open) {
    if (get(0, -1) || get(0, -2)) return;
    // Grashalme
    ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      if (U.hash(c * 8 + k, r) < 0.3) continue;
      const bx = x + 2 + k * 4, hh = 6 + U.hash(c + k, r * 3) * 12, lean = nz(k, c, 8) * 4;
      ctx.strokeStyle = U.hash(k, c) < 0.5 ? '#7cc447' : '#4f9a2f'; ctx.lineWidth = 1.3 + U.hash(c, k) * 0.8;
      ctx.beginPath(); ctx.moveTo(bx, y + 2); ctx.quadraticCurveTo(bx + lean * 0.3, y - hh * 0.6, bx + lean, y - hh); ctx.stroke();
    }
    // Ranken an Klippenrändern
    for (const [o, ex] of [[open.l, x + 3], [open.r, x + T - 3]]) {
      if (!o || U.hash(c, r * 5) < 0.3) continue;
      const l = 30 + U.hash(c * 3, r) * 60;
      ctx.strokeStyle = '#2f6b22'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex, y + 8); ctx.quadraticCurveTo(ex + nz(c, r, 1) * 10, y + 8 + l * 0.5, ex + nz(r, c, 2) * 6, y + 8 + l); ctx.stroke();
      for (let j = 1; j < 5; j++) leaf(ctx, ex, y + 8 + l * j / 5, 7, j % 2 ? 0.5 : 2.6, j % 2 ? '#3f8a2c' : '#5aa83a');
    }
    const h = U.hash(r * 17, c * 3);
    const px = x + 8 + U.hash(c, r * 11) * 16;
    if (h < 0.14) {
      for (let k = 0; k < 5; k++) fern(ctx, px, y + 4, 22 + U.hash(c + k, r) * 16, -Math.PI / 2 + (k - 2) * 0.42, '#5aa83a', '#3f8a2c');
    } else if (h < 0.22) {
      const glow = U.hash(c, r + 9) < 0.5 ? '127,246,255' : '213,140,255';
      const gg = ctx.createRadialGradient(px, y - 8, 0, px, y - 8, 20);
      gg.addColorStop(0, 'rgba(' + glow + ',0.45)'); gg.addColorStop(1, 'rgba(' + glow + ',0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px, y - 8, 20, 0, TAU); ctx.fill();
      for (let k = 0; k < 3; k++) {
        const mx = px + k * 6 - 6, mh = 5 + k * 3 + U.hash(k, c) * 3;
        ctx.fillStyle = '#e9e2c8'; ctx.beginPath(); ctx.roundRect(mx - 1.2, y - mh, 2.4, mh + 2, 1.2); ctx.fill();
        const cg = ctx.createRadialGradient(mx, y - mh - 2, 0.5, mx, y - mh, 5);
        cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.4, 'rgb(' + glow + ')'); cg.addColorStop(1, 'rgba(50,30,110,0.9)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(mx, y - mh, 4.5, 2.8, 0, Math.PI, 0); ctx.fill();
      }
    } else if (h < 0.28) {
      const sg = ctx.createRadialGradient(px - 3, y - 6, 1, px, y, 9);
      sg.addColorStop(0, '#a8b4a0'); sg.addColorStop(1, '#3f4a3c');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(px, y + 1, 9, 6, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = MOSS.mid; ctx.beginPath(); ctx.ellipse(px - 1, y - 4, 6, 2, 0, 0, TAU); ctx.fill();
    } else if (h < 0.34) {
      for (let k = 0; k < 3; k++) {
        const bx = px + (k - 1) * 5, fh = 8 + U.hash(c, k) * 8;
        ctx.strokeStyle = '#3f8a2c'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(bx, y + 2); ctx.quadraticCurveTo(bx - 2, y - fh * 0.5, bx, y - fh); ctx.stroke();
        ctx.fillStyle = U.hash(c + k, r) < 0.5 ? '#ffd166' : '#ff7eb6';
        for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * 2, y - fh + Math.sin(a) * 2, 1.6, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(bx, y - fh, 1.2, 0, TAU); ctx.fill();
      }
    }
  }

  // weiche Innenecken zwischen Erde/Fels in einer leeren Zelle
  function fillets(ctx, c, r, get) {
    const x = c * T, y = r * T, R = 26;
    const nat = (t) => t === 1 || t === 2;
    const C = [
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
        ctx.moveTo(P[0] + sx, P[1] + sy); ctx.lineTo(A[0] + sx, A[1]); ctx.lineTo(A[0], A[1]);
        ctx.arc(M[0], M[1], R, k[7], k[8], k[9]);
        ctx.lineTo(B[0], B[1] + sy); ctx.closePath();
      };
      path();
      ctx.fillStyle = tf === 1 ? soil(P[1]) : stoneCol(P[1]);
      ctx.fill();
      if (k[10]) {
        ctx.save(); path(); ctx.clip();
        const g = ctx.createRadialGradient(M[0], M[1], R, M[0], M[1], R + (tf === 1 ? 12 : 8));
        g.addColorStop(0, MOSS.light); g.addColorStop(0.35, MOSS.mid); g.addColorStop(1, MOSS.dark);
        ctx.strokeStyle = g; ctx.lineWidth = tf === 1 ? 22 : 14;
        ctx.beginPath(); ctx.arc(M[0], M[1], R + (tf === 1 ? 10 : 6), k[7], k[8], k[9]); ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = EDGE; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(M[0], M[1], R, k[7], k[8], k[9]); ctx.stroke();
    }
  }

  SL.Art = { OUT, nz, blob, fillStroke, leaf, drawTile, fillets };
})();
