/* ===== Heroes Wanted — roguelike engine & UI ===== */
(function () {
  var diff = TCG.getDifficulty();
  var DCFG = HW_DIFF[diff];
  var MAX_PARTY = 30; // 파티(=카드 덱)에 모집해 넣을 수 있는 최대 장수 수
  var SUB_COUNT = 12; // 메인 스테이지 1개당 서브 스테이지 수 (마지막은 적장 보스전)
  var run = null;

  /* ---------- helpers ---------- */
  function mkHero(id) {
    var d = HW_BY_ID[id];
    return { uid: id + '_' + Math.random().toString(36).slice(2, 7), def: d, atk: d.atk, weapon: null };
  }
  function relicSum(key) {
    return run.relics.reduce(function (s, r) { return s + (r.effect[key] || 0); }, 0);
  }
  // 무기 효과 헬퍼
  function wpn(h) { return h && h.weapon ? HW_WEAPON_BY_ID[h.weapon] : null; }
  function wpnVal(h, key) { var w = wpn(h); return w && w.effect[key] ? w.effect[key] : 0; }
  function effAtk(h) { return h.atk + wpnVal(h, 'atk') + (run.combat ? (run.combat.atkBuff || 0) : 0); }
  function lordMaxHp() { return HW_LORD.hp + run.party.reduce(function (s, h) { return s + wpnVal(h, 'lordHp'); }, 0); }
  function lordMaxMp() { return HW_LORD.mp + run.party.reduce(function (s, h) { return s + wpnVal(h, 'lordMp'); }, 0); }
  function skillMp(sk) { return 2 + (sk.cost || 1); } // 스킬 MP 비용 3~5
  // 보유 무기 중 아직 장착되지 않은 것들(중복 보유 허용)
  function freeWeaponIds() {
    var owned = (run.weapons || []).slice();
    run.party.forEach(function (h) {
      if (h.weapon) { var i = owned.indexOf(h.weapon); if (i !== -1) owned.splice(i, 1); }
    });
    return owned;
  }
  function living(arr) { return arr.filter(function (u) { return u.hp > 0; }); }
  function lowest(arr) {
    var a = living(arr); if (!a.length) return null;
    return a.reduce(function (m, u) { return (u.hp / u.maxHp) < (m.hp / m.maxHp) ? u : m; });
  }

  /* ---------- screen switching ---------- */
  function show(id) {
    ['mapScreen', 'combatScreen', 'rewardScreen', 'restScreen', 'shopScreen', 'eventScreen'].forEach(function (s) {
      document.getElementById(s).hidden = (s !== id);
    });
  }
  function updateTop() {
    document.getElementById('goldPill').textContent = '💰 ' + run.gold;
    var st = HW_STAGES[run.mainStage];
    document.getElementById('floorPill').textContent = st
      ? ((run.mainStage + 1) + '/' + HW_STAGES.length + ' ' + st.name + ' · ' + (run.subStage + 1) + '/' + SUB_COUNT)
      : '천하통일';
    document.getElementById('diffPill').textContent = '난이도 ' + TCG.diffLabel(diff);
  }

  /* ---------- save / continue ---------- */
  function saveRun() {
    try {
      if (!run) return;
      localStorage.setItem('hw_save', JSON.stringify({
        v: 3, diff: diff,
        party: run.party.map(function (h) { return { id: h.def.id, atk: h.atk, uid: h.uid, weapon: h.weapon || null }; }),
        gold: run.gold, mainStage: run.mainStage, subStage: run.subStage,
        relics: run.relics.map(function (r) { return r.id; }),
        weapons: run.weapons.slice(), sorties: run.sorties || 0,
        lordHp: run.lordHp
      }));
    } catch (e) {}
  }
  function clearSave() { try { localStorage.removeItem('hw_save'); } catch (e) {} }
  function loadSave() {
    try {
      var raw = localStorage.getItem('hw_save'); if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || !Array.isArray(d.party) || !d.party.length) return null;
      if (!d.party.every(function (h) { return HW_BY_ID[h.id]; })) return null;
      return d;
    } catch (e) { return null; }
  }
  function resumeRun(d) {
    var relicById = {}; HW_RELICS.forEach(function (r) { relicById[r.id] = r; });
    run = {
      party: d.party.map(function (h) {
        return { uid: h.uid || (h.id + '_' + Math.random().toString(36).slice(2, 7)), def: HW_BY_ID[h.id], atk: h.atk, weapon: (h.weapon && HW_WEAPON_BY_ID[h.weapon]) ? h.weapon : null };
      }),
      gold: d.gold || 0,
      mainStage: Math.min(Math.max(0, d.mainStage || 0), HW_STAGES.length - 1),
      subStage: Math.min(Math.max(0, d.subStage || 0), SUB_COUNT - 1),
      relics: (d.relics || []).map(function (id) { return relicById[id]; }).filter(Boolean),
      weapons: (d.weapons || []).filter(function (id) { return HW_WEAPON_BY_ID[id]; }),
      sorties: d.sorties || 0,
      stageShopped: false, combat: null
    };
    run.lordHp = (typeof d.lordHp === 'number') ? Math.min(d.lordHp, lordMaxHp()) : lordMaxHp();
    showMap();
  }

  /* ---------- run lifecycle ---------- */
  function newRun() {
    clearSave();
    run = { party: HW_STARTERS.map(mkHero), gold: DCFG.startGold, mainStage: 0, subStage: 0, relics: [], weapons: [], sorties: 0, stageShopped: false, combat: null };
    run.lordHp = lordMaxHp(); // 주공 HP는 모험 내내 유지(스테이지마다 일부 회복)
    showMap();
  }

  /* ---------- MAP ---------- */
  function hpBar(u, foe) {
    var pct = Math.max(0, Math.round(u.hp / u.maxHp * 100));
    return '<div class="hpbar' + (foe ? ' foe' : '') + '"><i style="width:' + pct + '%"></i></div>';
  }
  function miniHero(h) {
    var w = wpn(h);
    return '<div class="mini-hero" data-uid="' + h.uid + '">' +
      TCG.portrait(h.def.emoji, h.def.id) +
      '<div class="mh-name">' + h.def.name + '</div>' +
      '<div class="mh-stats">⚔' + effAtk(h) + (w ? ' <span class="mh-wpn">' + w.emoji + '</span>' : '') + '</div></div>';
  }
  function showMap() {
    updateTop();
    renderCampaign();
    show('mapScreen');
    saveRun();
  }
  function renderCampaign() {
    var m = run.mainStage, s = run.subStage, st = HW_STAGES[m];
    var isBoss = s === SUB_COUNT - 1;
    // 메인 전역 칩 (해금/진행/평정)
    var chips = HW_STAGES.map(function (x, i) {
      var cl = i < m ? 'done' : (i === m ? 'current' : 'locked');
      return '<div class="main-chip ' + cl + '">' + (i < m ? '✔' : (i === m ? (i + 1) : '🔒')) + '</div>';
    }).join('');
    // 서브 진행 점
    var dots = '';
    for (var i = 0; i < SUB_COUNT; i++) {
      var dc = i < s ? ' done' : (i === s ? ' current' : '');
      dots += '<span class="sub-dot' + dc + (i === SUB_COUNT - 1 ? ' boss' : '') + '"></span>';
    }
    var battleLabel = isBoss ? ('👑 적장 ' + HW_COMMANDERS[st.boss].name + ' 토벌') : ('⚔️ 출진 (' + (s + 1) + '/' + SUB_COUNT + ')');
    var html =
      '<div class="main-chips">' + chips + '</div>' +
      '<div class="main-banner' + (isBoss ? ' boss' : '') + '"><span class="mb-no">' + (m + 1) + '</span>' +
        '<div class="mb-title"><b>' + st.name + '</b><small>' + st.year + ' · 서브 ' + (s + 1) + '/' + SUB_COUNT + (isBoss ? ' · 적장전' : '') + '</small></div></div>' +
      '<p class="cs-desc">' + st.desc + '</p>' +
      '<div class="sub-dots">' + dots + '</div>' +
      '<div class="cs-actions">' +
        '<button class="camp-btn primary" data-act="battle">' + battleLabel + '</button>' +
        '<button class="camp-btn" data-act="shop"' + (run.stageShopped ? ' disabled' : '') + '>🏪 저잣거리' + (run.stageShopped ? ' ✓' : '') + '</button>' +
      '</div>';
    document.getElementById('mapTrack').innerHTML = html;
    document.getElementById('mapParty').innerHTML = run.party.map(miniHero).join('');
  }
  document.getElementById('mapTrack').addEventListener('click', function (e) {
    var btn = e.target.closest('.camp-btn');
    if (!btn || btn.disabled) return;
    var act = btn.dataset.act;
    TCG.sfx('tap');
    if (act === 'battle') return startStageCombat();
    if (act === 'shop') { run.stageShopped = true; showShop(); }
  });
  document.getElementById('mapParty').addEventListener('click', onMiniClick);
  document.getElementById('restParty').addEventListener('click', onMiniClick);
  function onMiniClick(e) {
    var m = e.target.closest('.mini-hero'); if (!m) return;
    var h = run.party.find(function (x) { return x.uid === m.dataset.uid; });
    if (h) showHeroModal(h);
  }

  // 서브 스테이지 클리어 → 다음 서브, 마지막(보스)이면 메인 평정 → 다음 메인 해금
  function advanceStage() {
    run.subStage++;
    if (run.subStage >= SUB_COUNT) {
      var cleared = HW_STAGES[run.mainStage];
      run.subStage = 0;
      run.mainStage++;
      run.stageShopped = false;
      if (run.mainStage >= HW_STAGES.length) { victory(); return; }
      run.lordHp = lordMaxHp(); // 전역 평정 시 주공 완전 회복
      TCG.toast('「' + cleared.name + '」 평정! 주공 완전 회복 · 「' + HW_STAGES[run.mainStage].name + '」 해금');
    }
    showMap();
  }

  /* ---------- COMBAT ---------- */
  function genSubEnemies(main, sub) {
    var st = HW_STAGES[main];
    var isBoss = sub === SUB_COUNT - 1;
    var prog = main * SUB_COUNT + sub; // 0..(8*12-1) 전체 진행도
    var hpM = DCFG.eHp * (1 + prog * 0.020);
    var atkM = DCFG.eAtk * (1 + prog * 0.009);
    function inst(d, boss) {
      var hp = Math.round(d.hp * hpM);
      return { def: d, name: d.name, emoji: d.emoji, maxHp: hp, hp: hp,
        atk: Math.max(1, Math.round(d.atk * atkM)), aoe: !!d.aoe, boss: !!boss, block: 0, intent: null };
    }
    var out = [];
    if (isBoss) {
      out.push(inst(TCG.pick(HW_ENEMIES.basic)));
      out.push(inst(TCG.pick(HW_ENEMIES.basic)));
      out.push(inst(HW_COMMANDERS[st.boss], true)); // 적장
    } else {
      var n = 1 + Math.floor(sub / 4); // 1~3
      for (var i = 0; i < n; i++) {
        var useElite = (main >= 3 || sub >= 6) && i === 0; // 후반 서브에 부장(정예) 1명
        out.push(inst(TCG.pick(useElite ? HW_ENEMIES.elite : HW_ENEMIES.basic)));
      }
    }
    return out;
  }

  function startStageCombat() {
    var st = HW_STAGES[run.mainStage], s = run.subStage;
    var isBoss = s === SUB_COUNT - 1;
    var enemies = genSubEnemies(run.mainStage, s);
    var mhp = lordMaxHp(), mmp = lordMaxMp();
    if (typeof run.lordHp !== 'number') run.lordHp = mhp;
    var startHp = Math.max(1, Math.min(run.lordHp, mhp)); // HP는 모험 내내 유지, MP는 매 전투 가득
    run.combat = {
      main: run.mainStage, sub: s, enemies: enemies, round: 0,
      lord: { hp: startHp, maxHp: mhp, mp: mmp, maxMp: mmp, block: relicSum('startBlock') }, // 주공(나)
      atkBuff: relicSum('startAtk'),
      draw: TCG.shuffle(run.party.map(function (h) { return h.uid; })), // 뽑을 카드 풀(왼쪽) = 보유 장수 전체
      center: [], used: [],                                              // 가운데 3장 / 사용한 풀(오른쪽)
      sel: null, targeting: false, pending: null, phase: 'player', log: []
    };
    show('combatScreen');
    if (isBoss) {
      fxBanner('👑 적장 ' + HW_COMMANDERS[st.boss].name, 'boss', 1500); shake('big');
      logMsg(st.name + ' — 적장 ' + HW_COMMANDERS[st.boss].name + ' 토벌전!');
    } else {
      fxBanner('⚔ ' + st.name + ' ' + (s + 1) + '/' + SUB_COUNT, 'round', 1000);
      logMsg(st.name + ' 서브 ' + (s + 1) + ' 개전!');
    }
    beginRound();
  }

  /* ---------- card piles: 뽑을 풀(draw) / 가운데(center,3장) / 사용한 풀(used) ---------- */
  function centerSize() { return 3 + relicSum('energy'); } // 가운데 카드 수 (유물로 증가 가능)
  function heroByUid(uid) { return run.party.find(function (h) { return h.uid === uid; }); }
  function aliveUid(uid) { return !!heroByUid(uid); } // 장수는 전투 중 죽지 않음(주공만 HP)
  function cleanPiles() {
    var c = run.combat;
    c.center = c.center.filter(aliveUid); c.draw = c.draw.filter(aliveUid); c.used = c.used.filter(aliveUid);
  }
  function drawOne() {
    var c = run.combat;
    if (!c.draw.length) {
      if (!c.used.length) return false;
      c.draw = TCG.shuffle(c.used); c.used = [];   // 뽑을 풀이 비면 사용한 풀을 랜덤 섞어 이동
      logMsg('덱을 다시 섞었습니다');
    }
    while (c.draw.length && !aliveUid(c.draw[c.draw.length - 1])) c.draw.pop();
    if (!c.draw.length) return false;
    c.center.push(c.draw.pop());
    return true;
  }
  function refillCenter() {
    var c = run.combat;
    cleanPiles();
    var cap = Math.min(centerSize(), run.party.length);
    var guard = 0;
    while (c.center.length < cap && guard++ < 60) { if (!drawOne()) break; }
  }

  function beginRound() {
    var c = run.combat;
    c.round++;
    if (c.round > 1) c.lord.block = 0; // 라운드 시작 시 주공 블록 초기화(1R은 startBlock 유지)
    refillCenter();
    rollIntents();
    c.sel = null; c.targeting = false; c.pending = null;
    renderCombat();
    if (c.round >= 2) fxBanner('라운드 ' + c.round, 'round', 850);
  }

  function rollIntents() {
    var c = run.combat;
    living(c.enemies).forEach(function (e) {
      if (e.aoe && c.round % 3 === 0) e.intent = { type: 'aoe', dmg: Math.max(1, Math.round(e.atk * 0.8)) };
      else e.intent = { type: 'attack', dmg: e.atk };
    });
  }

  function logMsg(m) {
    var c = run.combat; c.log.push(m); if (c.log.length > 6) c.log.shift();
    var el = document.getElementById('combatLog');
    el.innerHTML = c.log.map(function (x) { return '· ' + x; }).join('<br>');
    el.scrollTop = el.scrollHeight;
  }

  /* ---------- combat FX (rendered into the persistent #fxLayer) ---------- */
  function fxLayerEl() { return document.getElementById('fxLayer'); }
  function rectOf(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    var layer = fxLayerEl();
    if (!layer || typeof layer.getBoundingClientRect !== 'function') return null;
    var r = el.getBoundingClientRect(), lr = layer.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left - lr.left + r.width / 2, y: r.top - lr.top + r.height / 2, w: r.width, h: r.height };
  }
  function spawn(cls, x, y, html, ms) {
    var layer = fxLayerEl();
    if (!layer || typeof layer.appendChild !== 'function' || typeof document.createElement !== 'function') return null;
    var d = document.createElement('div');
    if (!d || !d.style) return null;
    d.className = 'fx ' + cls; d.style.left = x + 'px'; d.style.top = y + 'px';
    if (html) d.innerHTML = html;
    layer.appendChild(d);
    setTimeout(function () { if (d.remove) d.remove(); }, ms || 900);
    return d;
  }
  function fxFloat(x, y, text, color, big) { var d = spawn('fx-float' + (big ? ' big' : ''), x, y, '', 1000); if (d) { d.textContent = text; d.style.color = color || '#fff'; } }
  function fxSlash(x, y) { spawn('fx-slash', x, y, '', 420); }
  function fxBurst(x, y, color) { var d = spawn('fx-burst', x, y, '', 500); if (d) d.style.setProperty('--c', color || '#fff'); }
  function fxRing(x, y, color) { var d = spawn('fx-ring', x, y, '', 500); if (d) d.style.setProperty('--c', color || '#fff'); }
  function fxParticles(x, y, n, color) {
    for (var i = 0; i < (n || 6); i++) {
      var ang = Math.random() * 6.283, dist = 14 + Math.random() * 24;
      var d = spawn('fx-particle', x, y, '', 620);
      if (d) { d.style.setProperty('--c', color || '#ffd0d0'); d.style.setProperty('--dx', (Math.cos(ang) * dist) + 'px'); d.style.setProperty('--dy', (Math.sin(ang) * dist) + 'px'); }
    }
  }
  function fxSparkle(x, y, color, n) {
    for (var i = 0; i < (n || 5); i++) {
      var dx = (Math.random() - 0.5) * 34;
      var d = spawn('fx-sparkle', x + dx, y, '✦', 850);
      if (d) { d.style.color = color || '#8effb0'; d.style.setProperty('--delay', (i * 60) + 'ms'); }
    }
  }
  function fxProj(x1, y1, x2, y2, glyph, color) {
    var d = spawn('fx-proj', x1, y1, glyph || '●', 360);
    if (d) { if (color) d.style.color = color; d.style.setProperty('--dx', (x2 - x1) + 'px'); d.style.setProperty('--dy', (y2 - y1) + 'px'); }
  }
  function fxBanner(text, cls, ms) {
    var layer = fxLayerEl();
    if (!layer || typeof document.createElement !== 'function') return;
    var d = document.createElement('div');
    if (!d) return;
    d.className = 'fx-banner ' + (cls || ''); d.textContent = text;
    layer.appendChild(d);
    setTimeout(function () { if (d.remove) d.remove(); }, ms || 1100);
  }
  function shake(level) {
    var sc = document.getElementById('combatScreen');
    if (!sc || !sc.classList) return;
    var cls = level === 'big' ? 'shake-big' : 'shake-sm';
    sc.classList.add(cls);
    setTimeout(function () { sc.classList.remove(cls); }, level === 'big' ? 420 : 240);
  }
  // impact effect on an enemy at element `el`; physical=slash, else colored burst
  function fxHitEnemy(el, dmg, kind) {
    var p = rectOf(el); if (!p) return;
    if (kind === 'aoe') { fxBurst(p.x, p.y, '#ff8a4c'); fxParticles(p.x, p.y, 8, '#ffcaa0'); }
    else { fxSlash(p.x, p.y); fxBurst(p.x, p.y, '#ffffff'); fxParticles(p.x, p.y, 7, '#ffc6c6'); }
    fxFloat(p.x, p.y, '-' + dmg, '#ff9a9a', kind !== 'aoe');
  }
  function fxHitHero(el, dmg, blocked) {
    var p = rectOf(el); if (!p) return;
    if (blocked) fxFloat(p.x, p.y - 14, '🛡' + blocked, '#9fd2ff');
    if (dmg > 0) { fxSlash(p.x, p.y); fxBurst(p.x, p.y, '#ff6b6b'); fxParticles(p.x, p.y, 6, '#ffb0b0'); fxFloat(p.x, p.y, '-' + dmg, '#ff9a9a', true); }
  }
  function fxSupport(el, text, color, type) {
    var p = rectOf(el); if (!p) return;
    if (type === 'shield') fxRing(p.x, p.y, color);
    fxSparkle(p.x, p.y, color, 5);
    fxFloat(p.x, p.y, text, color);
  }
  function fxDeathAt(el, emoji) { var p = rectOf(el); if (!p) return; spawn('fx-death', p.x, p.y, emoji || '💥', 700); }

  function renderCombat() {
    var c = run.combat;
    // 안내: 가운데 카드를 쓰면 공격, 턴 종료 시 남은 카드는 방어
    document.getElementById('energyBox').innerHTML =
      '🎴 가운데 카드: 사용하면 <b>공격</b> · 턴 종료 시 남기면 <b>방어</b>';

    // enemies (적장은 주공을 공격)
    document.getElementById('enemyRow').innerHTML = c.enemies.map(function (e, idx) {
      var dead = e.hp <= 0;
      var tgt = c.targeting && c.pending && c.pending.side === 'enemy' && !dead;
      var intentTxt = e.intent ? (e.intent.type === 'aoe' ? '💥' + e.intent.dmg : '⚔️' + e.intent.dmg) : '';
      return '<div class="unit enemy' + (dead ? ' dead' : '') + (tgt ? ' targetable' : '') + '" data-side="enemy" data-idx="' + idx + '">' +
        (dead ? '' : '<div class="u-intent">' + intentTxt + '</div>') +
        (e.block > 0 ? '<div class="u-block">🛡' + e.block + '</div>' : '') +
        (e.poison > 0 ? '<div class="u-poison">☠' + e.poison + '</div>' : '') +
        TCG.portrait(e.emoji, e.name) +
        '<div class="u-name">' + e.name + '</div>' +
        '<div class="u-hp-text">❤ ' + Math.max(0, e.hp) + '/' + e.maxHp + '</div>' +
        hpBar({ hp: Math.max(0, e.hp), maxHp: e.maxHp }, true) + '</div>';
    }).join('');

    // 주공(나) 상태 바 — 적의 공격 대상
    var L = c.lord;
    var hpPct = Math.max(0, Math.round(L.hp / L.maxHp * 100));
    var mpPct = Math.max(0, Math.round(L.mp / Math.max(1, L.maxMp) * 100));
    document.getElementById('lordBar').innerHTML =
      '<div class="lord">' +
        TCG.portrait('👑', 'lord', 'lord-art') +
        '<div class="lord-info">' +
          '<div class="lord-name">주공 (나)' + (L.block > 0 ? ' <span class="lord-block">🛡' + L.block + '</span>' : '') + '</div>' +
          '<div class="lbar hp"><i style="width:' + hpPct + '%"></i><span>❤ ' + Math.max(0, L.hp) + ' / ' + L.maxHp + '</span></div>' +
          '<div class="lbar mp"><i style="width:' + mpPct + '%"></i><span>💧 MP ' + Math.max(0, L.mp) + ' / ' + L.maxMp + '</span></div>' +
        '</div></div>';

    renderPiles();
    renderActionBar();
    document.getElementById('endTurnBtn').disabled = (c.phase === 'enemy');
    var hint = document.getElementById('combatHint');
    if (c.phase === 'enemy') hint.textContent = '적이 행동 중…';
    else if (c.targeting) hint.textContent = '대상을 선택하세요';
    else if (c.sel) hint.textContent = '공격 행동을 선택하세요';
    else hint.textContent = '가운데 카드로 공격하거나, 턴 종료 시 남은 카드로 방어합니다';
  }

  function defenseOf(h) { return 3 + Math.floor(effAtk(h) / 3); }

  function renderPiles() {
    var c = run.combat;
    // 왼쪽: 뽑을 카드 풀 (겹친 더미)
    var drawStack = '';
    for (var i = 0; i < Math.min(c.draw.length, 5); i++) drawStack += '<div class="pile-card" style="--i:' + i + '"></div>';
    document.getElementById('drawPile').innerHTML =
      drawStack + '<div class="pile-label">뽑을 카드 <b>' + c.draw.length + '</b></div>';

    // 가운데: 공격/방어 덱 (3장)
    var canAct = c.phase !== 'enemy' && !c.targeting;
    document.getElementById('centerCards').innerHTML = c.center.map(function (uid) {
      var h = heroByUid(uid); if (!h) return '';
      var sk = h.def.skill;
      var sel = c.sel && c.sel.uid === uid && !c.targeting;
      var cls = 'combat-card' + (sel ? ' selected' : '') + (canAct ? '' : ' unplayable');
      var w = wpn(h);
      return '<div class="' + cls + '" data-uid="' + uid + '">' +
        TCG.portrait(h.def.emoji, h.def.id, 'cc-art') +
        '<div class="cc-name">' + h.def.name + '</div>' +
        '<div class="cc-atk">⚔' + effAtk(h) + '</div>' +
        '<div class="cc-def">🛡' + defenseOf(h) + '</div>' +
        (w ? '<div class="cc-wpn" title="' + w.name + '">' + w.emoji + '</div>' : '') +
        '<div class="cc-skill">' + sk.name + '</div></div>';
    }).join('') || '<div class="center-empty">카드 없음</div>';

    // 오른쪽: 사용한 카드 풀 (겹친 더미, 시작 시 빈 영역)
    var usedStack = '';
    for (var j = 0; j < Math.min(c.used.length, 5); j++) usedStack += '<div class="pile-card used" style="--i:' + j + '"></div>';
    document.getElementById('usedPile').innerHTML =
      usedStack + '<div class="pile-label">사용한 카드 <b>' + c.used.length + '</b></div>';
  }

  function renderActionBar() {
    var c = run.combat;
    var bar = document.getElementById('actionBar');
    if (!c.sel || c.targeting) { bar.hidden = true; return; }
    var h = heroByUid(c.sel.uid);
    if (!h) { bar.hidden = true; return; }
    var sk = h.def.skill;
    var mp = skillMp(sk);
    var canSkill = c.lord.mp >= mp;
    bar.hidden = false;
    bar.innerHTML =
      '<button class="act-btn" data-act="attack">기본 공격<small>피해 ' + effAtk(h) + (wpnVal(h, 'doubleStrike') ? ' ×2' : '') + (wpnVal(h, 'poison') ? ' ☠' + wpnVal(h, 'poison') : '') + '</small></button>' +
      '<button class="act-btn skill" data-act="skill"' + (canSkill ? '' : ' disabled') + '>' + sk.name + '<small>💧' + mp + ' · ' + sk.desc + '</small></button>' +
      '<button class="act-btn cancel" data-act="cancel">취소</button>';
  }

  // input — 적장만 대상 선택(아군 스킬은 주공에게 자동 적용)
  document.getElementById('enemyRow').addEventListener('click', function (e) { onUnitClick(e); });
  function onUnitClick(e) {
    var c = run.combat; if (!c || c.phase === 'enemy' || !c.targeting) return;
    var u = e.target.closest('.unit'); if (!u) return;
    if (c.pending.side === 'enemy' && u.dataset.side === 'enemy' && u.classList.contains('targetable')) {
      executeOn('enemy', parseInt(u.dataset.idx, 10));
    }
  }
  document.getElementById('centerCards').addEventListener('click', function (e) {
    var c = run.combat; if (!c || c.phase === 'enemy' || c.targeting) return;
    var card = e.target.closest('.combat-card'); if (!card) return;
    var uid = card.dataset.uid;
    c.sel = (c.sel && c.sel.uid === uid) ? null : { uid: uid };
    renderCombat();
  });
  document.getElementById('actionBar').addEventListener('click', function (e) {
    var b = e.target.closest('.act-btn'); if (!b || b.disabled) return;
    var c = run.combat; if (!c.sel) return;
    var act = b.dataset.act;
    if (act === 'cancel') { c.sel = null; c.targeting = false; c.pending = null; renderCombat(); return; }
    var h = heroByUid(c.sel.uid); if (!h) return;
    if (act === 'attack') { beginTarget('enemy', 'attack'); return; }
    // skill (MP 소모)
    var sk = h.def.skill;
    if (c.lord.mp < skillMp(sk)) { TCG.toast('MP가 부족합니다'); return; }
    if (sk.type === 'strike') beginTarget('enemy', 'skill'); // 단일 적 대상
    else doSkill(h, null); // aoe(전체)·multi(무작위)·heal/shield/buff(주공) 자동 처리
  });
  function beginTarget(side, kind) {
    var c = run.combat;
    c.targeting = true; c.pending = { side: side, kind: kind };
    renderCombat();
  }
  function executeOn(side, idx) {
    var c = run.combat;
    var h = heroByUid(c.sel.uid); if (!h) return;
    if (c.pending.kind === 'attack') { doAttack(h, c.enemies[idx]); }
    else if (c.pending.kind === 'skill') {
      var target = side === 'enemy' ? c.enemies[idx] : run.party[idx];
      doSkill(h, target);
    }
  }

  function dmgEnemy(e, dmg, el, kind) {
    var wasAlive = e.hp > 0;
    var d = dmg;
    if (e.block > 0) { var ab = Math.min(e.block, d); e.block -= ab; d -= ab; }
    e.hp -= d;
    fxHitEnemy(el, dmg, kind);
    if (e.hp <= 0 && wasAlive) fxDeathAt(el, e.emoji);
  }
  // 적의 공격은 주공(나)을 노린다 — 블록으로 먼저 흡수 후 HP 감소
  function dmgLord(dmg) {
    var c = run.combat, L = c.lord;
    var d = dmg, blocked = 0;
    if (L.block > 0) { var ab = Math.min(L.block, d); L.block -= ab; d -= ab; blocked = ab; }
    L.hp = Math.max(0, L.hp - d);
    fxHitHero(lordEl(), d, blocked);
  }
  function enemyEl(idx) { return document.querySelector('#enemyRow .unit[data-idx="' + idx + '"]'); }
  function lordEl() { return document.querySelector('#lordBar .lord-art'); }

  function doAttack(h, enemy) {
    var c = run.combat;
    var dmg = effAtk(h);
    var hits = wpnVal(h, 'doubleStrike') ? 2 : 1;
    TCG.sfx('attack');
    for (var k = 0; k < hits; k++) {
      if (enemy.hp <= 0) break;
      dmgEnemy(enemy, dmg, enemyEl(c.enemies.indexOf(enemy)));
    }
    var pv = wpnVal(h, 'poison');
    if (pv && enemy.hp > 0) { enemy.poison = (enemy.poison || 0) + pv; logMsg(enemy.name + '에 독 +' + pv); }
    shake('sm');
    var ls = relicSum('lifesteal');
    if (ls) { c.lord.hp = Math.min(c.lord.maxHp, c.lord.hp + ls); fxSupport(lordEl(), '+' + ls, '#7ef0b5'); }
    logMsg(h.def.name + ' → ' + enemy.name + ' ' + (dmg * hits) + ' 피해');
    finishPlay();
  }
  function doSkill(h, target) {
    var c = run.combat; var sk = h.def.skill;
    c.lord.mp = Math.max(0, c.lord.mp - skillMp(sk));
    TCG.sfx(sk.type === 'heal' ? 'heal' : 'skill');
    var pw = effAtk(h);
    if (sk.type === 'strike') {
      dmgEnemy(target, pw + sk.val, enemyEl(c.enemies.indexOf(target))); shake('big');
      logMsg(h.def.name + ' 「' + sk.name + '」 ' + (pw + sk.val) + ' 피해');
    } else if (sk.type === 'aoe') {
      living(c.enemies).forEach(function (e) { dmgEnemy(e, sk.val, enemyEl(c.enemies.indexOf(e)), 'aoe'); }); shake('big');
      logMsg(h.def.name + ' 「' + sk.name + '」 전체 ' + sk.val + ' 피해');
    } else if (sk.type === 'multi') {
      for (var i = 0; i < sk.val; i++) {
        var alive = living(c.enemies); if (!alive.length) break;
        var e2 = TCG.pick(alive);
        dmgEnemy(e2, pw, enemyEl(c.enemies.indexOf(e2)));
      }
      shake('sm'); logMsg(h.def.name + ' 「' + sk.name + '」 ' + sk.val + '회 공격');
    } else if (sk.type === 'heal') {
      c.lord.hp = Math.min(c.lord.maxHp, c.lord.hp + sk.val);
      if (h.def.id === 'oracle') c.lord.block += 5;
      fxSupport(lordEl(), '+' + sk.val, '#7ef0b5');
      logMsg(h.def.name + ' 「' + sk.name + '」 주공 ' + sk.val + ' 회복');
    } else if (sk.type === 'shield') {
      c.lord.block += sk.val;
      fxSupport(lordEl(), '🛡+' + sk.val, '#9fd2ff', 'shield');
      logMsg(h.def.name + ' 「' + sk.name + '」 주공 방어막 +' + sk.val);
    } else if (sk.type === 'buff') {
      c.atkBuff = (c.atkBuff || 0) + sk.val;
      fxSupport(lordEl(), '⚔+' + sk.val, '#ffd86b');
      logMsg(h.def.name + ' 「' + sk.name + '」 전군 공격력 +' + sk.val);
    }
    finishPlay();
  }

  function finishPlay() {
    var c = run.combat;
    if (c.sel) {
      var i = c.center.indexOf(c.sel.uid);
      if (i !== -1) { c.center.splice(i, 1); c.used.push(c.sel.uid); } // 가운데 → 사용한 풀
    }
    c.sel = null; c.targeting = false; c.pending = null;
    renderCombat();
    if (living(c.enemies).length === 0) { setTimeout(winCombat, 550); }
  }

  // 턴 종료: 가운데 남은 카드는 방어(주공 블록)로 전환되고 사용한 풀로 이동 → 적의 턴
  document.getElementById('endTurnBtn').addEventListener('click', function () {
    var c = run.combat; if (!c || c.phase === 'enemy' || c.targeting) return;
    var defended = 0, total = 0;
    c.center.slice().forEach(function (uid) {
      var h = heroByUid(uid);
      if (h) { total += defenseOf(h); defended++; }
      c.used.push(uid);
    });
    c.center = [];
    c.sel = null;
    if (total) {
      c.lord.block += total;
      fxSupport(lordEl(), '🛡+' + total, '#9fd2ff', 'shield');
      TCG.sfx('skill');
      logMsg(defended + '명이 방어해 주공 블록 +' + total);
    }
    enemyPhase();
  });

  function enemyPhase() {
    var c = run.combat;
    c.phase = 'enemy'; c.sel = null; c.targeting = false; c.pending = null;
    // 적에게 걸린 독이 턴마다 피해를 준다
    living(c.enemies).forEach(function (e) {
      if (e.poison > 0) {
        e.hp = Math.max(0, e.hp - e.poison);
        var el = enemyEl(c.enemies.indexOf(e));
        fxHitEnemy(el, e.poison, 'aoe');
        if (e.hp <= 0) fxDeathAt(el, e.emoji);
        logMsg(e.name + ' 독 피해 ' + e.poison);
      }
    });
    renderCombat();
    if (living(c.enemies).length === 0) { setTimeout(winCombat, 550); return; }
    fxBanner('적의 턴', 'foe-turn', 850);
    var foes = living(c.enemies);
    var step = 0;
    function next() {
      if (step >= foes.length) {
        if (c.lord.hp <= 0) { gameOver(); return; }
        c.phase = 'player';
        beginRound();
        return;
      }
      var e = foes[step++];
      if (e.hp <= 0) { next(); return; }
      var intent = e.intent;
      TCG.sfx('hit');
      shake(intent.type === 'aoe' ? 'big' : 'sm');
      dmgLord(intent.dmg);
      logMsg(e.name + ' → 주공 ' + intent.dmg + ' 피해');
      renderCombat();
      if (c.lord.hp <= 0) { setTimeout(gameOver, 400); return; }
      setTimeout(next, 480);
    }
    next();
  }

  function winCombat() {
    var c = run.combat;
    TCG.sfx('win');
    // 주공 HP는 모험 내내 유지 — 승리 시 일부만 회복(로그라이크 소모전)
    var heal = Math.round(c.lord.maxHp * 0.06) + relicSum('winHeal');
    run.lordHp = Math.min(c.lord.maxHp, c.lord.hp + heal);
    // gold + reward cadence
    var isBoss = c.sub === SUB_COUNT - 1;
    var prog = c.main * SUB_COUNT + c.sub;
    var gold = Math.round((6 + prog * 1.5) * DCFG.gold);
    run.gold += gold;
    run.sorties = (run.sorties || 0) + 1; // 누적 출진 횟수
    updateTop();
    run.pendingGold = gold; run.pendingBoss = isBoss;
    // 출진 5회·10회 뒤 보물상자(무기) 개봉
    if (run.sorties === 5 || run.sorties === 10) { showReward('weapon', gold); return; }
    if (isBoss && c.main === HW_STAGES.length - 1) { victory(); return; } // 최종 적장 격파
    if (isBoss) { showReward('relic', gold); return; }      // 메인 적장 처치 → 유물
    if ((c.sub + 1) % 4 === 0) { showReward('hero', gold); return; } // 4서브마다 장수 영입
    advanceStage();                                         // 일반 서브 → 바로 다음
  }

  /* ---------- REWARD ---------- */
  function showReward(mode, gold) {
    run.rewardMode = mode; run.pendingRecruit = null;
    document.getElementById('rewardTitle').textContent = (mode === 'weapon' ? '💎 보물상자! +💰' : '🎉 승리! +💰') + gold;
    var box = document.getElementById('rewardCards');
    if (mode === 'hero') {
      document.getElementById('rewardSub').textContent = '영입할 영웅 카드를 선택하세요';
      var pool = TCG.shuffle(HW_HEROES).slice(0, 3);
      box.innerHTML = pool.map(function (d) { return heroRewardCard(d); }).join('');
    } else if (mode === 'weapon') {
      document.getElementById('rewardSub').textContent = '획득할 보물(무기/보패)을 선택하세요 — 장수 상세에서 장착할 수 있습니다';
      var wpool = TCG.shuffle(HW_WEAPONS).slice(0, 3);
      box.innerHTML = wpool.map(function (w) {
        return '<div class="reward-card" data-weapon="' + w.id + '">' +
          '<div class="rc-emoji">' + w.emoji + '</div>' +
          '<div class="rc-name">' + w.name + '</div>' +
          '<div class="rc-skill">' + w.desc + '</div></div>';
      }).join('');
    } else {
      document.getElementById('rewardSub').textContent = '획득할 유물을 선택하세요';
      var owned = run.relics.map(function (r) { return r.id; });
      var avail = HW_RELICS.filter(function (r) { return owned.indexOf(r.id) === -1; });
      avail = TCG.shuffle(avail).slice(0, 3);
      if (!avail.length) { afterReward(); return; }
      box.innerHTML = avail.map(function (r) {
        return '<div class="reward-card" data-relic="' + r.id + '">' +
          '<div class="rc-emoji">' + r.emoji + '</div>' +
          '<div class="rc-name">' + r.name + '</div>' +
          '<div class="rc-skill">' + r.desc + '</div></div>';
      }).join('');
    }
    show('rewardScreen');
  }
  function heroRewardCard(d) {
    return '<div class="reward-card" data-hero="' + d.id + '">' +
      TCG.portrait(d.emoji, d.id, 'rc-portrait') +
      '<div class="rc-name">' + d.name + '</div>' +
      '<div class="rc-rarity rar-' + d.rarity + '">' + d.rarity + ' · ' + d.cls + '</div>' +
      '<div class="rc-stats">❤' + d.hp + ' ⚔' + d.atk + '</div>' +
      '<div class="rc-skill">「' + d.skill.name + '」 ' + d.skill.desc + '</div></div>';
  }
  document.getElementById('rewardCards').addEventListener('click', function (e) {
    var card = e.target.closest('.reward-card'); if (!card) return;
    TCG.sfx('reward');
    if (run.rewardMode === 'relic') {
      var r = HW_RELICS.find(function (x) { return x.id === card.dataset.relic; });
      run.relics.push(r); TCG.toast('유물 획득: ' + r.name); afterReward(); return;
    }
    if (run.rewardMode === 'weapon') {
      var w = HW_WEAPON_BY_ID[card.dataset.weapon];
      run.weapons.push(w.id); TCG.toast('보물 획득: ' + w.name); afterReward(); return;
    }
    var id = card.dataset.hero;
    if (run.party.length < MAX_PARTY) { run.party.push(mkHero(id)); TCG.toast('영입: ' + HW_BY_ID[id].name); afterReward(); }
    else {
      run.pendingRecruit = id;
      document.getElementById('rewardSub').textContent = '파티가 가득 찼습니다 — 교체할 영웅을 아래에서 선택하세요';
      showReplaceBar();
    }
  });
  function showReplaceBar() {
    var box = document.getElementById('rewardCards');
    box.innerHTML = '<div class="party-bar">' + run.party.map(miniHero).join('') + '</div>' +
      '<p class="screen-sub" style="width:100%">교체할 영웅을 탭하면 ' + HW_BY_ID[run.pendingRecruit].name + ' 와(과) 교체됩니다</p>';
    box.querySelectorAll('.mini-hero').forEach(function (m) {
      m.addEventListener('click', function () {
        var i = run.party.findIndex(function (x) { return x.uid === m.dataset.uid; });
        if (i >= 0) { run.party[i] = mkHero(run.pendingRecruit); TCG.toast('교체 완료'); afterReward(); }
      });
    });
  }
  document.getElementById('rewardSkip').addEventListener('click', function () {
    if (run.pendingRecruit) { run.pendingRecruit = null; }
    afterReward();
  });
  function afterReward() { advanceStage(); }

  /* ---------- REST ---------- */
  function showRest() {
    document.getElementById('restHeal').disabled = false;
    document.getElementById('restTrain').disabled = false;
    document.getElementById('restParty').innerHTML = run.party.map(miniHero).join('');
    run.restMode = null;
    show('restScreen');
  }
  document.getElementById('restHeal').addEventListener('click', function () {
    run.party.forEach(function (h) { h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * 0.4)); });
    TCG.toast('파티가 휴식했습니다'); advanceStage();
  });
  document.getElementById('restTrain').addEventListener('click', function () {
    run.restMode = 'train';
    document.getElementById('restHeal').disabled = true;
    TCG.toast('단련할 영웅을 선택하세요');
    document.getElementById('restParty').innerHTML = run.party.map(miniHero).join('');
  });
  document.getElementById('restParty').addEventListener('click', function (e) {
    if (run.restMode !== 'train') return;
    var m = e.target.closest('.mini-hero'); if (!m) return;
    var h = run.party.find(function (x) { return x.uid === m.dataset.uid; });
    if (!h) return;
    h.maxHp += 6; h.hp += 6; h.atk += 2;
    TCG.toast(h.def.name + ' 단련 완료! (+6 HP, +2 공격)');
    advanceStage();
  });

  /* ---------- SHOP ---------- */
  function showShop() {
    var heroPool = TCG.shuffle(HW_HEROES).slice(0, 2);
    var wpnPick = TCG.pick(HW_WEAPONS);
    run.shop = [
      { kind: 'hero', def: heroPool[0], cost: 35, sold: false },
      { kind: 'hero', def: heroPool[1], cost: 45, sold: false },
      { kind: 'weapon', wid: wpnPick.id, cost: 40, sold: false },
      { kind: 'upgrade', cost: 28, sold: false }
    ];
    renderShop();
    show('shopScreen');
  }
  function renderShop() {
    document.getElementById('shopItems').innerHTML = run.shop.map(function (it, i) {
      var emoji, name, desc;
      if (it.kind === 'hero') { emoji = it.def.emoji; name = it.def.name; desc = it.def.cls + ' · ⚔' + it.def.atk + ' · 「' + it.def.skill.name + '」'; }
      else if (it.kind === 'weapon') { var w = HW_WEAPON_BY_ID[it.wid]; emoji = w.emoji; name = w.name; desc = w.desc; }
      else { emoji = '⚒️'; name = '무기 강화'; desc = '무작위 영웅 공격력 +3'; }
      var afford = run.gold >= it.cost && !it.sold;
      return '<div class="shop-item' + (it.sold ? ' sold' : '') + '">' +
        '<div class="si-emoji">' + emoji + '</div>' +
        '<div class="si-name">' + name + '</div>' +
        '<div class="si-desc">' + desc + '</div>' +
        '<button class="btn primary si-buy" data-i="' + i + '"' + (afford ? '' : ' disabled') + '>' +
        (it.sold ? '구매완료' : '💰 ' + it.cost) + '</button></div>';
    }).join('');
  }
  document.getElementById('shopItems').addEventListener('click', function (e) {
    var b = e.target.closest('.si-buy'); if (!b || b.disabled) return;
    var it = run.shop[parseInt(b.dataset.i, 10)];
    if (it.sold || run.gold < it.cost) return;
    if (it.kind === 'hero') {
      if (run.party.length >= MAX_PARTY) { TCG.toast('파티가 가득 찼습니다 (최대 ' + MAX_PARTY + '명)'); return; }
      run.party.push(mkHero(it.def.id));
    } else if (it.kind === 'weapon') {
      run.weapons.push(it.wid); TCG.toast('보물 구입: ' + HW_WEAPON_BY_ID[it.wid].name);
    } else {
      var h = TCG.pick(run.party); h.atk += 3; TCG.toast(h.def.name + ' 공격력 +3');
    }
    run.gold -= it.cost; it.sold = true; updateTop(); saveRun(); renderShop();
  });
  document.getElementById('shopLeave').addEventListener('click', function () { showMap(); });

  /* ---------- TREASURE ---------- */
  function showTreasure() {
    var gold = Math.round((20 + run.stage * 4) * DCFG.gold);
    run.gold += gold; updateTop();
    document.getElementById('eventTitle').textContent = '💎 보물 발견! +💰' + gold;
    var owned = run.relics.map(function (r) { return r.id; });
    var avail = TCG.shuffle(HW_RELICS.filter(function (r) { return owned.indexOf(r.id) === -1; })).slice(0, 2);
    if (!avail.length) { document.getElementById('eventSub').textContent = '추가 골드를 얻었습니다.'; document.getElementById('eventChoices').innerHTML = '<button class="btn primary" id="evGo">계속</button>'; }
    else {
      document.getElementById('eventSub').textContent = '유물 하나를 가져갈 수 있습니다';
      document.getElementById('eventChoices').innerHTML = avail.map(function (r) {
        return '<div class="reward-card" data-relic="' + r.id + '"><div class="rc-emoji">' + r.emoji + '</div><div class="rc-name">' + r.name + '</div><div class="rc-skill">' + r.desc + '</div></div>';
      }).join('') + '<div style="width:100%"><button class="btn ghost" id="evSkip">그냥 떠나기</button></div>';
    }
    show('eventScreen');
  }
  document.getElementById('eventChoices').addEventListener('click', function (e) {
    var card = e.target.closest('.reward-card');
    if (card) { var r = HW_RELICS.find(function (x) { return x.id === card.dataset.relic; }); run.relics.push(r); TCG.toast('유물 획득: ' + r.name); advanceStage(); return; }
    if (e.target.id === 'evSkip' || e.target.id === 'evGo') advanceStage();
  });

  /* ---------- end states ---------- */
  function gameOver() {
    clearSave();
    TCG.sfx('lose');
    var fst = HW_STAGES[Math.min(run.mainStage, HW_STAGES.length - 1)];
    document.getElementById('overTitle').textContent = '💀 주공 전사';
    document.getElementById('overText').textContent = '「' + (fst ? fst.name : '') + '」 서브 ' + (run.subStage + 1) + '/' + SUB_COUNT + ' 에서 주공이 쓰러졌습니다. 다시 도전하세요!';
    document.getElementById('overModal').hidden = false;
  }
  function victory() {
    clearSave();
    TCG.sfx('win');
    document.getElementById('overTitle').textContent = '👑 천하통일!';
    document.getElementById('overText').textContent = '8개 전역을 모두 평정하고 천하를 통일했습니다! 위·촉·오를 아우른 영웅들이 환호합니다.';
    document.getElementById('overModal').hidden = false;
  }
  document.getElementById('overAgain').addEventListener('click', function () {
    document.getElementById('overModal').hidden = true; newRun();
  });

  /* ---------- hero detail ---------- */
  function showHeroModal(h) {
    var d = h.def;
    var cur = wpn(h);
    var free = freeWeaponIds();
    // 무기 장착 영역
    var wpnHtml = '<div class="wpn-box"><div class="wpn-title">🗡️ 무기 (장수당 1개)</div>';
    if (cur) {
      wpnHtml += '<div class="wpn-cur"><span>' + cur.emoji + ' <b>' + cur.name + '</b> — ' + cur.desc + '</span>' +
        '<button class="btn ghost wpn-act" data-wact="unequip">해제</button></div>';
    } else {
      wpnHtml += '<div class="wpn-cur none">장착된 무기 없음</div>';
    }
    if (free.length) {
      wpnHtml += '<div class="wpn-list">' + free.map(function (id) {
        var w = HW_WEAPON_BY_ID[id];
        return '<button class="wpn-opt" data-wact="equip" data-wid="' + id + '">' + w.emoji + ' ' + w.name +
          '<small>' + w.desc + '</small></button>';
      }).join('') + '</div>';
    } else if (!cur) {
      wpnHtml += '<div class="wpn-empty">보유한 무기가 없습니다 (보물상자에서 획득)</div>';
    }
    wpnHtml += '</div>';
    document.getElementById('heroModalBody').innerHTML =
      TCG.portrait(d.emoji, d.id, 'modal-portrait') +
      '<h2>' + d.name + ' <span class="rar-' + d.rarity + '" style="font-size:14px">' + d.rarity + '</span></h2>' +
      '<p>' + d.cls + ' · ⚔ ' + effAtk(h) + (cur && cur.effect.atk ? ' (무기 +' + cur.effect.atk + ')' : '') + '</p>' +
      '<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px;text-align:left;font-size:13px">' +
      '<b style="color:var(--gold)">「' + d.skill.name + '」</b> 💧' + skillMp(d.skill) + '<br>' +
      '<span style="color:var(--ink-dim)">' + d.skill.desc + '</span></div>' +
      wpnHtml +
      '<button class="btn primary" id="heroModalClose" style="margin-top:14px">닫기</button>';
    var modal = document.getElementById('heroModal');
    modal.hidden = false;
    document.getElementById('heroModalClose').addEventListener('click', function () { modal.hidden = true; });
    document.getElementById('heroModalBody').querySelectorAll('[data-wact]').forEach(function (b) {
      b.addEventListener('click', function () {
        TCG.sfx('tap');
        if (b.dataset.wact === 'unequip') h.weapon = null;
        else h.weapon = b.dataset.wid;
        saveRun();
        showHeroModal(h); // 다시 렌더
      });
    });
  }
  document.getElementById('heroModal').addEventListener('click', function (e) {
    if (e.target.id === 'heroModal') e.currentTarget.hidden = true;
  });

  /* ---------- boot ---------- */
  var muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.textContent = TCG.isMuted() ? '🔇' : '🔊';
    muteBtn.addEventListener('click', function () {
      var m = TCG.toggleMute(); muteBtn.textContent = m ? '🔇' : '🔊';
      TCG.audioResume(); if (!m) TCG.sfx('tap');
    });
  }
  var saved = loadSave();
  var continued = false;
  document.getElementById('continueBtn').addEventListener('click', function () {
    document.getElementById('startModal').hidden = true;
    TCG.audioResume();
    if (saved) resumeRun(saved); else newRun();
  });
  document.getElementById('newRunBtn').addEventListener('click', function () {
    document.getElementById('startModal').hidden = true;
    TCG.audioResume();
    newRun();
  });
  if (saved) {
    var sst = HW_STAGES[Math.min(saved.mainStage || 0, HW_STAGES.length - 1)];
    document.getElementById('startText').textContent =
      '진행 중인 전역이 있습니다 (' + ((saved.mainStage || 0) + 1) + '. ' + (sst ? sst.name : '') + ' 서브 ' + ((saved.subStage || 0) + 1) + '/' + SUB_COUNT + ' · 장수 ' + saved.party.length + '명). 이어서 하시겠어요?';
    document.getElementById('startModal').hidden = false;
  } else {
    newRun();
  }
})();
