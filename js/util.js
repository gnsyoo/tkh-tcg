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
    return { easy: t('df.easy'), normal: t('df.normal'), hard: t('df.hard') }[d] || d;
  }
  // 동적 UI 문구 번역 — window.__UI_I18N__(키→{ko,en,ja,zh,zhTW})에서 현재 언어 문자열을 찾아 {var} 치환
  function t(key, vars) {
    var lang = 'ko';
    try { var l = localStorage.getItem('tcg_lang'); if (['ko', 'en', 'ja', 'zh', 'zhTW'].indexOf(l) !== -1) lang = l; } catch (e) {}
    var dict = (typeof window !== 'undefined' && window.__UI_I18N__) || {};
    var e = dict[key];
    var s = e ? (e[lang] != null ? e[lang] : e.ko) : key;
    if (vars) s = String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
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
  // 인물별 특징(이름 기준) — 외형 오버라이드
  var FACE_TRAITS = {
    '관우': { skin: 'red', beard: 'long', brow: 'calm', top: 'helmet' },
    '하후돈': { eyepatch: true, beard: 'full', brow: 'fierce', top: 'helmet' },
    '장비': { skin: 'dark', hair: 'black', beard: 'full', brow: 'fierce', top: 'helmet' },
    '여포': { top: 'helmet', plume: true, beard: 'goatee' },
    '제갈량': { top: 'cap', beard: 'none', brow: 'calm' },
    '사마의': { top: 'cap', beard: 'goatee', brow: 'fierce' },
    '조운': { top: 'helmet', beard: 'none' },
    '유비': { bigEars: true, beard: 'goatee', brow: 'calm', top: 'crown' },
    '조조': { top: 'crown', beard: 'goatee', brow: 'fierce' },
    '손권': { hair: 'red', beard: 'full', top: 'crown' },
    '황충': { hair: 'white', beard: 'long', top: 'helmet' },
    '화타': { hair: 'white', beard: 'long', brow: 'calm', top: 'cap' },
    '사마염': { top: 'crown', beard: 'full' }, '원소': { top: 'crown', beard: 'full' },
    '동탁': { skin: 'dark', beard: 'full', brow: 'fierce' },
    '초선': { female: true, ornate: true }, '소교': { female: true }, '대교': { female: true },
    '순욱': { top: 'cap' }, '순유': { top: 'cap' }, '서서': { top: 'cap' }, '정욱': { top: 'cap' },
    '방통': { top: 'cap', brow: 'fierce' }, '가후': { top: 'cap', beard: 'goatee', brow: 'fierce' },
    '주유': { top: 'cap', beard: 'none', brow: 'calm' }, '육손': { top: 'cap', beard: 'none', brow: 'calm' },
    '마초': { top: 'helmet', beard: 'goatee' }, '장료': { top: 'helmet', beard: 'full' },
    '방덕': { top: 'helmet', beard: 'full' }, '황개': { hair: 'gray', beard: 'full', top: 'helmet' },
    '화웅': { beard: 'full', brow: 'fierce', top: 'helmet' }, '서황': { top: 'helmet', beard: 'full' },
    '손책': { top: 'helmet', beard: 'none' }, '태사자': { top: 'helmet' }, '강유': { top: 'helmet' },
    '하후연': { top: 'helmet', beard: 'goatee' }, '조비': { top: 'crown', beard: 'goatee' },
    '감녕': { top: 'helmet' }, '전위': { top: 'helmet', beard: 'full', brow: 'fierce' },
    '허저': { top: 'helmet', beard: 'full' }, '여몽': { top: 'helmet' }, '마대': { top: 'helmet' },
    '장합': { top: 'helmet' }, '등애': { top: 'helmet', hair: 'gray' }, '공손찬': { top: 'helmet' },
    '위연': { top: 'helmet', beard: 'goatee', brow: 'fierce' }, '악진': { top: 'helmet' }
  };
  function faceSVG(seed, name) {
    var s = String(seed || ''), T = FACE_TRAITS[name] || {};
    var SKIN = ['#f2cba6', '#ecbd92', '#e0ad7e', '#cf9b6e', '#bb8456'];
    var SKSH = ['#d6a880', '#c99a72', '#bf8f63', '#ad7a52', '#9a6a42'];
    var HAIR = ['#23190f', '#150e08', '#3a2614', '#4b3a26', '#0e0e0e'];
    var si = pf(s, 'skin', 5), skin = SKIN[si], sksh = SKSH[si];
    if (T.skin === 'red') { skin = '#c75a48'; sksh = '#a23f30'; }
    else if (T.skin === 'dark') { skin = '#8f6a45'; sksh = '#6d4f31'; }
    else if (T.skin === 'pale') { skin = '#f6ddc4'; sksh = '#dab695'; }
    var hair = HAIR[pf(s, 'hair', 5)];
    if (T.hair === 'white') hair = '#e9e9e9';
    else if (T.hair === 'gray') hair = '#a9a9a9';
    else if (T.hair === 'red') hair = '#7d3a28';
    else if (T.hair === 'black') hair = '#120c07';
    var bh = hue(s);
    var robe = 'hsl(' + bh + ',46%,40%)', robeD = 'hsl(' + bh + ',44%,28%)', collar = 'hsl(' + ((bh + 28) % 360) + ',55%,58%)';
    var female = !!T.female;
    var top = T.top || ['topknot', 'helmet', 'cap', 'sidehair', 'longhair'][pf(s, 'top', 5)];
    var beard = female ? 'none' : (T.beard || ['none', 'mustache', 'goatee', 'full'][pf(s, 'beard', 4)]);
    var brow = female ? 'thin' : ((T.brow === 'fierce') ? 'fierce' : (T.brow === 'calm') ? 'flat' : ['flat', 'fierce', 'raised'][pf(s, 'brow', 3)]);
    var P = [];
    P.push('<path d="M2 64 Q7 46 21 44 L43 44 Q57 46 62 64 Z" fill="' + robe + '"/>');
    P.push('<path d="M21 44 L32 56 L43 44 L41 64 L23 64 Z" fill="' + robeD + '"/>');
    P.push('<path d="M23 44 L32 53 L41 44" fill="none" stroke="' + collar + '" stroke-width="2.6" stroke-linejoin="round"/>');
    P.push('<path d="M27 36 h10 v8 q-5 3 -10 0 Z" fill="' + sksh + '"/>');
    if (top === 'longhair' || female) P.push('<path d="M16 24 Q15 7 32 6 Q49 7 48 24 L48 44 Q45 31 45 23 Q45 14 32 13 Q19 14 19 23 Q19 31 16 44 Z" fill="' + hair + '"/>');
    var er = T.bigEars ? 3.4 : 2.3, ery = T.bigEars ? 5 : 3.6;
    P.push('<ellipse cx="32" cy="25" rx="13" ry="15" fill="' + skin + '"/>');
    P.push('<ellipse cx="19.5" cy="27" rx="' + er + '" ry="' + ery + '" fill="' + skin + '"/><ellipse cx="44.5" cy="27" rx="' + er + '" ry="' + ery + '" fill="' + skin + '"/>');
    if (brow === 'fierce') P.push('<path d="M22 20 L29 22.7" stroke="' + hair + '" stroke-width="2.1" stroke-linecap="round"/><path d="M42 20 L35 22.7" stroke="' + hair + '" stroke-width="2.1" stroke-linecap="round"/>');
    else if (brow === 'raised') P.push('<path d="M22.5 21 Q26 19.4 29 21" stroke="' + hair + '" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M35 21 Q38 19.4 41.5 21" stroke="' + hair + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>');
    else if (brow === 'thin') P.push('<path d="M23 21.6 Q26 20.6 29 21.7" stroke="' + hair + '" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M35 21.7 Q38 20.6 41 21.6" stroke="' + hair + '" stroke-width="1.1" fill="none" stroke-linecap="round"/>');
    else P.push('<path d="M22.5 21.5 h6.5" stroke="' + hair + '" stroke-width="1.8" stroke-linecap="round"/><path d="M35 21.5 h6.5" stroke="' + hair + '" stroke-width="1.8" stroke-linecap="round"/>');
    P.push('<ellipse cx="26" cy="26" rx="3.1" ry="2" fill="#fbf3ea"/><ellipse cx="38" cy="26" rx="3.1" ry="2" fill="#fbf3ea"/>');
    P.push('<circle cx="26.6" cy="26" r="1.5" fill="#241a12"/><circle cx="37.4" cy="26" r="1.5" fill="#241a12"/>');
    P.push('<path d="M32 26 L30.4 31 Q32 32 33.6 31" fill="none" stroke="' + sksh + '" stroke-width="1.2" stroke-linecap="round"/>');
    if (female) { P.push('<ellipse cx="24" cy="31" rx="2.2" ry="1.3" fill="#ef8a8a" opacity="0.4"/><ellipse cx="40" cy="31" rx="2.2" ry="1.3" fill="#ef8a8a" opacity="0.4"/>'); P.push('<path d="M29.2 34.6 Q32 36.7 34.8 34.6 Q32 35.6 29.2 34.6 Z" fill="#c64b54"/>'); }
    else P.push('<path d="M28.5 34.5 Q32 36 35.5 34.5" fill="none" stroke="#a85847" stroke-width="1.4" stroke-linecap="round"/>');
    if (beard === 'full') P.push('<path d="M20 29 Q20 46 32 48 Q44 46 44 29 Q41 39 32 39 Q23 39 20 29 Z" fill="' + hair + '"/>');
    else if (beard === 'long') P.push('<path d="M22 30 Q22 53 32 60 Q42 53 42 30 Q38 40 32 40 Q26 40 22 30 Z" fill="' + hair + '"/>');
    else if (beard === 'goatee') P.push('<path d="M29 36 Q32 43 35 36 Q32 38.5 29 36 Z" fill="' + hair + '"/>');
    if (female) { P.push('<path d="M18 24 Q18 9 32 8 Q46 9 46 24 Q45 15 32 14 Q19 15 18 24 Z" fill="' + hair + '"/>'); P.push('<ellipse cx="32" cy="7" rx="4.5" ry="3.6" fill="' + hair + '"/><circle cx="32" cy="6.5" r="1.4" fill="#f0c33c"/>'); }
    else if (top === 'topknot') { P.push('<path d="M18 25 Q17 9 32 8 Q47 9 46 25 Q45 16 32 15 Q19 16 18 25 Z" fill="' + hair + '"/>'); P.push('<rect x="29.5" y="3.5" width="5" height="7" rx="2.2" fill="' + hair + '"/><ellipse cx="32" cy="4" rx="4" ry="3.4" fill="' + hair + '"/>'); }
    else if (top === 'helmet') { P.push('<path d="M17 26 Q16 7 32 6 Q48 7 47 26 Q41 13 32 13 Q23 13 17 26 Z" fill="#9aa3ad"/>'); P.push('<path d="M17 26 Q16 7 32 6 Q48 7 47 26" fill="none" stroke="#646c78" stroke-width="1.4"/>'); P.push('<rect x="22" y="12" width="20" height="2.4" rx="1.2" fill="#cdd3da"/>'); var pc = T.plume ? '#c0392b' : '#8d8f96'; P.push('<path d="M30 6 Q32 0 34 6 Z" fill="' + pc + '"/><ellipse cx="32" cy="2.6" rx="3" ry="2.6" fill="' + pc + '"/>'); }
    else if (top === 'cap') { P.push('<path d="M18 24 Q18 11 32 11 Q46 11 46 24 Q45 16 32 15 Q19 16 18 24 Z" fill="' + hair + '"/>'); P.push('<path d="M20 16 Q20 5 32 5 Q44 5 44 16 Q44 11 32 11 Q20 11 20 16 Z" fill="' + robeD + '"/>'); P.push('<rect x="29.5" y="2" width="5" height="5" rx="1.5" fill="' + robeD + '"/>'); }
    else if (top === 'crown') { P.push('<path d="M18 25 Q17 11 32 10 Q47 11 46 25 Q45 17 32 16 Q19 17 18 25 Z" fill="' + hair + '"/>'); P.push('<rect x="20" y="7" width="24" height="4.5" rx="1" fill="#d4af37"/>'); P.push('<rect x="22" y="3" width="20" height="4.5" rx="1" fill="#2a2436"/>'); P.push('<circle cx="25" cy="9.2" r="1" fill="#fff2b0"/><circle cx="32" cy="9.2" r="1" fill="#fff2b0"/><circle cx="39" cy="9.2" r="1" fill="#fff2b0"/>'); }
    else if (top === 'sidehair') { P.push('<path d="M17 27 Q16 18 22 16 Q19 24 20 28 Z" fill="' + hair + '"/><path d="M47 27 Q48 18 42 16 Q45 24 44 28 Z" fill="' + hair + '"/>'); P.push('<path d="M22 16 Q26 13 32 13 Q38 13 42 16 Q38 15 32 15 Q26 15 22 16 Z" fill="' + hair + '" opacity="0.85"/>'); }
    else P.push('<path d="M19 23 Q19 14 32 13 Q45 14 45 23 Q44 17 32 16 Q20 17 19 23 Z" fill="' + hair + '"/>');
    if (beard !== 'none') P.push('<path d="M25.5 33 Q28 35 32 34.6 Q36 35 38.5 33 Q34 34 32 34 Q30 34 25.5 33 Z" fill="' + hair + '"/>');
    if (T.eyepatch) { P.push('<path d="M14 23 L48 32" stroke="#1d1d22" stroke-width="2.4"/>'); P.push('<ellipse cx="26" cy="26" rx="4.2" ry="3.2" fill="#1d1d22"/>'); }
    if (female && T.ornate) { // 초선 — 화려한 머리 장식·꽃·귀걸이·이마 화전·늘어뜨린 술
      P.push('<path d="M16 14 L15 27" stroke="#d4af37" stroke-width="1"/><circle cx="15" cy="28" r="1.3" fill="#d4324a"/>');
      P.push('<path d="M48 14 L49 27" stroke="#d4af37" stroke-width="1"/><circle cx="49" cy="28" r="1.3" fill="#d4324a"/>');
      P.push('<ellipse cx="32" cy="6.5" rx="5.6" ry="4.2" fill="#160f0a"/>');
      P.push('<path d="M26.5 7 Q24 2 27 0.6 Q28.5 4 29.5 6.5 Z" fill="#f0c33c"/><path d="M37.5 7 Q40 2 37 0.6 Q35.5 4 34.5 6.5 Z" fill="#f0c33c"/>');
      P.push('<circle cx="32" cy="3.6" r="2.1" fill="#d4324a"/><circle cx="27.5" cy="6.2" r="1.2" fill="#f0c33c"/><circle cx="36.5" cy="6.2" r="1.2" fill="#f0c33c"/>');
      P.push('<g fill="#ec6a93"><circle cx="42" cy="11.5" r="1.6"/><circle cx="44.4" cy="11.5" r="1.6"/><circle cx="43.2" cy="9.6" r="1.6"/><circle cx="43.2" cy="13.4" r="1.6"/></g><circle cx="43.2" cy="11.5" r="1.1" fill="#f0c33c"/>');
      P.push('<circle cx="32" cy="18.6" r="1.3" fill="#d4324a"/>');
      P.push('<circle cx="19.3" cy="31.8" r="1.4" fill="#f0c33c"/><circle cx="44.7" cy="31.8" r="1.4" fill="#f0c33c"/>');
    }
    return '<svg class="p-face" viewBox="0 0 64 64" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' + P.join('') + '</svg>';
  }
  // 인물화 대상: 장수/카드(ASCII id). 주공('lord')·적장('cmd_*')·적(한글 이름)은 이모지 유지
  function isFaceSeed(seed) {
    var s = String(seed || '');
    if (!s || s === 'lord' || s.indexOf('cmd_') === 0) return false;
    return /^[\x00-\x7F]+$/.test(s);
  }
  // portrait: 장수/카드는 절차적 인물화(얼굴), 그 외(적·주공)는 이모지 메달리온
  function portrait(emoji, seed, extraClass, name) {
    if (isFaceSeed(seed)) {
      return '<div class="portrait face ' + (extraClass || '') + '" style="--h:' + hue(seed) + '">' + faceSVG(seed, name) + '</div>';
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
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 2000);
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
  var dialogueOn = true; // 보스 대사 — 기본 켜짐
  try { dialogueOn = localStorage.getItem('tcg_dialogue') !== '0'; } catch (e) {}
  function toggleDialogue() { dialogueOn = !dialogueOn; try { localStorage.setItem('tcg_dialogue', dialogueOn ? '1' : '0'); } catch (e) {} return dialogueOn; }
  function isDialogueOn() { return dialogueOn; }
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

  // 안드로이드 하드웨어 뒤로가기 — 열린 모달 닫기 → 이전 페이지 → (루트면) 종료 확인
  function initBackButton() {
    if (typeof window === 'undefined') return;
    if (!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) return;
    var App = window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (!App || !App.addListener) return;
    App.addListener('backButton', function (info) {
      // 1) 열려 있는 오버레이/시트가 있으면 가장 위의 것을 닫는다
      var open = document.querySelectorAll('.overlay:not([hidden]), .codex-page:not([hidden]), .settings-sheet:not([hidden])');
      if (open.length) {
        var top = open[open.length - 1];
        top.hidden = true;
        if (top.classList && top.classList.contains('settings-sheet')) { var bd = document.getElementById('ssBackdrop'); if (bd) bd.hidden = true; }
        return;
      }
      // 2) 웹 히스토리(페이지 이동)가 있으면 이전 페이지로
      if (info && info.canGoBack) { window.history.back(); return; }
      // 3) 더 갈 곳이 없으면 종료 확인
      if (window.confirm(t('app.exitConfirm'))) { try { App.exitApp(); } catch (e) {} }
    });
  }

  return {
    getDifficulty: getDifficulty,
    diffLabel: diffLabel,
    t: t,
    rand: rand, pick: pick, shuffle: shuffle, clamp: clamp,
    hue: hue, portrait: portrait,
    toast: toast, floatText: floatText, delay: delay,
    sfx: sfx, toggleMute: toggleMute, isMuted: isMuted, audioResume: audioResume,
    toggleDialogue: toggleDialogue, isDialogueOn: isDialogueOn,
    initFloatMenu: initFloatMenu,
    initBackButton: initBackButton
  };
})();

// 앱(안드로이드)에서 하드웨어 뒤로가기 처리 등록
if (typeof document !== 'undefined') {
  if (document.readyState !== 'loading') TCG.initBackButton();
  else document.addEventListener('DOMContentLoaded', function () { TCG.initBackButton(); });
}
