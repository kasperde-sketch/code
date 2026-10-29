'use strict';
// Kämpfer: Bewegung, Tricks, Angriffe, Schaden, Animation
(function () {
  const SL = window.SL;
  const U = SL.U;
  const P = SL.P;
  const T = SL.T;
  const BW = 22, BH = 62;
  const TWO_HANDED = { spear: 1, hammer: 1, firestaff: 1, lightstaff: 1, rockets: 1, gravity: 1 };

  class Fighter {
    constructor(game, o) {
      this.game = game;
      this.id = o.id;
      this.name = o.name;
      this.color = o.color;
      this.team = o.team;
      this.isPlayer = !!o.isPlayer;
      this.ai = null;
      this.look = o.look || { hat: 'none', face: 'normal', cape: 'none' };
      this.capeColor = SL.CAPES[this.look.cape] ? SL.CAPES[this.look.cape].color : null;
      this.species = o.species || null;
      this.weapons = (o.weapons || []).slice(0, 4);
      while (this.weapons.length < 4) this.weapons.push(null);
      this.abilities = (o.abilities || []).filter((a) => a);
      this.extras = (o.extras || []).slice(0, 4);
      while (this.extras.length < 4) this.extras.push(null);
      this.dmgMult = o.dmgMult || 1;

      this.armor = 0; this.speedMult = o.speed || 1; this.maxJumps = 2; this.jumpMult = 1;
      for (const id of this.extras) {
        const e = SL.EXTRAS[id];
        if (!e) continue;
        if (e.armor) this.armor += e.armor;
        if (e.speed) this.speedMult *= e.speed;
        if (e.jumps) this.maxJumps += e.jumps;
        if (e.jumpMult) this.jumpMult *= e.jumpMult;
      }
      this.hasHelmet = this.extras.includes('helmet');
      this.hasChest = this.extras.includes('chest');
      this.hasJetpack = this.extras.includes('jetpack');

      this.maxHp = o.hp || 100;
      this.hp = this.maxHp;
      this.mana = 100;
      this.jetFuel = 100;
      this.x = o.x; this.y = o.y; this.vx = 0; this.vy = 0;
      this.facing = o.facing || 1;
      this.grounded = false; this.wallDir = 0; this.coyote = 0; this.jumpBuf = 0;
      this.jumpsLeft = this.maxJumps - 1;
      this.airDodged = false;
      this.state = 'normal';
      this.stunT = 0; this.dodgeT = 0; this.dodgeDir = 1; this.dodgeCd = 0; this.invulnT = 0.6;
      this.knockT = 0; this.flashT = 0; this.cooldownT = 0; this.comboTimer = 0; this.combo = 0;
      this.bubbleT = 0; this.invisT = 0; this.slowT = 0; this.burnT = 0; this.burnBy = null; this.thrownT = 0; this.thrownBy = null;
      this.climb = null;
      this.attack = null;
      this.charge = 0;
      this.gravWell = null;
      this.blocking = false;
      this.holding = null; this.heldBy = null; this.grabT = 0;
      this.hook = null;
      this.lastAttacker = null; this.lastAttackT = -99; this.lastHitKind = ''; this.lastCombo = 0;
      this.prevAttack = false;
      this.inpDown = false; this.crouchS = 0;
      this.phase = 0;
      this.aimX = this.x + this.facing * 100; this.aimY = this.y - 34;
      this.wAngWorld = 0;
      this.weaponIdx = Math.max(0, this.weapons.findIndex((w) => w));
      this.ammo = {}; this.ammoT = {};
      for (const id of this.weapons) {
        const w = SL.WEAPONS[id];
        if (w && w.ammo) { this.ammo[id] = w.ammo; this.ammoT[id] = 0; }
      }
      this.abCd = this.abilities.map(() => 0);
      this.exCd = this.extras.map(() => 0);
      this.kills = 0;

      this.tg = [];
      for (let i = 0; i < 11; i++) this.tg.push({ x: this.x, y: this.y });
      this.skel = new SL.Skeleton(this.x, this.y);
      this.computePose(0);
      this.skel.snap(this.tg);
      this.cape = [];
      for (let i = 0; i < 5; i++) this.cape.push({ x: this.x, y: this.y - 47 + i * 7, px: this.x, py: this.y - 47 + i * 7 });
      this.tail = [];
      for (let i = 1; i <= 7; i++) this.tail.push({ x: this.x - this.facing * i * 6, y: this.y - 26, px: this.x - this.facing * i * 6, py: this.y - 26 });
    }

    get weapon() { return SL.WEAPONS[this.weapons[this.weaponIdx]] || SL.WEAPONS.fists; }
    get alive() { return this.state !== 'dead'; }
    get cx() { return this.skel.p[P.PELVIS].x * 0.6 + this.skel.p[P.NECK].x * 0.4; }
    get cy() { return this.skel.p[P.PELVIS].y * 0.6 + this.skel.p[P.NECK].y * 0.4; }
    get canAct() { return this.state === 'normal' && this.game.actionsAllowed; }

    shoulder() {
      const n = this.skel.p[P.NECK];
      return { x: n.x, y: n.y + 2 };
    }
    aimDir() {
      const s = this.shoulder();
      const dx = this.aimX - s.x, dy = this.aimY - s.y, l = U.hypot(dx, dy) || 1;
      return { x: dx / l, y: dy / l };
    }
    bodyNear(x, y, r) { return this.skel.distTo(x, y) < r; }

    // ---------- Hauptupdate ----------
    update(dt, inp) {
      const world = this.game.world;
      if (this.state === 'dead') { this.skel.ragdoll(dt, world); this.updateCape(dt); return; }
      this.tickTimers(dt);
      if (this.state === 'held') { this.updateHeld(dt); this.updateCape(dt); return; }
      if (this.state === 'ragdoll') {
        this.skel.ragdoll(dt, world);
        const pv = this.skel.p[P.PELVIS];
        this.x = pv.x; this.y = pv.y + 28; this.vx = pv.vx; this.vy = pv.vy;
        this.stunT -= dt;
        if (this.thrownT > 0) this.checkThrownImpact();
        if (this.stunT <= 0 && (U.hypot(pv.vx, pv.vy) < 280 || this.stunT < -1.2)) this.getUp();
        this.updateCape(dt);
        return;
      }
      if (this.state === 'climb') {
        this.updateClimb(dt);
        this.computePose(dt);
        this.skel.follow(this.tg, dt);
        this.updateCape(dt);
        return;
      }
      const ai = this.game.actionsAllowed ? inp : SL.blankInput();
      if (!this.game.actionsAllowed) { ai.aimX = inp.aimX; ai.aimY = inp.aimY; }
      this.handleActions(dt, ai);
      if (this.state !== 'normal') return;
      this.move(dt, ai);
      this.computePose(dt);
      this.skel.follow(this.tg, dt);
      if (this.holding) this.holding.pinTo = this.skel.p[P.HAND_R];
      this.updateCape(dt);
    }

    tickTimers(dt) {
      const dec = (k) => { if (this[k] > 0) this[k] = Math.max(0, this[k] - dt); };
      dec('invulnT'); dec('dodgeCd'); dec('cooldownT'); dec('comboTimer'); dec('flashT');
      dec('bubbleT'); dec('invisT'); dec('slowT'); dec('knockT'); dec('thrownT');
      for (let i = 0; i < this.abCd.length; i++) if (this.abCd[i] > 0) this.abCd[i] = Math.max(0, this.abCd[i] - dt);
      for (let i = 0; i < this.exCd.length; i++) if (this.exCd[i] > 0) this.exCd[i] = Math.max(0, this.exCd[i] - dt);
      if (!this.gravWell) this.mana = Math.min(100, this.mana + 16 * dt);
      if (this.grounded) this.jetFuel = Math.min(100, this.jetFuel + 30 * dt);
      for (const id in this.ammo) {
        const w = SL.WEAPONS[id];
        if (this.ammo[id] < w.ammo) {
          this.ammoT[id] += dt;
          if (this.ammoT[id] >= w.regen) { this.ammo[id]++; this.ammoT[id] = 0; }
        }
      }
      if (this.burnT > 0) {
        this.burnT -= dt;
        this.applyDot(5 * dt, this.burnBy);
        if (Math.random() < 0.5) this.game.fx.add(this.cx + U.rand(-6, 6), this.cy + U.rand(-14, 10), U.rand(-20, 20), U.rand(-90, -40), 0.4, U.rand(3, 5), U.pick(['#ff9f43', '#ffd166', '#ff6b35']), { grow: -6 });
      }
      if (this.slowT > 0 && Math.random() < 0.3) this.game.fx.add(this.cx + U.rand(-8, 8), this.cy + U.rand(-16, 12), 0, -20, 0.5, 2.5, '#bdefff');
    }

    applyDot(dmg, src) {
      if (this.state === 'dead' || this.bubbleT > 0) return;
      this.hp -= dmg * (1 - this.armor);
      if (src && src !== this) { this.lastAttacker = src; this.lastAttackT = this.game.time; this.lastHitKind = 'fire'; }
      if (this.hp <= 0) this.die(this.lastAttacker, 'fire', 0, -100);
    }

    // ---------- Aktionen ----------
    handleActions(dt, inp) {
      const g = this.game;
      this.aimX = inp.aimX; this.aimY = inp.aimY;
      this.inpDown = inp.down;
      if (this.dodgeT <= 0) this.facing = this.aimX >= this.x ? 1 : -1;

      if (inp.slot != null && this.weapons[inp.slot]) this.switchWeapon(inp.slot);
      if (inp.cycle) {
        for (let k = 1; k <= 4; k++) {
          const i = (this.weaponIdx + inp.cycle * k + 8) % 4;
          if (this.weapons[i]) { this.switchWeapon(i); break; }
        }
      }

      this.blocking = inp.block && !this.attack && this.dodgeT <= 0 && !this.holding && !this.gravWell;

      if (inp.dodgeP && this.dodgeCd <= 0 && !this.holding && (this.grounded || !this.airDodged)) {
        const dir = inp.moveX ? Math.sign(inp.moveX) : this.facing;
        this.dodgeT = 0.28; this.dodgeDir = dir; this.dodgeCd = 0.75; this.invulnT = Math.max(this.invulnT, 0.22);
        this.vx = dir * 680 * this.speedMult;
        if (!this.grounded) { this.airDodged = true; this.vy = Math.min(this.vy * 0.3, -60); }
        this.attack = null; this.blocking = false; this.charge = 0;
        g.fx.dust(this.x, this.y, 5);
      }

      if (inp.grabP && this.dodgeT <= 0) {
        if (this.holding) this.throwHeld();
        else this.tryGrab();
      }

      this.handleAttack(dt, inp);
      this.prevAttack = inp.attack;

      for (let i = 0; i < this.abilities.length; i++) {
        if (inp.abP[i] && this.abCd[i] <= 0 && this.state === 'normal') {
          const id = this.abilities[i];
          if (SL.useAbility(this, id)) {
            this.abCd[i] = SL.ABILITIES[id].cd;
            if (id !== 'invis') this.invisT = 0;
          }
        }
      }
      for (let i = 0; i < 4; i++) {
        const id = this.extras[i];
        const e = SL.EXTRAS[id];
        if (!e || !e.active) continue;
        if (e.active === 'hold') this.jetHeld = inp.exH[i];
        else if (inp.exP[i] && this.exCd[i] <= 0 && this.state === 'normal') {
          if (SL.useExtra(this, id)) this.exCd[i] = e.cd || 0;
        }
      }
    }

    switchWeapon(i) {
      if (i === this.weaponIdx) return;
      this.weaponIdx = i;
      if (this.attack && this.attack.kind !== 'slam') this.attack = null;
      this.charge = 0;
      if (this.gravWell) { SL.gravBlast(this.game, this); this.gravWell = null; }
      this.cooldownT = Math.max(this.cooldownT, 0.12);
    }

    handleAttack(dt, inp) {
      const g = this.game;
      const w = this.weapon;
      if (this.attack) this.updateAttack(dt, inp);
      if (this.state !== 'normal') return;
      if (this.blocking || this.holding) { this.charge = 0; return; }
      if (this.dodgeT > 0) {
        if (inp.attackP && w.kind === 'melee') { this.dodgeT = 0; this.startMelee(w, inp, true); }
        return;
      }
      const released = this.prevAttack && !inp.attack;
      switch (w.kind) {
        case 'melee':
          if ((inp.attackP || inp.attack) && !this.attack && this.cooldownT <= 0) this.startMelee(w, inp, false);
          break;
        case 'proj': {
          const want = w.auto ? inp.attack : inp.attackP;
          if (want && !this.attack && this.cooldownT <= 0 && this.pay(w)) {
            const o = this.muzzle(w);
            SL.spawnProjectile(g, w.proj, o.x, o.y, o.dx, o.dy, this);
            this.cooldownT = w.cd;
            if (w.recoil) { this.vx -= o.dx * w.recoil; this.vy -= o.dy * w.recoil * 0.5; this.knockT = 0.1; }
            this.invisT = 0;
          }
          break;
        }
        case 'throw':
          if (inp.attackP && !this.attack && this.cooldownT <= 0 && this.pay(w)) {
            this.attack = { kind: 'throw', t: 0, dur: 0.24, w, thrown: false };
            this.cooldownT = w.cd;
            this.invisT = 0;
          }
          break;
        case 'lightning':
          if (inp.attackP && this.cooldownT <= 0 && this.pay(w)) {
            const o = this.muzzle(w);
            SL.castLightning(g, this, w, o.x, o.y, o.dx, o.dy);
            this.cooldownT = w.cd;
            this.invisT = 0;
          }
          break;
        case 'charge':
          if (inp.attack && this.cooldownT <= 0) {
            this.charge = Math.min(w.maxCharge, this.charge + dt);
          } else if (released && this.charge > 0.05) {
            const o = this.muzzle(w);
            SL.spawnProjectile(g, 'arrow', o.x, o.y, o.dx, o.dy, this, { power: this.charge / w.maxCharge });
            this.charge = 0;
            this.cooldownT = w.cd;
            this.invisT = 0;
          } else if (!inp.attack) this.charge = 0;
          break;
        case 'gravity':
          if (inp.attack && this.cooldownT <= 0 && this.mana > 1) {
            const s = this.shoulder();
            let dx = this.aimX - s.x, dy = this.aimY - s.y;
            const l = U.hypot(dx, dy) || 1;
            const m = Math.min(l, 320);
            dx = dx / l * m; dy = dy / l * m;
            if (!this.gravWell) this.gravWell = { x: s.x + dx, y: s.y + dy, t: 0 };
            this.gravWell.x = U.lerp(this.gravWell.x, s.x + dx, 0.2);
            this.gravWell.y = U.lerp(this.gravWell.y, s.y + dy, 0.2);
            this.gravWell.t += dt;
            this.mana = Math.max(0, this.mana - w.manaRate * dt);
            this.invisT = 0;
          } else if (this.gravWell) {
            SL.gravBlast(g, this);
            this.gravWell = null;
            this.cooldownT = w.cd;
          }
          break;
      }
    }

    pay(w) {
      if (w.mana) {
        if (this.mana < w.mana) return false;
        this.mana -= w.mana;
        return true;
      }
      if (w.ammo) {
        if (!(this.ammo[w.id] > 0)) return false;
        this.ammo[w.id]--;
        return true;
      }
      return true;
    }

    muzzle(w) {
      const d = this.aimDir();
      const h = this.skel.p[P.HAND_R];
      const len = (w.len || 10) + 4;
      return { x: h.x + d.x * len, y: h.y + d.y * len, dx: d.x, dy: d.y };
    }

    startMelee(w, inp, dash) {
      this.invisT = 0;
      if (w.slam && !this.grounded && inp.down) {
        this.attack = { kind: 'slam', t: 0, dur: 2, w, hit: new Set(), combo: 1 };
        this.vy = 1300;
        return;
      }
      this.combo = this.comboTimer > 0 ? (this.combo % 3) + 1 : 1;
      const heavy = this.combo === 3;
      this.attack = { kind: 'melee', t: 0, dur: w.swing * (heavy ? 1.3 : 1), w, combo: this.combo, hit: new Set(), tileHit: false, dash };
      if (dash) this.vx = this.facing * 620 * this.speedMult;
      else if (this.grounded) this.vx += this.facing * (heavy ? 180 : 90);
    }

    updateAttack(dt, inp) {
      const a = this.attack;
      a.t += dt;
      if (a.kind === 'melee') {
        const p = a.t / a.dur;
        if (p > 0.2 && p < 0.85) this.meleeHitCheck(a);
        if (a.t >= a.dur) {
          this.attack = null;
          this.comboTimer = a.combo === 3 ? 0 : 0.42;
          this.cooldownT = a.w.cd + (a.combo === 3 ? 0.15 : 0);
        }
      } else if (a.kind === 'throw') {
        if (!a.thrown && a.t > a.dur * 0.55) {
          a.thrown = true;
          const d = this.aimDir();
          const h = this.skel.p[P.HAND_R];
          SL.spawnProjectile(this.game, 'bomb', h.x + d.x * 8, h.y + d.y * 8, d.x, d.y, this, { inheritVx: this.vx });
        }
        if (a.t >= a.dur) this.attack = null;
      } else if (a.kind === 'slam') {
        this.meleeHitCheck(a);
        if (this.grounded) {
          SL.groundSlam(this.game, this, a.w);
          this.attack = null;
          this.cooldownT = 0.35;
        } else if (a.t > a.dur) this.attack = null;
      }
    }

    meleeHitCheck(a) {
      const g = this.game, w = a.w;
      const s = this.shoulder();
      let tipX, tipY, baseX = s.x, baseY = s.y;
      const kick = w.id === 'fists' && a.combo === 3;
      if (kick) {
        const pv = this.skel.p[P.PELVIS], ft = this.skel.p[P.FOOT_R];
        baseX = pv.x; baseY = pv.y;
        tipX = ft.x + this.facing * 4; tipY = ft.y;
      } else {
        const h = this.skel.p[P.HAND_R];
        const len = (w.len || 0) + 6;
        tipX = h.x + Math.cos(this.wAngWorld) * len;
        tipY = h.y + Math.sin(this.wAngWorld) * len;
      }
      const thick = w.heavy ? 14 : 10;
      const heavy = a.combo === 3 || a.kind === 'slam';
      for (const f of g.fighters) {
        if (f === this || a.hit.has(f) || f.state === 'dead' && f.skel.p[P.PELVIS].y > SL.H) continue;
        if (f.skel.distToSeg(baseX, baseY, tipX, tipY) > thick) continue;
        a.hit.add(f);
        if (f.state === 'dead') { f.hit({ kx: this.facing * 300, ky: -200 }); continue; }
        const d = this.aimDir();
        let kx = d.x * 0.6 + this.facing * 0.4, ky = d.y * 0.6 - 0.4;
        const l = U.hypot(kx, ky) || 1;
        const k = w.knock * (heavy ? 1.5 : 1) * (a.dash ? 1.2 : 1);
        const dmg = w.dmg * (heavy ? 1.45 : 1) * (a.dash ? 1.25 : 1);
        if (f.hit({ dmg, kx: kx / l * k, ky: ky / l * k, from: this, kind: 'melee', combo: a.combo, heavy: w.heavy, x: this.x })) {
          g.fx.spark(tipX, tipY, '#fff3c4', w.heavy ? 14 : 8);
          g.fx.addShake(w.heavy ? 5 : 2);
        }
      }
      for (const e of g.entities) {
        if (e.hittable && !a.hit.has(e) && U.segDist(e.x, e.y, baseX, baseY, tipX, tipY) < e.r + thick) {
          a.hit.add(e);
          e.damage(w.dmg * 1.5, this);
        }
      }
      // Geschosse zurückschlagen
      if (w.kind === 'melee' && w.id !== 'fists') {
        for (const pr of g.projectiles) {
          if (pr.owner === this || pr.deflected === this) continue;
          if (U.segDist(pr.x, pr.y, baseX, baseY, tipX, tipY) < pr.r + 10) {
            const d = this.aimDir(), sp = U.hypot(pr.vx, pr.vy) * 1.1;
            pr.vx = d.x * sp; pr.vy = d.y * sp; pr.owner = this; pr.deflected = this;
            g.fx.spark(pr.x, pr.y, '#ffffff', 10);
          }
        }
      }
      if (!a.tileHit) {
        const c = Math.floor(tipX / T), r = Math.floor(tipY / T);
        if (g.world.get(c, r)) {
          a.tileHit = true;
          if (g.world.damageTile(c, r, w.tile * (heavy ? 1.5 : 1), this, g)) g.fx.spark(tipX, tipY, '#e0c090', 5);
        }
      }
    }

    // ---------- Packen & Werfen ----------
    tryGrab() {
      const g = this.game;
      let best = null, bd = 50;
      for (const f of g.fighters) {
        if (f === this || f.state === 'dead' || f.state === 'held' || f.invulnT > 0 || f.bubbleT > 0 || f.team === this.team) continue;
        const d = U.dist(this.x + this.facing * 14, this.y - 34, f.cx, f.cy);
        if (d < bd) { bd = d; best = f; }
      }
      if (!best) return;
      if (best.holding) best.dropHeld();
      if (best.hook) best.hook.dead = true;
      best.attack = null; best.blocking = false; best.charge = 0; best.gravWell = null;
      best.state = 'held'; best.heldBy = this; best.grabT = 1.8;
      this.holding = best;
      best.pinTo = this.skel.p[P.HAND_R];
      this.invisT = 0;
    }

    throwHeld() {
      const v = this.holding;
      if (!v) return;
      this.holding = null;
      v.heldBy = null;
      v.state = 'ragdoll';
      v.stunT = 1.0;
      v.thrownT = 1.2;
      v.thrownBy = this;
      const d = this.aimDir();
      v.hit({ dmg: 6, kx: d.x * 950, ky: d.y * 950 - 250, from: this, kind: 'throw', x: this.x });
      this.game.fx.dust(v.cx, v.cy, 5);
    }

    dropHeld() {
      const v = this.holding;
      if (!v) return;
      this.holding = null;
      v.heldBy = null;
      if (v.state === 'held') { v.state = 'ragdoll'; v.stunT = 0.3; }
    }

    updateHeld(dt) {
      const gr = this.heldBy;
      if (!gr || gr.state !== 'normal' || gr.holding !== this) {
        this.heldBy = null;
        this.state = 'ragdoll'; this.stunT = 0.4;
        return;
      }
      const pin = gr.skel.p[P.HAND_R];
      this.skel.ragdoll(dt, this.game.world, { x: pin.x, y: pin.y });
      const pv = this.skel.p[P.PELVIS];
      this.x = pv.x; this.y = pv.y + 28;
      this.grabT -= dt;
      if (this.grabT <= 0) {
        gr.holding = null; this.heldBy = null;
        this.state = 'ragdoll'; this.stunT = 0.25;
        this.skel.impulse(-gr.facing * 200, -200);
      }
    }

    checkThrownImpact() {
      const pv = this.skel.p[P.PELVIS];
      if (U.hypot(pv.vx, pv.vy) < 450) return;
      for (const f of this.game.fighters) {
        if (f === this || f === this.thrownBy || f.state !== 'normal') continue;
        if (U.dist(pv.x, pv.y, f.cx, f.cy) < 32) {
          f.hit({ dmg: 10, kx: pv.vx * 0.6, ky: -220, from: this.thrownBy, kind: 'body', x: pv.x });
          this.hit({ dmg: 5, kx: -pv.vx * 0.2, ky: -100, from: this.thrownBy, kind: 'body' });
          this.thrownT = 0;
          break;
        }
      }
    }

    // ---------- Bewegung ----------
    sideSolid(dir) {
      const w = this.game.world;
      const c = Math.floor((this.x + dir * (BW / 2 + 1.5)) / T);
      const r0 = Math.floor((this.y - BH + 6) / T), r1 = Math.floor((this.y - 6) / T);
      for (let r = r0; r <= r1; r++) if (w.get(c, r)) return true;
      return false;
    }

    move(dt, inp) {
      const g = this.game, w = g.world;
      // in Blöcken eingeklemmt? nach oben schieben
      if (!w.boxFree(this.x - BW / 2, this.y - BH, this.x + BW / 2, this.y)) {
        for (let k = 1; k <= 6; k++) {
          if (w.boxFree(this.x - BW / 2, this.y - BH - k * 12, this.x + BW / 2, this.y - k * 12)) { this.y -= k * 12; break; }
        }
      }
      const ix = inp.moveX;
      // Enterhaken
      if (this.hook && this.hook.attached) {
        const hx = this.hook.x - this.x, hy = this.hook.y - (this.y - 40), l = U.hypot(hx, hy);
        if (l < 36 || inp.jumpP || this.hook.t > 1.4) {
          this.hook.dead = true; this.hook = null;
          this.vy = Math.min(this.vy, -380); this.jumpsLeft = Math.max(this.jumpsLeft, 1);
        } else {
          this.vx = hx / l * 820; this.vy = hy / l * 820;
          this.moveAndCollide(dt);
          return;
        }
      }
      if (this.dodgeT > 0) {
        this.dodgeT -= dt;
        this.vy += SL.G * dt * 0.6;
      } else {
        let max = 330 * this.speedMult;
        if (this.blocking) max *= 0.45;
        if (this.slowT > 0) max *= 0.6;
        if (this.attack && this.attack.w && this.attack.w.heavy) max *= 0.7;
        if (this.charge > 0) max *= 0.6;
        if (this.inpDown && this.grounded) max *= 0.5;
        let acc = this.grounded ? 3200 : 1900;
        if (this.knockT > 0) acc *= 0.15;
        const target = ix * max;
        if (ix !== 0 || this.grounded) {
          const fric = ix === 0 ? (this.knockT > 0 ? 600 : 2800) : acc;
          if (this.vx < target) this.vx = Math.min(target, this.vx + fric * dt);
          else if (this.vx > target) this.vx = Math.max(target, this.vx - fric * dt);
        }
        // Schwerkraft
        let grav = SL.G;
        if (this.inpDown && !this.grounded) grav *= 1.6;
        if (!inp.jumpH && this.vy < -250 && this.knockT <= 0) grav *= 2.1;
        this.vy += grav * dt;
      }
      // Wand
      this.wallDir = 0;
      if (!this.grounded && ix !== 0 && this.sideSolid(Math.sign(ix))) this.wallDir = Math.sign(ix);
      if (this.wallDir && this.vy > 160 && this.dodgeT <= 0) this.vy = 160;
      // Kante hochziehen
      if (this.wallDir && this.vy > -260 && this.tryLedge(this.wallDir)) return;
      // Springen
      if (inp.jumpP) this.jumpBuf = 0.12;
      if (this.jumpBuf > 0) this.jumpBuf -= dt;
      if (this.grounded) this.coyote = 0.1; else if (this.coyote > 0) this.coyote -= dt;
      if (this.jumpBuf > 0 && this.dodgeT <= 0) {
        if (this.coyote > 0) {
          this.vy = -760 * this.jumpMult; this.coyote = 0; this.jumpBuf = 0;
          g.fx.dust(this.x, this.y, 4);
        } else if (this.wallDir) {
          this.vy = -720 * this.jumpMult; this.vx = -this.wallDir * 440; this.jumpBuf = 0; this.knockT = 0.12;
          g.fx.dust(this.x + this.wallDir * 10, this.y - 20, 4);
        } else if (this.jumpsLeft > 0) {
          this.vy = -680 * this.jumpMult; this.jumpsLeft--; this.jumpBuf = 0;
          g.fx.ring(this.x, this.y, 18, 'rgba(255,255,255,0.8)', 0.3, 3);
        }
      }
      // Jetpack
      if (this.hasJetpack && this.jetHeld && this.jetFuel > 0) {
        this.vy = Math.max(this.vy - 3400 * dt, -460);
        this.jetFuel = Math.max(0, this.jetFuel - 40 * dt);
        g.fx.add(this.x - this.facing * 8, this.y - 26, U.rand(-30, 30), U.rand(150, 260), 0.3, U.rand(3, 6), U.pick(['#ffb347', '#ff6b35', '#ffd166']), { grow: -8 });
      }
      if (this.vy > 1400) this.vy = 1400;
      const wasAir = !this.grounded, vyBefore = this.vy;
      this.moveAndCollide(dt);
      if (this.grounded) {
        this.jumpsLeft = this.maxJumps - 1;
        this.airDodged = false;
        if (wasAir && vyBefore > 500) g.fx.dust(this.x, this.y, 5);
      }
      if (this.wallDir) this.jumpsLeft = Math.max(this.jumpsLeft, 1);
    }

    moveAndCollide(dt) {
      const w = this.game.world;
      let nx = this.x + this.vx * dt;
      const top = this.y - BH, bot = this.y;
      if (this.vx !== 0) {
        const dir = Math.sign(this.vx);
        const c = Math.floor((nx + dir * BW / 2) / T);
        const r0 = Math.floor((top + 1) / T), r1 = Math.floor((bot - 1) / T);
        let hit = false;
        for (let r = r0; r <= r1; r++) if (w.get(c, r)) { hit = true; break; }
        if (hit) {
          nx = dir > 0 ? c * T - BW / 2 - 0.01 : (c + 1) * T + BW / 2 + 0.01;
          this.vx = 0;
        }
      }
      this.x = nx;
      let ny = this.y + this.vy * dt;
      this.grounded = false;
      const c0 = Math.floor((this.x - BW / 2 + 1) / T), c1 = Math.floor((this.x + BW / 2 - 1) / T);
      if (this.vy >= 0) {
        const r = Math.floor(ny / T);
        for (let c = c0; c <= c1; c++) {
          if (w.get(c, r) && this.y <= r * T + 0.5) { ny = r * T; this.vy = 0; this.grounded = true; break; }
        }
      } else {
        const r = Math.floor((ny - BH) / T);
        for (let c = c0; c <= c1; c++) {
          if (w.get(c, r)) { ny = (r + 1) * T + BH; this.vy = 0; break; }
        }
      }
      this.y = ny;
    }

    tryLedge(dir) {
      const w = this.game.world;
      const c = Math.floor((this.x + dir * (BW / 2 + 2)) / T);
      for (let r = Math.floor((this.y - BH - 8) / T); r <= Math.floor((this.y - 24) / T); r++) {
        if (w.get(c, r) && !w.get(c, r - 1) && !w.get(c, r - 2)) {
          const ly = r * T;
          if (ly < this.y - BH - 10 || ly > this.y - 22) continue;
          const tx = c * T + T / 2;
          if (!w.boxFree(tx - BW / 2, ly - BH, tx + BW / 2, ly)) continue;
          // Platz über dem Kopf zum Hochziehen
          if (!w.boxFree(this.x - BW / 2, ly - BH, this.x + BW / 2, this.y - 1)) continue;
          this.state = 'climb';
          this.climb = { t: 0, fx: this.x, fy: this.y, tx, ty: ly };
          this.vx = 0; this.vy = 0;
          return true;
        }
      }
      return false;
    }

    updateClimb(dt) {
      const c = this.climb;
      c.t += dt;
      const p = Math.min(1, c.t / 0.22);
      if (p < 0.6) { this.y = U.lerp(c.fy, c.ty, p / 0.6); }
      else { this.y = c.ty; this.x = U.lerp(c.fx, c.tx, (p - 0.6) / 0.4); }
      if (p >= 1) {
        this.state = 'normal'; this.climb = null; this.grounded = true;
        this.jumpsLeft = this.maxJumps - 1;
      }
    }

    getUp() {
      const w = this.game.world;
      const pv = this.skel.p[P.PELVIS];
      const px = pv.x;
      let base = pv.y + 28;
      const g = w.groundBelow(px, pv.y, 2);
      if (g != null) base = Math.min(base, g);
      for (const off of [0, -8, -16, -32, -48, -64]) {
        const y = base + off;
        if (w.boxFree(px - BW / 2, y - BH, px + BW / 2, y)) {
          this.x = px; this.y = y;
          this.vx = pv.vx * 0.3; this.vy = Math.min(0, pv.vy * 0.3);
          this.state = 'normal';
          this.invulnT = Math.max(this.invulnT, 0.25);
          this.grounded = false;
          this.knockT = 0;
          return;
        }
      }
      this.stunT = 0.2;
    }

    // ---------- Schaden ----------
    hit(o) {
      const g = this.game;
      if (this.state === 'dead') { this.skel.impulse((o.kx || 0) * 0.6, (o.ky || 0) * 0.6); return false; }
      if (this.invulnT > 0 && !o.force) return false;
      const src = o.from || null;
      if (src && src !== this && src.team === this.team) return false;
      let dmg = o.dmg || 0, kx = o.kx || 0, ky = o.ky || 0;
      if (this.bubbleT > 0) { dmg = 0; kx *= 0.15; ky *= 0.15; g.fx.ring(this.cx, this.cy, 44, '#9fe3ff', 0.25, 3); }
      const sx = o.x != null ? o.x : src ? src.x : this.x;
      if (this.blocking && this.state === 'normal' && Math.sign(sx - this.x) === this.facing && o.kind !== 'fire') {
        dmg *= o.heavy ? 0.5 : 0.2; kx *= 0.35; ky *= 0.35;
        g.fx.spark(this.x + this.facing * 22, this.y - 38, '#9fd3ff', 10);
      }
      dmg *= 1 - this.armor;
      if (src && src.dmgMult) dmg *= src.dmgMult;
      this.hp -= dmg;
      if (dmg > 0.5) {
        this.flashT = 0.08;
        g.fx.burst(this.cx, this.cy, Math.min(10, 2 + dmg / 3), this.color, 260, 0.35, 3, { grav: 0.6 });
      }
      if (src && src !== this) { this.lastAttacker = src; this.lastAttackT = g.time; this.lastHitKind = o.kind || ''; this.lastCombo = o.combo || 0; }
      if (this.invisT > 0 && dmg > 0) this.invisT = 0;
      if (this.hp <= 0) { this.die(src, o.kind, kx, ky); return true; }
      const ks = 1 + (1 - this.hp / this.maxHp) * 0.6;
      kx *= ks; ky *= ks;
      const mag = U.hypot(kx, ky);
      if (this.state === 'ragdoll') { this.skel.impulse(kx * 0.8, ky * 0.8); this.stunT = Math.max(this.stunT, 0.3); return true; }
      if (this.state === 'held') return true;
      if (mag > 520 || o.stun) this.goRagdoll(0.35 + mag / 1800, kx, ky);
      else {
        this.vx += kx; this.vy += ky * 0.9;
        if (ky < -50) this.grounded = false;
        this.knockT = 0.18;
        this.skel.impulse(kx * 0.5, ky * 0.5);
      }
      return true;
    }

    goRagdoll(t, kx, ky) {
      this.dropHeld();
      if (this.hook) { this.hook.dead = true; this.hook = null; }
      if (this.gravWell) { this.gravWell = null; }
      this.attack = null; this.charge = 0; this.blocking = false; this.dodgeT = 0;
      if (this.state === 'climb') this.climb = null;
      this.state = 'ragdoll';
      this.stunT = t;
      for (const p of this.skel.p) {
        p.vx += this.vx + kx * U.rand(0.8, 1.2);
        p.vy += this.vy + ky * U.rand(0.8, 1.2);
      }
      this.skel.p[P.HEAD].vx += kx * 0.3;
    }

    die(killer, kind, kx, ky) {
      if (this.state === 'dead') return;
      const wasThrown = this.thrownT > 0;
      if (this.state === 'normal' || this.state === 'climb') this.goRagdoll(1, kx || 0, ky || 0);
      else this.skel.impulse((kx || 0) * 0.8, (ky || 0) * 0.8);
      this.dropHeld();
      if (this.heldBy) { this.heldBy.holding = null; this.heldBy = null; }
      this.state = 'dead';
      this.hp = 0;
      this.burnT = 0;
      this.game.onDeath(this, killer, kind, wasThrown);
    }

    // ---------- Animation ----------
    computePose(dt) {
      const d = this.facing, tg = this.tg, X = this.x, Y = this.y;
      const set = (i, lx, ly) => { tg[i].x = X + lx * d; tg[i].y = Y + ly; };
      const spd = Math.abs(this.vx);
      const time = this.game ? this.game.time : 0;
      if (this.grounded) this.phase += dt * spd * 0.045;
      const run = this.grounded ? Math.min(1, spd / 300) : 0;
      const crouch = this.inpDown && this.grounded ? 1 : 0;
      this.crouchS = U.lerp(this.crouchS, crouch, Math.min(1, dt * 14));
      const cr = this.crouchS;

      if (this.dodgeT > 0 && this.state === 'normal') {
        const prog = 1 - this.dodgeT / 0.28;
        const th = prog * Math.PI * 2 * (this.dodgeDir * d);
        const base = [[4, -14], [2, -8], [0, 0], [7, 2], [1, 9], [5, 4], [-2, 9], [6, -5], [8, 3], [8, -6], [10, 2]];
        const cs = Math.cos(th), sn = Math.sin(th);
        for (let i = 0; i < 11; i++) {
          const [bx, by] = base[i];
          set(i, bx * cs - by * sn, -20 + bx * sn + by * cs);
        }
        this.wAngWorld = Math.atan2(tg[P.HAND_R].y - tg[P.ELBOW_R].y, tg[P.HAND_R].x - tg[P.ELBOW_R].x);
        return;
      }

      let py = -28 + cr * 9 + (run > 0.1 ? -Math.abs(Math.sin(this.phase)) * 2.5 : Math.sin(time * 3 + this.id) * 0.7);
      let lean = this.grounded ? run * 5 * Math.sign(this.vx || 1) * d : U.clamp(this.vx / 330 * 3 * d, -3, 3);
      if (this.attack) lean += 2;
      set(P.PELVIS, 0, py);
      set(P.NECK, lean, py - 20 + cr * 2);
      set(P.HEAD, lean * 1.3, py - 30 + cr * 2);

      // Beine
      let fR, fL, kR, kL;
      if (this.state === 'climb') {
        fR = [6, -6]; kR = [8, -16]; fL = [-3, 0]; kL = [0, -13];
      } else if (this.grounded) {
        if (run > 0.08) {
          const ph = this.phase * Math.sign(this.vx) * d;
          const s = Math.sin(ph), c = Math.cos(ph);
          fR = [s * 13 * run, -Math.max(0, c) * 9 * run];
          fL = [-s * 13 * run, -Math.max(0, -c) * 9 * run];
        } else {
          const wd = 6 + cr * 4;
          fR = [wd, 0]; fL = [-wd, 0];
        }
        kR = [(fR[0]) / 2 + 4, (py + fR[1]) / 2 - 1 + cr * 3];
        kL = [(fL[0]) / 2 + 3, (py + fL[1]) / 2 - 1 + cr * 3];
      } else if (this.wallDir) {
        const wx = this.wallDir * d;
        fR = [wx * 8, -6]; kR = [wx * 10, -18]; fL = [wx * 4, 2]; kL = [wx * 7, -12];
      } else if (this.vy < 0) {
        fR = [7, -8]; kR = [9, -18]; fL = [-6, -3]; kL = [-1, -14];
      } else {
        fR = [5, -2]; kR = [7, -14]; fL = [-7, 0]; kL = [-4, -13];
      }

      // Arme
      const Sx = lean * 0.9, Sy = py - 18;
      const sWorldX = X + Sx * d, sWorldY = Y + Sy;
      const la = Math.atan2(this.aimY - sWorldY, (this.aimX - sWorldX) * d);
      const ang = (a, len) => [Sx + Math.cos(a) * len, Sy + Math.sin(a) * len];
      const w = this.weapon, a = this.attack;
      let hand, elbow, wAng;
      if (this.state === 'climb') {
        hand = [12, -64 + (this.y - (this.climb ? this.climb.ty : this.y))]; elbow = [8, Sy - 8]; wAng = -1.5;
        hand[1] = Math.min(hand[1], Sy + 4);
      } else if (this.blocking) {
        hand = [Sx + 13, Sy - 2]; elbow = [Sx + 8, Sy + 7]; wAng = -1.3;
      } else if (this.holding) {
        hand = ang(la * 0.5, 22); elbow = ang(la * 0.5 + 0.2, 12); wAng = la;
      } else if (a && (a.kind === 'melee' || a.kind === 'slam')) {
        const t = U.clamp(a.t / a.dur, 0, 1), e = 1 - Math.pow(1 - t, 3);
        if (a.kind === 'slam') {
          const aa = -1.9; hand = ang(aa, 21); elbow = ang(aa + 0.35, 11); wAng = aa + 0.3;
        } else if (w.thrust || w.id === 'fists') {
          if (w.id === 'fists' && a.combo === 3) {
            hand = ang(0.9, 13); elbow = ang(1.5, 8); wAng = la;
            const ka = U.clamp(la, -0.7, 0.5), ext = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6 * 0.6;
            fR = [Math.cos(ka) * 28 * ext, py + Math.sin(ka) * 28 * ext];
            kR = [Math.cos(ka - 0.6) * 15, py + Math.sin(ka - 0.6) * 15];
          } else {
            const ext = t < 0.35 ? 8 + (t / 0.35) * 18 : 26 - (t - 0.35) / 0.65 * 12;
            hand = ang(la, ext); elbow = ang(la + 0.35, ext * 0.5); wAng = la;
          }
        } else {
          let a0, a1;
          if (a.combo === 2) { a0 = la + 1.4; a1 = la - 1.5; }
          else if (a.combo === 3) { a0 = la - 2.7; a1 = la + 1.5; }
          else { a0 = la - 1.9; a1 = la + 1.2; }
          const aa = a0 + (a1 - a0) * e;
          hand = ang(aa, 21); elbow = ang(aa - 0.35 * Math.sign(a1 - a0), 11); wAng = aa;
        }
      } else if (a && a.kind === 'throw') {
        const t = U.clamp(a.t / a.dur, 0, 1);
        const aa = -2.2 + t * 2.6 + la * 0.3;
        hand = ang(aa, 21); elbow = ang(aa - 0.4, 11); wAng = aa;
      } else if (w.id === 'fists') {
        hand = ang(la * 0.6 + 0.5, 15); elbow = ang(la * 0.6 + 1.2, 9); wAng = la;
      } else if (w.kind === 'melee') {
        hand = ang(0.6 + la * 0.3, 16); elbow = ang(1.0 + la * 0.2, 9); wAng = -0.9 + la * 0.3;
      } else {
        hand = ang(la, 20); elbow = ang(la + 0.3, 11); wAng = la;
      }
      set(P.HAND_R, hand[0], hand[1]);
      set(P.ELBOW_R, elbow[0], elbow[1]);
      this.wAngWorld = d === 1 ? wAng : Math.PI - wAng;

      // hinterer Arm
      let bh, be;
      if (w.kind === 'charge' && this.charge > 0) {
        bh = ang(la, 20 - this.charge / w.maxCharge * 16); be = ang(la + 0.6, 9);
      } else if (TWO_HANDED[w.id] && !this.blocking && !this.holding && this.state !== 'climb') {
        bh = [hand[0] - Math.cos(wAng) * 9, hand[1] - Math.sin(wAng) * 9];
        be = [(Sx + bh[0]) / 2 - 2, (Sy + bh[1]) / 2 + 5];
      } else if (this.state === 'climb') {
        bh = [9, hand[1]]; be = [5, Sy - 6];
      } else if (w.id === 'fists' && !a) {
        bh = ang(la * 0.5 + 0.9, 13); be = ang(la * 0.5 + 1.6, 8);
      } else if (!this.grounded) {
        bh = [Sx - 10, Sy - 6]; be = [Sx - 7, Sy + 3];
      } else {
        bh = [Sx - 4 - Math.sin(this.phase) * 9 * run, Sy + 19]; be = [Sx - 3 - Math.sin(this.phase) * 4 * run, Sy + 10];
      }
      set(P.HAND_L, bh[0], bh[1]);
      set(P.ELBOW_L, be[0], be[1]);
      set(P.FOOT_R, fR[0], fR[1]); set(P.KNEE_R, kR[0], kR[1]);
      set(P.FOOT_L, fL[0], fL[1]); set(P.KNEE_L, kL[0], kL[1]);
    }

    updateCape(dt) {
      if (this.species && SL.SPECIES[this.species].tail) this.updateTail(dt);
      if (!this.capeColor) return;
      const n = this.skel.p[P.NECK];
      let px = n.x, py = n.y;
      for (const c of this.cape) {
        const vx = (c.x - c.px) * 0.9, vy = (c.y - c.py) * 0.9;
        c.px = c.x; c.py = c.y;
        c.x += vx - this.facing * 0.35;
        c.y += vy + 900 * dt * dt;
        const dx = c.x - px, dy = c.y - py, l = U.hypot(dx, dy) || 1;
        c.x = px + dx / l * 7; c.y = py + dy / l * 7;
        px = c.x; py = c.y;
      }
    }

    // Schwanz der Kreaturen: schwingt locker hinterher
    updateTail(dt) {
      const pv = this.skel.p[P.PELVIS];
      const dead = this.state === 'dead';
      const sway = Math.sin(this.game.time * 3 + this.id) * 0.25;
      let px = pv.x - this.facing * 2, py = pv.y - 2;
      for (const c of this.tail) {
        const vx = (c.x - c.px) * 0.86, vy = (c.y - c.py) * 0.86;
        c.px = c.x; c.py = c.y;
        c.x += vx - (dead ? 0 : this.facing * 0.9);
        c.y += vy + (dead ? 1200 * dt * dt : sway - 0.12);
        const dx = c.x - px, dy = c.y - py, l = U.hypot(dx, dy) || 1;
        c.x = px + dx / l * 6.5; c.y = py + dy / l * 6.5;
        px = c.x; py = c.y;
      }
    }

    draw(ctx) {
      const pv = this.skel.p[P.PELVIS];
      if (pv.y > SL.H + 260) return;
      let alpha = 1;
      if (this.invisT > 0) alpha = this.isPlayer ? 0.35 : 0.1;
      if (this.state === 'dead') alpha = 0.85;
      const showWeapon = this.state !== 'dead';
      let wAng = this.wAngWorld;
      if (this.state !== 'normal' && this.state !== 'climb') {
        const h = this.skel.p[P.HAND_R], e = this.skel.p[P.ELBOW_R];
        wAng = Math.atan2(h.y - e.y, h.x - e.x);
      }
      if (this.species) {
        SL.drawCreature(ctx, this.skel.p, {
          species: this.species, color: this.color, facing: this.facing, flash: this.flashT > 0, alpha,
          tailPts: this.tail, time: this.game.time, airborne: this.state === 'normal' && !this.grounded,
          weapon: showWeapon ? this.weapons[this.weaponIdx] : null, weaponAng: wAng,
          weaponOpt: { charge: this.charge / (this.weapon.maxCharge || 1), time: this.game.time },
          dead: this.state === 'dead',
        });
      } else SL.drawStick(ctx, this.skel.p, {
        color: this.color, facing: this.facing, flash: this.flashT > 0, alpha,
        hat: this.look.hat, face: this.look.face, cape: this.capeColor, capePts: this.cape,
        helmet: this.hasHelmet, chest: this.hasChest, jetpack: this.hasJetpack,
        weapon: showWeapon ? this.weapons[this.weaponIdx] : null, weaponAng: wAng,
        weaponOpt: { charge: this.charge / (this.weapon.maxCharge || 1), time: this.game.time },
        dead: this.state === 'dead',
      });
      if (this.state === 'dead') return;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (this.blocking) {
        ctx.strokeStyle = 'rgba(150,210,255,0.85)';
        ctx.lineWidth = 4;
        const cx = this.x, cy = this.y - 36;
        const a0 = this.facing === 1 ? -1.0 : Math.PI - 1.0;
        ctx.beginPath(); ctx.arc(cx, cy, 30, a0, a0 + 2.0); ctx.stroke();
      }
      if (this.bubbleT > 0) {
        ctx.fillStyle = 'rgba(160,225,255,0.18)';
        ctx.strokeStyle = 'rgba(160,225,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.cx, this.cy - 4, 42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (this.gravWell) SL.drawGravWell(ctx, this);
      ctx.restore();
    }

    drawOverlay(ctx) {
      if (this.state === 'dead' || (this.invisT > 0 && !this.isPlayer)) return;
      const h = this.skel.p[P.HEAD];
      const x = h.x, y = Math.max(16, h.y - 26);
      if (this.isPlayer) {
        ctx.fillStyle = this.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 6, y - 14); ctx.lineTo(x + 6, y - 14); ctx.lineTo(x, y - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        const w = 34, frac = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x - w / 2 - 1, y - 9, w + 2, 6);
        ctx.fillStyle = this.color;
        ctx.fillRect(x - w / 2, y - 8, w * frac, 4);
      }
      if (h.y < -10) {
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x - 8, 18); ctx.lineTo(x + 8, 18); ctx.closePath(); ctx.fill();
      }
    }
  }

  SL.Fighter = Fighter;
})();
