/*
 * bgm-engine.js — 삼국영웅전 상황별 BGM 엔진 (Web Audio, 크로스페이드 루프)
 * window.BGMEngine 전역. mp3를 디코드해 매 바퀴 이음새를 크로스페이드(꼬리 페이드아웃 +
 * 다음 머리 페이드인)로 이어 붙여 "뚝" 끊김 없이 반복한다.
 *
 * API (변경 없음)
 *   BGMEngine.play(sceneKey)   // 'intro'|'home'|'heroes'|'heroes_lobby'|'daejang'|'blood' — 1.4s 크로스페이드 전환
 *   BGMEngine.stop()           // 페이드아웃 정지
 *   BGMEngine.stinger(key)     // 'victory'|'defeat' — 일회성, 현재 BGM 더킹 후 복귀
 *   BGMEngine.setEnabled(bool) // 마스터 on/off (localStorage 'hb_bgm')
 *   BGMEngine.isEnabled()      // bool
 *   BGMEngine.current()        // 현재 sceneKey | null
 *
 * 파일 위치: 같은 디렉터리 기준 ./bgm/<key>.mp3
 */
(function () {
  var BASE = './bgm/';
  // loopXfade: 바퀴 이음새 크로스페이드 길이(초). 트랙 길이의 25%로 자동 클램프.
  var SRC = {
    intro:        { file: 'intro.mp3',        vol: 0.9, loopXfade: 2.0 },
    home:         { file: 'home.mp3',         vol: 0.9, loopXfade: 2.0 },
    heroes:       { file: 'heroes.mp3',       vol: 0.9, loopXfade: 1.5 },
    heroes_lobby: { file: 'heroes_lobby.mp3', vol: 0.9, loopXfade: 2.0 },
    daejang:      { file: 'daejang.mp3',      vol: 0.9, loopXfade: 1.5 },
    blood:        { file: 'blood.mp3',        vol: 0.9, loopXfade: 2.0 }
  };
  var STING = {
    victory: { file: 'victory.mp3', vol: 1.0 },
    defeat:  { file: 'defeat.mp3',  vol: 1.0 }
  };
  var SCENE_FADE = 1.4;   // 장면 전환 크로스페이드(초)
  var DEFAULT_VOL = 0.9;  // 기본 BGM 볼륨(0~1)

  // 볼륨 단일 소스: localStorage 'hb_bgm_vol'(0~1). 0이면 BGM 오프.
  var volume = DEFAULT_VOL;
  try {
    var _sv = localStorage.getItem('hb_bgm_vol');
    if (_sv !== null && _sv !== '') volume = Math.max(0, Math.min(1, parseFloat(_sv) || 0));
    else if (localStorage.getItem('hb_bgm') === '0') volume = 0; // 구버전 on/off 토글 마이그레이션
  } catch (e) {}
  function isOn() { return volume > 0.0005; }

  var ctx = null, master = null;
  var sceneKey = null;
  var voice = null;       // 현재 보이스 {key, bus, sources[], timer, stopped}
  var buffers = {};       // key -> AudioBuffer
  var loading = {};       // key -> Promise
  var pendingPlay = null; // 디코드 대기 중 예약된 key

  function ensure() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = isOn() ? volume : 0.0001;
    master.connect(ctx.destination);
  }
  function resume() { try { if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (e) {} }

  function loadBuffer(key) {
    if (buffers[key]) return Promise.resolve(buffers[key]);
    if (loading[key]) return loading[key];
    var meta = SRC[key] || STING[key];
    if (!meta) return Promise.reject();
    loading[key] = fetch(BASE + meta.file)
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (ab) {
        return new Promise(function (res, rej) {
          ctx.decodeAudioData(ab, function (buf) { buffers[key] = buf; res(buf); }, rej);
        });
      });
    return loading[key];
  }

  // ===== 크로스페이드 루프 보이스 =====
  function makeVoice(key, buf) {
    var meta = SRC[key];
    var bus = ctx.createGain(); bus.gain.value = 0.0001; bus.connect(master);
    var dur = buf.duration;
    var xf = Math.min(meta.loopXfade || 1.5, dur * 0.25);
    var period = dur - xf;            // 다음 바퀴 시작 간격
    var v = { key: key, bus: bus, sources: [], timer: null, stopped: false, nextStart: 0, dur: dur, xf: xf, period: period, buf: buf };

    function scheduleOne(when) {
      var src = ctx.createBufferSource(); src.buffer = buf;
      var g = ctx.createGain(); src.connect(g); g.connect(bus);
      // 머리 페이드인
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(1, when + xf);
      // 꼬리 페이드아웃
      g.gain.setValueAtTime(1, when + dur - xf);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      src.start(when);
      try { src.stop(when + dur + 0.05); } catch (e) {}
      v.sources.push(src);
      // 오래된 소스 정리
      if (v.sources.length > 4) v.sources.shift();
    }

    // 첫 바퀴는 페이드인 없이 바로(장면 전환 크로스페이드가 담당)
    function scheduleFirst(when) {
      var src = ctx.createBufferSource(); src.buffer = buf;
      var g = ctx.createGain(); src.connect(g); g.connect(bus);
      g.gain.setValueAtTime(1, when);
      g.gain.setValueAtTime(1, when + dur - xf);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      src.start(when);
      try { src.stop(when + dur + 0.05); } catch (e) {}
      v.sources.push(src);
    }

    var t0 = ctx.currentTime + 0.06;
    v.nextStart = t0 + period;   // 다음(2번째) 바퀴 시작 시점
    scheduleFirst(t0);

    // 룩어헤드 스케줄러: 1바퀴 앞서 다음 바퀴 예약
    v.timer = setInterval(function () {
      if (v.stopped) return;
      while (v.nextStart < ctx.currentTime + 1.0) {
        scheduleOne(v.nextStart);
        v.nextStart += period;
      }
    }, 200);

    return v;
  }

  function fadeBusTo(v, target, dur) {
    if (!v || !v.bus) return;
    var t = ctx.currentTime;
    v.bus.gain.cancelScheduledValues(t);
    v.bus.gain.setValueAtTime(Math.max(0.0001, v.bus.gain.value), t);
    v.bus.gain.linearRampToValueAtTime(Math.max(0.0001, target), t + dur);
  }
  function killVoice(v, dur) {
    if (!v) return;
    fadeBusTo(v, 0.0001, dur);
    setTimeout(function () {
      v.stopped = true;
      if (v.timer) clearInterval(v.timer);
      for (var i = 0; i < v.sources.length; i++) { try { v.sources[i].stop(); } catch (e) {} }
      try { v.bus.disconnect(); } catch (e) {}
    }, dur * 1000 + 120);
  }

  function startScene(key) {
    var meta = SRC[key]; if (!meta) return;
    ensure(); resume();
    sceneKey = key;
    loadBuffer(key).then(function (buf) {
      if (sceneKey !== key) return;           // 그새 다른 장면으로 바뀜
      var prev = voice;
      if (prev) killVoice(prev, SCENE_FADE);
      var v = makeVoice(key, buf);
      voice = v;
      fadeBusTo(v, meta.vol, SCENE_FADE);
    }).catch(function () {});
  }

  function stinger(key) {
    var meta = STING[key]; if (!meta) return;
    ensure(); resume();
    // 현재 BGM 더킹
    if (voice) {
      var base = (SRC[voice.key] || {}).vol || 0.9;
      fadeBusTo(voice, base * 0.16, 0.12);
      setTimeout(function () { if (voice && voice.key) fadeBusTo(voice, base, 2.0); }, 140);
    }
    loadBuffer(key).then(function (buf) {
      var src = ctx.createBufferSource(); src.buffer = buf;
      var g = ctx.createGain(); g.gain.value = isOn() ? meta.vol : 0.0001;
      src.connect(g); g.connect(master);
      src.start(ctx.currentTime + 0.02);
    }).catch(function () {});
  }

  function stop() {
    if (voice) killVoice(voice, 1.0);
    voice = null; sceneKey = null;
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, isNaN(v) ? 0 : v)); ensure();
    var t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
    master.gain.linearRampToValueAtTime(isOn() ? volume : 0.0001, t + 0.25);
    if (isOn()) resume();
    try { localStorage.setItem('hb_bgm_vol', String(volume)); } catch (e) {}
  }
  function setEnabled(b) { setVolume(b ? (isOn() ? volume : DEFAULT_VOL) : 0); }

  // 자동재생 정책: 첫 사용자 제스처에서 컨텍스트 잠금 해제
  function unlock() { ensure(); resume(); }
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, unlock, { passive: true });
  });

  window.BGMEngine = {
    play: function (key) { if (key && key !== sceneKey) startScene(key); else { ensure(); resume(); } },
    stop: stop,
    stinger: stinger,
    setEnabled: setEnabled,
    isEnabled: function () { return isOn(); },
    setVolume: setVolume,
    getVolume: function () { return volume; },
    current: function () { return sceneKey; },
    setBase: function (path) { BASE = path; buffers = {}; loading = {}; }
  };
})();
