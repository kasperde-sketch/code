'use strict';
// Malerischer Urwald-Stil für die Spielwelt: Moos, Waldboden, Ruinensteine, Farne, Pilze
(function () {
  const SL = window.SL;
  const U = SL.U;
  const T = SL.T;
  const OUT = '#14211a';
  const TAU = Math.PI * 2;

  function nz(x, y, s) { return U.hash(Math.round(x) + (s || 0) * 131, Math.round(y) - (s || 0) * 71) * 2 - 1; }

  // weiche, unregelmäßige Rundform
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
    if (lw) { ctx.strokeStyle = stroke || OUT; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  function leaf(ctx, x, y, len, ang, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.3, len, 0);
    ctx.quadraticCurveTo(len * 0.5, len * 0.3, 0, 0);
    ctx.fill(); ctx.restore();
  }

  // ---------- Blockformen mit runden Ecken ----------
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
  function outlineOpen(ctx, x, y, open, R, lw, col) {
    const rd = radii(open, R);
    ctx.strokeStyle = col || OUT; ctx.lineWidth = lw || 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const s of ['u', 'r', 'd', 'l']) if (open[s]) seg(ctx, x, y, T, T, rd, s);
    ctx.stroke();
  }

  // Farbverläufe nach Höhe – keine Kachelstreifen
  function soil(py) { return U.mix('#4b3624', '#1f160e', U.clamp((py - 300) / 600, 0, 1)); }
  function stone(py) { return U.mix('#8d9c8a', '#556455', U.clamp((py - 250) / 650, 0, 1)); }

  // dickes Moospolster oben auf einem Block (innerhalb der Blockform)
  function mossTop(ctx, x, y, c, r, thick) {
    const g = ctx.createLinearGradient(0, y - 2, 0, y + thick + 4);
    g.addColorStop(0, '#79c447'); g.addColorStop(0.5, '#4c9a2f'); g.addColorStop(1, '#2c6420');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 2);
    ctx.lineTo(x + T + 2, y - 2);
    const by = (k) => y + thick + nz(x + k * 8, y, 6) * 2;
    ctx.lineTo(x + T + 2, by(4));
    for (let k = 4; k > 0; k--) ctx.quadraticCurveTo(x + k * 8 - 4, by(k) + 6, x + (k - 1) * 8, by(k - 1));
    ctx.lineTo(x - 2, by(0));
    ctx.closePath();
    ctx.fill();
    for (let k = 0; k < 4; k++) {
      const px = x + 3 + U.hash(c * 5 + k, r) * 26, py = y + 2 + U.hash(c, r * 5 + k) * (thick - 4);
      ctx.fillStyle = k % 2 ? 'rgba(170,230,110,0.55)' : 'rgba(40,90,25,0.45)';
      ctx.beginPath(); ctx.arc(px, py, 1.5 + U.hash(k, c) * 2, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(190,240,130,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 2, y + 2); ctx.lineTo(x + T + 2, y + 2); ctx.stroke();
  }

  // get(dc, dr) → Typ des Nachbarn (0 = leer)
  function drawTile(ctx, t, c, r, hp, life, get, stage) {
    const x = c * T, y = r * T;
    const open = { u: !get(0, -1), d: !get(0, 1), l: !get(-1, 0), r: !get(1, 0) };
    const h = U.hash(c, r);
    if (stage === 2) { if (t === 5) leaves(ctx, x, y, c, r); return; }
    if (stage === 3) {
      if ((t === 1 || t === 2) && open.u) topDecor(ctx, x, y, c, r, t, get);
      if ((t === 1 || t === 2) && open.d && !get(0, 2)) hangingMoss(ctx, x, y, c, r);
      return;
    }
    switch (t) {
      case 1: { // Waldboden
        ctx.save();
        shape(ctx, x, y, open, 16);
        const g = ctx.createLinearGradient(0, y, 0, y + T);
        g.addColorStop(0, soil(y)); g.addColorStop(1, soil(y + T));
        ctx.fillStyle = g; ctx.fill();
        ctx.clip();
        if (h > 0.55) {
          ctx.strokeStyle = 'rgba(120,90,60,0.35)'; ctx.lineWidth = 1.6 + h * 1.5; ctx.lineCap = 'round';
          const sx = x + U.hash(r, c) * T;
          ctx.beginPath(); ctx.moveTo(sx, y - 2); ctx.bezierCurveTo(sx + 8, y + 10, sx - 6, y + 20, sx + 4, y + T + 2); ctx.stroke();
        }
        if (h < 0.18) {
          const px = x + 8 + U.hash(c * 3, r) * 16, py = y + (open.u ? 18 : 8) + U.hash(c, r * 3) * 8;
          const sg = ctx.createRadialGradient(px - 2, py - 2, 0.5, px, py, 5);
          sg.addColorStop(0, '#9aa596'); sg.addColorStop(1, '#4f5a4c');
          ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(px, py, 5, 3.6, 0, 0, TAU); ctx.fill();
        }
        if (open.u) mossTop(ctx, x, y, c, r, 11);
        if (open.l || open.r) {
          ctx.fillStyle = 'rgba(60,120,40,0.45)';
          if (open.l) { ctx.beginPath(); ctx.ellipse(x, y + 12 + h * 10, 5, 9, 0, 0, TAU); ctx.fill(); }
          if (open.r) { ctx.beginPath(); ctx.ellipse(x + T, y + 18 - h * 8, 5, 9, 0, 0, TAU); ctx.fill(); }
        }
        ctx.restore();
        outlineOpen(ctx, x, y, open, 16, 2);
        break;
      }
      case 2: { // uralter Ruinenstein
        ctx.save();
        shape(ctx, x, y, open, 8);
        const g = ctx.createLinearGradient(x, y, x + T, y + T);
        g.addColorStop(0, U.mix(stone(y), '#ffffff', 0.12)); g.addColorStop(1, U.mix(stone(y + T), '#000000', 0.12));
        ctx.fillStyle = g; ctx.fill();
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 2, y + T - 3); ctx.lineTo(x + 2, y + 2); ctx.lineTo(x + T - 3, y + 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(20,30,22,0.45)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(x + T, y + 0.5); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + T); ctx.stroke();
        if (h > 0.82) {
          ctx.strokeStyle = 'rgba(30,45,32,0.5)'; ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (let a = 0; a < 4.2 * Math.PI; a += 0.3) {
            const rr = 1 + a * 0.75, px = x + 16 + Math.cos(a) * rr, py = y + 16 + Math.sin(a) * rr;
            if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        } else if (h < 0.2) {
          ctx.fillStyle = 'rgba(70,130,45,0.5)';
          ctx.beginPath(); ctx.ellipse(x + 10 + h * 40, y + 20, 8, 5, 0.3, 0, TAU); ctx.fill();
        }
        if (open.u) mossTop(ctx, x, y, c, r, 7);
        ctx.restore();
        outlineOpen(ctx, x, y, open, 8, 2);
        break;
      }
      case 3: { // bemooster Baumstamm
        const top = y + 1, bot = y + T - 2, cy = (top + bot) / 2, ry = (bot - top) / 2;
        const lx = open.l ? x + 6 : x - 0.7, rx = open.r ? x + T - 6 : x + T + 0.7;
        ctx.beginPath(); ctx.rect(lx, top, rx - lx, bot - top);
        const bg = ctx.createLinearGradient(0, top, 0, bot);
        bg.addColorStop(0, '#6e5236'); bg.addColorStop(0.5, '#4f3a26'); bg.addColorStop(1, '#2b1f14');
        ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = 'rgba(20,12,6,0.5)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lx, cy - 4); ctx.bezierCurveTo(x + 12, cy - 2, x + 22, cy - 6, rx, cy - 4);
        ctx.moveTo(lx, bot - 6); ctx.bezierCurveTo(x + 8, bot - 4, x + 20, bot - 8, rx, bot - 6);
        ctx.stroke();
        ctx.save(); ctx.beginPath(); ctx.rect(lx, top - 4, rx - lx, 14); ctx.clip();
        for (let k = 0; k < 5; k++) {
          const px = lx + U.hash(c * 7 + k, r) * (rx - lx);
          const mg = ctx.createRadialGradient(px, top, 1, px, top + 2, 7);
          mg.addColorStop(0, '#8fd04f'); mg.addColorStop(1, '#2e6a22');
          ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(px, top + 2, 6 + U.hash(k, c) * 3, 0, TAU); ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = OUT; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lx, bot); ctx.lineTo(rx, bot); ctx.stroke();
        for (const [isOpen, ex] of [[open.l, x + 6], [open.r, x + T - 6]]) {
          if (!isOpen) continue;
          ctx.beginPath(); ctx.ellipse(ex, cy, 6.5, ry, 0, 0, TAU);
          fillStroke(ctx, '#b48a58', 2);
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
        const g = ctx.createRadialGradient(cx - 5, cy - 6, 2, cx, cy, 18);
        g.addColorStop(0, '#a9b5a4'); g.addColorStop(1, '#4b5848');
        ctx.fillStyle = g; ctx.fill();
        ctx.save(); rock(); ctx.clip();
        if (open.u) {
          blob(ctx, cx - 2, cy - 15, 13, c + r * 5, 7, 0.55);
          const mg = ctx.createLinearGradient(0, cy - 20, 0, cy - 6);
          mg.addColorStop(0, '#8fd04f'); mg.addColorStop(1, '#2e6a22');
          ctx.fillStyle = mg; ctx.fill();
        }
        ctx.fillStyle = 'rgba(20,30,20,0.25)';
        ctx.beginPath(); ctx.ellipse(cx + 5, cy + 8, 12, 6, 0, 0, TAU); ctx.fill();
        ctx.restore();
        rock(); fillStroke(ctx, null, 2);
        break;
      }
      case 6: { // Baumstamm
        const g = ctx.createLinearGradient(x + 5, 0, x + T - 5, 0);
        g.addColorStop(0, '#1d2c1c'); g.addColorStop(0.4, '#3a4a2c'); g.addColorStop(0.75, '#5d6b3c'); g.addColorStop(1, '#1d2c1c');
        ctx.beginPath();
        ctx.moveTo(x + 6, y); ctx.bezierCurveTo(x + 4, y + 10, x + 7, y + 22, x + 6, y + T);
        ctx.lineTo(x + T - 6, y + T); ctx.bezierCurveTo(x + T - 5, y + 22, x + T - 8, y + 10, x + T - 6, y);
        ctx.closePath();
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.bezierCurveTo(x + 12, y + 12, x + 16, y + 20, x + 14, y + T); ctx.stroke();
        ctx.fillStyle = 'rgba(70,130,45,0.5)';
        ctx.beginPath(); ctx.ellipse(x + 10, y + 10 + h * 12, 3, 8, 0, 0, TAU); ctx.fill();
        break;
      }
      case 7: { // Erdwall als Ruinenquader
        const a = life > 0 && life < 1.5 ? 0.5 + 0.5 * Math.sin(life * 20) : 1;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, T - 3, T - 3, 6);
        const g = ctx.createLinearGradient(x, y, x + T, y + T);
        g.addColorStop(0, '#a7b29d'); g.addColorStop(1, '#5a6656');
        fillStroke(ctx, g, 2);
        ctx.strokeStyle = 'rgba(30,45,32,0.45)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x + 8, y + 16); ctx.lineTo(x + 24, y + 16); ctx.moveTo(x + 16, y + 8); ctx.lineTo(x + 16, y + 24); ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
    }
    const info = SL.TILES[t];
    if (info && info.destr && hp < info.hp) {
      const dmg = 1 - hp / info.hp;
      ctx.strokeStyle = 'rgba(15,20,15,' + (0.45 + dmg * 0.5) + ')';
      ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 16, y + 16); ctx.quadraticCurveTo(x + 10, y + 12, x + 6, y + 7);
      ctx.moveTo(x + 16, y + 16); ctx.quadraticCurveTo(x + 24, y + 13, x + 27, y + 6);
      if (dmg > 0.5) { ctx.moveTo(x + 16, y + 16); ctx.quadraticCurveTo(x + 20, y + 23, x + 17, y + 28); ctx.moveTo(x + 16, y + 16); ctx.quadraticCurveTo(x + 9, y + 20, x + 6, y + 24); }
      ctx.stroke();
    }
  }

  function leaves(ctx, x, y, c, r) {
    const cx = x + T / 2 + nz(c, r, 3) * 6, cy = y + T / 2 + nz(c, r, 4) * 5;
    ctx.fillStyle = '#16351a';
    blob(ctx, cx, cy, 20, c * 13 + r * 7, 8); ctx.fill();
    for (let i = 0; i < 22; i++) {
      const a = U.hash(c * 31 + i, r) * TAU, d = Math.sqrt(U.hash(c, r * 31 + i)) * 22;
      const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.85;
      const shade = 0.5 + (px - cx) / 22 * 0.3 - (py - cy) / 22 * 0.45 + (U.hash(i, c + r) - 0.5) * 0.3;
      leaf(ctx, px, py, 9 + U.hash(i, r) * 7, U.hash(c + i, r * 3) * TAU, shade > 0.7 ? '#8fd04f' : shade > 0.4 ? '#3f8a2c' : '#1f4a1c');
    }
    if (U.hash(c, r + 3) > 0.8) {
      ctx.fillStyle = '#ff7eb6';
      ctx.beginPath(); ctx.arc(cx + 6, cy - 4, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(cx + 6, cy - 4, 1.2, 0, TAU); ctx.fill();
    }
  }

  function fern(ctx, x, y, len, ang, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.1, len, len * 0.15); ctx.stroke();
    for (let i = 1; i < 9; i++) {
      const t = i / 9, px = len * t, py = -len * 0.1 * 4 * t * (1 - t) + len * 0.15 * t * t, l = len * 0.3 * (1 - t * 0.8);
      leaf(ctx, px, py, l, -1.1, col); leaf(ctx, px, py, l, 1.1, col);
    }
    ctx.restore();
  }

  function hangingMoss(ctx, x, y, c, r) {
    if (U.hash(c * 7, r * 3) < 0.45) return;
    ctx.strokeStyle = 'rgba(55,110,38,0.85)'; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const px = x + 5 + U.hash(c + k, r) * 22, l = 8 + U.hash(c, r + k) * 22;
      ctx.lineWidth = 2 + U.hash(k, c) * 2;
      ctx.beginPath(); ctx.moveTo(px, y + T - 1); ctx.quadraticCurveTo(px + 3, y + T + l * 0.5, px - 1, y + T + l); ctx.stroke();
      leaf(ctx, px - 1, y + T + l, 6, 1.4, '#4c9a2f');
    }
  }

  function topDecor(ctx, x, y, c, r, t, get) {
    if (get(0, -1) || get(0, -2)) return;
    ctx.strokeStyle = '#5aa83a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      if (U.hash(c * 5 + k, r) < 0.4) continue;
      const bx = x + 3 + k * 6.5, hh = 5 + U.hash(c + k, r * 3) * 8, lean = nz(k, c, 8) * 3;
      ctx.beginPath(); ctx.moveTo(bx, y + 2); ctx.quadraticCurveTo(bx + lean * 0.3, y - hh * 0.5, bx + lean, y - hh); ctx.stroke();
    }
    const h = U.hash(r * 17, c * 3);
    const px = x + 8 + U.hash(c, r * 11) * 16;
    if (h < 0.14) {
      for (let k = 0; k < 4; k++) fern(ctx, px, y + 3, 16 + U.hash(c + k, r) * 12, -Math.PI / 2 + (k - 1.5) * 0.5, k % 2 ? '#3f8a2c' : '#5aa83a');
    } else if (h < 0.22) {
      const glow = U.hash(c, r + 9) < 0.5 ? '127,246,255' : '213,140,255';
      const gg = ctx.createRadialGradient(px, y - 8, 0, px, y - 8, 18);
      gg.addColorStop(0, 'rgba(' + glow + ',0.45)'); gg.addColorStop(1, 'rgba(' + glow + ',0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px, y - 8, 18, 0, TAU); ctx.fill();
      for (let k = 0; k < 2; k++) {
        const mx = px + k * 7 - 3, mh = 6 + k * 4;
        ctx.fillStyle = '#e9e2c8'; ctx.fillRect(mx - 1.2, y - mh, 2.4, mh + 1);
        const cg = ctx.createRadialGradient(mx, y - mh - 2, 0.5, mx, y - mh, 5);
        cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.5, 'rgb(' + glow + ')'); cg.addColorStop(1, 'rgba(60,40,120,0.9)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(mx, y - mh, 4.5, 3, 0, Math.PI, 0); ctx.fill();
      }
    } else if (h < 0.28) {
      const sg = ctx.createRadialGradient(px - 2, y - 4, 0.5, px, y - 2, 6);
      sg.addColorStop(0, '#a9b5a4'); sg.addColorStop(1, '#4b5848');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(px, y - 1, 6, 4, 0, Math.PI, 0); ctx.fill();
    } else if (h < 0.33) {
      ctx.strokeStyle = '#3f7a1f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, y + 1); ctx.quadraticCurveTo(px - 2, y - 6, px, y - 10); ctx.stroke();
      ctx.fillStyle = U.hash(c, r) < 0.5 ? '#ffd166' : '#ff7eb6';
      ctx.beginPath(); ctx.arc(px, y - 11, 2.6, 0, TAU); ctx.fill();
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
      ctx.fillStyle = tf === 1 ? soil(P[1]) : stone(P[1]);
      ctx.fill();
      if (k[10]) {
        ctx.save(); path(); ctx.clip();
        ctx.strokeStyle = '#4c9a2f'; ctx.lineWidth = tf === 1 ? 22 : 14;
        ctx.beginPath(); ctx.arc(M[0], M[1], R, k[7], k[8], k[9]); ctx.stroke();
        ctx.strokeStyle = 'rgba(190,240,130,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(M[0], M[1], R + 2.5, k[7], k[8], k[9]); ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(M[0], M[1], R, k[7], k[8], k[9]); ctx.stroke();
    }
  }

  SL.Art = { OUT, nz, blob, fillStroke, leaf, drawTile, fillets };
})();
