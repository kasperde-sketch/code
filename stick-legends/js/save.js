'use strict';
// Spielstand im Browser speichern
(function () {
  const SL = window.SL;
  const KEY = 'stickLegends_save_v1';

  function defaults() {
    return {
      points: 100,
      owned: {
        sword: true, spear: true, firestaff: true, bombs: true,
        teleport: true, wind: true, helmet: true,
        hat_none: true, face_normal: true, face_happy: true, cape_none: true,
      },
      loadout: {
        weapons: ['sword', 'spear', 'firestaff', 'bombs'],
        abilities: ['teleport', 'wind'],
        extras: ['helmet', null, null, null],
      },
      look: { color: '#3b82f6', hat: 'none', face: 'normal', cape: 'none' },
      settings: { lang: 'de', diff: 1, bots: 1, map: 'random', rounds: 3, waveDiff: 1, waveMap: 'random', keys: SL.defaultKeys(), keyLabels: {} },
      stats: { kills: 0, wins: 0, bestWave: 0 },
      campaign: { level: 0 },
    };
  }

  function merge(base, src) {
    if (!src || typeof src !== 'object') return base;
    for (const k in base) {
      if (!(k in src)) continue;
      const b = base[k], s = src[k];
      if (Array.isArray(b)) base[k] = Array.isArray(s) ? s : b;
      else if (b && typeof b === 'object') base[k] = merge(b, s);
      else if (typeof s === typeof b) base[k] = s;
    }
    // unbekannte Schlüssel in "owned" übernehmen
    if (src.owned && base.owned) for (const k in src.owned) base.owned[k] = !!src.owned[k];
    if (src.keyLabels && base.keyLabels) for (const k in src.keyLabels) base.keyLabels[k] = String(src.keyLabels[k]).slice(0, 12);
    return base;
  }

  SL.save = {
    data: null,
    load() {
      let parsed = null;
      try {
        const s = localStorage.getItem(KEY);
        if (s) parsed = JSON.parse(s);
      } catch (e) { parsed = null; }
      this.data = merge(defaults(), parsed);
      this.validate();
      SL.lang = this.data.settings.lang === 'en' ? 'en' : 'de';
    },
    store() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* Speichern nicht möglich */ }
    },
    reset() {
      this.data = defaults();
      this.store();
      SL.lang = 'de';
    },
    abilitySlots() {
      // 2 Plätze am Anfang, mit Kampagnen-Fortschritt bis 5
      const lv = this.data.campaign.level;
      return Math.min(5, 2 + Math.floor(lv / 12));
    },
    owns(id) { return !!this.data.owned[id]; },
    buy(id, price) {
      if (this.owns(id) || this.data.points < price) return false;
      this.data.points -= price;
      this.data.owned[id] = true;
      this.store();
      return true;
    },
    addPoints(n) {
      this.data.points += Math.round(n);
    },
    validate() {
      const d = this.data, lo = d.loadout;
      const fix = (arr, len, table) => {
        const out = [];
        for (let i = 0; i < len; i++) {
          const id = arr[i];
          out.push(id && table[id] && this.owns(id) && !out.includes(id) ? id : null);
        }
        return out;
      };
      lo.weapons = fix(lo.weapons, 4, SL.WEAPONS);
      lo.abilities = fix(lo.abilities, this.abilitySlots(), SL.ABILITIES);
      lo.extras = fix(lo.extras, 4, SL.EXTRAS);
      if (!SL.COLORS.includes(d.look.color)) d.look.color = SL.COLORS[1];
      if (!SL.HATS[d.look.hat] || !this.owns('hat_' + d.look.hat)) d.look.hat = 'none';
      if (!SL.FACES[d.look.face] || !this.owns('face_' + d.look.face)) d.look.face = 'normal';
      if (!SL.CAPES[d.look.cape] || !this.owns('cape_' + d.look.cape)) d.look.cape = 'none';
      d.settings.diff = SL.U.clamp(d.settings.diff | 0, 0, 3);
      d.settings.waveDiff = SL.U.clamp(d.settings.waveDiff | 0, 0, 3);
      d.settings.bots = SL.U.clamp(d.settings.bots | 0, 1, 7);
      if (![3, 5, 7].includes(d.settings.rounds)) d.settings.rounds = 3;
      if (!SL.MAPS.some((m) => m.id === d.settings.map)) d.settings.map = 'random';
      if (!SL.MAPS.some((m) => m.id === d.settings.waveMap)) d.settings.waveMap = 'random';
      for (const a in d.settings.keys) {
        const k = d.settings.keys[a];
        d.settings.keys[a] = [0, 1].map((i) => (typeof k[i] === 'string' && k[i].length < 24 ? k[i] : null));
      }
    },
  };
})();
