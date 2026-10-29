'use strict';
// Tastatur, Maus und Gamepad
(function () {
  const SL = window.SL;
  const U = SL.U;

  SL.ABILITY_KEYS = ['KeyQ', 'KeyE', 'KeyC', 'KeyX', 'KeyZ'];
  SL.ABILITY_LABELS = ['Q', 'E', 'C', 'X', 'Z'];
  SL.EXTRA_KEYS = ['KeyR', 'KeyT', 'KeyG', 'KeyV'];
  SL.EXTRA_LABELS = ['R', 'T', 'G', 'V'];

  const GAME_KEYS = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

  SL.blankInput = function () {
    return {
      moveX: 0, jumpP: false, jumpH: false, down: false,
      attack: false, attackP: false, block: false, dodgeP: false, grabP: false,
      abP: [false, false, false, false, false],
      exP: [false, false, false, false], exH: [false, false, false, false],
      slot: null, cycle: 0, aimX: 0, aimY: 0, wheel: false,
    };
  };

  const I = SL.input = {
    keys: {},
    pressed: {},
    mouse: { x: 800, y: 400, down: [false, false, false], pressed: [false, false, false] },
    wheelDelta: 0,
    padIndex: -1,
    padBtn: [],
    padPrev: [],
    padAxes: [0, 0, 0, 0],
    usePad: false,
    aimOff: { x: 140, y: -20 },
    pausePressed: false,
    gameActive: false,

    init(canvas) {
      window.addEventListener('keydown', (e) => {
        if (I.gameActive && GAME_KEYS.has(e.code)) e.preventDefault();
        if (!I.keys[e.code]) I.pressed[e.code] = true;
        I.keys[e.code] = true;
        I.usePad = false;
        if (e.code === 'Escape' || e.code === 'KeyP') I.pausePressed = true;
      });
      window.addEventListener('keyup', (e) => { I.keys[e.code] = false; });
      window.addEventListener('blur', () => { I.keys = {}; I.mouse.down = [false, false, false]; });
      canvas.addEventListener('mousemove', (e) => { I.setMouse(e); I.usePad = false; });
      canvas.addEventListener('mousedown', (e) => {
        I.setMouse(e);
        if (e.button < 3) { I.mouse.down[e.button] = true; I.mouse.pressed[e.button] = true; }
        I.usePad = false;
      });
      window.addEventListener('mouseup', (e) => { if (e.button < 3) I.mouse.down[e.button] = false; });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('wheel', (e) => { if (I.gameActive) { e.preventDefault(); I.wheelDelta += Math.sign(e.deltaY); } }, { passive: false });
      window.addEventListener('gamepadconnected', (e) => { I.padIndex = e.gamepad.index; });
      window.addEventListener('gamepaddisconnected', (e) => { if (I.padIndex === e.gamepad.index) I.padIndex = -1; });
    },

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
    k(code) { return !!I.keys[code]; },
    kp(code) { return !!I.pressed[code]; },

    // Eingabe für die Spielerfigur in diesem Bild
    frame(player) {
      const inp = SL.blankInput();
      const k = I.k, kp = I.kp;
      let mx = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0);
      if (I.padAxes[0]) mx = I.padAxes[0];
      inp.moveX = U.clamp(mx, -1, 1);
      inp.jumpP = kp('KeyW') || kp('Space') || kp('ArrowUp') || I.padP(0);
      inp.jumpH = k('KeyW') || k('Space') || k('ArrowUp') || I.padH(0);
      inp.down = k('KeyS') || k('ArrowDown') || I.padAxes[1] > 0.6;
      inp.attack = I.mouse.down[0] || I.padH(7);
      inp.attackP = I.mouse.pressed[0] || I.padP(7);
      inp.block = I.mouse.down[2] || k('KeyB') || I.padH(6);
      inp.dodgeP = kp('ShiftLeft') || kp('ShiftRight') || I.padP(1);
      inp.grabP = kp('KeyF') || I.padP(2);
      for (let i = 0; i < 5; i++) inp.abP[i] = kp(SL.ABILITY_KEYS[i]);
      if (I.padP(3)) inp.abP[0] = true;
      if (I.padP(11)) inp.abP[1] = true;
      if (I.padP(10)) inp.abP[2] = true;
      const padEx = [12, 15, 13, 14];
      for (let i = 0; i < 4; i++) {
        inp.exP[i] = kp(SL.EXTRA_KEYS[i]) || I.padP(padEx[i]);
        inp.exH[i] = k(SL.EXTRA_KEYS[i]) || I.padH(padEx[i]);
      }
      for (let i = 0; i < 4; i++) if (kp('Digit' + (i + 1))) inp.slot = i;
      if (I.wheelDelta) inp.cycle = I.wheelDelta > 0 ? 1 : -1;
      if (I.padP(5)) inp.cycle = 1;
      if (I.padP(4)) inp.cycle = -1;
      inp.wheel = k('Tab') || I.padH(8);

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
      I.mouse.pressed = [false, false, false];
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
