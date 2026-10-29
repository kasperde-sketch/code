'use strict';
// Computergegner: nutzen dieselben Tricks wie der Spieler
(function () {
  const SL = window.SL;
  const U = SL.U;
  const T = SL.T;

  const CLASS = { sword: 'melee', spear: 'melee', hammer: 'melee', fists: 'melee', firestaff: 'far', lightstaff: 'mid', frostbow: 'far', bombs: 'mid', rockets: 'far', gravity: 'mid' };

  class BotAI {
    constructor(f, diff, type) {
      this.f = f; this.d = diff; this.type = type;
      this.inp = SL.blankInput();
      this.thinkT = U.rand(0.1, 0.5);
      this.target = null;
      this.move = 0;
      this.blockT = 0; this.holdAttackT = 0; this.chargeGoal = 0; this.throwT = 0; this.jumpHoldT = 0;
      this.aimErr = 0;
      this.strafeT = 0; this.strafeDir = 0;
      this.recovering = false;
      this.aimOverride = null;
    }

    groundAhead(dir, rows) {
      const f = this.f, w = f.game.world;
      const x = f.x + dir * 26;
      return w.groundBelow(x, f.y - 4, rows || 7) != null;
    }
    wallAhead(dir) {
      const f = this.f, w = f.game.world;
      const c = Math.floor((f.x + dir * 20) / T);
      return w.get(c, Math.floor((f.y - 16) / T)) || w.get(c, Math.floor((f.y - 44) / T));
    }

    getInput(dt) {
      const f = this.f, g = f.game, inp = this.inp;
      inp.jumpP = false; inp.attackP = false; inp.dodgeP = false; inp.grabP = false;
      inp.abP.fill(false); inp.exP.fill(false); inp.slot = null; inp.cycle = 0;
      this.thinkT -= dt;
      if (this.thinkT <= 0 && f.state === 'normal') {
        this.thinkT = this.d.react * U.rand(0.7, 1.3);
        this.think(g);
      }
      // laufende Halteaktionen
      if (this.blockT > 0) { this.blockT -= dt; inp.block = true; } else inp.block = false;
      if (this.holdAttackT > 0) { this.holdAttackT -= dt; inp.attack = true; } else inp.attack = false;
      if (this.jumpHoldT > 0) { this.jumpHoldT -= dt; inp.jumpH = true; } else inp.jumpH = false;
      if (f.weapon.kind === 'charge' && this.chargeGoal > 0) {
        if (f.charge < this.chargeGoal) inp.attack = true;
        else { inp.attack = false; this.chargeGoal = 0; }
      }
      if (f.holding) {
        this.throwT -= dt;
        if (this.throwT <= 0) inp.grabP = true;
      }
      inp.moveX = this.move;
      // Ziel verfolgen
      const t = this.target;
      if (this.aimOverride) {
        inp.aimX = this.aimOverride.x; inp.aimY = this.aimOverride.y;
      } else if (t && t.state !== 'dead') {
        const w = f.weapon;
        let lead = 0;
        if (w.kind === 'proj' || w.kind === 'charge') lead = U.dist(f.x, f.y, t.cx, t.cy) / 800;
        let tx = t.cx + t.vx * lead, ty = t.cy + (t.state === 'normal' ? t.vy * lead * 0.5 : 0);
        if (w.kind === 'throw') ty -= Math.abs(tx - f.x) * 0.28;
        if (w.kind === 'charge' && this.chargeGoal) ty -= Math.abs(tx - f.x) * 0.06;
        const s = f.shoulder();
        const a = Math.atan2(ty - s.y, tx - s.x) + this.aimErr;
        const r = U.dist(s.x, s.y, tx, ty);
        inp.aimX = s.x + Math.cos(a) * r; inp.aimY = s.y + Math.sin(a) * r;
      } else {
        inp.aimX = f.x + f.facing * 100; inp.aimY = f.y - 34;
      }
      // Jetpack bei Absturz
      const exJet = f.extras.indexOf('jetpack');
      if (exJet >= 0) inp.exH[exJet] = this.recovering && f.vy > -100;
      return inp;
    }

    pickTarget(g) {
      const f = this.f;
      let best = null, bd = 1e9;
      for (const o of g.fighters) {
        if (o === f || o.state === 'dead' || o.team === f.team) continue;
        let d = U.dist(f.x, f.y, o.x, o.y);
        if (o.invisT > 0 && d > 90) continue;
        if (o.isPlayer) d *= 0.85;
        if (o === this.target) d *= 0.8;
        if (d < bd) { bd = d; best = o; }
      }
      return best;
    }

    think(g) {
      const f = this.f, inp = this.inp, D = this.d, w = g.world;
      this.aimOverride = null;
      inp.down = false;
      this.aimErr = U.rand(-D.aimErr, D.aimErr);
      this.target = this.pickTarget(g);

      // Absturz? retten!
      this.recovering = !f.grounded && w.groundBelow(f.x, f.y, SL.ROWS) == null;
      if (this.recovering || f.y > SL.H - 20) { this.recover(g); return; }

      const t = this.target;
      if (!t) {
        this.move = 0;
        if (Math.random() < 0.3) this.move = U.pick([-1, 0, 1]);
        if (this.move && !this.groundAhead(this.move)) this.move = 0;
        return;
      }
      const dx = t.cx - f.x, dy = t.cy - (f.y - 31), adx = Math.abs(dx), dist = U.hypot(dx, dy);

      // passende Waffe wählen
      let want = 'melee';
      if (dist > 130) want = this.type.style === 'melee' && dist < 300 ? 'melee' : (this.type.style === 'far' ? 'far' : 'mid');
      let best = -1;
      for (let i = 0; i < 4; i++) {
        const id = f.weapons[i];
        if (!id) continue;
        const c = CLASS[id];
        const wd = SL.WEAPONS[id];
        if (wd.ammo && !(f.ammo[id] > 0)) continue;
        if (wd.mana && f.mana < wd.mana) continue;
        if (c === want) { best = i; break; }
        if (best < 0 || (want !== 'melee' && c !== 'melee')) best = i;
      }
      if (best >= 0 && best !== f.weaponIdx && Math.random() < 0.6) inp.slot = best;
      const wpn = f.weapon, wc = CLASS[wpn.id] || 'melee';

      // Abstand halten
      let rMin = 0, rMax = 34 + (wpn.len || 0);
      if (wc === 'far') { rMin = 200; rMax = 420; }
      else if (wc === 'mid') { rMin = 120; rMax = 300; }
      let move = 0;
      if (adx > rMax) move = Math.sign(dx);
      else if (adx < rMin) move = -Math.sign(dx);
      else {
        this.strafeT -= D.react;
        if (this.strafeT <= 0) { this.strafeT = U.rand(0.5, 1.5); this.strafeDir = U.pick([-1, 0, 0, 1]); }
        move = this.strafeDir;
      }
      if (move !== 0 && !this.groundAhead(move)) {
        const far = this.groundAhead(move, SL.ROWS);
        const gapJumpable = (() => {
          for (let k = 2; k <= 6; k++) if (w.groundBelow(f.x + move * k * T, f.y - 70, 5) != null) return true;
          return false;
        })();
        if (gapJumpable && f.grounded && Math.sign(dx) === move && adx > 80) inp.jumpP = true;
        else if (!far || Math.random() < 0.7) move = 0;
      }
      if (move !== 0 && this.wallAhead(move) && f.grounded) { inp.jumpP = true; this.jumpHoldT = 0.3; }
      if (dy < -70 && adx < 260) {
        if (f.grounded && Math.random() < 0.6) { inp.jumpP = true; this.jumpHoldT = 0.35; }
        else if (!f.grounded && f.vy > -50 && f.jumpsLeft > 0 && Math.random() < 0.5) { inp.jumpP = true; this.jumpHoldT = 0.3; }
      }
      if (dy > 80 && adx < 60 && f.grounded) move = Math.random() < 0.5 ? 1 : -1;
      this.move = move;

      // Verteidigung
      for (const o of g.fighters) {
        if (o === f || o.state !== 'normal' || o.team === f.team) continue;
        const od = U.dist(o.x, o.y, f.x, f.y);
        if (od < 100 && o.attack && o.attack.kind === 'melee' && Math.sign(f.x - o.x) === o.facing) {
          if (Math.random() < D.block) this.blockT = 0.35;
          else if (Math.random() < D.dodge * 0.5) { inp.dodgeP = true; this.move = Math.sign(f.x - o.x); }
        }
      }
      for (const p of g.projectiles) {
        if (p.owner === f || p.stuck || (p.owner && p.owner.team === f.team)) continue;
        const pd = U.dist(p.x, p.y, f.cx, f.cy);
        const toward = (f.cx - p.x) * p.vx + (f.cy - p.y) * p.vy > 0;
        if (pd < 170 && toward) {
          if (Math.random() < D.dodge) {
            if (p.kind === 'bomb' || Math.random() < 0.4) { inp.jumpP = true; this.jumpHoldT = 0.3; }
            else inp.dodgeP = true;
          } else if (Math.random() < D.block * 0.6 && p.kind !== 'bomb') this.blockT = 0.3;
          break;
        }
      }
      if (this.blockT > 0) return;

      // Packen und über die Kante werfen
      if (!f.holding && dist < 42 && t.state === 'normal' && Math.random() < 0.18 * D.aggr) { inp.grabP = true; this.throwT = 0.25 + D.react; }
      if (f.holding) {
        const voidL = !this.groundAhead(-1, SL.ROWS), voidR = !this.groundAhead(1, SL.ROWS);
        const dir = voidL && !voidR ? -1 : voidR && !voidL ? 1 : (f.x < SL.W / 2 ? -1 : 1);
        this.aimOverride = { x: f.x + dir * 120, y: f.y - 90 };
        this.move = 0;
        return;
      }

      // Angriff
      const los = w.lineFree(f.x, f.y - 40, t.cx, t.cy);
      if (Math.random() < D.aggr) {
        switch (wpn.kind) {
          case 'melee':
            if (dist < (wpn.len || 0) + 40) this.holdAttackT = D.react + 0.1;
            if (wpn.slam && !f.grounded && dy > 40 && adx < 60) { inp.down = true; inp.attackP = true; }
            break;
          case 'proj': case 'lightning':
            if (los && dist < 720) { inp.attackP = true; if (wpn.auto) this.holdAttackT = D.react; }
            break;
          case 'throw':
            if (dist < 520) inp.attackP = true;
            break;
          case 'charge':
            if (los && dist < 800 && !this.chargeGoal) this.chargeGoal = wpn.maxCharge * U.rand(0.5, 1);
            break;
          case 'gravity':
            if (dist < 330) this.holdAttackT = U.rand(0.5, 1.1);
            break;
        }
      }
      if (inp.down && !(wpn.slam && !f.grounded)) inp.down = false;
      if (wpn.kind === 'melee' && dist < 140 && dist > 70 && f.dodgeCd <= 0 && Math.random() < D.aggr * 0.15) {
        inp.dodgeP = true; this.move = Math.sign(dx);
      }

      // Fähigkeiten
      for (let i = 0; i < f.abilities.length; i++) {
        if (f.abCd[i] > 0) continue;
        const id = f.abilities[i];
        let use = false;
        switch (id) {
          case 'teleport': use = dist > 450 && Math.random() < 0.25; break;
          case 'wind': use = dist < 200 && Math.random() < 0.35; break;
          case 'earthwall': use = g.projectiles.some((p) => p.owner !== f && U.dist(p.x, p.y, f.x, f.y) < 220) && Math.random() < 0.5; break;
          case 'bubble': use = f.hp < f.maxHp * 0.45 && dist < 220; break;
          case 'thunder': use = dist < 650 && Math.random() < 0.3; break;
          case 'spirit': use = dist < 550 && Math.random() < 0.35; break;
          case 'slowmo': use = dist < 260 && Math.random() < 0.25; break;
          case 'invis': use = f.hp < f.maxHp * 0.6 && Math.random() < 0.15; break;
        }
        if (use) { inp.abP[i] = true; break; }
      }
      const tur = f.extras.indexOf('turret');
      if (tur >= 0 && f.exCd[tur] <= 0 && f.grounded && dist < 500 && Math.random() < 0.3) inp.exP[tur] = true;
    }

    recover(g) {
      const f = this.f, w = g.world, inp = this.inp;
      let bestX = null, bd = 1e9, bestY = 0;
      const c0 = Math.floor(f.x / T);
      for (let dc = -18; dc <= 18; dc++) {
        const c = c0 + dc;
        if (c < 0 || c >= SL.COLS) continue;
        for (let r = Math.max(1, Math.floor((f.y - 260) / T)); r < SL.ROWS; r++) {
          if (w.get(c, r) && !w.get(c, r - 1) && !w.get(c, r - 2)) {
            const x = c * T + T / 2, y = r * T;
            const d = Math.abs(x - f.x) + Math.max(0, f.y - y) * 0.3;
            if (d < bd) { bd = d; bestX = x; bestY = y; }
            break;
          }
        }
      }
      if (bestX == null) { this.move = f.x < SL.W / 2 ? 1 : -1; return; }
      this.move = Math.sign(bestX - f.x);
      if (f.vy > -80 && f.jumpsLeft > 0) { inp.jumpP = true; this.jumpHoldT = 0.4; return; }
      const tp = f.abilities.indexOf('teleport');
      if (tp >= 0 && f.abCd[tp] <= 0 && f.vy > 0) {
        this.aimOverride = { x: bestX, y: bestY - 40 };
        inp.abP[tp] = true;
      }
      const gh = f.extras.indexOf('grapple');
      if (gh >= 0 && f.exCd[gh] <= 0 && !f.hook) {
        this.aimOverride = { x: bestX, y: bestY + 4 };
        inp.exP[gh] = true;
      }
    }
  }

  SL.BotAI = BotAI;
})();
