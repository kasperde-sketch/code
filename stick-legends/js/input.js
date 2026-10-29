'use strict';
// Tastatur, Maus und Gamepad – Tasten frei belegbar
(function () {
  const SL = window.SL;
  const U = SL.U;

  // Aktionen mit Standardbelegung (je 2 Plätze)
  SL.KEY_ACTIONS = [
    ['left', ['KeyA', 'ArrowLeft']], ['right', ['KeyD', 'ArrowRight']], ['jump', ['KeyW', 'Space']], ['down', ['KeyS', 'ArrowDown']],
    ['attack', ['Mouse0', null]], ['block', ['Mouse2', 'KeyB']], ['dodge', ['ShiftLeft', null]], ['grab', ['KeyF', null]],
    ['w1', ['Digit1', null]], ['w2', ['Digit2', null]], ['w3', ['Digit3', null]], ['w4', ['Digit4', null]], ['wheel', ['Tab', null]],
    ['ab1', ['KeyQ', null]], ['ab2', ['KeyE', null]], ['ab3', ['KeyC', null]], ['ab4', ['KeyX', null]], ['ab5', ['KeyZ', null]],
    ['ex1', ['KeyR', null]], ['ex2', ['KeyT', null]], ['ex3', ['KeyG', null]], ['ex4', ['KeyV', null]],
    ['inv', ['KeyI', null]], ['pause', ['Escape', 'KeyP']],
  ];
  SL.defaultKeys = function () {
    const o = {};
    for (const [a, k] of SL.KEY_ACTIONS) o[a] = k.slice();
    return o;
  };

  const NAMES = {
    de: { Mouse0: 'Linksklick', Mouse1: 'Mausrad-Klick', Mouse2: 'Rechtsklick', Mouse3: 'Maus 4', Mouse4: 'Maus 5', Space: 'Leertaste', ShiftLeft: 'Shift', ShiftRight: 'Shift rechts', ControlLeft: 'Strg', ControlRight: 'Strg rechts', AltLeft: 'Alt', Escape: 'Esc', Enter: 'Enter', Backspace: '⌫', CapsLock: 'Feststell' },
    en: { Mouse0: 'Left click', Mouse1: 'Middle click', Mouse2: 'Right click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5', Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Right Shift', ControlLeft: 'Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Alt', Escape: 'Esc', Enter: 'Enter', Backspace: '⌫', CapsLock: 'Caps' },
  };
  const ARROWS = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
  SL.keyName = function (code) {
    if (!code) return '—';
    const lbl = SL.save && SL.save.data.settings.keyLabels && SL.save.data.settings.keyLabels[code];
    if (lbl) return lbl;
    const n = NAMES[SL.lang] || NAMES.de;
    if (n[code]) return n[code];
    if (ARROWS[code]) return ARROWS[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad/.test(code)) return 'Num ' + code.slice(6);
    return code;
  };

  SL.blankInput = function () {
    return {
      moveX: 0, jumpP: false, jumpH: false, down: false,
      attack: false, attackP: false, block: false, dodgeP: false, grabP: false,
      abP: [false, false, false, false, false],
      exP: [false, false, false, false], exH: [false, false, false, false],
      slot: null, cycle: 0, aimX: 0, aimY: 0, wheel: false, invP: false,
    };
  };

  const I = SL.input = {
    keys: {},
    pressed: {},
    mouse: { x: 800, y: 400 },
    wheelDelta: 0,
    padIndex: -1,
    padBtn: [],
    padPrev: [],
    padAxes: [0, 0, 0, 0],
    usePad: false,
    aimOff: { x: 140, y: -20 },
    pausePressed: false,
    gameActive: false,
    capture: null, // Funktion, die die nächste Taste zum Belegen bekommt

    init(canvas) {
      window.addEventListener('keydown', (e) => {
        if (I.capture) {
          e.preventDefault(); e.stopPropagation();
          const fn = I.capture; I.capture = null;
          fn(e.code === 'Escape' ? null : e.code, e.key);
          return;
        }
        if (I.gameActive && (I.isGameKey(e.code) || e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow'))) e.preventDefault();
        if (!I.keys[e.code]) I.pressed[e.code] = true;
        I.keys[e.code] = true;
        I.usePad = false;
        if (e.code === 'Escape' || I.bound('pause', e.code)) I.pausePressed = true;
      }, true);
      window.addEventListener('keyup', (e) => { I.keys[e.code] = false; });
      window.addEventListener('blur', () => { I.keys = {}; });
      window.addEventListener('mousedown', (e) => {
        if (I.capture && e.button < 5) {
          e.preventDefault(); e.stopPropagation();
          const fn = I.capture; I.capture = null;
          fn('Mouse' + e.button, null);
        }
      }, true);
      canvas.addEventListener('mousemove', (e) => { I.setMouse(e); I.usePad = false; });
      canvas.addEventListener('mousedown', (e) => {
        I.setMouse(e);
        const c = 'Mouse' + e.button;
        if (!I.keys[c]) I.pressed[c] = true;
        I.keys[c] = true;
        I.usePad = false;
      });
      window.addEventListener('mouseup', (e) => { I.keys['Mouse' + e.button] = false; });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('wheel', (e) => { if (I.gameActive) { e.preventDefault(); I.wheelDelta += Math.sign(e.deltaY); } }, { passive: false });
      window.addEventListener('gamepadconnected', (e) => { I.padIndex = e.gamepad.index; });
      window.addEventListener('gamepaddisconnected', (e) => { if (I.padIndex === e.gamepad.index) I.padIndex = -1; });
    },

    binds(action) { return (SL.save.data.settings.keys[action] || []).filter((c) => c); },
    bound(action, code) { return this.binds(action).includes(code); },
    isGameKey(code) {
      const k = SL.save.data.settings.keys;
      for (const a in k) if (a !== 'pause' && k[a].includes(code)) return true;
      return false;
    },
    down(action) { return this.binds(action).some((c) => I.keys[c]); },
    hit(action) { return this.binds(action).some((c) => I.pressed[c]); },
    label(action) { const b = this.binds(action); return b.length ? SL.keyName(b[0]) : ''; },

    setMouse(e) {
      const v = SL.view;
      if (!v) return;
      const rect = e.target.getBoundingClientRect();
      const px = (e.clientX - rect.left) * v.dpr, py = (e.clientY - rect.top) * v.dpr;
      I.mouse.x = (px - v.ox) / v.scale;
      I.mouse.y = (py - v.oy) / v.scale;
    },

    poll() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let pad = null;
      if (pads) {
        if (I.padIndex >= 0 && pads[I.padIndex]) pad = pads[I.padIndex];
        else for (const p of pads) if (p && p.connected) { pad = p; I.padIndex = p.index; break; }
      }
      I.padPrev = I.padBtn;
      if (!pad) { I.padBtn = []; I.padAxes = [0, 0, 0, 0]; return; }
      I.padBtn = pad.buttons.map((b) => b.pressed || b.value > 0.4);
      I.padAxes = [0, 1, 2, 3].map((i) => {
        const v = pad.axes[i] || 0;
        return Math.abs(v) < 0.22 ? 0 : v;
      });
      if (I.padBtn.some((b) => b) || I.padAxes.some((a) => a !== 0)) I.usePad = true;
      if (I.padP(9)) I.pausePressed = true;
    },

    padH(i) { return !!I.padBtn[i]; },
    padP(i) { return !!I.padBtn[i] && !I.padPrev[i]; },

    // Eingabe für die Spielerfigur in diesem Bild
    frame(player) {
      const inp = SL.blankInput();
      let mx = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);
      if (I.padAxes[0]) mx = I.padAxes[0];
      inp.moveX = U.clamp(mx, -1, 1);
      inp.jumpP = I.hit('jump') || I.padP(0);
      inp.jumpH = I.down('jump') || I.padH(0);
      inp.down = I.down('down') || I.padAxes[1] > 0.6;
      inp.attack = I.down('attack') || I.padH(7);
      inp.attackP = I.hit('attack') || I.padP(7);
      inp.block = I.down('block') || I.padH(6);
      inp.dodgeP = I.hit('dodge') || I.padP(1);
      inp.grabP = I.hit('grab') || I.padP(2);
      for (let i = 0; i < 5; i++) inp.abP[i] = I.hit('ab' + (i + 1));
      if (I.padP(3)) inp.abP[0] = true;
      if (I.padP(11)) inp.abP[1] = true;
      if (I.padP(10)) inp.abP[2] = true;
      const padEx = [12, 15, 13, 14];
      for (let i = 0; i < 4; i++) {
        inp.exP[i] = I.hit('ex' + (i + 1)) || I.padP(padEx[i]);
        inp.exH[i] = I.down('ex' + (i + 1)) || I.padH(padEx[i]);
      }
      for (let i = 0; i < 4; i++) if (I.hit('w' + (i + 1))) inp.slot = i;
      if (I.wheelDelta) inp.cycle = I.wheelDelta > 0 ? 1 : -1;
      if (I.padP(5)) inp.cycle = 1;
      if (I.padP(4)) inp.cycle = -1;
      inp.wheel = I.down('wheel') || I.padH(8);
      inp.invP = I.hit('inv');

      const cx = player ? player.x : SL.W / 2, cy = player ? player.y - 34 : SL.H / 2;
      if (I.usePad) {
        const ax = I.padAxes[2], ay = I.padAxes[3];
        if (U.hypot(ax, ay) > 0.3) { I.aimOff.x = ax * 220; I.aimOff.y = ay * 220; }
        else if (inp.moveX) { I.aimOff.x = Math.sign(inp.moveX) * Math.max(140, Math.abs(I.aimOff.x)); }
        inp.aimX = cx + I.aimOff.x;
        inp.aimY = cy + I.aimOff.y;
      } else {
        inp.aimX = I.mouse.x;
        inp.aimY = I.mouse.y;
      }
      return inp;
    },

    // Rohe Zielrichtung fürs Waffenrad
    wheelVector(player) {
      if (I.usePad) return { x: I.padAxes[2], y: I.padAxes[3] };
      return { x: I.mouse.x - player.x, y: I.mouse.y - (player.y - 34) };
    },

    endFrame() {
      I.pressed = {};
      I.wheelDelta = 0;
      I.pausePressed = false;
    },

    // Menüsteuerung per Gamepad
    navT: 0,
    menuNav(dt, root) {
      if (!I.padBtn.length) return;
      I.navT -= dt;
      const items = Array.from(root.querySelectorAll('button:not([disabled]), [data-nav]')).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      let idx = items.indexOf(document.activeElement);
      let dir = 0;
      if (I.padP(12) || I.padP(14) || (I.padAxes[1] < -0.5 && I.navT <= 0)) dir = -1;
      if (I.padP(13) || I.padP(15) || (I.padAxes[1] > 0.5 && I.navT <= 0)) dir = 1;
      if (dir) {
        I.navT = 0.22;
        idx = idx < 0 ? 0 : (idx + dir + items.length) % items.length;
        items[idx].focus();
      }
      if (I.padP(0) && idx >= 0) items[idx].click();
      if (I.padP(1)) {
        const b = root.querySelector('[data-back]');
        if (b) b.click();
      }
    },
  };
})();
