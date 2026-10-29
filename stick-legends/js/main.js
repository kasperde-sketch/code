'use strict';
// Start, Hauptschleife, Bildschirmgröße
(function () {
  const SL = window.SL;
  const STEP = 1 / 60;

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
      this.moveTo(x + rr, y);
      this.arcTo(x + w, y, x + w, y + h, rr);
      this.arcTo(x + w, y + h, x, y + h, rr);
      this.arcTo(x, y + h, x, y, rr);
      this.arcTo(x, y, x + w, y, rr);
      this.closePath();
    };
  }

  const app = SL.app = {
    canvas: null, ctx: null, game: null, lastOpts: null, acc: 0, last: 0,

    init() {
      SL.save.load();
      document.documentElement.lang = SL.lang;
      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext('2d');
      SL.input.init(this.canvas);
      SL.menu.init(document.getElementById('ui'));
      window.addEventListener('resize', () => this.resize());
      this.resize();
      this.attract();
      SL.menu.show('main');
      this.last = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    },

    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      const scale = Math.min(this.canvas.width / SL.W, this.canvas.height / SL.H);
      SL.view = { scale, dpr, ox: (this.canvas.width - SL.W * scale) / 2, oy: (this.canvas.height - SL.H * scale) / 2 };
    },

    attract() {
      this.game = new SL.Game({ mode: 'attract', diff: 1, map: 'random' });
      SL.input.gameActive = false;
    },

    startGame(opts) {
      this.lastOpts = opts;
      SL.menu.hide();
      opts.onEnd = (r) => this.onEnd(r);
      this.game = new SL.Game(opts);
      SL.input.gameActive = true;
      this.acc = 0;
    },

    onEnd(result) {
      SL.input.gameActive = false;
      SL.menu.result = result;
      SL.menu.show('results');
    },

    pause() {
      if (!this.game || this.game.mode === 'attract' || this.game.over) return;
      this.game.paused = true;
      SL.input.gameActive = false;
      SL.menu.show('pause');
    },
    resume() {
      if (!this.game) return;
      SL.menu.hide();
      this.game.paused = false;
      SL.input.gameActive = true;
      SL.input.keys = {};
    },
    restart() { if (this.lastOpts) this.startGame(Object.assign({}, this.lastOpts)); },
    quit() {
      this.attract();
      SL.menu.show('main');
    },

    loop(now) {
      let dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      const I = SL.input;
      I.poll();
      const g = this.game;
      const menuOn = SL.menu.visible();
      if (menuOn) {
        I.menuNav(dt, SL.menu.root);
        if (I.pausePressed) {
          if (SL.menu.screen === 'pause') this.resume();
          else SL.menu.back();
        }
        if (g.mode !== 'attract' && SL.menu.screen !== 'pause' && SL.menu.screen !== 'results') this.attract();
      } else if (I.pausePressed) this.pause();

      const game = this.game;
      if (!game.paused && !game.over) {
        this.acc += dt;
        let first = true, steps = 0;
        while (this.acc >= STEP && steps < 4) {
          const inp = game.mode === 'attract' || menuOn ? SL.blankInput() : I.frame(game.player);
          if (!first) { inp.jumpP = false; inp.attackP = false; inp.dodgeP = false; inp.grabP = false; inp.abP.fill(false); inp.exP.fill(false); inp.slot = null; inp.cycle = 0; inp.invP = false; }
          game.update(STEP, inp);
          this.acc -= STEP;
          first = false;
          steps++;
        }
        if (steps === 4) this.acc = 0;
        if (steps > 0) I.endFrame();
      } else I.endFrame();
      this.render();
      requestAnimationFrame((t) => this.loop(t));
    },

    render() {
      const ctx = this.ctx, v = SL.view;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#bfe6fa';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(v.scale, 0, 0, v.scale, v.ox, v.oy);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, SL.W, SL.H);
      ctx.clip();
      this.game.draw(ctx);
      ctx.restore();
    },
  };

  window.addEventListener('DOMContentLoaded', () => app.init());
})();
