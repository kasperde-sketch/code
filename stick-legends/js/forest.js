'use strict';
// Malerischer Urwald-Hintergrund mit Ruinen, Lichtstrahlen, Nebel und Glühwürmchen
(function () {
  const SL = window.SL;
  const W = SL.W, H = SL.H, TAU = Math.PI * 2;
  const LIGHT = { x: 0.66, y: -0.05 };

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function wave(x, seed, amp, base) {
    const r = rng(seed);
    let y = base;
    for (let k = 1; k <= 4; k++) { const ph = r() * TAU, a = amp / k * (0.6 + r() * 0.8); y += Math.sin(x / W * TAU * k + ph) * a; }
    return y;
  }

  // ---------- Malwerkzeuge ----------
  function leaf(c, x, y, len, ang, col) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = col;
    c.beginPath(); c.moveTo(0, 0);
    c.quadraticCurveTo(len * 0.5, -len * 0.28, len, 0);
    c.quadraticCurveTo(len * 0.5, len * 0.28, 0, 0);
    c.fill(); c.restore();
  }
  function foliage(c, cx, cy, radius, count, dark, mid, light, R) {
    c.fillStyle = dark;
    for (let i = 0; i < count * 0.6; i++) {
      const a = R() * TAU, d = Math.sqrt(R()) * radius * 0.7;
      c.beginPath(); c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, radius * (0.14 + R() * 0.18), 0, TAU); c.fill();
    }
    for (let i = 0; i < count * 10; i++) {
      const a = R() * TAU, d = Math.sqrt(R()) * radius * 1.12;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.75;
      const shade = 0.45 + (x - cx) / radius * 0.3 - (y - cy) / radius * 0.45 + (R() - 0.5) * 0.35;
      leaf(c, x, y, radius * (0.1 + R() * 0.1), R() * TAU, shade > 0.7 ? light : shade > 0.38 ? mid : dark);
    }
  }
  function moss(c, x, y, w, R, dark, light, drips) {
    for (let i = 0; i < w / 7; i++) {
      const px = x + R() * w, r = 4 + R() * 9;
      const g = c.createRadialGradient(px, y - r * 0.4, 1, px, y, r);
      g.addColorStop(0, light); g.addColorStop(1, dark);
      c.fillStyle = g; c.beginPath(); c.arc(px, y + R() * 4, r, 0, TAU); c.fill();
    }
    if (drips) {
      c.strokeStyle = dark; c.lineCap = 'round';
      for (let i = 0; i < w / 40; i++) {
        const px = x + R() * w, l = 16 + R() * 50;
        c.lineWidth = 2 + R() * 2.5;
        c.beginPath(); c.moveTo(px, y); c.quadraticCurveTo(px + (R() - 0.5) * 10, y + l * 0.5, px + (R() - 0.5) * 6, y + l); c.stroke();
      }
    }
  }
  function stonePal(f) {
    const base = [[120, 136, 118], [96, 112, 98], [68, 82, 72]], fog = [150, 196, 168];
    const mix = (c, k) => 'rgb(' + c.map((v, i) => Math.round(lerp(v * k, fog[i], f))).join(',') + ')';
    return { light: mix(base[0], 1.25), mid: mix(base[1], 1), dark: mix(base[2], 0.9), deep: mix(base[2], 0.6) };
  }
  function block(c, x, y, w, h, pal) {
    const g = c.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, pal.light); g.addColorStop(1, pal.dark);
    c.fillStyle = g; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 4); c.fill();
  }
  function column(c, x, base, w, h, R, pal, broken, mossy) {
    const top = base - h;
    const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, pal.dark); g.addColorStop(0.3, pal.mid); g.addColorStop(0.62, pal.light); g.addColorStop(1, pal.dark);
    c.fillStyle = g;
    c.beginPath(); c.moveTo(x - w / 2, base);
    if (broken) { c.lineTo(x - w / 2, top + 26); for (let i = 0; i <= 6; i++) c.lineTo(x - w / 2 + w * i / 6, top + R() * 40); c.lineTo(x + w / 2, top + 18); }
    else { c.lineTo(x - w / 2, top); c.lineTo(x + w / 2, top); }
    c.lineTo(x + w / 2, base); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.13)'; c.lineWidth = Math.max(1, w * 0.035);
    for (let k = 1; k < 5; k++) { const fx = x - w / 2 + w * k / 5; c.beginPath(); c.moveTo(fx, top + 36); c.lineTo(fx, base - 20); c.stroke(); }
    block(c, x, base - h * 0.04, w * 1.3, h * 0.05 + 7, pal);
    if (!broken) block(c, x, top, w * 1.35, h * 0.05 + 8, pal);
    if (mossy) moss(c, x - w / 2 - 4, top + (broken ? 16 : 0), w + 8, R, '#2d5a22', '#8ccf4c', true);
  }
  function arch(c, x, base, span, h, thick, R, pal) {
    const pw = thick * 1.1;
    column(c, x - span / 2, base, pw, h, R, pal, false, false);
    column(c, x + span / 2, base, pw, h, R, pal, false, false);
    const cy = base - h, r1 = span / 2 - pw * 0.1, r2 = r1 + thick, n = 13;
    for (let i = 0; i < n; i++) {
      if (i > 8 && R() < 0.55) continue;
      const a0 = Math.PI + i / n * Math.PI + 0.012, a1 = Math.PI + (i + 1) / n * Math.PI - 0.012;
      const g = c.createRadialGradient(x, cy, r1, x, cy, r2);
      g.addColorStop(0, pal.dark); g.addColorStop(0.5, pal.light); g.addColorStop(1, pal.mid);
      c.fillStyle = g;
      c.beginPath(); c.arc(x, cy, r2, a0, a1); c.arc(x, cy, r1, a1, a0, true); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(25,35,28,0.55)'; c.lineWidth = 2.5; c.stroke();
    }
    for (let i = 0; i < 22; i++) {
      const a = Math.PI + 0.15 + R() * Math.PI * 0.6, px = x + Math.cos(a) * (r2 + 2), py = cy + Math.sin(a) * (r2 + 2), r = 5 + R() * 9;
      const g = c.createRadialGradient(px, py - r * 0.4, 1, px, py, r);
      g.addColorStop(0, '#9ad655'); g.addColorStop(1, '#2d5a22');
      c.fillStyle = g; c.beginPath(); c.arc(px, py, r, 0, TAU); c.fill();
    }
  }
  function stoneHead(c, x, base, s, R, pal) {
    const w = 170 * s, h = 210 * s, top = base - h;
    const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, pal.dark); g.addColorStop(0.55, pal.light); g.addColorStop(1, pal.dark);
    c.fillStyle = g; c.beginPath(); c.roundRect(x - w / 2, top, w, h, 34 * s); c.fill();
    c.fillStyle = pal.deep;
    c.beginPath(); c.roundRect(x - w * 0.42, top + h * 0.3, w * 0.84, h * 0.08, 8 * s); c.fill();
    for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(x + sx * w * 0.2, top + h * 0.47, w * 0.1, h * 0.06, 0, 0, TAU); c.fill(); }
    c.fillStyle = pal.mid; c.beginPath(); c.moveTo(x, top + h * 0.45); c.lineTo(x + w * 0.09, top + h * 0.68); c.lineTo(x - w * 0.09, top + h * 0.68); c.closePath(); c.fill();
    c.fillStyle = pal.deep; c.beginPath(); c.roundRect(x - w * 0.24, top + h * 0.77, w * 0.48, h * 0.07, 6 * s); c.fill();
    moss(c, x - w / 2, top + 6, w, R, '#2d5a22', '#8ccf4c', true);
  }
  function bigTree(c, x, base, w, R, col, rim) {
    const top = -40;
    const g = c.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, col.dark); g.addColorStop(0.35, col.mid); g.addColorStop(0.7, col.light); g.addColorStop(1, col.dark);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - w * 0.42, top);
    c.bezierCurveTo(x - w * 0.5, base - 360, x - w * 0.45, base - 140, x - w * 1.5, base);
    c.lineTo(x + w * 1.5, base);
    c.bezierCurveTo(x + w * 0.5, base - 150, x + w * 0.5, base - 380, x + w * 0.42, top);
    c.closePath(); c.fill();
    for (const sx of [-1, 1]) {
      const ex = x + sx * w * (1.2 + R() * 0.4);
      c.beginPath();
      c.moveTo(x + sx * w * 0.25, base - 200);
      c.bezierCurveTo(x + sx * w * 0.5, base - 110, ex - sx * 26, base - 36, ex, base + 4);
      c.lineTo(ex - sx * 36, base + 4);
      c.bezierCurveTo(x + sx * w * 0.6, base - 28, x + sx * w * 0.2, base - 70, x, base - 150);
      c.closePath(); c.fill();
    }
    c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      let px = x + (R() - 0.5) * w * 0.7;
      c.lineWidth = 2 + R() * 3;
      c.beginPath(); c.moveTo(px, top);
      for (let y = top; y < base - 50; y += 50) { px += (R() - 0.5) * 9; c.lineTo(px, y); }
      c.stroke();
    }
    c.strokeStyle = rim; c.lineWidth = w * 0.06;
    c.beginPath(); c.moveTo(x + w * 0.38, top); c.bezierCurveTo(x + w * 0.46, base - 380, x + w * 0.46, base - 150, x + w * 0.9, base - 36); c.stroke();
    for (let i = 0; i < 12; i++) {
      const py = base - 70 - R() * 480, px = x - w * 0.3 + R() * w * 0.2;
      c.fillStyle = 'rgba(64,122,44,0.5)'; c.beginPath(); c.ellipse(px, py, 5 + R() * 7, 20 + R() * 34, (R() - 0.5) * 0.3, 0, TAU); c.fill();
      c.fillStyle = 'rgba(150,205,95,0.3)'; c.beginPath(); c.ellipse(px + 3, py - 5, 3 + R() * 3, 10 + R() * 14, 0, 0, TAU); c.fill();
    }
  }

  // ---------- Ebenen ----------
  const LAYERS = [
    { factor: 0.12, blur: 2.5, build(c, R) {
      for (let i = 0; i < 5; i++) {
        const x = (i + R() * 0.6) * W / 4.5;
        c.fillStyle = 'rgba(44,96,78,0.85)';
        c.beginPath(); c.moveTo(x - 60, H); c.bezierCurveTo(x - 44, 420, x - 34, 160, x - 26, -20); c.lineTo(x + 26, -20); c.bezierCurveTo(x + 34, 160, x + 44, 420, x + 60, H); c.fill();
        foliage(c, x, 30 + R() * 60, 220, 18, 'rgba(36,86,66,0.9)', 'rgba(60,124,96,0.9)', 'rgba(120,180,140,0.9)', R);
      }
      for (let i = 0; i < 2; i++) {
        const x = (i + 0.3 + R() * 0.4) * W / 2, w = 360 + R() * 120, base = 640;
        for (let s = 0; s < 6; s++) {
          const sw = w * (1 - s * 0.14);
          c.fillStyle = s % 2 ? 'rgba(70,118,98,0.9)' : 'rgba(78,128,106,0.9)';
          c.fillRect(x - sw / 2, base - (s + 1) * 52, sw, 52);
        }
        c.fillStyle = 'rgba(40,80,64,0.95)'; c.fillRect(x - 22, base - 330, 44, 60);
      }
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(150,205,175,0.15)'); g.addColorStop(0.7, 'rgba(150,205,175,0.55)'); g.addColorStop(1, 'rgba(150,205,175,1)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    } },
    { factor: 0.3, blur: 1, build(c, R) {
      const pal = stonePal(0.3);
      c.fillStyle = 'rgba(70,120,88,1)';
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) c.lineTo(x, wave(x, 11, 24, 690));
      c.lineTo(W, H); c.closePath(); c.fill();
      arch(c, W * 0.2, 700, 280, 280, 54, R, pal);
      column(c, W * 0.47, 705, 60, 330, R, pal, false, true);
      column(c, W * 0.47 + 120, 705, 60, 210, R, pal, true, true);
      stoneHead(c, W * 0.72, 715, 1.05, R, pal);
      for (let k = 0; k < 3; k++) column(c, W * 0.88 + k * 80, 705, 50, 160 + R() * 200, R, pal, R() < 0.6, true);
      const g = c.createLinearGradient(0, 260, 0, H);
      g.addColorStop(0, 'rgba(150,205,175,0.02)'); g.addColorStop(1, 'rgba(150,205,175,0.35)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    } },
    { factor: 0.55, blur: 0, build(c, R) {
      const col = { dark: '#1d2c1c', mid: '#3a4a2c', light: '#5d6b3c' };
      c.fillStyle = '#21401f';
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) c.lineTo(x, wave(x, 23, 30, 770));
      c.lineTo(W, H); c.closePath(); c.fill();
      for (const fx of [0.08, 0.36, 0.63, 0.93]) {
        const x = fx * W + (R() - 0.5) * 60;
        bigTree(c, x, wave(x, 23, 30, 770) + 10, 70 + R() * 50, R, col, 'rgba(230,240,170,0.35)');
      }
      for (let i = 0; i < 11; i++) foliage(c, i / 10 * W + (R() - 0.5) * 80, -30 + R() * 70, 200, 22, '#0f2a14', '#2c6a24', '#7fbf45', R);
    } },
  ];

  // Vordergrund-Blätterdach (hängt oben ins Bild)
  function buildCanopy(c, R) {
    for (let i = 0; i < 9; i++) {
      const x = i / 8 * W + (R() - 0.5) * 100;
      foliage(c, x, -60 + R() * 30, 170, 18, '#04100a', '#0b2311', '#1d4a1f', R);
      for (let k = 0; k < 9; k++) leaf(c, x + (R() - 0.5) * 260, 20 + R() * 70, 40 + R() * 50, Math.PI / 2 + (R() - 0.5) * 1.2, R() < 0.5 ? '#07170b' : '#0e2a12');
    }
  }

  function glowSprite(r, g, b) {
    const s = makeCanvas(128, 128), c = s.getContext('2d');
    const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.18, `rgba(${r},${g},${b},0.75)`);
    gr.addColorStop(0.5, `rgba(${r},${g},${b},0.18)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
    return s;
  }

  const F = SL.Forest = {
    built: null, rs: 0,
    SPR: null,
    rays: [], fogs: [], motes: [],

    // Ebenen einmal vorberechnen (bei Größenänderung neu)
    ensure() {
      const rs = Math.min(1.25, Math.max(0.5, SL.view ? SL.view.scale : 1));
      if (this.built && Math.abs(rs - this.rs) < 0.15) return;
      this.rs = rs;
      this.built = LAYERS.map((L, idx) => {
        const R = rng(2000 + idx * 911);
        const raw = makeCanvas(W * rs, H * rs), c = raw.getContext('2d');
        c.scale(rs, rs);
        L.build(c, R);
        if (L.blur && 'filter' in c) {
          const out = makeCanvas(raw.width, raw.height), o = out.getContext('2d');
          o.filter = 'blur(' + L.blur * rs + 'px)'; o.drawImage(raw, 0, 0);
          return { factor: L.factor, canvas: out };
        }
        return { factor: L.factor, canvas: raw };
      });
      const cr = makeCanvas(W * rs, 260 * rs), cc = cr.getContext('2d');
      cc.scale(rs, rs); buildCanopy(cc, rng(4242));
      const blurred = makeCanvas(cr.width, cr.height), bc = blurred.getContext('2d');
      if ('filter' in bc) bc.filter = 'blur(' + 3 * rs + 'px)';
      bc.drawImage(cr, 0, 0);
      this.canopy = blurred;
      const sky = makeCanvas(W * rs * 0.5, H * rs * 0.5), sc = sky.getContext('2d');
      sc.scale(rs * 0.5, rs * 0.5);
      const g = sc.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1d4a36'); g.addColorStop(0.35, '#3c7a58'); g.addColorStop(0.7, '#7cb38a'); g.addColorStop(1, '#a7d4ae');
      sc.fillStyle = g; sc.fillRect(0, 0, W, H);
      const lx = LIGHT.x * W, ly = LIGHT.y * H;
      const lg = sc.createRadialGradient(lx, ly, 10, lx, ly, H * 0.95);
      lg.addColorStop(0, 'rgba(255,250,210,0.95)'); lg.addColorStop(0.25, 'rgba(240,255,190,0.45)'); lg.addColorStop(1, 'rgba(240,255,190,0)');
      sc.fillStyle = lg; sc.fillRect(0, 0, W, H);
      this.sky = sky;
      const post = makeCanvas(W * 0.5, H * 0.5), pc = post.getContext('2d');
      pc.scale(0.5, 0.5);
      const v = pc.createRadialGradient(W / 2, H * 0.5, H * 0.35, W / 2, H * 0.5, W * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,12,6,0.55)');
      pc.fillStyle = v; pc.fillRect(0, 0, W, H);
      this.vignette = post;
      if (!this.SPR) {
        this.SPR = { firefly: glowSprite(214, 255, 120), warm: glowSprite(255, 236, 170), fog: glowSprite(200, 235, 215), cyan: glowSprite(127, 246, 255) };
        const R = rng(77);
        for (let i = 0; i < 6; i++) this.rays.push({ x: LIGHT.x + (i - 2.5) * 0.08 + (R() - 0.5) * 0.04, w: 26 + R() * 70, spread: 0.07 + R() * 0.09, a: 0.16 + R() * 0.14, ph: R() * TAU, sp: 0.2 + R() * 0.3 });
        const R2 = rng(99);
        for (let i = 0; i < 14; i++) this.fogs.push({ x: R2() * W, y: 560 + R2() * 300, rx: 260 + R2() * 340, ry: 60 + R2() * 60, a: 0.14 + R2() * 0.14, drift: 6 + R2() * 14, factor: 0.3 + R2() * 0.4 });
        const R3 = rng(55);
        for (let i = 0; i < 70; i++) this.motes.push({ x: R3() * W, y: R3() * H, z: 0.4 + R3() * 0.8, ph: R3() * TAU, vx: (R3() - 0.5) * 12, vy: -5 - R3() * 12, fire: R3() < 0.4 });
      }
    },

    // Hintergrund mit Parallaxe zur Kamera zeichnen (Bildschirmraum)
    drawBack(ctx, cam, t) {
      this.ensure();
      ctx.drawImage(this.sky, 0, 0, W, H);
      const lay = (canvas, f) => {
        const zf = 1 + (cam.z - 1) * f;
        ctx.save();
        ctx.translate(W / 2, H / 2); ctx.scale(zf, zf);
        ctx.translate(-(W / 2 + (cam.x - W / 2) * f), -(H / 2 + (cam.y - H / 2) * f));
        ctx.drawImage(canvas, 0, 0, W, H);
        ctx.restore();
      };
      lay(this.built[0].canvas, this.built[0].factor);
      this.drawFog(ctx, cam, t, 0.45);
      lay(this.built[1].canvas, this.built[1].factor);
      this.drawRays(ctx, cam, t);
      lay(this.built[2].canvas, this.built[2].factor);
      this.drawFog(ctx, cam, t, 1);
    },

    drawRays(ctx, cam, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const len = H * 1.3;
      for (const r of this.rays) {
        const ang = 0.3 + Math.sin(t * r.sp * 0.4 + r.ph) * 0.05;
        const pulse = 0.65 + 0.35 * Math.sin(t * r.sp + r.ph * 2);
        const ox = r.x * W - (cam.x - W / 2) * 0.4, oy = -40;
        const dx = -Math.sin(ang), dy = Math.cos(ang), nx = dy, ny = -dx;
        const w0 = r.w * 0.5, w1 = r.w * 0.5 + len * r.spread;
        const g = ctx.createLinearGradient(ox, oy, ox + dx * len, oy + dy * len);
        g.addColorStop(0, `rgba(255,246,200,${r.a * pulse})`);
        g.addColorStop(0.55, `rgba(230,255,190,${r.a * pulse * 0.45})`);
        g.addColorStop(1, 'rgba(230,255,190,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(ox + nx * w0, oy + ny * w0); ctx.lineTo(ox - nx * w0, oy - ny * w0);
        ctx.lineTo(ox + dx * len - nx * w1, oy + dy * len - ny * w1); ctx.lineTo(ox + dx * len + nx * w1, oy + dy * len + ny * w1);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },

    drawFog(ctx, cam, t, maxFactor) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const f of this.fogs) {
        if (f.factor > maxFactor || (maxFactor === 1 && f.factor <= 0.45)) continue;
        let x = (f.x + t * f.drift - (cam.x - W / 2) * f.factor) % (W + f.rx * 2);
        if (x < -f.rx) x += W + f.rx * 2;
        ctx.globalAlpha = f.a * (0.8 + 0.2 * Math.sin(t * 0.3 + f.x));
        ctx.drawImage(this.SPR.fog, x - f.rx, f.y - f.ry, f.rx * 2, f.ry * 2);
      }
      ctx.restore();
    },

    // Glühwürmchen, Staub und Blätterdach vor der Spielwelt
    drawFront(ctx, cam, t, dt) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const m of this.motes) {
        m.x += (m.vx + Math.sin(t * 0.8 + m.ph) * 8) * dt;
        m.y += m.vy * dt * m.z;
        if (m.y < -20) m.y = H + 20;
        if (m.x < -20) m.x += W + 40;
        if (m.x > W + 20) m.x -= W + 40;
        const x = m.x - (cam.x - W / 2) * m.z * 0.3, y = m.y;
        if (m.fire) {
          const blink = Math.max(0, Math.sin(t * (1.3 + m.z) + m.ph));
          ctx.globalAlpha = 0.2 + 0.7 * blink;
          const s = 26 * m.z;
          ctx.drawImage(this.SPR.firefly, x - s / 2, y - s / 2, s, s);
        } else {
          ctx.globalAlpha = 0.25;
          const s = 12 * m.z;
          ctx.drawImage(this.SPR.warm, x - s / 2, y - s / 2, s, s);
        }
      }
      ctx.restore();
      // Blätterdach oben, bewegt sich mit der Welt
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
      ctx.globalAlpha = 0.96;
      ctx.drawImage(this.canopy, 0, -24 + Math.sin(t * 0.5) * 3, W, 260);
      ctx.restore();
    },

    drawPost(ctx, t) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const lx = LIGHT.x * W, ly = LIGHT.y * H;
      const b = ctx.createRadialGradient(lx, ly, 0, lx, ly, H * 0.55);
      b.addColorStop(0, `rgba(255,248,210,${0.26 + 0.04 * Math.sin(t * 0.5)})`);
      b.addColorStop(1, 'rgba(255,248,210,0)');
      ctx.fillStyle = b; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'soft-light';
      const cg = ctx.createLinearGradient(0, 0, 0, H);
      cg.addColorStop(0, 'rgba(255,220,150,0.3)'); cg.addColorStop(1, 'rgba(20,80,60,0.35)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.drawImage(this.vignette, 0, 0, W, H);
    },

    // kleines Vorschaubild für das Menü
    preview(ctx, w, h) {
      this.ensure();
      ctx.drawImage(this.sky, 0, 0, w, h);
      for (const l of this.built) ctx.drawImage(l.canvas, 0, 0, w, h);
    },
  };
})();
