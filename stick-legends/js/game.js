'use strict';
// Spielablauf: Modi, Runden, Wellen, Punkte, Anzeige
(function () {
  const SL = window.SL;
  const U = SL.U;
  const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

  function scaledDiff(base, s) {
    return Object.assign({}, base, {
      react: base.react * (1 - s * 0.5),
      aimErr: base.aimErr * (1 - s),
      block: Math.min(0.9, base.block + s * 0.3),
      dodge: Math.min(0.9, base.dodge + s * 0.3),
      aggr: Math.min(1, base.aggr + s * 0.2),
    });
  }

  class Game {
    constructor(opts) {
      this.opts = opts;
      this.mode = opts.mode; // 'ffa' | 'waves' | 'attract'
      this.diff = SL.DIFFS[opts.diff == null ? 1 : opts.diff];
      this.fx = new SL.FX();
      this.time = 0;
      this.paused = false;
      this.over = false;
      this.earned = 0; this.kills = 0; this.lastKillT = -99;
      this.roundNo = 0; this.wave = 0; this.roundsWon = 0;
      this.slowmo = null;
      this.actionsAllowed = false;
      this.banner = null;
      this.wheel = null;
      this.invOpen = false;
      this.fighters = []; this.projectiles = []; this.entities = [];
      this.spawnQueue = [];
      this.usedColors = [];
      this.specs = [];
      const save = SL.save.data;
      if (this.mode !== 'attract') {
        const lo = save.loadout;
        this.specs.push({
          sid: 0, name: SL.t('you'), color: save.look.color, team: 0, isPlayer: true, look: Object.assign({}, save.look),
          weapons: lo.weapons.slice(), abilities: lo.abilities.slice(0, SL.save.abilitySlots()), extras: lo.extras.slice(), hp: 100,
        });
        this.usedColors.push(save.look.color);
      }
      if (this.mode === 'ffa' || this.mode === 'attract') {
        const n = this.mode === 'attract' ? 4 : opts.bots;
        const scale = this.mode === 'attract' ? 0 : Math.min(0.25, save.stats.wins * 0.004);
        for (let i = 0; i < n; i++) this.specs.push(this.makeBot(this.specs.length, this.specs.length, scale));
      }
      this.scores = this.specs.map(() => 0);
      this.startRound();
    }

    makeBot(sid, team, scale, typeId) {
      const keys = Object.keys(SL.BOT_TYPES);
      const type = SL.BOT_TYPES[typeId || U.pick(keys)];
      const weapons = U.shuffle(type.weapons.slice()).slice(0, 3);
      const abilities = U.shuffle(type.abilities.slice()).slice(0, 2);
      let color = SL.COLORS.find((c) => !this.usedColors.includes(c) && c !== '#f2f2f2') || U.pick(SL.COLORS);
      this.usedColors.push(color);
      if (this.usedColors.length >= SL.COLORS.length - 1) this.usedColors = this.usedColors.slice(0, 1);
      const hats = ['none', 'none', 'cap', 'tophat', 'wizard', 'viking'];
      return {
        sid, name: SL.tn(type.name), color, team, isPlayer: false, type: type.id,
        look: { hat: type.id === 'mage' ? 'wizard' : type.id === 'tank' ? 'viking' : U.pick(hats), face: U.pick(['normal', 'angry', 'cool', 'happy']), cape: 'none' },
        weapons, abilities, extras: type.extras.slice(),
        hp: Math.round(type.hp * (1 + scale * 0.5)), speed: type.speed,
        dmgMult: this.diff.dmg * (1 + scale * 0.5),
        ai: scaledDiff(this.diff, scale),
      };
    }

    createFighter(spec, x, y) {
      const f = new SL.Fighter(this, Object.assign({}, spec, { id: spec.sid, x, y, facing: x < SL.W / 2 ? 1 : -1 }));
      f.sid = spec.sid;
      if (!spec.isPlayer) f.ai = new SL.BotAI(f, spec.ai, SL.BOT_TYPES[spec.type]);
      this.fighters.push(f);
      return f;
    }

    startRound() {
      this.roundNo++;
      const map = this.opts.map && this.opts.map !== 'random' ? SL.MAPS.find((m) => m.id === this.opts.map) || SL.MAPS[0] : U.pick(SL.MAPS);
      this.world = new SL.World(map);
      this.fighters = []; this.projectiles = []; this.entities = []; this.slowmo = null; this.spawnQueue = [];
      this.fx = new SL.FX();
      this.deadT = 0;
      const spawns = U.shuffle(this.world.spawns.slice());
      if (this.mode === 'waves') {
        const sp = this.world.spawns[0];
        this.player = this.createFighter(this.specs[0], sp.x, sp.y);
        this.wave = 0;
        this.state = 'countdown'; this.stateT = 2.2;
        this.setBanner(SL.t('wave', { n: 1 }), null, 2.2);
      } else {
        this.specs.forEach((s, i) => { const sp = spawns[i % spawns.length]; this.createFighter(s, sp.x, sp.y); });
        this.player = this.fighters.find((f) => f.isPlayer) || null;
        this.state = 'countdown';
        this.stateT = this.mode === 'attract' ? 0.4 : 2.2;
        if (this.mode !== 'attract') this.setBanner(SL.t('round', { n: this.roundNo }), null, 2.2);
      }
      this.actionsAllowed = false;
    }

    startWave() {
      this.wave++;
      const n = Math.min(6, 1 + Math.floor((this.wave + 1) / 2));
      const scale = Math.min(0.6, (this.wave - 1) * 0.05);
      const sp = U.shuffle(this.world.spawns.slice());
      for (let i = 0; i < n; i++) {
        const type = this.wave % 5 === 0 && i === 0 ? 'tank' : null;
        const spec = this.makeBot(100 + this.wave * 10 + i, 1, scale, type);
        this.spawnQueue.push({ spec, t: 0.4 + i * 0.6, x: sp[i % sp.length].x });
      }
      if (this.wave > 1) this.setBanner(SL.t('wave', { n: this.wave }), null, 1.6);
    }

    setBanner(text, sub, t) { this.banner = { text, sub, t, max: t }; }

    timeScale(e) {
      const s = this.slowmo;
      if (!s || s.t <= 0) return 1;
      if (e === s.caster || (e.owner && e.owner === s.caster)) return 1;
      return 0.35;
    }

    update(dt, pin) {
      if (this.paused || this.over) return;
      const pl = this.player;
      // Waffenrad
      if (pl && pin.wheel && pl.state === 'normal' && this.mode !== 'attract') {
        if (!this.wheel) this.wheel = { sel: pl.weaponIdx };
        const v = SL.input.wheelVector(pl);
        if (U.hypot(v.x, v.y) > (SL.input.usePad ? 0.4 : 24)) {
          const a = Math.atan2(v.y, v.x);
          this.wheel.sel = (Math.round((a + Math.PI / 2) / (Math.PI / 2)) + 4) % 4;
        }
        dt *= 0.25;
        pin = Object.assign({}, pin, { attack: false, attackP: false });
      } else if (this.wheel) {
        if (pl && pl.weapons[this.wheel.sel]) pin.slot = this.wheel.sel;
        this.wheel = null;
      }
      if (pin.invP && this.mode !== 'attract') this.invOpen = !this.invOpen;
      if (pl && pl.state === 'dead' && this.mode === 'ffa') dt *= 1.8;
      this.time += dt;
      if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }

      // Zustände
      if (this.state === 'countdown') {
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = 'play'; this.actionsAllowed = true;
          if (this.mode !== 'attract') this.setBanner(SL.t('go'), null, 0.8);
          if (this.mode === 'waves') this.startWave();
        }
      } else if (this.state === 'break') {
        this.stateT -= dt;
        if (this.stateT <= 0) { this.state = 'play'; this.startWave(); }
      } else if (this.state === 'roundEnd') {
        this.stateT -= dt;
        if (this.stateT <= 0) this.afterRound();
      }
      if (this.slowmo) { this.slowmo.t -= dt; if (this.slowmo.t <= 0) this.slowmo = null; }

      for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
        const q = this.spawnQueue[i];
        q.t -= dt;
        if (q.t <= 0) {
          this.spawnQueue.splice(i, 1);
          const f = this.createFighter(q.spec, q.x, -40);
          f.invulnT = 1.2;
          this.fx.ring(q.x, 30, 30, q.spec.color, 0.5, 4);
        }
      }

      for (const f of this.fighters) {
        const fdt = dt * this.timeScale(f);
        const inp = f.isPlayer ? pin : f.ai.getInput(fdt);
        f.update(fdt, inp);
        if (f.gravWell && f.state === 'normal') SL.updateGravWell(this, f, fdt);
        else if (f.gravWell && f.state !== 'normal') f.gravWell = null;
        if (f.alive && (f.cy > SL.H + 80 || f.cx < -160 || f.cx > SL.W + 160)) f.die(null, 'ringout', 0, 0);
      }
      for (const p of this.projectiles) p.update(dt * this.timeScale(p), this);
      this.projectiles = this.projectiles.filter((p) => !p.dead);
      for (const e of this.entities) e.update(dt * this.timeScale(e), this);
      this.entities = this.entities.filter((e) => !e.dead);
      this.world.update(dt, this);
      this.crushCheck();
      this.fx.update(dt);
      if (this.state === 'play') this.checkEnd(dt);
    }

    crushCheck() {
      for (const ch of this.world.chunks) {
        if (ch.vy < 350) continue;
        for (const f of this.fighters) {
          if (!f.alive || ch.hitSet.has(f)) continue;
          for (const tl of ch.tiles) {
            const x0 = (ch.c0 + tl.dc) * SL.T, y0 = (ch.r0 + tl.dr) * SL.T + ch.oy;
            if (f.cx + 10 > x0 && f.cx - 10 < x0 + SL.T && f.cy + 30 > y0 && f.cy - 30 < y0 + SL.T) {
              ch.hitSet.add(f);
              const cause = ch.cause && ch.cause !== f ? ch.cause : null;
              f.hit({ dmg: 18, kx: U.rand(-100, 100), ky: 450, from: cause, kind: 'crush', stun: true, force: true });
              break;
            }
          }
        }
      }
    }

    checkEnd(dt) {
      if (this.mode === 'waves') {
        if (!this.player.alive) { this.endRound(null); return; }
        const enemiesAlive = this.fighters.some((f) => f.alive && f.team !== 0);
        if (!enemiesAlive && this.spawnQueue.length === 0 && this.wave > 0) {
          const bonus = Math.round(this.wave * 5 * this.diff.pts);
          this.earned += bonus; SL.save.addPoints(bonus);
          this.setBanner(SL.t('waveClear'), '+' + bonus + ' ⭐', 2.4);
          const p = this.player;
          p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.35);
          for (const id in p.ammo) p.ammo[id] = SL.WEAPONS[id].ammo;
          this.fighters = this.fighters.filter((f) => f.alive || f.skel.p[SL.P.PELVIS].y < SL.H + 200);
          this.state = 'break'; this.stateT = 3;
          SL.save.store();
        }
        return;
      }
      const alive = this.fighters.filter((f) => f.alive);
      const teams = new Set(alive.map((f) => f.team));
      if (teams.size <= 1) { this.endRound(alive[0] || null); return; }
      if (this.player && !this.player.alive) {
        this.deadT += dt;
        if (this.deadT > 15) this.endRound(null);
      }
    }

    endRound(winner) {
      this.state = 'roundEnd';
      this.stateT = 2.6;
      this.roundWinner = winner;
      if (this.mode === 'attract') { this.stateT = 2; return; }
      if (this.mode === 'waves') {
        this.stateT = 2.2;
        this.setBanner(SL.t('gameOver'), SL.t('wave', { n: this.wave }), 2.2);
        return;
      }
      if (winner) {
        this.scores[winner.sid]++;
        if (winner.isPlayer) {
          this.roundsWon++;
          const bonus = Math.round(20 * this.diff.pts);
          this.earned += bonus; SL.save.addPoints(bonus);
          this.setBanner(SL.t('youWinRound'), '+' + bonus + ' ⭐', 2.4);
        } else this.setBanner(SL.t('winsRound', { name: winner.name }), null, 2.4);
      } else this.setBanner(SL.t('draw'), null, 2.4);
      SL.save.store();
    }

    afterRound() {
      if (this.mode === 'attract') { this.roundNo = 0; this.startRound(); return; }
      if (this.mode === 'waves') { this.finish(false); return; }
      const best = Math.max(...this.scores);
      if (best >= this.opts.rounds) {
        const won = this.scores[0] >= this.opts.rounds;
        if (won) {
          const bonus = Math.round(50 * this.diff.pts);
          this.earned += bonus; SL.save.addPoints(bonus);
        }
        this.finish(won);
      } else this.startRound();
    }

    finish(won) {
      this.over = true;
      const st = SL.save.data.stats;
      if (won) st.wins++;
      if (this.mode === 'waves') st.bestWave = Math.max(st.bestWave, this.wave);
      SL.save.store();
      if (this.opts.onEnd) this.opts.onEnd({ mode: this.mode, won, kills: this.kills, earned: this.earned, wave: this.wave, roundsWon: this.roundsWon });
    }

    onDeath(victim, killer, kind, wasThrown) {
      if (!killer || killer === victim) killer = this.time - victim.lastAttackT < 6 ? victim.lastAttacker : null;
      if (killer === victim) killer = null;
      this.fx.burst(victim.cx, victim.cy, 16, victim.color, 380, 0.6, 4, { grav: 0.8 });
      this.fx.ring(victim.cx, victim.cy, 40, victim.color, 0.4, 4);
      if (killer) killer.kills++;
      if (this.mode === 'attract' || !killer || !killer.isPlayer) return;
      let pts = 10 * this.diff.pts;
      const labels = [];
      if (kind === 'ringout') { pts += 5; labels.push(SL.t('bonusRingout')); }
      if (wasThrown || victim.lastHitKind === 'throw') { pts += 8; labels.push(SL.t('bonusThrow')); }
      if (victim.lastCombo === 3 && victim.lastHitKind === 'melee') { pts += 5; labels.push(SL.t('bonusCombo')); }
      if (kind === 'crush') { pts += 10; labels.push(SL.t('bonusCrush')); }
      if (this.time - this.lastKillT < 3) { pts += 10; labels.push(SL.t('bonusDouble')); }
      this.lastKillT = this.time;
      pts = Math.round(pts);
      this.earned += pts;
      this.kills++;
      SL.save.addPoints(pts);
      SL.save.data.stats.kills++;
      const tx = U.clamp(victim.cx, 60, SL.W - 60), ty = U.clamp(victim.cy - 40, 60, SL.H - 60);
      this.fx.text(tx, ty, '+' + pts + ' ⭐ ' + labels.join(' '), '#ffe066');
    }

    // ---------- Zeichnen ----------
    draw(ctx) {
      ctx.save();
      if (this.fx.shake > 0) ctx.translate(U.rand(-1, 1) * this.fx.shake, U.rand(-1, 1) * this.fx.shake);
      this.world.drawBack(ctx);
      this.world.drawTiles(ctx);
      for (const e of this.entities) e.draw(ctx, this);
      const order = this.fighters.slice().sort((a, b) => (a.alive ? 1 : 0) - (b.alive ? 1 : 0) || (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
      for (const f of order) f.draw(ctx);
      for (const p of this.projectiles) p.draw(ctx, this);
      this.fx.draw(ctx);
      for (const f of this.fighters) f.drawOverlay(ctx);
      ctx.restore();
      if (this.slowmo) { ctx.fillStyle = 'rgba(255,170,90,0.08)'; ctx.fillRect(0, 0, SL.W, SL.H); }
      if (this.mode !== 'attract') this.drawHUD(ctx);
      if (this.banner) this.drawBanner(ctx);
      if (this.wheel) this.drawWheel(ctx);
    }

    drawBanner(ctx) {
      const b = this.banner;
      const a = Math.min(1, b.t * 3, (b.max - b.t) * 6 + 0.3);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = 'bold 60px system-ui, sans-serif';
      ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(30,40,60,0.55)';
      ctx.strokeText(b.text, SL.W / 2, 200);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.text, SL.W / 2, 200);
      if (b.sub) {
        ctx.font = 'bold 30px system-ui, sans-serif';
        ctx.lineWidth = 6;
        ctx.strokeText(b.sub, SL.W / 2, 245);
        ctx.fillStyle = '#ffe066';
        ctx.fillText(b.sub, SL.W / 2, 245);
      }
      ctx.restore();
    }

    drawHUD(ctx) {
      const p = this.player;
      const PANEL = 'rgba(16,20,29,0.8)', SLOT = 'rgba(255,255,255,0.07)', DIM = '#8e98aa';
      ctx.save();
      const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
      if (p) {
        // Leben und Mana oben links
        const ph = p.hasJetpack ? 62 : 54;
        ctx.fillStyle = PANEL; rr(14, 14, 300, ph, 14); ctx.fill();
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(34, 34, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
        const hpF = Math.max(0, p.hp / p.maxHp);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(52, 24, 248, 16, 8); ctx.fill();
        ctx.fillStyle = hpF > 0.5 ? '#4ade80' : hpF > 0.25 ? '#facc15' : '#f87171';
        if (hpF > 0) { rr(52, 24, 248 * hpF, 16, 8); ctx.fill(); }
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(Math.max(0, p.hp)) + ' / ' + p.maxHp, 176, 36);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(52, 46, 248, 7, 4); ctx.fill();
        ctx.fillStyle = '#60a5fa'; rr(52, 46, 248 * p.mana / 100, 7, 4); ctx.fill();
        if (p.hasJetpack) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(52, 57, 248, 5, 3); ctx.fill();
          ctx.fillStyle = '#fb923c'; rr(52, 57, 248 * p.jetFuel / 100, 5, 3); ctx.fill();
        }

        // Waffenleiste unten
        const sw = 78, sh = 58, gap = 8, bw = 4 * sw + 3 * gap + 20, bx = (SL.W - bw) / 2, by = SL.H - sh - 34;
        ctx.fillStyle = PANEL; rr(bx, by, bw, sh + 20, 16); ctx.fill();
        for (let i = 0; i < 4; i++) {
          const x = bx + 10 + i * (sw + gap), y = by + 10, id = p.weapons[i], sel = i === p.weaponIdx;
          ctx.fillStyle = sel ? 'rgba(255,255,255,0.16)' : SLOT;
          rr(x, y, sw, sh, 11); ctx.fill();
          if (sel) { ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.stroke(); }
          if (id) {
            const wd = SL.WEAPONS[id];
            const len = { spear: 92, hammer: 54, rockets: 52, firestaff: 64, lightstaff: 64, sword: 50, gravity: 40, frostbow: 30, bombs: 18 }[id] || 40;
            const sc = id === 'frostbow' ? 0.95 : Math.min(1, 62 / len);
            SL.drawWeapon(ctx, id, x + sw / 2 - (id === 'frostbow' ? 0 : len * sc / 2.2), y + sh / 2 + 3, id === 'frostbow' ? 0 : -0.3, sc, { time: this.time });
            if (wd.ammo) {
              ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'right';
              ctx.fillText(p.ammo[id] + '/' + wd.ammo, x + sw - 6, y + sh - 6);
            }
          }
          ctx.fillStyle = DIM; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left';
          ctx.fillText(SL.input.label('w' + (i + 1)), x + 6, y + 14);
        }
        const hint = '[' + SL.input.label('inv') + '] ' + SL.t('inventory');
        ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'left';
        const hw = ctx.measureText(hint).width + 20;
        ctx.fillStyle = PANEL; rr(bx + bw + 8, by + sh / 2 - 4, hw, 26, 13); ctx.fill();
        ctx.fillStyle = '#e6e9ef';
        ctx.fillText(hint, bx + bw + 18, by + sh / 2 + 13);

        // Inventar (Fähigkeiten + Ausrüstung)
        if (this.invOpen) {
          const cs = 52, cg = 8;
          const rows = [
            { title: SL.t('abilities'), items: p.abilities.map((id, i) => ({ icon: SL.ABILITIES[id].icon, key: SL.input.label('ab' + (i + 1)), cd: p.abCd[i] / SL.ABILITIES[id].cd })) },
            { title: SL.t('extras'), items: p.extras.map((id, i) => id ? { icon: SL.EXTRAS[id].icon, key: SL.EXTRAS[id].active ? SL.input.label('ex' + (i + 1)) : '', cd: SL.EXTRAS[id].cd ? p.exCd[i] / SL.EXTRAS[id].cd : 0, on: id === 'grapple' && p.hook } : null) },
          ];
          const maxN = Math.max(4, ...rows.map((r) => r.items.length));
          const iw = maxN * (cs + cg) - cg + 32, ih = rows.length * (cs + 26) + 18;
          const ix = (SL.W - iw) / 2, iy = by - ih - 12;
          ctx.fillStyle = PANEL; rr(ix, iy, iw, ih, 16); ctx.fill();
          rows.forEach((row, ri) => {
            const ry = iy + 14 + ri * (cs + 26);
            ctx.fillStyle = DIM; ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'left';
            ctx.fillText(row.title.toUpperCase(), ix + 16, ry + 8);
            row.items.forEach((it, k) => {
              const x = ix + 16 + k * (cs + cg), y = ry + 16;
              ctx.fillStyle = SLOT; rr(x, y, cs, cs, 10); ctx.fill();
              if (!it) return;
              ctx.font = '26px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#000';
              ctx.globalAlpha = it.cd > 0 ? 0.4 : 1;
              ctx.fillText(it.icon, x + cs / 2, y + cs / 2 + 10);
              ctx.globalAlpha = 1;
              if (it.cd > 0) {
                ctx.fillStyle = 'rgba(0,0,0,0.45)';
                ctx.beginPath(); ctx.moveTo(x + cs / 2, y + cs / 2); ctx.arc(x + cs / 2, y + cs / 2, cs / 2 - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * it.cd); ctx.fill();
              }
              if (it.on) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; rr(x, y, cs, cs, 10); ctx.stroke(); }
              if (it.key) {
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'left';
                ctx.fillText(it.key, x + 5, y + 12);
              }
            });
          });
        }
      }
      // oben rechts
      const save = SL.save.data;
      ctx.textAlign = 'right';
      ctx.fillStyle = PANEL;
      rr(SL.W - 314, 14, 300, this.mode === 'ffa' ? 76 : 64, 14); ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('⭐ ' + save.points + (this.earned ? '  (+' + this.earned + ')' : ''), SL.W - 30, 42);
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.fillStyle = '#e6e9ef';
      if (this.mode === 'waves') {
        const left = this.fighters.filter((f) => f.alive && f.team !== 0).length + this.spawnQueue.length;
        ctx.fillText(SL.t('wave', { n: Math.max(1, this.wave) }) + ' · ' + SL.t('enemiesLeft', { n: left }), SL.W - 30, 66);
      } else {
        let xx = SL.W - 30;
        ctx.textAlign = 'center';
        for (let i = this.specs.length - 1; i >= 0; i--) {
          const s = this.specs[i];
          ctx.fillStyle = s.color;
          ctx.beginPath(); ctx.arc(xx - 10, 68, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = s.color === '#f2f2f2' || s.color === '#f5c518' ? '#1f2937' : '#ffffff';
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.fillText(String(this.scores[i]), xx - 10, 72);
          xx -= 28;
        }
        ctx.fillStyle = DIM; ctx.textAlign = 'right'; ctx.font = '600 12px system-ui, sans-serif';
        ctx.fillText(SL.t('round', { n: this.roundNo }) + ' · ' + SL.t('roundsToWin') + ': ' + this.opts.rounds, xx + 4, 72);
      }
      ctx.restore();
    }

    drawWheel(ctx) {
      const p = this.player;
      if (!p) return;
      const cx = U.clamp(p.x, 130, SL.W - 130), cy = U.clamp(p.y - 34, 130, SL.H - 130);
      ctx.save();
      ctx.fillStyle = 'rgba(20,30,45,0.55)';
      ctx.beginPath(); ctx.arc(cx, cy, 110, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 2;
        const x = cx + Math.cos(a) * 70, y = cy + Math.sin(a) * 70;
        if (i === this.wheel.sel) {
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 110, a - Math.PI / 4, a + Math.PI / 4); ctx.fill();
        }
        const id = p.weapons[i];
        if (id) SL.drawWeapon(ctx, id, x - 20, y, -0.4, 0.8, { time: this.time });
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(id ? SL.tn(SL.WEAPONS[id].name) : SL.t('empty'), x, y + 30);
      }
      ctx.restore();
    }
  }

  SL.Game = Game;
})();
