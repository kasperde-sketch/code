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

  // Arenen der Welt "Wiese" – zusammenhängende Natur, keine schwebenden Plattformen.
  // ground(Höhen): pro Spalte die Oberkante (Zeile), null = Schlucht. rect(Typ, Spalte0, Zeile0, Spalte1, Zeile1).
  // tree(Spalte, Oberkante, Kronengröße). # Erde  S Fels  W Baumstamm (liegend)  C Felsbrocken  L Blätter  B Stamm
  const _ = null;
  SL.MAPS = [
    {
      id: 'hills', name: { de: 'Grüne Hügel', en: 'Green Hills' },
      build(m) {
        m.ground([_, _, _, 19, 18, 18, 17, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, _, _, _,
          19, 18, 16, 15, 14, 14, 15, 16, 17, 18, 19, _, _, _, 21, 20, 20, 19, 18, 17, 17, 18, 18, 19, 19, 20, 20, _, _, _]);
        m.tree(6, 17, 3);
        m.tree(41, 17, 3);
        m.rect('S', 24, 12, 25, 13); m.rect('S', 23, 13, 23, 13);
        m.rect('C', 11, 17, 12, 17); m.rect('C', 11, 16, 11, 16);
        m.rect('W', 35, 19, 37, 19);
        m.rect('C', 44, 18, 44, 18);
        m.rect('L', 20, 18, 20, 18); m.rect('L', 29, 17, 29, 17);
      },
    },
    {
      id: 'gorge', name: { de: 'Felsschlucht', en: 'Rocky Gorge' },
      build(m) {
        m.ground([_, _, 16, 16, 15, 15, 15, 15, 16, 16, 16, 15, 15, 15, 15, _, _, _, _, _,
          _, _, 18, 17, 17, 17, 17, 18, _, _, _, _, _, _, _, 15, 15, 15, 15, 16, 16, 16, 15, 15, 15, 15, 16, 16, _, _]);
        // Überhänge aus Fels an den Schluchträndern
        m.rect('#', 15, 15, 17, 16); m.rect('#', 15, 17, 15, 18);
        m.rect('#', 32, 15, 34, 16); m.rect('#', 34, 17, 34, 18);
        m.tree(5, 15, 3); m.tree(44, 15, 3);
        m.rect('C', 10, 14, 11, 14); m.rect('C', 38, 14, 39, 14);
        m.rect('L', 13, 14, 13, 14); m.rect('L', 36, 14, 36, 14);
      },
    },
    {
      id: 'arch', name: { de: 'Felsbogen', en: 'Stone Arch' },
      build(m) {
        m.ground([_, _, 18, 18, 17, 17, 17, 18, 18, _, _, _, 19, 19, 18, 18, 17, 16, 15, 14,
          13, 13, 12, 12, 12, 12, 12, 12, 13, 13, 14, 15, 16, 17, 18, 18, 19, 19, _, _, _, 18, 18, 17, 17, 17, 18, 18, _, _]);
        // Tunnel durch den Hügel – oben bleibt ein natürlicher Felsbogen
        m.clear(21, 16, 28, 20);
        m.tree(5, 17, 3); m.tree(44, 17, 3);
        m.rect('C', 14, 17, 15, 17); m.rect('C', 34, 17, 34, 17);
        m.rect('W', 24, 11, 25, 11);
      },
    },
  ];

  for (const group of [SL.WEAPONS, SL.ABILITIES, SL.EXTRAS, SL.HATS, SL.FACES, SL.CAPES, SL.BOT_TYPES]) {
    for (const k in group) group[k].id = k;
  }
})();
