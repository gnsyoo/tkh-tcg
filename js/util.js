/* ===== Shared helpers used by both mockups ===== */
var TCG = (function () {
  function getDifficulty() {
    var params = new URLSearchParams(location.search);
    var d = params.get('diff') || localStorage.getItem('tcg_difficulty') || 'normal';
    if (['easy', 'normal', 'hard'].indexOf(d) === -1) d = 'normal';
    localStorage.setItem('tcg_difficulty', d);
    return d;
  }
  function diffLabel(d) {
    return { easy: '하 (Easy)', normal: '중 (Normal)', hard: '상 (Hard)' }[d] || d;
  }
  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rand(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  // deterministic hue (0-359) from a string — used for procedural card portraits
  function hue(str) {
    str = String(str || '');
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % 360;
  }
  // portrait frame markup: a framed "silk" medallion with the emoji as the figure
  function portrait(emoji, seed, extraClass) {
    return '<div class="portrait ' + (extraClass || '') + '" style="--h:' + hue(seed) + '">' +
      '<span class="p-emoji">' + emoji + '</span></div>';
  }

  var toastEl = null;
  var toastTimer = null;
  function toast(msg, ms) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 1600);
  }

  function floatText(container, x, y, text, color) {
    var el = document.createElement('div');
    el.className = 'float-dmg';
    el.textContent = text;
    el.style.color = color || '#fff';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 950);
  }

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- sound (WebAudio, no asset files) ---------- */
  var audioCtx = null, muted = false;
  try { muted = localStorage.getItem('tcg_muted') === '1'; } catch (e) {}
  function ensureCtx() {
    if (audioCtx) return audioCtx;
    var AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try { audioCtx = new AC(); } catch (e) { audioCtx = null; }
    return audioCtx;
  }
  function audioResume() { var c = ensureCtx(); if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} } }
  function blip(freq, dur, type, gain, when) {
    var c = ensureCtx(); if (!c || muted) return;
    try {
      var t = c.currentTime + (when || 0);
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.value = 0.0001;
      o.connect(g); g.connect(c.destination);
      g.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) {}
  }
  var SFX = {
    tap: function () { blip(330, 0.05, 'square', 0.04); },
    place: function () { blip(440, 0.08, 'triangle', 0.09); blip(660, 0.08, 'triangle', 0.07, 0.04); },
    attack: function () { blip(200, 0.07, 'sawtooth', 0.09); },
    hit: function () { blip(130, 0.12, 'square', 0.11); },
    skill: function () { blip(520, 0.06, 'square', 0.08); blip(740, 0.1, 'triangle', 0.08, 0.05); },
    heal: function () { blip(520, 0.1, 'sine', 0.09); blip(820, 0.12, 'sine', 0.07, 0.07); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { blip(f, 0.18, 'triangle', 0.11, i * 0.1); }); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { blip(f, 0.26, 'sawtooth', 0.09, i * 0.12); }); },
    reward: function () { [659, 880].forEach(function (f, i) { blip(f, 0.14, 'triangle', 0.1, i * 0.08); }); }
  };
  function sfx(name) { if (SFX[name]) SFX[name](); }
  function toggleMute() { muted = !muted; try { localStorage.setItem('tcg_muted', muted ? '1' : '0'); } catch (e) {} return muted; }
  function isMuted() { return muted; }
  // resume audio on first user gesture (browser autoplay policy)
  if (typeof document !== 'undefined' && document.addEventListener) {
    var _once = function () { audioResume(); document.removeEventListener('pointerdown', _once); document.removeEventListener('keydown', _once); };
    document.addEventListener('pointerdown', _once);
    document.addEventListener('keydown', _once);
  }

  // 우측 상단 플로팅 메뉴: 버튼을 누르면 패널이 펼쳐지고, 바깥/링크 클릭 시 닫힘
  function initFloatMenu() {
    if (typeof document === 'undefined') return;
    var toggle = document.getElementById('fmToggle');
    var panel = document.getElementById('fmPanel');
    if (!toggle || !panel) return;
    var open = false;
    if (panel.removeAttribute) panel.removeAttribute('hidden'); // hidden 속성 대신 클래스로만 제어
    function setOpen(v) {
      open = !!v;
      if (panel.classList) panel.classList.toggle('fm-open', open);
      if (toggle.classList) toggle.classList.toggle('open', open);
      toggle.textContent = open ? '✕' : '☰';
    }
    setOpen(false);
    toggle.addEventListener('click', function (e) {
      if (e.stopPropagation) e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
      setOpen(!open);
    });
    document.addEventListener('click', function (e) {
      if (!open) return;
      if (e.target && e.target.closest && e.target.closest('#floatMenu')) return;
      setOpen(false);
    });
    panel.addEventListener('click', function (e) {
      // 메뉴(링크) 항목을 누르면 닫음
      if (e.target && e.target.closest && e.target.closest('a')) setOpen(false);
    });
  }

  return {
    getDifficulty: getDifficulty,
    diffLabel: diffLabel,
    rand: rand, pick: pick, shuffle: shuffle, clamp: clamp,
    hue: hue, portrait: portrait,
    toast: toast, floatText: floatText, delay: delay,
    sfx: sfx, toggleMute: toggleMute, isMuted: isMuted, audioResume: audioResume,
    initFloatMenu: initFloatMenu
  };
})();
