/* ===== Shared helpers used by both mockups ===== */
var TCG = (function () {
  function getDifficulty() {
    // 난이도 선택 제거 — 기본 '상(hard)' 고정. (URL ?diff= 는 테스트용 오버라이드로만 유지)
    var params = new URLSearchParams(location.search);
    var d = params.get('diff');
    if (['easy', 'normal', 'hard'].indexOf(d) === -1) d = 'hard';
    try { localStorage.setItem('tcg_difficulty', d); } catch (e) {}
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
  // ── 절차적 인물화(삼국지 조조전 풍 얼굴) — 외부 이미지 없이 시드 기반 SVG로 생성 ──
  function pf(seed, salt, mod) { return hue(String(seed) + '|' + salt) % mod; }
  function faceSVG(seed) {
    var s = String(seed || '');
    var SKIN = ['#f2cba6', '#ecbd92', '#e0ad7e', '#cf9b6e', '#bb8456'];
    var SKSH = ['#d6a880', '#c99a72', '#bf8f63', '#ad7a52', '#9a6a42'];
    var HAIR = ['#23190f', '#150e08', '#3a2614', '#4b3a26', '#717171', '#0e0e0e'];
    var si = pf(s, 'skin', 5), skin = SKIN[si], sksh = SKSH[si];
    var hair = HAIR[pf(s, 'hair', 6)];
    var bh = hue(s);
    var robe = 'hsl(' + bh + ',46%,40%)', robeD = 'hsl(' + bh + ',44%,28%)', collar = 'hsl(' + ((bh + 28) % 360) + ',55%,58%)';
    var top = pf(s, 'top', 5), beard = pf(s, 'beard', 4), brow = pf(s, 'brow', 3), eye = pf(s, 'eye', 2);
    var P = [];
    // 어깨·의복
    P.push('<path d="M2 64 Q7 46 21 44 L43 44 Q57 46 62 64 Z" fill="' + robe + '"/>');
    P.push('<path d="M21 44 L32 56 L43 44 L41 64 L23 64 Z" fill="' + robeD + '"/>');
    P.push('<path d="M23 44 L32 53 L41 44" fill="none" stroke="' + collar + '" stroke-width="2.6" stroke-linejoin="round"/>');
    // 목
    P.push('<path d="M27 36 h10 v8 q-5 3 -10 0 Z" fill="' + sksh + '"/>');
    // 뒤로 넘긴 장발
    if (top === 4) P.push('<path d="M17 24 Q16 8 32 7 Q48 8 47 24 L47 42 Q44 30 44 23 Q44 15 32 14 Q20 15 20 23 Q20 30 17 42 Z" fill="' + hair + '"/>');
    // 얼굴·귀
    P.push('<ellipse cx="32" cy="25" rx="13" ry="15" fill="' + skin + '"/>');
    P.push('<ellipse cx="19.5" cy="26" rx="2.3" ry="3.6" fill="' + skin + '"/><ellipse cx="44.5" cy="26" rx="2.3" ry="3.6" fill="' + skin + '"/>');
    // 눈썹
    if (brow === 1) P.push('<path d="M22 20 L29 22.5" stroke="' + hair + '" stroke-width="2" stroke-linecap="round"/><path d="M42 20 L35 22.5" stroke="' + hair + '" stroke-width="2" stroke-linecap="round"/>');
    else if (brow === 2) P.push('<path d="M22.5 21 Q26 19.5 29 21" stroke="' + hair + '" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M35 21 Q38 19.5 41.5 21" stroke="' + hair + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>');
    else P.push('<path d="M22.5 21.5 h6.5" stroke="' + hair + '" stroke-width="1.8" stroke-linecap="round"/><path d="M35 21.5 h6.5" stroke="' + hair + '" stroke-width="1.8" stroke-linecap="round"/>');
    // 눈
    var ey = eye === 1 ? 26.5 : 26;
    P.push('<ellipse cx="26" cy="' + ey + '" rx="3.1" ry="2" fill="#fbf3ea"/><ellipse cx="38" cy="' + ey + '" rx="3.1" ry="2" fill="#fbf3ea"/>');
    P.push('<circle cx="26.6" cy="' + ey + '" r="1.5" fill="#241a12"/><circle cx="37.4" cy="' + ey + '" r="1.5" fill="#241a12"/>');
    if (eye === 1) P.push('<path d="M22.9 25 Q26 24 29.1 25" stroke="' + sksh + '" stroke-width="1.3" fill="none"/><path d="M34.9 25 Q38 24 41.1 25" stroke="' + sksh + '" stroke-width="1.3" fill="none"/>');
    // 코·입
    P.push('<path d="M32 26 L30.4 31 Q32 32 33.6 31" fill="none" stroke="' + sksh + '" stroke-width="1.2" stroke-linecap="round"/>');
    P.push('<path d="M28.5 34.5 Q32 36 35.5 34.5" fill="none" stroke="#a85847" stroke-width="1.4" stroke-linecap="round"/>');
    // 턱수염
    if (beard === 3) P.push('<path d="M20 29 Q20 46 32 48 Q44 46 44 29 Q41 39 32 39 Q23 39 20 29 Z" fill="' + hair + '"/>');
    else if (beard === 2) P.push('<path d="M29 36 Q32 43 35 36 Q32 38.5 29 36 Z" fill="' + hair + '"/>');
    // 머리·관·투구
    if (top === 0) { P.push('<path d="M18 25 Q17 9 32 8 Q47 9 46 25 Q45 16 32 15 Q19 16 18 25 Z" fill="' + hair + '"/>'); P.push('<rect x="29.5" y="3.5" width="5" height="7" rx="2.2" fill="' + hair + '"/><ellipse cx="32" cy="4" rx="4" ry="3.4" fill="' + hair + '"/>'); }
    else if (top === 1) { P.push('<path d="M17 26 Q16 7 32 6 Q48 7 47 26 Q41 13 32 13 Q23 13 17 26 Z" fill="#9aa3ad"/>'); P.push('<path d="M17 26 Q16 7 32 6 Q48 7 47 26" fill="none" stroke="#646c78" stroke-width="1.4"/>'); P.push('<path d="M30 6 Q32 1 34 6 Z" fill="#c0392b"/><ellipse cx="32" cy="3" rx="3" ry="2.6" fill="#c0392b"/>'); P.push('<rect x="22" y="12" width="20" height="2.4" rx="1.2" fill="#cdd3da"/>'); }
    else if (top === 2) { P.push('<path d="M18 24 Q18 11 32 11 Q46 11 46 24 Q45 16 32 15 Q19 16 18 24 Z" fill="' + hair + '"/>'); P.push('<path d="M20 16 Q20 5 32 5 Q44 5 44 16 Q44 11 32 11 Q20 11 20 16 Z" fill="' + robeD + '"/>'); P.push('<rect x="29.5" y="2" width="5" height="5" rx="1.5" fill="' + robeD + '"/>'); }
    else if (top === 3) { P.push('<path d="M17 27 Q16 18 22 16 Q19 24 20 28 Z" fill="' + hair + '"/><path d="M47 27 Q48 18 42 16 Q45 24 44 28 Z" fill="' + hair + '"/>'); P.push('<path d="M22 16 Q26 13 32 13 Q38 13 42 16 Q38 15 32 15 Q26 15 22 16 Z" fill="' + hair + '" opacity="0.85"/>'); }
    else { P.push('<path d="M19 23 Q19 14 32 13 Q45 14 45 23 Q44 17 32 16 Q20 17 19 23 Z" fill="' + hair + '"/>'); }
    // 콧수염(맨 위)
    if (beard >= 1) P.push('<path d="M25.5 33 Q28 35 32 34.6 Q36 35 38.5 33 Q34 34 32 34 Q30 34 25.5 33 Z" fill="' + hair + '"/>');
    return '<svg class="p-face" viewBox="0 0 64 64" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' + P.join('') + '</svg>';
  }
  function portraitStyle() { try { return localStorage.getItem('tcg_portrait') === 'emoji' ? 'emoji' : 'face'; } catch (e) { return 'face'; } }
  // 인물화 대상: 장수/카드(ASCII id). 주공('lord')·적장('cmd_*')·적(한글 이름)은 기존 이모지 유지
  function isFaceSeed(seed) {
    var s = String(seed || '');
    if (!s || s === 'lord' || s.indexOf('cmd_') === 0) return false;
    return /^[\x00-\x7F]+$/.test(s);
  }
  // portrait frame markup: 인물화(얼굴) 또는 이모지 메달리온
  function portrait(emoji, seed, extraClass) {
    if (portraitStyle() === 'face' && isFaceSeed(seed)) {
      return '<div class="portrait face ' + (extraClass || '') + '" style="--h:' + hue(seed) + '">' + faceSVG(seed) + '</div>';
    }
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
    getPortrait: portraitStyle,
    setPortrait: function (st) { try { localStorage.setItem('tcg_portrait', st === 'emoji' ? 'emoji' : 'face'); } catch (e) {} },
    toast: toast, floatText: floatText, delay: delay,
    sfx: sfx, toggleMute: toggleMute, isMuted: isMuted, audioResume: audioResume,
    initFloatMenu: initFloatMenu
  };
})();
