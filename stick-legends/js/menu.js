'use strict';
// Menüs: Hauptmenü, Spielmodi, Ausrüstung, Shop, Figur, Einstellungen, Pause, Ergebnis
(function () {
  const SL = window.SL;
  const U = SL.U;
  const t = (k, v) => SL.t(k, v);
  const tn = (o) => U.esc(SL.tn(o));

  const iconCache = {};
  function weaponIcon(id) {
    if (iconCache[id]) return iconCache[id];
    const c = document.createElement('canvas');
    c.width = 120; c.height = 72;
    const ctx = c.getContext('2d');
    const len = { spear: 92, hammer: 54, rockets: 52, firestaff: 64, lightstaff: 64, sword: 50, gravity: 40, frostbow: 30, bombs: 20 }[id] || 40;
    const sc = id === 'frostbow' ? 1.35 : Math.min(1.8, 96 / len);
    if (id === 'frostbow') ctx.translate(52, 36);
    else ctx.translate(60 - (len * sc) / 2 * Math.cos(-0.35), 44);
    SL.drawWeapon(ctx, id, 0, 0, id === 'frostbow' ? 0 : -0.35, sc, { charge: 0, time: 0.3 });
    iconCache[id] = c.toDataURL();
    return iconCache[id];
  }

  const mapCache = {};
  function mapPreview(map) {
    if (mapCache[map.id]) return mapCache[map.id];
    const w = new SL.World(map);
    w.renderTiles();
    const c = document.createElement('canvas');
    c.width = 240; c.height = 134;
    const ctx = c.getContext('2d');
    ctx.drawImage(w.bg, 0, 0, 240, 134);
    ctx.drawImage(w.tileCanvas, 0, 0, 240, 134);
    mapCache[map.id] = c.toDataURL();
    return mapCache[map.id];
  }

  function itemIcon(cat, id) {
    if (cat === 'weapons') return '<img class="wicon" alt="" src="' + weaponIcon(id) + '">';
    const tbl = cat === 'abilities' ? SL.ABILITIES : SL.EXTRAS;
    return '<span class="emo">' + tbl[id].icon + '</span>';
  }
  function table(cat) { return cat === 'weapons' ? SL.WEAPONS : cat === 'abilities' ? SL.ABILITIES : SL.EXTRAS; }

  const M = SL.menu = {
    root: null,
    screen: 'main',
    picker: null,
    shopTab: 'weapons',
    result: null,
    toastT: null,

    init(root) {
      this.root = root;
      root.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act]');
        if (!el || el.disabled) return;
        this.act(el.dataset.act, el.dataset);
      });
    },

    show(screen) {
      this.screen = screen;
      this.listen = null;
      SL.input.capture = null;
      this.picker = null;
      this.render();
      this.root.classList.remove('hidden');
      const first = this.root.querySelector('button.primary:not([disabled])') || this.root.querySelector('button:not([disabled])');
      if (first && SL.input.usePad) first.focus();
    },
    hide() { this.root.classList.add('hidden'); this.root.innerHTML = ''; },
    visible() { return !this.root.classList.contains('hidden'); },

    toast(msg) {
      let el = document.getElementById('toast');
      if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
      el.textContent = msg;
      el.classList.add('on');
      clearTimeout(this.toastT);
      this.toastT = setTimeout(() => el.classList.remove('on'), 1600);
    },

    back() {
      if (this.picker) { this.picker = null; this.render(); return; }
      if (this.screen === 'pause') { SL.app.resume(); return; }
      if (this.screen !== 'main' && this.screen !== 'results') this.show('main');
    },

    act(a, ds) {
      const s = SL.save.data, st = s.settings;
      switch (a) {
        case 'main': case 'ffa': case 'waves': case 'loadout': case 'shop': case 'look': case 'settings':
          this.show(a); break;
        case 'bots-': st.bots = Math.max(1, st.bots - 1); SL.save.store(); this.render(); break;
        case 'bots+': st.bots = Math.min(7, st.bots + 1); SL.save.store(); this.render(); break;
        case 'diff': st.diff = +ds.v; SL.save.store(); this.render(); break;
        case 'waveDiff': st.waveDiff = +ds.v; SL.save.store(); this.render(); break;
        case 'map': st.map = ds.v; SL.save.store(); this.render(); break;
        case 'waveMap': st.waveMap = ds.v; SL.save.store(); this.render(); break;
        case 'rounds': st.rounds = +ds.v; SL.save.store(); this.render(); break;
        case 'startFfa': SL.app.startGame({ mode: 'ffa', bots: st.bots, diff: st.diff, map: st.map, rounds: st.rounds }); break;
        case 'startWaves': SL.app.startGame({ mode: 'waves', diff: st.waveDiff, map: st.waveMap }); break;
        case 'pick': this.picker = { cat: ds.cat, i: +ds.i }; this.render(); break;
        case 'closePick': this.picker = null; this.render(); break;
        case 'set': {
          const p = this.picker, arr = s.loadout[p.cat];
          const id = ds.id || null;
          const other = id ? arr.indexOf(id) : -1;
          if (other >= 0 && other !== p.i) arr[other] = arr[p.i];
          arr[p.i] = id;
          SL.save.store();
          this.picker = null;
          this.render();
          break;
        }
        case 'tab': this.shopTab = ds.v; this.render(); break;
        case 'buy': {
          const price = +ds.price;
          if (SL.save.buy(ds.id, price)) {
            this.autoEquip(ds.id);
            this.toast('✅ ' + ds.name);
          } else this.toast(t('notEnough'));
          this.render();
          break;
        }
        case 'color': s.look.color = ds.v; SL.save.store(); this.render(); break;
        case 'hat': case 'face': case 'cape':
          if (SL.save.owns(a + '_' + ds.v)) { s.look[a] = ds.v; SL.save.store(); this.render(); }
          else { this.shopTab = 'cosmetics'; this.show('shop'); }
          break;
        case 'lang':
          st.lang = ds.v; SL.lang = ds.v; SL.save.store();
          document.documentElement.lang = ds.v;
          this.render();
          break;
        case 'bind': {
          const a2 = ds.a, i2 = +ds.i;
          this.listen = { a: a2, i: i2 };
          this.render();
          SL.input.capture = (code, key) => {
            const keys = st.keys;
            if (code === 'Delete' || code === 'Backspace') keys[a2][i2] = null;
            else if (code) {
              for (const k in keys) keys[k] = keys[k].map((c) => (c === code ? null : c));
              keys[a2][i2] = code;
              if (key && key.length === 1 && key !== ' ') st.keyLabels[code] = key.toUpperCase();
            }
            this.listen = null;
            SL.save.store();
            this.render();
          };
          break;
        }
        case 'resetKeys':
          st.keys = SL.defaultKeys(); st.keyLabels = {}; SL.save.store(); this.render();
          break;
        case 'reset':
          if (window.confirm(t('resetConfirm'))) { SL.save.reset(); this.show('main'); }
          break;
        case 'resume': SL.app.resume(); break;
        case 'restart': SL.app.restart(); break;
        case 'quit': SL.app.quit(); break;
        case 'again': SL.app.restart(); break;
      }
    },

    // Neu gekaufte Sachen gleich in einen freien Platz legen
    autoEquip(id) {
      const lo = SL.save.data.loadout;
      let cat = null;
      if (SL.WEAPONS[id]) cat = 'weapons'; else if (SL.ABILITIES[id]) cat = 'abilities'; else if (SL.EXTRAS[id]) cat = 'extras';
      if (cat) {
        const arr = lo[cat];
        const free = arr.indexOf(null);
        if (free >= 0 && !arr.includes(id)) arr[free] = id;
      } else {
        const [k, v] = id.split('_');
        if (k === 'hat' || k === 'face' || k === 'cape') SL.save.data.look[k] = v;
      }
      SL.save.validate();
      SL.save.store();
    },

    render() {
      const fn = this['r_' + this.screen];
      this.root.innerHTML = fn ? fn.call(this) : '';
      if (this.screen === 'look') this.drawPreview();
    },

    seg(act, items, cur) {
      return '<div class="seg">' + items.map((it) => '<button data-act="' + act + '" data-v="' + U.esc(it.v) + '" class="' + (String(it.v) === String(cur) ? 'on' : '') + '">' + it.html + '</button>').join('') + '</div>';
    },

    r_main() {
      const s = SL.save.data;
      return '<div class="panel main">' +
        '<h1 class="logo">Stick <span>Legends</span></h1>' +
        '<p class="tag">' + t('tagline') + '</p>' +
        '<div class="pts">⭐ ' + s.points + ' ' + t('points') + '</div>' +
        '<div class="modes">' +
        '<button class="mode primary" data-act="ffa"><span class="emo">⚔️</span><b>' + t('ffa') + '</b></button>' +
        '<button class="mode" data-act="waves"><span class="emo">🌊</span><b>' + t('waves') + '</b>' + (s.stats.bestWave ? '<small>🏆 ' + t('wave', { n: s.stats.bestWave }) + '</small>' : '') + '</button>' +
        '<button class="mode" disabled><span class="emo">🗺️</span><b>' + t('campaign') + '</b><small>' + t('soon') + '</small></button>' +
        '<button class="mode" disabled><span class="emo">🏖️</span><b>' + t('sandbox') + '</b><small>' + t('soon') + '</small></button>' +
        '<button class="mode" disabled><span class="emo">🎨</span><b>' + t('creative') + '</b><small>' + t('lockedCreative') + '</small></button>' +
        '</div>' +
        '<div class="row">' +
        '<button data-act="loadout">🎒 ' + t('loadout') + '</button>' +
        '<button data-act="shop">🛒 ' + t('shop') + '</button>' +
        '<button data-act="look">🧍 ' + t('look') + '</button>' +
        '<button data-act="settings">⚙️ ' + t('settings') + '</button>' +
        '</div></div>';
    },

    mapSeg(act, cur) {
      const items = [{ v: 'random', html: '<span class="maprand">🎲</span><span>' + t('random') + '</span>' }]
        .concat(SL.MAPS.map((m) => ({ v: m.id, html: '<img alt="" src="' + mapPreview(m) + '"><span>' + tn(m.name) + '</span>' })));
      return '<div class="maps">' + this.seg(act, items, cur) + '</div>';
    },

    r_ffa() {
      const st = SL.save.data.settings;
      return '<div class="panel">' +
        '<h2>⚔️ ' + t('ffa') + '</h2>' +
        '<div class="field"><label>' + t('enemies') + '</label><div class="stepper"><button data-act="bots-">−</button><span>' + st.bots + '</span><button data-act="bots+">+</button></div></div>' +
        '<div class="field"><label>' + t('difficulty') + '</label>' + this.seg('diff', SL.DIFFS.map((d, i) => ({ v: i, html: tn(d.name) })), st.diff) + '</div>' +
        '<div class="field col"><label>' + t('arena') + '</label>' + this.mapSeg('map', st.map) + '</div>' +
        '<div class="field"><label>' + t('roundsToWin') + '</label>' + this.seg('rounds', [3, 5, 7].map((n) => ({ v: n, html: String(n) })), st.rounds) + '</div>' +
        '<p class="hint">' + t('autoScale') + '</p>' +
        '<div class="row"><button data-back data-act="main">← ' + t('back') + '</button><button class="primary" data-act="startFfa">▶ ' + t('start') + '</button></div>' +
        '</div>';
    },

    r_waves() {
      const st = SL.save.data.settings;
      return '<div class="panel">' +
        '<h2>🌊 ' + t('waves') + '</h2>' +
        '<div class="field"><label>' + t('difficulty') + '</label>' + this.seg('waveDiff', SL.DIFFS.map((d, i) => ({ v: i, html: tn(d.name) })), st.waveDiff) + '</div>' +
        '<div class="field col"><label>' + t('arena') + '</label>' + this.mapSeg('waveMap', st.waveMap) + '</div>' +
        '<p class="hint">' + t('autoScale') + '</p>' +
        '<div class="row"><button data-back data-act="main">← ' + t('back') + '</button><button class="primary" data-act="startWaves">▶ ' + t('start') + '</button></div>' +
        '</div>';
    },

    r_loadout() {
      const lo = SL.save.data.loadout;
      const nAb = SL.save.abilitySlots();
      const slot = (cat, i, id, key) => {
        const tb = table(cat);
        return '<button class="slot" data-act="pick" data-cat="' + cat + '" data-i="' + i + '">' +
          (key ? '<i class="key">' + key + '</i>' : '') +
          (id ? itemIcon(cat, id) + '<span>' + tn(tb[id].name) + '</span>' : '<span class="emptyslot">＋</span><span>' + t('empty') + '</span>') +
          '</button>';
      };
      let html = '<div class="panel wide"><h2>🎒 ' + t('loadout') + '</h2><p class="hint">' + t('slotsInfo', { n: nAb }) + '</p>';
      html += '<h3>' + t('weapons') + '</h3><div class="slots">' + lo.weapons.map((id, i) => slot('weapons', i, id, String(i + 1))).join('') + '</div>';
      html += '<h3>' + t('abilities') + '</h3><div class="slots">' + lo.abilities.map((id, i) => slot('abilities', i, id, SL.input.label('ab' + (i + 1)))).join('');
      for (let i = nAb; i < 5; i++) html += '<button class="slot locked" disabled><span class="emo">🔒</span><span>' + t('locked') + '</span></button>';
      html += '</div><p class="hint">' + t('abilitySlotsInfo') + '</p>';
      html += '<h3>' + t('extras') + '</h3><div class="slots">' + lo.extras.map((id, i) => slot('extras', i, id, id && SL.EXTRAS[id].active ? SL.input.label('ex' + (i + 1)) : '')).join('') + '</div>';
      html += '<div class="row"><button data-back data-act="main">← ' + t('back') + '</button><button data-act="shop">🛒 ' + t('shop') + '</button></div></div>';
      if (this.picker) html += this.pickerHtml();
      return html;
    },

    pickerHtml() {
      const p = this.picker, tb = table(p.cat), cur = SL.save.data.loadout[p.cat][p.i];
      const ids = Object.keys(tb).filter((id) => !tb[id].hidden && SL.save.owns(id));
      let html = '<div class="modal"><div class="panel"><h2>' + t('choose') + '</h2><div class="picklist">';
      html += '<button class="pick ' + (cur ? '' : 'on') + '" data-act="set" data-id=""><span class="emo">✖️</span><div><b>' + t('empty') + '</b></div></button>';
      for (const id of ids) {
        const it = tb[id];
        html += '<button class="pick ' + (id === cur ? 'on' : '') + '" data-act="set" data-id="' + id + '">' + itemIcon(p.cat, id) +
          '<div><b>' + tn(it.name) + (it.passive ? ' <em>' + t('passive') + '</em>' : '') + '</b><small>' + tn(it.desc) + '</small></div></button>';
      }
      html += '</div><div class="row"><button data-back data-act="closePick">← ' + t('back') + '</button><button data-act="shop">🛒 ' + t('shop') + '</button></div></div></div>';
      return html;
    },

    r_shop() {
      const s = SL.save.data;
      const tabs = [['weapons', '⚔️ ' + t('weapons')], ['abilities', '✨ ' + t('abilities')], ['extras', '🛡️ ' + t('extras')], ['cosmetics', '🎩 ' + t('cosmetics')]];
      let html = '<div class="panel wide dark shop"><div class="shophead"><h2>🛒 ' + t('shop') + '</h2><div class="pts">⭐ ' + s.points + '</div></div>';
      html += '<div class="tabs">' + tabs.map(([k, l]) => '<button data-act="tab" data-v="' + k + '" class="' + (this.shopTab === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
      const cards = [];
      const card = (key, icon, name, desc, price) => {
        const owned = SL.save.owns(key);
        const can = s.points >= price;
        cards.push('<div class="card ' + (owned ? 'owned' : '') + '"><div class="cimg">' + icon + '</div>' +
          '<div class="cbody"><b>' + name + '</b>' + (desc ? '<small>' + desc + '</small>' : '') + '</div>' +
          '<div class="cfoot">' + (owned ? '<span class="tagok">✓ ' + t('owned') + '</span>' :
            '<span class="price">⭐ ' + price + '</span><button class="' + (can ? 'primary' : '') + '" data-act="buy" data-id="' + key + '" data-price="' + price + '" data-name="' + name + '"' + (can ? '' : ' disabled') + '>' + t('buy') + '</button>') +
          '</div></div>');
      };
      if (this.shopTab === 'cosmetics') {
        for (const id in SL.HATS) if (id !== 'none') card('hat_' + id, '<span class="emo">' + SL.HATS[id].icon + '</span>', tn(SL.HATS[id].name), t('hat'), SL.HATS[id].price);
        for (const id in SL.FACES) if (SL.FACES[id].price) card('face_' + id, '<span class="emo">' + SL.FACES[id].icon + '</span>', tn(SL.FACES[id].name), t('face'), SL.FACES[id].price);
        for (const id in SL.CAPES) if (id !== 'none') card('cape_' + id, '<span class="emo">' + SL.CAPES[id].icon + '</span>', tn(SL.CAPES[id].name), t('cape'), SL.CAPES[id].price);
      } else {
        const tb = table(this.shopTab);
        for (const id in tb) {
          if (tb[id].hidden) continue;
          card(id, itemIcon(this.shopTab, id), tn(tb[id].name), tn(tb[id].desc), tb[id].price);
        }
      }
      html += '<div class="cards">' + cards.join('') + '</div>';
      html += '<div class="row"><button data-back data-act="main">← ' + t('back') + '</button><button data-act="loadout">🎒 ' + t('loadout') + '</button></div></div>';
      return html;
    },

    r_look() {
      const s = SL.save.data, lk = s.look;
      const opts = (kind, tbl) => Object.keys(tbl).map((id) => {
        const owned = SL.save.owns(kind + '_' + id);
        return '<button class="chip ' + (lk[kind] === id ? 'on' : '') + (owned ? '' : ' lockd') + '" data-act="' + kind + '" data-v="' + id + '" title="' + tn(tbl[id].name) + '">' +
          '<span class="emo">' + tbl[id].icon + '</span><small>' + (owned ? tn(tbl[id].name) : '🔒 ⭐' + tbl[id].price) + '</small></button>';
      }).join('');
      return '<div class="panel wide look"><h2>🧍 ' + t('look') + '</h2><div class="lookwrap"><canvas id="preview" width="220" height="260"></canvas><div class="lookopts">' +
        '<h3>' + t('color') + '</h3><div class="swatches">' + SL.COLORS.map((c) => '<button class="sw ' + (lk.color === c ? 'on' : '') + '" data-act="color" data-v="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>').join('') + '</div>' +
        '<h3>' + t('hat') + '</h3><div class="chips">' + opts('hat', SL.HATS) + '</div>' +
        '<h3>' + t('face') + '</h3><div class="chips">' + opts('face', SL.FACES) + '</div>' +
        '<h3>' + t('cape') + '</h3><div class="chips">' + opts('cape', SL.CAPES) + '</div>' +
        '</div></div><div class="row"><button data-back data-act="main">← ' + t('back') + '</button></div></div>';
    },

    drawPreview() {
      const cv = document.getElementById('preview');
      if (!cv) return;
      const ctx = cv.getContext('2d');
      const lk = SL.save.data.look;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.save();
      ctx.translate(100, 228);
      ctx.scale(2.2, 2.2);
      const pts = [[2, -60], [1, -49], [0, -28], [4, -14], [6, 0], [-3, -14], [-6, 0], [-5, -39], [-6, -28], [9, -40], [16, -46]].map(([x, y]) => ({ x, y }));
      const cape = [];
      for (let i = 0; i < 5; i++) cape.push({ x: 1 - i * 1.6, y: -49 + (i + 1) * 7 });
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(0, 1, 18, 3, 0, 0, Math.PI * 2); ctx.fill();
      const lo = SL.save.data.loadout;
      SL.drawStick(ctx, pts, {
        color: lk.color, facing: 1, hat: lk.hat, face: lk.face, cape: SL.CAPES[lk.cape].color, capePts: cape,
        helmet: lo.extras.includes('helmet'), chest: lo.extras.includes('chest'), jetpack: lo.extras.includes('jetpack'),
        weapon: lo.weapons.find((w) => w) || null, weaponAng: -0.8,
      });
      ctx.restore();
    },

    r_settings() {
      const s = SL.save.data;
      const PAD = { left: 'L-Stick', right: 'L-Stick', jump: 'A', down: 'L-Stick ↓', attack: 'RT', block: 'LT', dodge: 'B', grab: 'X',
        w1: 'LB / RB', w2: 'LB / RB', w3: 'LB / RB', w4: 'LB / RB', wheel: 'Back', ab1: 'Y', ab2: 'R3', ab3: 'L3',
        ex1: 'D-Pad ↑', ex2: 'D-Pad →', ex3: 'D-Pad ↓', ex4: 'D-Pad ←', pause: 'Start' };
      const name = (a) => {
        const m = /^(w|ab|ex)(\d)$/.exec(a);
        if (m) return t({ w: 'k_weapon', ab: 'k_ability', ex: 'k_extra' }[m[1]], { n: m[2] });
        return t('k_' + a);
      };
      const keys = s.settings.keys;
      const rows = SL.KEY_ACTIONS.map(([a]) => '<tr><td>' + name(a) + '</td>' + [0, 1].map((i) => {
        const on = this.listen && this.listen.a === a && this.listen.i === i;
        return '<td><button class="key' + (on ? ' listening' : '') + '" data-act="bind" data-a="' + a + '" data-i="' + i + '">' + (on ? t('pressKey') : U.esc(SL.keyName(keys[a][i]))) + '</button></td>';
      }).join('') + '<td class="padk">' + (PAD[a] || '—') + '</td></tr>').join('');
      return '<div class="panel wide dark"><h2>⚙️ ' + t('settings') + '</h2>' +
        '<div class="field"><label>' + t('language') + '</label>' + this.seg('lang', [{ v: 'de', html: 'Deutsch' }, { v: 'en', html: 'English' }], s.settings.lang) + '</div>' +
        '<h3>' + t('keybinds') + '</h3><p class="hint">' + t('bindHint') + '</p>' +
        '<table class="ctrl keys"><tr><th></th><th>⌨️ 1</th><th>⌨️ 2</th><th>🎮 ' + t('gamepad') + '</th></tr>' + rows + '</table>' +
        '<p class="hint">' + t('tipClimb') + '</p>' +
        '<div class="row"><button data-back data-act="main">← ' + t('back') + '</button><button data-act="resetKeys">↺ ' + t('resetKeys') + '</button><button class="danger" data-act="reset">' + t('reset') + '</button></div></div>';
    },

    r_pause() {
      return '<div class="panel small"><h2>⏸ ' + t('pause') + '</h2><div class="col">' +
        '<button class="primary" data-act="resume" data-back>▶ ' + t('resume') + '</button>' +
        '<button data-act="restart">↻ ' + t('restart') + '</button>' +
        '<button data-act="quit">🏠 ' + t('mainMenu') + '</button></div></div>';
    },

    r_results() {
      const r = this.result || {};
      const title = r.mode === 'waves' ? t('gameOver') : r.won ? t('victory') : t('defeat');
      const emo = r.mode === 'waves' ? '🌊' : r.won ? '🏆' : '💥';
      let stats = '<li><span>' + t('kills') + '</span><b>' + (r.kills || 0) + '</b></li>';
      if (r.mode === 'waves') stats += '<li><span>' + t('waveReached') + '</span><b>' + r.wave + '</b></li>';
      else stats += '<li><span>' + t('roundsWon') + '</span><b>' + r.roundsWon + '</b></li>';
      stats += '<li><span>' + t('earned') + '</span><b>⭐ ' + (r.earned || 0) + '</b></li>';
      return '<div class="panel small"><h2 class="big">' + emo + ' ' + title + '</h2><ul class="stats">' + stats + '</ul>' +
        '<div class="pts">⭐ ' + SL.save.data.points + ' ' + t('points') + '</div>' +
        '<div class="col"><button class="primary" data-act="again">↻ ' + t('again') + '</button>' +
        '<button data-act="shop">🛒 ' + t('shop') + '</button>' +
        '<button data-act="quit" data-back>🏠 ' + t('mainMenu') + '</button></div></div>';
    },
  };
})();
