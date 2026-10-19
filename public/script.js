(function () {
  'use strict';

  var STORAGE_KEY = 'kasper-babysitter-v1';
  var body = document.body;
  var blocksEl = document.getElementById('blocks');
  var toolbar = document.getElementById('toolbar');
  var editToggle = document.getElementById('editToggle');
  var lightbox = document.getElementById('lightbox');
  var lbImg = lightbox.querySelector('img');

  var DEFAULT_BLOCKS = [
    { title: 'Auf dem Hof', text: 'Zwischen Katzen, Hunden und frischer Landluft aufgewachsen.', img: '' },
    { title: 'Vorlese-Ecke', text: 'Geschichten vorlesen gehört zu meinen liebsten Aufgaben.', img: '' }
  ];

  /* ---------- Helpers ---------- */
  var MAX_BLOCKS = 30;
  var MAX_UPLOAD = 15 * 1024 * 1024;
  var ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  // Steuerzeichen entfernen, Länge begrenzen
  function clean(s, max) {
    return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, max);
  }
  function isSafeImage(v) {
    return typeof v === 'string' && v.length < 4000000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(v);
  }

  function slotHTML() {
    return '<figure class="slot empty"><img alt=""><span class="ph">Bild</span>' +
      '<label class="overlay"><span>Bild wählen</span><input type="file" accept="image/*" hidden></label></figure>';
  }

  function createBlock(data) {
    var el = document.createElement('article');
    el.className = 'block';
    el.innerHTML =
      '<button type="button" class="block-del">Löschen</button>' + slotHTML() +
      '<div class="block-body"><h4 data-b="title"></h4><p data-b="text"></p></div>';
    el.querySelector('[data-b="title"]').textContent = data.title || 'Neue Überschrift';
    el.querySelector('[data-b="text"]').textContent = data.text || 'Kurzer Freitext …';
    if (data.img) setSlotImage(el.querySelector('.slot'), data.img);
    if (body.classList.contains('editing')) setEditable(el, true);
    blocksEl.appendChild(el);
    return el;
  }

  function setSlotImage(slot, src) {
    var img = slot.querySelector('img');
    img.src = src;
    slot.classList.remove('empty');
    slot.dataset.custom = src.indexOf('data:') === 0 ? '1' : '';
  }

  function markEmpty(slot) { slot.classList.add('empty'); }

  function setEditable(root, on) {
    root.querySelectorAll('[data-k], [data-b]').forEach(function (n) {
      if (on) n.setAttribute('contenteditable', 'true');
      else n.removeAttribute('contenteditable');
    });
    if (root.matches && root.matches('[data-k], [data-b]')) {
      if (on) root.setAttribute('contenteditable', 'true'); else root.removeAttribute('contenteditable');
    }
  }

  function resizeImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var im = new Image();
      im.onload = function () {
        var max = 1400, w = im.width, h = im.height;
        if (w > max || h > max) {
          var r = Math.min(max / w, max / h);
          w = Math.round(w * r); h = Math.round(h * r);
        }
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.82));
      };
      im.onerror = function () { cb(null); };
      im.src = reader.result;
    };
    reader.onerror = function () { cb(null); };
    reader.readAsDataURL(file);
  }

  /* ---------- Initial image state ---------- */
  document.querySelectorAll('.slot[data-img]').forEach(function (slot) {
    var img = slot.querySelector('img');
    img.addEventListener('error', function () { img.removeAttribute('src'); markEmpty(slot); });
    if (!img.complete || !img.naturalWidth) { if (img.complete) markEmpty(slot); }
  });

  /* ---------- Load / Save ---------- */
  function load() {
    var state = null;
    try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) {}
    if (!state || typeof state !== 'object') { DEFAULT_BLOCKS.forEach(createBlock); return; }

    var texts = state.texts && typeof state.texts === 'object' ? state.texts : {};
    var images = state.images && typeof state.images === 'object' ? state.images : {};
    var blocks = Array.isArray(state.blocks) ? state.blocks.slice(0, MAX_BLOCKS) : [];

    // gespeicherte Daten gelten als nicht vertrauenswürdig: nur Text, nur geprüfte Bild-URLs
    Array.prototype.forEach.call(document.querySelectorAll('[data-k]'), function (n) {
      var k = n.getAttribute('data-k');
      if (typeof texts[k] === 'string') n.textContent = clean(texts[k], 2000);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.slot[data-img]'), function (s) {
      var v = images[s.getAttribute('data-img')];
      if (isSafeImage(v)) setSlotImage(s, v);
    });
    blocks.forEach(function (b) {
      if (b && typeof b === 'object') createBlock({
        title: typeof b.title === 'string' ? clean(b.title, 200) : '',
        text: typeof b.text === 'string' ? clean(b.text, 2000) : '',
        img: isSafeImage(b.img) ? b.img : ''
      });
    });
  }

  function save() {
    var state = { texts: {}, images: {}, blocks: [] };
    document.querySelectorAll('[data-k]').forEach(function (n) {
      state.texts[n.getAttribute('data-k')] = clean(n.innerText, 2000);
    });
    document.querySelectorAll('.slot[data-img]').forEach(function (s) {
      if (s.dataset.custom) state.images[s.dataset.img] = s.querySelector('img').src;
    });
    blocksEl.querySelectorAll('.block').forEach(function (b) {
      var s = b.querySelector('.slot');
      state.blocks.push({
        title: clean(b.querySelector('[data-b="title"]').innerText, 200),
        text: clean(b.querySelector('[data-b="text"]').innerText, 2000),
        img: s.dataset.custom ? s.querySelector('img').src : ''
      });
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      flash('Gespeichert ✓');
    } catch (e) {
      alert('Speichern fehlgeschlagen – der Browser-Speicher ist voll. Bitte weniger oder kleinere Bilder verwenden.');
    }
  }

  function flash(msg) {
    var s = toolbar.querySelector('span');
    var old = s.textContent;
    s.textContent = msg;
    setTimeout(function () { s.textContent = old; }, 1800);
  }

  /* ---------- Login (Hauptbenutzer) ---------- */
  // Nur Passwort-Hash (PBKDF2-SHA256, Salt, 310.000 Iterationen) – kein Klartext.
  // Hinweis: reiner Client-Schutz der Bearbeitungsansicht; Änderungen bleiben ohnehin lokal im Browser.
  var PW_SALT = '41e4035111f2ab32475adc2d932a5c4f';
  var PW_HASH = '711a145df90a7561b72431e80e05ccb4ebed1ca700ba159ce23e98d33b0e51c9';
  var PW_ITER = 310000;
  var failCount = 0, lockedUntil = 0;

  function hexToBytes(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }
  function bytesToHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  function safeEqual(a, b) {
    if (a.length !== b.length) return false;
    var d = 0;
    for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return d === 0;
  }
  function checkPassword(pw) {
    if (!(window.crypto && crypto.subtle)) return Promise.resolve(false);
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']).then(function (key) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(PW_SALT), iterations: PW_ITER }, key, 256);
    }).then(function (bits) { return safeEqual(bytesToHex(bits), PW_HASH); })
      .catch(function () { return false; });
  }

  var loginEl = document.getElementById('login');
  var pwInput = document.getElementById('pw');
  var loginNote = document.getElementById('loginNote');

  function syncEditLink() {
    editToggle.hidden = !(location.hash === '#edit' || body.classList.contains('editing'));
  }
  window.addEventListener('hashchange', syncEditLink);
  syncEditLink();

  document.getElementById('loginCancel').addEventListener('click', function () { loginEl.hidden = true; pwInput.value = ''; });
  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var wait = lockedUntil - Date.now();
    if (wait > 0) { loginNote.textContent = 'Bitte ' + Math.ceil(wait / 1000) + ' s warten.'; return; }
    checkPassword(pwInput.value).then(function (ok) {
      pwInput.value = '';
      if (ok) {
        failCount = 0; loginNote.textContent = ''; loginEl.hidden = true;
        enterEdit();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        failCount++;
        lockedUntil = Date.now() + Math.min(Math.pow(2, failCount) * 500, 60000);
        loginNote.textContent = 'Anmeldung fehlgeschlagen.';
      }
    });
  });

  /* ---------- Edit mode ---------- */
  function enterEdit() {
    body.classList.add('editing');
    toolbar.hidden = false;
    setEditable(document, true);
    document.querySelectorAll('details').forEach(function (d) { d.open = true; });
  }

  function exitEdit() {
    body.classList.remove('editing');
    toolbar.hidden = true;
    setEditable(document, false);
    document.querySelectorAll('details').forEach(function (d) { d.open = false; });
  }

  editToggle.addEventListener('click', function () {
    if (body.classList.contains('editing')) { exitEdit(); return; }
    loginEl.hidden = false; pwInput.focus();
  });
  document.getElementById('exitBtn').addEventListener('click', exitEdit);
  document.getElementById('saveBtn').addEventListener('click', save);
  document.getElementById('resetBtn').addEventListener('click', function () {
    if (confirm('Alle gespeicherten Änderungen verwerfen und Seite zurücksetzen?')) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      location.reload();
    }
  });

  document.getElementById('addBlock').addEventListener('click', function () {
    if (blocksEl.children.length >= MAX_BLOCKS) { flash('Maximal ' + MAX_BLOCKS + ' Blöcke.'); return; }
    var b = createBlock({ title: 'Neue Überschrift', text: 'Kurzer Freitext …', img: '' });
    b.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ---------- Delegated events ---------- */
  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input.matches('.slot input[type="file"]') || !input.files[0]) return;
    var slot = input.closest('.slot');
    var file = input.files[0];
    input.value = '';
    if (ALLOWED_TYPES.indexOf(file.type) === -1 || file.size > MAX_UPLOAD) {
      flash('Nur JPG, PNG oder WebP bis 15 MB erlaubt.');
      return;
    }
    resizeImage(file, function (data) { if (data) setSlotImage(slot, data); });
  });

  document.addEventListener('click', function (e) {
    var editing = body.classList.contains('editing');

    var del = e.target.closest('.block-del');
    if (del) {
      if (confirm('Diesen Block löschen?')) del.closest('.block').remove();
      return;
    }

    if (editing) {
      // keep links and accordions inert while editing text
      var a = e.target.closest('a[contenteditable], summary');
      if (a) e.preventDefault();
      return;
    }

    var poster = e.target.closest('.poster');
    if (poster && !poster.classList.contains('empty')) {
      lbImg.src = poster.querySelector('img').src;
      lightbox.hidden = false;
    }
  });

  lightbox.addEventListener('click', function () { lightbox.hidden = true; });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') lightbox.hidden = true;
  });

  // plain-text paste only
  document.addEventListener('paste', function (e) {
    if (!e.target.closest || !e.target.closest('[contenteditable="true"]')) return;
    e.preventDefault();
    var t = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, t);
  });

  /* ---------- Contact form ---------- */
  var mode = 'baby';
  var form = document.getElementById('form');
  var note = document.getElementById('formNote');

  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      mode = tab.dataset.mode;
      document.querySelectorAll('.tab').forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on);
      });
      form.querySelectorAll('label[data-mode]').forEach(function (l) {
        l.hidden = l.dataset.mode !== mode;
      });
      document.getElementById('submitBtn').textContent = mode === 'baby' ? 'Anfrage senden' : 'Hilfe anfragen';
      note.textContent = '';
    });
  });

  var lastSent = 0;

  function showError(msg, withWhatsApp) {
    note.textContent = msg;
    if (withWhatsApp) {
      var a = document.createElement('a');
      a.href = 'https://wa.me/4915159410998';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'WhatsApp';
      note.appendChild(document.createTextNode(' Alternativ per '));
      note.appendChild(a);
      note.appendChild(document.createTextNode(' oder Telefon melden.'));
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var name = clean(f.name.value, 100).replace(/[\r\n]+/g, ' ').trim();
    var kontakt = clean(f.kontakt.value, 120).replace(/[\r\n]+/g, ' ').trim();
    var termin = clean(f.termin.value, 120).replace(/[\r\n]+/g, ' ').trim();
    var kinder = clean(f.kinder.value, 120).replace(/[\r\n]+/g, ' ').trim();
    var ort = clean(f.ort.value, 150).replace(/[\r\n]+/g, ' ').trim();
    var art = ['Gartenarbeit', 'Einkäufe', 'Beides'].indexOf(f.art.value) > -1 ? f.art.value : 'Gartenarbeit';
    var nachricht = clean(f.nachricht.value, 1500).trim();

    if (!name || !kontakt) { showError('Bitte Name und Telefon oder E-Mail angeben.'); return; }
    var isMail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(kontakt);
    var isTel = /^\+?[0-9][0-9 \/()\-]{5,}$/.test(kontakt);
    if (!isMail && !isTel) { showError('Bitte eine gültige Telefonnummer oder E-Mail-Adresse angeben.'); return; }
    if (!f.datenschutz.checked) { showError('Bitte der Datenschutzerklärung zustimmen.'); return; }

    // Honeypot: Bots füllen das versteckte Feld, Menschen nicht
    if (f._honey.value) { form.reset(); showSent(); return; }
    // einfache Sendesperre gegen Mehrfach-Absenden
    if (Date.now() - lastSent < 15000) { showError('Bitte einen Moment warten, bevor du erneut sendest.'); return; }

    var lines = ['Name: ' + name, 'Kontakt: ' + kontakt];
    if (termin) lines.push('Wunschtermin: ' + termin);
    if (mode === 'baby') { if (kinder) lines.push('Kinder: ' + kinder); }
    else { lines.push('Art der Hilfe: ' + art); if (ort) lines.push('Adresse: ' + ort); }
    lines.push('', nachricht);
    var subject = mode === 'baby' ? 'Babysitting-Anfrage' : 'Anfrage Extra-Hilfe (Garten & Einkäufe)';

    var btn = document.getElementById('submitBtn');
    btn.disabled = true;
    note.textContent = 'Wird gesendet …';
    fetch('https://formsubmit.co/ajax/kasper310810@gmail.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
      body: JSON.stringify({ _subject: subject, _template: 'table', _honey: '', message: lines.join('\n') })
    }).then(function (r) {
      if (!r.ok) throw new Error('send failed');
      lastSent = Date.now();
      form.reset();
      note.textContent = '';
      showSent();
    }).catch(function () {
      showError('Senden fehlgeschlagen. Bitte später erneut versuchen.', true);
    }).then(function () { btn.disabled = false; });
  });

  function showSent() {
    var el = document.getElementById('sent');
    var parts = [el.querySelector('.sent-c'), el.querySelector('.sent-t'), el.querySelector('p')];
    el.hidden = false;
    parts.forEach(function (n) { n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; });
    setTimeout(function () {
      el.hidden = true;
      window.scrollTo(0, 0);
    }, 2200);
  }

  load();
})();
