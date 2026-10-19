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
      im.src = reader.result;
    };
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
    if (!state) { DEFAULT_BLOCKS.forEach(createBlock); return; }

    Object.keys(state.texts || {}).forEach(function (k) {
      var n = document.querySelector('[data-k="' + k + '"]');
      if (n) n.innerHTML = state.texts[k];
    });
    Object.keys(state.images || {}).forEach(function (k) {
      var s = document.querySelector('.slot[data-img="' + k + '"]');
      if (s) setSlotImage(s, state.images[k]);
    });
    (state.blocks || []).forEach(createBlock);
  }

  function save() {
    var state = { texts: {}, images: {}, blocks: [] };
    document.querySelectorAll('[data-k]').forEach(function (n) {
      state.texts[n.getAttribute('data-k')] = n.innerHTML;
    });
    document.querySelectorAll('.slot[data-img]').forEach(function (s) {
      if (s.dataset.custom) state.images[s.dataset.img] = s.querySelector('img').src;
    });
    blocksEl.querySelectorAll('.block').forEach(function (b) {
      var s = b.querySelector('.slot');
      state.blocks.push({
        title: b.querySelector('[data-b="title"]').textContent,
        text: b.querySelector('[data-b="text"]').textContent,
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
    body.classList.contains('editing') ? exitEdit() : enterEdit();
    if (body.classList.contains('editing')) window.scrollTo({ top: 0, behavior: 'smooth' });
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
    var b = createBlock({ title: 'Neue Überschrift', text: 'Kurzer Freitext …', img: '' });
    b.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ---------- Delegated events ---------- */
  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input.matches('.slot input[type="file"]') || !input.files[0]) return;
    var slot = input.closest('.slot');
    resizeImage(input.files[0], function (data) { setSlotImage(slot, data); });
    input.value = '';
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

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    if (!f.name.value.trim() || !f.kontakt.value.trim()) {
      note.textContent = 'Bitte Name und Telefon oder E-Mail angeben.';
      return;
    }
    var lines = ['Name: ' + f.name.value, 'Kontakt: ' + f.kontakt.value];
    if (f.termin.value.trim()) lines.push('Wunschtermin: ' + f.termin.value);
    if (mode === 'baby') { if (f.kinder.value.trim()) lines.push('Kinder: ' + f.kinder.value); }
    else lines.push('Art der Hilfe: ' + f.art.value, 'Adresse: ' + f.ort.value);
    lines.push('', f.nachricht.value);
    var subject = mode === 'baby' ? 'Babysitting-Anfrage' : 'Anfrage Extra-Hilfe (Garten & Einkäufe)';
    window.location.href = 'mailto:kasper310810@gmail.com?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\n'));
    note.textContent = 'Dein E-Mail-Programm öffnet sich mit der vorbereiteten Anfrage.';
  });

  load();
})();
