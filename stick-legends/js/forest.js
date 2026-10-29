'use strict';
// Urwald im Stil des Hintergrunds: Tiefennebel, gotische Ruinen, Urwaldriesen, God Rays, Vordergrund
(function () {
  const SL = window.SL;
  const W = SL.W, H = SL.H, TAU = Math.PI * 2;
  const K = H / 1080;          // Malmaßstab (gemalt wird in 1080er Einheiten)
  const MX = 420, MY = 140;    // Ränder für Parallaxe und Zoom
  const LIGHT = { x: 0.64, y: -0.06 };
  const COL = {
    skyTop: '#06141a', skyMid: '#0d3a33', skyLow: '#1d6b5a', skyHaze: '#5fb8a4',
    moss: '#4f9a2f', mossLight: '#9ad655', mossDark: '#1f4a1c',
    ray: '255,236,160', cyanFog: '95,214,208', pollen: '220,255,150',
  };

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => SL.U.mix(a, b, t);
  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  // sichtbarer Bereich einer Ebene in Mal-Einheiten
  const X0 = -MX / K, X1 = (W + MX) / K, TOP = -MY / K, BOT = (H + MY) / K;
  const spread = (i, n, R) => X0 + (i + 0.2 + R() * 0.6) / n * (X1 - X0);
  function wave(x, seed, amp, base) {
    const r = rng(seed);
    let y = base;
    for (let k = 1; k <= 5; k++) { const ph = r() * TAU, a = amp / k * (0.6 + r() * 0.8); y += Math.sin(x * 0.0018 * k + ph) * a; }
    return y;
  }

  // ---------- Vegetation ----------
  function leaf(c, x, y, len, ang, col, vein) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = col;
    c.beginPath(); c.moveTo(0, 0);
    c.bezierCurveTo(len * 0.25, -len * 0.32, len * 0.7, -len * 0.3, len, 0);
    c.bezierCurveTo(len * 0.7, len * 0.26, len * 0.25, len * 0.28, 0, 0);
    c.fill();
    if (vein) {
      c.strokeStyle = vein; c.lineWidth = Math.max(0.6, len * 0.04);
      c.beginPath(); c.moveTo(len * 0.05, 0); c.quadraticCurveTo(len * 0.5, -len * 0.04, len * 0.92, 0); c.stroke();
    }
    c.restore();
  }
  function foliage(c, cx, cy, radius, count, dark, mid, light, R) {
    c.fillStyle = dark;
    for (let i = 0; i < count * 0.6; i++) {
      const a = R() * TAU, d = Math.sqrt(R()) * radius * 0.7;
      c.beginPath(); c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, radius * (0.14 + R() * 0.18), 0, TAU); c.fill();
    }
    for (let i = 0; i < count * 11; i++) {
      const a = R() * TAU, d = Math.sqrt(R()) * radius * 1.12;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.75;
      const shade = 0.45 + (x - cx) / radius * 0.3 - (y - cy) / radius * 0.45 + (R() - 0.5) * 0.35;
      leaf(c, x, y, radius * (0.1 + R() * 0.1), R() * TAU, shade > 0.7 ? light : shade > 0.38 ? mid : dark);
    }
  }
  function fern(c, x, y, len, ang, colA, colB, R) {
    c.save(); c.translate(x, y); c.rotate(ang);
    const pt = (t) => {
      const curl = t > 0.82 ? (t - 0.82) / 0.18 : 0;
      return [len * t, -len * 0.16 * Math.sin(t * Math.PI) + len * 0.12 * t * t - curl * curl * len * 0.06];
    };
    c.strokeStyle = colB; c.lineWidth = Math.max(1.4, len * 0.018); c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i <= 20; i++) { const p = pt(i / 20); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
    c.stroke();
    for (let i = 1; i < 18; i++) {
      const t = i / 18, p = pt(t), l = len * 0.3 * (1 - t * 0.85) * (t < 0.1 ? t * 10 : 1);
      leaf(c, p[0], p[1], l, -1.15 + (R() - 0.5) * 0.15, i % 2 ? colA : colB, 'rgba(0,0,0,0.18)');
      leaf(c, p[0], p[1], l * 0.95, 1.1 + (R() - 0.5) * 0.15, colB, 'rgba(0,0,0,0.18)');
    }
    const e = pt(1);
    c.beginPath(); c.arc(e[0] - 2, e[1] + 2, len * 0.025 + 1.5, 0, Math.PI * 1.6); c.stroke();
    c.restore();
  }
  function fernBush(c, x, y, size, R, colA, colB) {
    const n = 5 + Math.floor(R() * 3);
    for (let k = 0; k < n; k++) fern(c, x + (R() - 0.5) * 16, y + 6, size * (0.7 + R() * 0.5), -Math.PI / 2 + (k - (n - 1) / 2) * 0.42 + (R() - 0.5) * 0.2, colA, colB, R);
  }
  function moss(c, x, y, w, R, dark, light, drips) {
    for (let i = 0; i < w / 4; i++) {
      const px = x + R() * w, r = 3 + R() * 8, py = y + R() * 4;
      const g = c.createRadialGradient(px, py - r * 0.35, 0.5, px, py, r);
      g.addColorStop(0, light); g.addColorStop(1, dark);
      c.fillStyle = g; c.beginPath(); c.ellipse(px, py, r * 1.3, r * 0.55, 0, 0, TAU); c.fill();
    }
    if (drips) {
      c.strokeStyle = dark; c.lineCap = 'round';
      for (let i = 0; i < w / 34; i++) {
        const px = x + R() * w, l = 14 + R() * 60;
        c.lineWidth = 1.6 + R() * 2.6;
        c.beginPath(); c.moveTo(px, y); c.quadraticCurveTo(px + (R() - 0.5) * 12, y + l * 0.5, px + (R() - 0.5) * 6, y + l); c.stroke();
      }
    }
  }
  function ivy(c, x, y, len, R, col) {
    let px = x, py = y;
    c.strokeStyle = '#1d3a16'; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(px, py);
    const pts = [];
    for (let i = 0; i < len / 14; i++) { px += (R() - 0.5) * 12; py += 14; c.lineTo(px, py); pts.push([px, py]); }
    c.stroke();
    for (const [lx, ly] of pts) leaf(c, lx, ly, 8 + R() * 6, (R() < 0.5 ? 0.3 : Math.PI - 0.3) + (R() - 0.5) * 0.6, R() < 0.5 ? col : mix(col, '#000000', 0.3));
  }

  // ---------- Steinbau ----------
  function stonePal(fog) {
    const f = '#5fa59a';
    return {
      light: mix('#8fa594', f, fog), mid: mix('#5d7466', f, fog), dark: mix('#34463c', f, fog), deep: mix('#18231d', f, fog * 0.9),
      joint: 'rgba(10,18,14,' + (0.55 * (1 - fog * 0.7)) + ')',
    };
  }
  function ashlar(c, x, y, w, h, pal, R) {
    const v = (R() - 0.5) * 0.18;
    c.fillStyle = pal.mid;
    c.beginPath(); c.roundRect(x, y, w, h, 2); c.fill();
    c.fillStyle = v > 0 ? 'rgba(255,255,255,' + v * 0.6 + ')' : 'rgba(0,0,0,' + (-v) + ')';
    c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x + 1, y + 1, w - 2, 2.5);
    c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(x + 1, y + h - 3, w - 2, 2.5);
    c.strokeStyle = pal.joint; c.lineWidth = 1.6; c.strokeRect(x, y, w, h);
  }
  function crack(c, x, y, len, R, col) {
    c.strokeStyle = col; c.lineWidth = 1.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y);
    let px = x, py = y;
    for (let i = 0; i < 5; i++) { px += (R() - 0.5) * 12; py += len / 5; c.lineTo(px, py); }
    c.stroke();
  }
  function pillar(c, x, base, w, h, pal, R, opt) {
    const course = 34, top = base - h, broken = opt && opt.broken;
    c.save();
    if (broken) {
      c.beginPath(); c.moveTo(x - w * 0.7, base + 2); c.lineTo(x - w * 0.7, top + 20);
      for (let i = 0; i <= 6; i++) c.lineTo(x - w / 2 + w * i / 6, top + R() * 34);
      c.lineTo(x + w * 0.7, top + 14); c.lineTo(x + w * 0.7, base + 2); c.closePath(); c.clip();
    }
    c.fillStyle = pal.deep; c.fillRect(x - w / 2 - 2, top, w + 4, h);
    let row = 0;
    for (let y = base - course; y > top - course; y -= course) {
      const yy = Math.max(top, y), hh = y + course - yy;
      let xx = x - w / 2 - (row % 2 ? w * 0.45 : 0);
      while (xx < x + w / 2) {
        const bw = w * (0.45 + R() * 0.2);
        const a = Math.max(x - w / 2, xx), b = Math.min(x + w / 2, xx + bw);
        if (b - a > 4) ashlar(c, a, yy, b - a, hh, pal, R);
        xx += bw;
      }
      row++;
    }
    const lg = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    lg.addColorStop(0, 'rgba(0,0,0,0.35)'); lg.addColorStop(0.55, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(255,240,190,0.12)');
    c.fillStyle = lg; c.fillRect(x - w / 2, top, w, h);
    c.fillStyle = pal.dark; c.beginPath(); c.roundRect(x - w * 0.65, base - 22, w * 1.3, 22, 3); c.fill();
    c.fillStyle = pal.light; c.fillRect(x - w * 0.65, base - 22, w * 1.3, 3);
    if (!broken) {
      c.fillStyle = pal.dark; c.beginPath(); c.roundRect(x - w * 0.7, top - 16, w * 1.4, 20, 3); c.fill();
      c.fillStyle = pal.light; c.fillRect(x - w * 0.7, top - 16, w * 1.4, 3);
    }
    for (let i = 0; i < 2; i++) crack(c, x + (R() - 0.5) * w * 0.6, top + h * (0.15 + R() * 0.5), 40 + R() * 50, R, pal.joint);
    c.restore();
    if (opt && opt.moss) moss(c, x - w * 0.7, top - (broken ? -10 : 14), w * 1.4, R, COL.mossDark, COL.mossLight, true);
    if (opt && opt.ivy) ivy(c, x - w / 2 + 4, top + 10, h * 0.7, R, '#3f8a2c');
  }
  function gothicArch(c, x, base, span, h, th, pal, R, opt) {
    const pw = th * 1.15;
    pillar(c, x - span / 2 - pw / 2, base, pw, h, pal, R, { moss: true, ivy: opt && opt.ivy });
    pillar(c, x + span / 2 + pw / 2, base, pw, h, pal, R, { moss: true });
    const sy = base - h, r1 = span, r2 = span + th;
    const lc = { x: x + span / 2, y: sy }, rc = { x: x - span / 2, y: sy };
    const n = 7, broken = opt && opt.broken;
    for (const side of [-1, 1]) {
      const ctr = side < 0 ? lc : rc;
      const a0 = side < 0 ? Math.PI : 0, a1 = side < 0 ? Math.PI + Math.PI / 3 : -Math.PI / 3;
      for (let i = 0; i < n; i++) {
        if (broken && side > 0 && i >= n - 3 && R() < 0.7) continue;
        const b0 = a0 + (a1 - a0) * i / n, b1 = a0 + (a1 - a0) * (i + 1) / n;
        const s = Math.min(b0, b1), e = Math.max(b0, b1);
        c.beginPath(); c.arc(ctr.x, ctr.y, r2, s, e); c.arc(ctr.x, ctr.y, r1, e, s, true); c.closePath();
        const g = c.createRadialGradient(ctr.x, ctr.y, r1, ctr.x, ctr.y, r2);
        g.addColorStop(0, pal.dark); g.addColorStop(0.45, pal.light); g.addColorStop(1, pal.mid);
        c.fillStyle = g; c.fill();
        c.strokeStyle = pal.joint; c.lineWidth = 2; c.stroke();
      }
    }
    const ax = x, ay = sy - Math.sin(Math.PI / 3) * span;
    if (!broken) {
      c.beginPath(); c.moveTo(ax - th * 0.35, ay - th * 0.9); c.lineTo(ax + th * 0.35, ay - th * 0.9); c.lineTo(ax + th * 0.22, ay + th * 0.15); c.lineTo(ax - th * 0.22, ay + th * 0.15); c.closePath();
      c.fillStyle = pal.light; c.fill(); c.strokeStyle = pal.joint; c.lineWidth = 2; c.stroke();
    }
    for (let i = 0; i < 30; i++) {
      const side = R() < 0.5 ? -1 : 1, ctr = side < 0 ? lc : rc;
      const a = side < 0 ? Math.PI + R() * Math.PI / 3 : -R() * Math.PI / 3;
      const px = ctr.x + Math.cos(a) * (r2 + 1), py = ctr.y + Math.sin(a) * (r2 + 1);
      if (py > sy - 10) continue;
      const r = 4 + R() * 7, tang = side < 0 ? a + Math.PI / 2 : a - Math.PI / 2;
      const g = c.createRadialGradient(px, py - r * 0.4, 0.5, px, py, r * 1.2);
      g.addColorStop(0, COL.mossLight); g.addColorStop(1, COL.mossDark);
      c.fillStyle = g; c.beginPath(); c.ellipse(px, py, r * 1.4, r * 0.6, tang, 0, TAU); c.fill();
    }
    c.strokeStyle = '#1f4a1c'; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const px = x + (R() - 0.5) * span * 0.8, py = ay + 30 + Math.abs(px - x) * 0.9, l = 60 + R() * 120;
      c.lineWidth = 2 + R() * 2;
      c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + (R() - 0.5) * 20, py + l * 0.5, px + (R() - 0.5) * 10, py + l); c.stroke();
      for (let k = 1; k < 6; k++) leaf(c, px + (R() - 0.5) * 8, py + l * k / 6, 9 + R() * 6, R() < 0.5 ? 0.5 : 2.6, '#3f8a2c');
    }
  }
  function traceryWall(c, x, base, w, h, pal, R) {
    c.save();
    c.beginPath(); c.moveTo(x - w / 2, base + 2);
    for (let i = 0; i <= 8; i++) c.lineTo(x - w / 2 + w * i / 8, base - h + R() * h * 0.25);
    c.lineTo(x + w / 2, base + 2); c.closePath(); c.clip();
    c.fillStyle = pal.mid; c.fillRect(x - w / 2, base - h, w, h);
    c.strokeStyle = pal.joint; c.lineWidth = 1.4;
    for (let y = base - 30; y > base - h; y -= 30) { c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y); c.stroke(); }
    const ww = w * 0.42, wy = base - h * 0.2, wh = h * 0.55;
    c.fillStyle = pal.deep;
    c.beginPath(); c.moveTo(x - ww / 2, wy); c.lineTo(x - ww / 2, wy - wh);
    c.arc(x + ww / 2, wy - wh, ww, Math.PI, Math.PI + Math.PI / 3);
    c.arc(x - ww / 2, wy - wh, ww, -Math.PI / 3, 0);
    c.lineTo(x + ww / 2, wy); c.closePath(); c.fill();
    c.strokeStyle = pal.light; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x, wy); c.lineTo(x, wy - wh); c.stroke();
    const rx = x, ry = wy - wh - ww * 0.35, rr = ww * 0.26;
    c.beginPath(); c.arc(rx, ry, rr, 0, TAU); c.stroke();
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; c.beginPath(); c.arc(rx + Math.cos(a) * rr * 0.55, ry + Math.sin(a) * rr * 0.55, rr * 0.38, 0, TAU); c.stroke(); }
    c.restore();
    moss(c, x - w / 2, base - h + h * 0.1, w, R, 'rgba(40,90,60,0.9)', 'rgba(120,190,130,0.9)', true);
  }
  function bigTree(c, x, base, w, R, col) {
    const top = TOP;
    const g = c.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, col.dark); g.addColorStop(0.35, col.mid); g.addColorStop(0.7, col.light); g.addColorStop(1, col.dark);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - w * 0.42, top);
    c.bezierCurveTo(x - w * 0.5, base - 420, x - w * 0.45, base - 160, x - w * 1.5, base);
    c.lineTo(x + w * 1.5, base);
    c.bezierCurveTo(x + w * 0.5, base - 170, x + w * 0.5, base - 440, x + w * 0.42, top);
    c.closePath(); c.fill();
    for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) {
      const ex = x + sx * w * (1.1 + k * 0.7 + R() * 0.3);
      c.beginPath();
      c.moveTo(x + sx * w * 0.25, base - 220 - k * 40);
      c.bezierCurveTo(x + sx * w * 0.5, base - 120, ex - sx * 30, base - 40, ex, base + 4);
      c.lineTo(ex - sx * 40, base + 4);
      c.bezierCurveTo(x + sx * w * 0.6, base - 30, x + sx * w * 0.2, base - 80, x, base - 160);
      c.closePath(); c.fill();
    }
    c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      let px = x + (R() - 0.5) * w * 0.7;
      c.lineWidth = 2 + R() * 4;
      c.beginPath(); c.moveTo(px, top);
      for (let y = top; y < base - 60; y += 60) { px += (R() - 0.5) * 10; c.lineTo(px, y); }
      c.stroke();
    }
    c.strokeStyle = 'rgba(255,236,170,0.3)'; c.lineWidth = w * 0.06;
    c.beginPath(); c.moveTo(x + w * 0.38, top); c.bezierCurveTo(x + w * 0.46, base - 440, x + w * 0.46, base - 170, x + w * 0.9, base - 40); c.stroke();
    for (let i = 0; i < 16; i++) {
      const py = base - 80 - R() * 560, px = x - w * 0.3 + R() * w * 0.2;
      c.fillStyle = 'rgba(64,122,44,0.5)'; c.beginPath(); c.ellipse(px, py, 6 + R() * 8, 24 + R() * 40, (R() - 0.5) * 0.3, 0, TAU); c.fill();
      c.fillStyle = 'rgba(150,205,95,0.3)'; c.beginPath(); c.ellipse(px + 3, py - 6, 3 + R() * 4, 12 + R() * 16, 0, 0, TAU); c.fill();
    }
    ivy(c, x - w * 0.3, base - 520, 420, R, '#3f8a2c');
  }
  function ground(c, seed, amp, base, fill) {
    c.fillStyle = fill;
    c.beginPath(); c.moveTo(X0 - 20, BOT);
    for (let x = X0 - 20; x <= X1 + 20; x += 20) c.lineTo(x, wave(x, seed, amp, base));
    c.lineTo(X1 + 20, BOT); c.closePath(); c.fill();
  }

  // ---------- Ebenen (Faktor = Parallaxe, < 1 hinten, > 1 vorne) ----------
  const LAYERS = [
    { factor: 0.06, blur: 4, build(c, R) {
      for (let i = 0; i < 6; i++) {
        const px = spread(i, 6, R);
        c.fillStyle = 'rgba(30,90,92,0.8)';
        c.beginPath(); c.moveTo(px - 60, BOT); c.bezierCurveTo(px - 46, 520, px - 34, 160, px - 26, TOP); c.lineTo(px + 26, TOP); c.bezierCurveTo(px + 34, 160, px + 46, 520, px + 60, BOT); c.fill();
        foliage(c, px, 20 + R() * 70, 250, 20, 'rgba(26,82,80,0.9)', 'rgba(44,118,108,0.9)', 'rgba(110,180,160,0.9)', R);
      }
      for (let i = 0; i < 2; i++) traceryWall(c, spread(i, 2, R), 820, 360, 520, stonePal(0.82), R);
      const g = c.createLinearGradient(0, TOP, 0, 1080);
      g.addColorStop(0, 'rgba(' + COL.cyanFog + ',0.10)'); g.addColorStop(0.6, 'rgba(' + COL.cyanFog + ',0.45)'); g.addColorStop(1, 'rgba(' + COL.cyanFog + ',0.85)');
      c.fillStyle = g; c.fillRect(X0, TOP, X1 - X0, BOT - TOP);
    } },
    { factor: 0.14, blur: 2, build(c, R) {
      const pal = stonePal(0.55);
      ground(c, 5, 30, 800, 'rgba(40,100,86,1)');
      for (let i = 0; i < 3; i++) {
        const px = spread(i, 3, R);
        if (i % 2) gothicArch(c, px, 810, 140, 300, 40, pal, R, { broken: R() < 0.5 });
        else { pillar(c, px - 90, 810, 50, 360, pal, R, { moss: true }); pillar(c, px + 40, 810, 50, 240, pal, R, { moss: true, broken: true }); }
      }
      const g = c.createLinearGradient(0, 200, 0, 1080);
      g.addColorStop(0, 'rgba(' + COL.cyanFog + ',0.06)'); g.addColorStop(1, 'rgba(' + COL.cyanFog + ',0.5)');
      c.fillStyle = g; c.fillRect(X0, TOP, X1 - X0, BOT - TOP);
    } },
    { factor: 0.28, blur: 0.8, build(c, R) {
      const pal = stonePal(0.18);
      ground(c, 11, 34, 860, '#1e4a35');
      const items = [
        (x) => gothicArch(c, x, 870, 190, 380, 56, pal, R, { ivy: true }),
        (x) => { pillar(c, x, 880, 70, 470, pal, R, { moss: true, ivy: true }); pillar(c, x + 150, 880, 70, 300, pal, R, { moss: true, broken: true }); },
        (x) => gothicArch(c, x, 870, 160, 320, 50, pal, R, { broken: true }),
      ];
      items.forEach((fn, i) => fn(spread(i, items.length, R)));
      for (let i = 0; i < 12; i++) {
        const x = X0 + R() * (X1 - X0), y = wave(x, 11, 34, 860) + 4;
        ashlar(c, x, y - 18 - R() * 10, 26 + R() * 30, 16 + R() * 10, pal, R);
        moss(c, x, y - 22, 30, R, COL.mossDark, COL.mossLight, false);
      }
      const g = c.createLinearGradient(0, 300, 0, 1080);
      g.addColorStop(0, 'rgba(' + COL.cyanFog + ',0)'); g.addColorStop(1, 'rgba(' + COL.cyanFog + ',0.28)');
      c.fillStyle = g; c.fillRect(X0, TOP, X1 - X0, BOT - TOP);
    } },
    { factor: 0.48, blur: 0, build(c, R) {
      const col = { dark: '#0f1c16', mid: '#2a3b2a', light: '#4d5e38' };
      for (let i = 0; i < 4; i++) bigTree(c, spread(i, 4, R), 1000, 85 + R() * 60, R, col);
      for (let i = 0; i < 12; i++) foliage(c, X0 + (i + R() * 0.5) / 12 * (X1 - X0), -50 + R() * 90, 240, 26, '#0b2410', '#22622a', '#79bf48', R);
    } },
  ];
  // unscharfer Vordergrund: Äste oben in den Ecken, Farne unten in den Ecken
  const FRONT = { factor: 1.3, blur: 6, build(c, R) {
    for (const [px, dir] of [[X0 + 260, 1], [X1 - 260, -1], [(X0 + X1) / 2 + 300, -1]]) {
      const len = 520 + R() * 260, ex = px + dir * len, ey = 40 + R() * 70;
      c.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        c.strokeStyle = k ? '#0f1c12' : '#050b07'; c.lineWidth = k ? 24 : 32;
        c.beginPath(); c.moveTo(px - dir * 80, TOP);
        c.bezierCurveTo(px + dir * len * 0.2, ey + 100, px + dir * len * 0.6, ey - 50, ex, ey); c.stroke();
      }
      for (let k = 0; k < 6; k++) {
        const t = 0.3 + k * 0.12;
        foliage(c, lerp(px, ex, t), lerp(40, ey, t) + 10, 80 + R() * 50, 14, '#020805', '#08180d', '#14341a', R);
      }
    }
    for (const px of [X0 + 300, X1 - 300]) fernBush(c, px, BOT - 60, 240 + R() * 80, R, '#05140a', '#0a2210');
  } };

  function glowSprite(rgb) {
    const s = makeCanvas(128, 128), c = s.getContext('2d');
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(0.18, 'rgba(' + rgb + ',0.75)');
    g.addColorStop(0.5, 'rgba(' + rgb + ',0.18)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    return s;
  }

  function buildLayer(L, idx, rs) {
    const R = rng(4000 + idx * 977);
    const raw = makeCanvas((W + MX * 2) * rs, (H + MY * 2) * rs), c = raw.getContext('2d');
    c.scale(rs, rs); c.translate(MX, MY); c.scale(K, K);
    L.build(c, R);
    if (L.blur && 'filter' in c) {
      const out = makeCanvas(raw.width, raw.height), o = out.getContext('2d');
      o.filter = 'blur(' + L.blur * rs + 'px)'; o.drawImage(raw, 0, 0);
      return { factor: L.factor, canvas: out };
    }
    return { factor: L.factor, canvas: raw };
  }

  const F = SL.Forest = {
    built: null, rs: 0, SPR: null,
    rays: [], fogs: [], motes: [], vines: [],

    ensure() {
      const rs = Math.min(1, Math.max(0.5, SL.view ? SL.view.scale : 1));
      if (this.built && Math.abs(rs - this.rs) < 0.15) return;
      this.rs = rs;
      this.built = LAYERS.map((L, i) => buildLayer(L, i, rs));
      this.front = buildLayer(FRONT, 9, rs);
      const sky = makeCanvas(W * 0.5, H * 0.5), sc = sky.getContext('2d');
      sc.scale(0.5, 0.5);
      const g = sc.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, COL.skyTop); g.addColorStop(0.35, COL.skyMid); g.addColorStop(0.72, COL.skyLow); g.addColorStop(1, COL.skyHaze);
      sc.fillStyle = g; sc.fillRect(0, 0, W, H);
      const lx = LIGHT.x * W, ly = LIGHT.y * H;
      const lg = sc.createRadialGradient(lx, ly, 10, lx, ly, H * 0.95);
      lg.addColorStop(0, 'rgba(255,246,200,0.95)'); lg.addColorStop(0.22, 'rgba(220,255,190,0.4)'); lg.addColorStop(1, 'rgba(200,255,190,0)');
      sc.fillStyle = lg; sc.fillRect(0, 0, W, H);
      this.sky = sky;
      const vg = makeCanvas(W * 0.5, H * 0.5), vc = vg.getContext('2d');
      vc.scale(0.5, 0.5);
      const v = vc.createRadialGradient(W / 2, H * 0.5, H * 0.32, W / 2, H * 0.5, W * 0.72);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,10,14,0.62)');
      vc.fillStyle = v; vc.fillRect(0, 0, W, H);
      this.vignette = vg;
      if (!this.SPR) {
        this.SPR = { pollen: glowSprite(COL.pollen), warm: glowSprite(COL.ray), fog: glowSprite(COL.cyanFog), mist: glowSprite('200,240,220') };
        const R = rng(77);
        for (let i = 0; i < 7; i++) this.rays.push({ x: LIGHT.x + (i - 3) * 0.07 + (R() - 0.5) * 0.04, w: 22 + R() * 66, spread: 0.06 + R() * 0.1, a: 0.16 + R() * 0.14, ph: R() * TAU, sp: 0.2 + R() * 0.3 });
        const R2 = rng(99);
        for (let i = 0; i < 18; i++) { const d = i % 3; this.fogs.push({ x: R2() * W, y: [560, 680, 800][d] + (R2() - 0.5) * 80, rx: 240 + R2() * 340, ry: 60 + R2() * 60, a: [0.3, 0.22, 0.16][d] * (0.6 + R2() * 0.6), drift: 6 + R2() * 14, factor: [0.15, 0.4, 0.75][d], cyan: d < 2 }); }
        const R3 = rng(55);
        for (let i = 0; i < 110; i++) { const z = 0.3 + R3() * 1; this.motes.push({ x: R3() * W, y: R3() * H, z, r: (1 + R3() * 2) * z, ph: R3() * TAU, vx: (R3() - 0.5) * 12, vy: -5 - R3() * 12, fire: R3() < 0.35 }); }
        const R4 = rng(31);
        for (let i = 0; i < 8; i++) this.vines.push({ x: R4() * (W + 300) - 150, len: 160 + R4() * 260, phase: R4() * TAU, w: 3 + R4() * 3 });
      }
    },

    // Ebene mit Parallaxe und Kamera-Zoom zeichnen
    layer(ctx, L, cam) {
      const f = L.factor, zf = 1 + (cam.z - 1) * f;
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.scale(zf, zf);
      ctx.translate(-(W / 2 + (cam.x - W / 2) * f), -(H / 2 + (cam.y - H / 2) * f));
      ctx.drawImage(L.canvas, -MX, -MY, W + MX * 2, H + MY * 2);
      ctx.restore();
    },

    drawBack(ctx, cam, t) {
      this.ensure();
      ctx.drawImage(this.sky, 0, 0, W, H);
      this.layer(ctx, this.built[0], cam);
      this.drawFog(ctx, cam, t, 0);
      this.layer(ctx, this.built[1], cam);
      this.drawRays(ctx, cam, t);
      this.layer(ctx, this.built[2], cam);
      this.drawMotes(ctx, cam, t, false);
      this.drawFog(ctx, cam, t, 1);
      this.layer(ctx, this.built[3], cam);
      this.drawVines(ctx, cam, t);
    },

    drawRays(ctx, cam, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const len = H * 1.35;
      for (const r of this.rays) {
        const ang = 0.3 + Math.sin(t * r.sp * 0.4 + r.ph) * 0.05;
        const pulse = 0.65 + 0.35 * Math.sin(t * r.sp + r.ph * 2);
        const ox = r.x * W - (cam.x - W / 2) * 0.3, oy = -40;
        const dx = -Math.sin(ang), dy = Math.cos(ang), nx = dy, ny = -dx;
        const w0 = r.w * 0.5, w1 = r.w * 0.5 + len * r.spread;
        const g = ctx.createLinearGradient(ox, oy, ox + dx * len, oy + dy * len);
        g.addColorStop(0, 'rgba(' + COL.ray + ',' + r.a * pulse + ')');
        g.addColorStop(0.55, 'rgba(230,255,190,' + r.a * pulse * 0.45 + ')');
        g.addColorStop(1, 'rgba(230,255,190,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(ox + nx * w0, oy + ny * w0); ctx.lineTo(ox - nx * w0, oy - ny * w0);
        ctx.lineTo(ox + dx * len - nx * w1, oy + dy * len - ny * w1); ctx.lineTo(ox + dx * len + nx * w1, oy + dy * len + ny * w1);
        ctx.closePath(); ctx.fill();
        Object.assign(r, { _ox: ox, _dx: dx, _dy: dy, _w0: w0, _pulse: pulse });
      }
      ctx.restore();
    },

    rayLight(x, y) {
      let best = 0;
      for (const r of this.rays) {
        if (r._ox == null) continue;
        const px = x - r._ox, py = y + 40, along = px * r._dx + py * r._dy;
        if (along < 0) continue;
        const across = Math.abs(px * r._dy - py * r._dx), half = r._w0 + along * r.spread;
        if (across < half) best = Math.max(best, (1 - across / half) * (1 - along / (H * 1.35)) * r._pulse);
      }
      return best;
    },

    drawFog(ctx, cam, t, band) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const f of this.fogs) {
        const b = f.factor < 0.3 ? 0 : f.factor < 0.6 ? 1 : 2;
        if (b !== band) continue;
        const span = W + f.rx * 2;
        let x = (f.x + t * f.drift - (cam.x - W / 2) * f.factor) % span;
        if (x < 0) x += span;
        x -= f.rx;
        ctx.globalAlpha = f.a * (0.8 + 0.2 * Math.sin(t * 0.3 + f.x));
        ctx.drawImage(f.cyan ? this.SPR.fog : this.SPR.mist, x - f.rx, f.y - (cam.y - H / 2) * f.factor - f.ry, f.rx * 2, f.ry * 2);
      }
      ctx.restore();
    },

    drawVines(ctx, cam, t) {
      const f = 0.55;
      ctx.save(); ctx.lineCap = 'round';
      for (const v of this.vines) {
        const x = v.x - (cam.x - W / 2) * f, top = -10 - (cam.y - H / 2) * f;
        const sway = Math.sin(t * 0.6 + v.phase) * 18, bottom = top + v.len;
        const ex = x + sway, cx1 = x + sway * 0.3, my = top + v.len * 0.55;
        ctx.strokeStyle = '#132b12'; ctx.lineWidth = v.w;
        ctx.beginPath(); ctx.moveTo(x, top); ctx.quadraticCurveTo(cx1, my, ex, bottom); ctx.stroke();
        for (let k = 1; k < 8; k++) {
          const tt = k / 8;
          const px = (1 - tt) * (1 - tt) * x + 2 * (1 - tt) * tt * cx1 + tt * tt * ex;
          const py = (1 - tt) * (1 - tt) * top + 2 * (1 - tt) * tt * my + tt * tt * bottom;
          leaf(ctx, px, py, 12 + v.w * 2, (k % 2 ? 0.6 : 2.5) + Math.sin(t + k) * 0.12, k % 2 ? '#2e6a22' : '#3f8a2c');
        }
      }
      ctx.restore();
    },

    drawMotes(ctx, cam, t, front) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const m of this.motes) {
        if ((m.z > 0.9) !== front) continue;
        const x = m.x - (cam.x - W / 2) * m.z * 0.3, y = m.y;
        if (m.fire) {
          ctx.globalAlpha = 0.2 + 0.7 * Math.max(0, Math.sin(t * (1.3 + m.z) + m.ph));
          const s = m.r * 13; ctx.drawImage(this.SPR.pollen, x - s / 2, y - s / 2, s, s);
        } else {
          ctx.globalAlpha = 0.08 + this.rayLight(x, y) * 0.9;
          const s = m.r * 7; ctx.drawImage(this.SPR.warm, x - s / 2, y - s / 2, s, s);
        }
      }
      ctx.restore();
    },

    // vor der Spielwelt: Bodennebel, Glühwürmchen, unscharfer Vordergrund
    drawFront(ctx, cam, t, dt) {
      for (const m of this.motes) {
        m.x += (m.vx + Math.sin(t * 0.8 + m.ph) * 8) * dt;
        m.y += m.vy * dt * m.z;
        if (m.y < -20) m.y = H + 20;
        if (m.x < -20) m.x += W + 40;
        if (m.x > W + 20) m.x -= W + 40;
      }
      this.drawFog(ctx, cam, t, 2);
      this.drawMotes(ctx, cam, t, true);
      this.layer(ctx, this.front, cam);
    },

    drawPost(ctx, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const lx = LIGHT.x * W, ly = LIGHT.y * H;
      const b = ctx.createRadialGradient(lx, ly, 0, lx, ly, H * 0.55);
      b.addColorStop(0, 'rgba(255,244,200,' + (0.28 + 0.04 * Math.sin(t * 0.5)) + ')'); b.addColorStop(1, 'rgba(255,244,200,0)');
      ctx.fillStyle = b; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'soft-light';
      const cg = ctx.createLinearGradient(0, 0, 0, H);
      cg.addColorStop(0, 'rgba(255,214,140,0.3)'); cg.addColorStop(0.6, 'rgba(30,140,100,0.12)'); cg.addColorStop(1, 'rgba(10,40,70,0.4)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.drawImage(this.vignette, 0, 0, W, H);
    },

    preview(ctx, w, h) {
      this.ensure();
      ctx.drawImage(this.sky, 0, 0, w, h);
      const sx = w / W, sy = h / H;
      for (const l of this.built) ctx.drawImage(l.canvas, -MX * sx, -MY * sy, (W + MX * 2) * sx, (H + MY * 2) * sy);
    },
  };
})();
