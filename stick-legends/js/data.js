'use strict';
// Spielinhalte: Waffen, Fähigkeiten, Ausrüstung, Kosmetik, Gegner, Arenen
(function () {
  const SL = window.SL;

  SL.WEAPONS = {
    fists: {
      kind: 'melee', dmg: 7, knock: 300, len: 0, swing: 0.18, cd: 0.05, tile: 4, price: 0, hidden: true,
      name: { de: 'Fäuste', en: 'Fists' },
      desc: { de: 'Schlag, Schlag, Tritt.', en: 'Punch, punch, kick.' },
    },
    sword: {
      kind: 'melee', dmg: 13, knock: 390, len: 34, swing: 0.24, cd: 0.08, tile: 10, price: 0,
      name: { de: 'Schwert', en: 'Sword' },
      desc: { de: 'Schnelle 3er-Kombo. Kann Geschosse zurückschlagen.', en: 'Fast 3-hit combo. Can deflect projectiles.' },
    },
    spear: {
      kind: 'melee', thrust: true, dmg: 15, knock: 440, len: 56, swing: 0.3, cd: 0.12, tile: 8, price: 0,
      name: { de: 'Speer', en: 'Spear' },
      desc: { de: 'Große Reichweite, stößt Gegner weg.', en: 'Long reach, pushes enemies away.' },
    },
    hammer: {
      kind: 'melee', heavy: true, slam: true, dmg: 24, knock: 720, len: 36, swing: 0.46, cd: 0.2, tile: 45, price: 150,
      name: { de: 'Donnerhammer', en: 'Thunder Hammer' },
      desc: { de: 'Langsam, aber gewaltig. In der Luft + ↓ + Angriff = Bodenstampfer.', en: 'Slow but mighty. In air + ↓ + attack = ground slam.' },
    },
    firestaff: {
      kind: 'proj', proj: 'fireball', mana: 12, cd: 0.32, auto: true, len: 40, price: 0,
      name: { de: 'Feuerstab', en: 'Fire Staff' },
      desc: { de: 'Feuerbälle, die Gegner in Brand setzen. Kostet Mana.', en: 'Fireballs that set enemies ablaze. Costs mana.' },
    },
    lightstaff: {
      kind: 'lightning', mana: 22, cd: 0.55, dmg: 16, range: 460, chain: 2, len: 40, price: 200,
      name: { de: 'Blitzstab', en: 'Lightning Staff' },
      desc: { de: 'Blitz, der auf weitere Gegner überspringt.', en: 'Lightning that chains to more enemies.' },
    },
    frostbow: {
      kind: 'charge', proj: 'arrow', maxCharge: 0.8, cd: 0.25, len: 30, price: 180,
      name: { de: 'Frostbogen', en: 'Frost Bow' },
      desc: { de: 'Gedrückt halten zum Spannen. Treffer verlangsamen.', en: 'Hold to draw. Hits slow enemies.' },
    },
    bombs: {
      kind: 'throw', proj: 'bomb', ammo: 5, regen: 4.5, cd: 0.35, len: 0, price: 0,
      name: { de: 'Bombenbeutel', en: 'Bomb Bag' },
      desc: { de: 'Springende Bomben, die Blöcke sprengen.', en: 'Bouncing bombs that blast blocks.' },
    },
    rockets: {
      kind: 'proj', proj: 'rocket', ammo: 3, regen: 6, cd: 0.8, len: 38, recoil: 220, price: 250,
      name: { de: 'Raketenwerfer', en: 'Rocket Launcher' },
      desc: { de: 'Große Explosionen. Wenig Munition.', en: 'Big explosions. Little ammo.' },
    },
    gravity: {
      kind: 'gravity', manaRate: 30, cd: 0.9, len: 30, price: 350,
      name: { de: 'Gravitationskanone', en: 'Gravity Cannon' },
      desc: { de: 'Halten: saugt alles an. Loslassen: schleudert alles weg.', en: 'Hold: pulls everything in. Release: blasts it away.' },
    },
  };

  SL.ABILITIES = {
    teleport: { icon: '✨', cd: 4, price: 0, color: '#b48cff',
      name: { de: 'Teleport', en: 'Teleport' },
      desc: { de: 'Springt in Zielrichtung. Rettet dich beim Absturz.', en: 'Blink towards your aim. Saves you from falling.' } },
    wind: { icon: '🌪️', cd: 5, price: 0, color: '#9fe3ff',
      name: { de: 'Windstoß', en: 'Gust' },
      desc: { de: 'Schleudert Gegner weg und lenkt Geschosse um.', en: 'Blows enemies away and redirects projectiles.' } },
    earthwall: { icon: '🪨', cd: 7, price: 120, color: '#a0896f',
      name: { de: 'Erdwall', en: 'Earth Wall' },
      desc: { de: 'Lässt eine Steinwand aus dem Boden wachsen.', en: 'Raises a stone wall from the ground.' } },
    bubble: { icon: '🛡️', cd: 12, price: 150, color: '#7fd7ff',
      name: { de: 'Schutzblase', en: 'Shield Bubble' },
      desc: { de: 'Kurz fast unverwundbar.', en: 'Almost invulnerable for a moment.' } },
    thunder: { icon: '⚡', cd: 8, price: 220, color: '#ffe066',
      name: { de: 'Blitzschlag', en: 'Thunderstrike' },
      desc: { de: 'Ruft einen Blitz vom Himmel auf die Zielstelle.', en: 'Calls lightning down on your target spot.' } },
    spirit: { icon: '👻', cd: 14, price: 260, color: '#d8f3ff',
      name: { de: 'Geisterhelfer', en: 'Spirit Helper' },
      desc: { de: 'Beschwört einen Geist, der Gegner jagt.', en: 'Summons a spirit that hunts enemies.' } },
    slowmo: { icon: '⏳', cd: 16, price: 300, color: '#ffb36b',
      name: { de: 'Zeitlupe', en: 'Slow Time' },
      desc: { de: 'Alle anderen werden langsam.', en: 'Everyone else slows down.' } },
    invis: { icon: '🌫️', cd: 14, price: 200, color: '#c9d1d9',
      name: { de: 'Unsichtbarkeit', en: 'Invisibility' },
      desc: { de: 'Gegner verlieren dich aus den Augen.', en: 'Enemies lose track of you.' } },
  };

  SL.EXTRAS = {
    helmet: { icon: '⛑️', passive: true, armor: 0.1, price: 0, cat: 'armor',
      name: { de: 'Eisenhelm', en: 'Iron Helmet' },
      desc: { de: '10 % weniger Schaden.', en: '10% less damage.' } },
    chest: { icon: '🦺', passive: true, armor: 0.2, speed: 0.92, price: 140, cat: 'armor',
      name: { de: 'Brustpanzer', en: 'Chestplate' },
      desc: { de: '20 % weniger Schaden, etwas langsamer.', en: '20% less damage, a bit slower.' } },
    boots: { icon: '👢', passive: true, jumps: 1, jumpMult: 1.08, price: 120, cat: 'tool',
      name: { de: 'Federschuhe', en: 'Spring Boots' },
      desc: { de: 'Dreifachsprung und höhere Sprünge.', en: 'Triple jump and higher jumps.' } },
    jetpack: { icon: '🚀', active: 'hold', price: 300, cat: 'gadget',
      name: { de: 'Jetpack', en: 'Jetpack' },
      desc: { de: 'Taste halten zum Fliegen. Lädt am Boden auf.', en: 'Hold the key to fly. Recharges on the ground.' } },
    grapple: { icon: '🪝', active: 'press', cd: 0.6, price: 260, cat: 'tool',
      name: { de: 'Enterhaken', en: 'Grappling Hook' },
      desc: { de: 'Zieht dich zu Wänden – oder Gegner zu dir.', en: 'Pulls you to walls – or enemies to you.' } },
    turret: { icon: '🎯', active: 'press', cd: 22, price: 320, cat: 'gadget',
      name: { de: 'Geschützturm', en: 'Turret' },
      desc: { de: 'Stellt einen Turm auf, der auf Gegner schießt.', en: 'Deploys a turret that shoots enemies.' } },
  };

  SL.COLORS = ['#e74c3c', '#3b82f6', '#f5c518', '#22b14c', '#9b59b6', '#ff8c1a', '#16c2c2', '#ff5fa2', '#8b5a2b', '#2c3e50', '#f2f2f2', '#7ed957'];

  SL.HATS = {
    none: { icon: '—', price: 0, name: { de: 'Kein Hut', en: 'No hat' } },
    cap: { icon: '🧢', price: 50, name: { de: 'Kappe', en: 'Cap' } },
    tophat: { icon: '🎩', price: 80, name: { de: 'Zylinder', en: 'Top Hat' } },
    wizard: { icon: '🧙', price: 90, name: { de: 'Zauberhut', en: 'Wizard Hat' } },
    viking: { icon: '⚔️', price: 120, name: { de: 'Wikingerhelm', en: 'Viking Helmet' } },
    crown: { icon: '👑', price: 150, name: { de: 'Krone', en: 'Crown' } },
  };
  SL.FACES = {
    normal: { icon: '🙂', price: 0, name: { de: 'Normal', en: 'Normal' } },
    happy: { icon: '😄', price: 0, name: { de: 'Fröhlich', en: 'Happy' } },
    angry: { icon: '😠', price: 40, name: { de: 'Wütend', en: 'Angry' } },
    sleepy: { icon: '😴', price: 40, name: { de: 'Müde', en: 'Sleepy' } },
    cool: { icon: '😎', price: 60, name: { de: 'Cool', en: 'Cool' } },
  };
  SL.CAPES = {
    none: { icon: '—', price: 0, color: null, name: { de: 'Kein Umhang', en: 'No cape' } },
    red: { icon: '🟥', price: 100, color: '#d63031', name: { de: 'Roter Umhang', en: 'Red Cape' } },
    blue: { icon: '🟦', price: 100, color: '#2f6fd6', name: { de: 'Blauer Umhang', en: 'Blue Cape' } },
    gold: { icon: '🟨', price: 160, color: '#e8b923', name: { de: 'Goldener Umhang', en: 'Golden Cape' } },
  };

  SL.BOT_TYPES = {
    brawler: { name: { de: 'Nahkämpfer', en: 'Brawler' }, weapons: ['sword', 'hammer', 'spear'], abilities: ['teleport', 'wind', 'bubble'], extras: ['helmet'], style: 'melee', hp: 100, speed: 1.03 },
    gunner: { name: { de: 'Schütze', en: 'Gunner' }, weapons: ['firestaff', 'bombs', 'rockets', 'frostbow', 'sword'], abilities: ['teleport', 'earthwall', 'wind'], extras: ['turret'], style: 'far', hp: 90, speed: 1 },
    mage: { name: { de: 'Magier', en: 'Mage' }, weapons: ['lightstaff', 'gravity', 'firestaff', 'spear'], abilities: ['thunder', 'slowmo', 'spirit', 'wind', 'invis', 'teleport'], extras: [], style: 'mid', hp: 85, speed: 1 },
    tank: { name: { de: 'Panzer', en: 'Tank' }, weapons: ['hammer', 'spear', 'bombs'], abilities: ['bubble', 'wind', 'earthwall'], extras: ['chest', 'helmet'], style: 'melee', hp: 140, speed: 0.95 },
  };

  SL.DIFFS = [
    { id: 'easy', name: { de: 'Leicht', en: 'Easy' }, react: 0.4, aimErr: 0.22, block: 0.1, dodge: 0.08, aggr: 0.45, dmg: 0.7, pts: 0.6 },
    { id: 'normal', name: { de: 'Normal', en: 'Normal' }, react: 0.25, aimErr: 0.12, block: 0.3, dodge: 0.25, aggr: 0.7, dmg: 1, pts: 1 },
    { id: 'hard', name: { de: 'Schwer', en: 'Hard' }, react: 0.16, aimErr: 0.06, block: 0.5, dodge: 0.45, aggr: 0.85, dmg: 1.15, pts: 1.5 },
    { id: 'extreme', name: { de: 'Extrem', en: 'Extreme' }, react: 0.09, aimErr: 0.025, block: 0.75, dodge: 0.7, aggr: 1, dmg: 1.3, pts: 2.2 },
  ];

  // Arenen der Welt "Wiese". rect(Typ, Spalte0, Zeile0, Spalte1, Zeile1)
  // # Erde  S Stein  W Holz  C Kiste  L Blätter  B Baumstamm
  SL.MAPS = [
    {
      id: 'hills', name: { de: 'Grüne Hügel', en: 'Green Hills' },
      build(m) {
        m.rect('#', 5, 22, 44, 27);
        m.rect('#', 18, 20, 31, 21);
        m.rect('#', 21, 19, 28, 19);
        m.rect('C', 9, 20, 10, 21); m.rect('C', 9, 19, 9, 19);
        m.rect('C', 39, 20, 40, 21); m.rect('C', 40, 19, 40, 19);
        m.rect('S', 7, 15, 7, 15); m.rect('W', 8, 15, 13, 15); m.rect('S', 14, 15, 14, 15);
        m.rect('S', 35, 15, 35, 15); m.rect('W', 36, 15, 41, 15); m.rect('S', 42, 15, 42, 15);
        m.rect('S', 21, 11, 21, 11); m.rect('W', 22, 11, 27, 11); m.rect('S', 28, 11, 28, 11);
        m.rect('C', 24, 10, 25, 10);
      },
      spawns: [[12, 17], [37, 17], [24, 7], [10, 12], [39, 12], [20, 16], [29, 16], [16, 18]],
    },
    {
      id: 'bridge', name: { de: 'Holzbrücke', en: 'Wooden Bridge' },
      build(m) {
        m.rect('#', 2, 17, 13, 27); m.rect('#', 36, 17, 47, 27);
        m.rect('W', 14, 17, 35, 17);
        m.rect('S', 24, 23, 25, 27); m.rect('S', 21, 22, 28, 22);
        m.rect('B', 6, 12, 6, 16); m.rect('L', 3, 9, 9, 11);
        m.rect('B', 43, 12, 43, 16); m.rect('L', 40, 9, 46, 11);
        m.rect('C', 19, 16, 19, 16); m.rect('C', 30, 16, 30, 16);
        m.rect('S', 22, 10, 27, 10);
      },
      spawns: [[10, 14], [39, 14], [24, 6], [5, 5], [44, 5], [17, 13], [32, 13], [24, 19]],
    },
    {
      id: 'islands', name: { de: 'Schwebende Wiese', en: 'Floating Meadow' },
      build(m) {
        m.rect('#', 3, 20, 14, 22); m.rect('#', 5, 23, 12, 23); m.rect('#', 7, 24, 10, 24);
        m.rect('#', 35, 20, 46, 22); m.rect('#', 37, 23, 44, 23); m.rect('#', 39, 24, 42, 24);
        m.rect('#', 19, 16, 30, 18); m.rect('#', 21, 19, 28, 19); m.rect('#', 23, 20, 26, 20);
        m.rect('C', 23, 15, 26, 15); m.rect('C', 24, 14, 25, 14);
        m.rect('S', 9, 13, 9, 13); m.rect('W', 10, 13, 15, 13);
        m.rect('W', 34, 13, 39, 13); m.rect('S', 40, 13, 40, 13);
        m.rect('S', 23, 8, 26, 8);
        m.rect('S', 21, 26, 28, 26);
        m.rect('L', 4, 18, 5, 19); m.rect('L', 44, 18, 45, 19);
      },
      spawns: [[8, 17], [41, 17], [21, 13], [12, 10], [37, 10], [24, 5], [28, 13], [11, 17]],
    },
  ];

  for (const group of [SL.WEAPONS, SL.ABILITIES, SL.EXTRAS, SL.HATS, SL.FACES, SL.CAPES, SL.BOT_TYPES]) {
    for (const k in group) group[k].id = k;
  }
})();
