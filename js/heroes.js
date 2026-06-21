/* ===== Heroes Wanted — roguelike engine & UI ===== */
(function () {
  var diff = TCG.getDifficulty();
  var DCFG = HW_DIFF[diff];
  var MAX_PARTY = HW_HEROES.length; // 수집은 장수 수만큼 가능(전 장수 수집 가능)
  var MIN_DECK = 10, MAX_DECK = 30; // 출진 덱: 최소 10장 · 최대 30장
  var SUB_COUNT = 11; // 메인 스테이지 1개당 출전 수 (11번째=적장 보스, 5·10번째=중간보스)
  var run = null;

  /* ---------- helpers ---------- */
  function mkHero(id) {
    var d = HW_BY_ID[id];
    return { uid: id + '_' + Math.random().toString(36).slice(2, 7), def: d, atk: d.atk, weapons: [] };
  }
  function relicSum(key) {
    return run.relics.reduce(function (s, r) { return s + (r.effect[key] || 0); }, 0);
  }
  // 무기 효과 헬퍼 (장착 수: C=0 · R=1 · SR=2 · SSR=3)
  function slotsForRarity(r) { return r === 'SSR' ? 3 : r === 'SR' ? 2 : r === 'R' ? 1 : 0; }
  var RAR_BG = { C: '#9aa0a6', R: '#5aa6ff', SR: '#c77bff', SSR: '#f0c33c' };
  function rarBg(r) { return RAR_BG[r] || '#9aa0a6'; }
  function weaponSlots(h) { return h && h.def ? slotsForRarity(h.def.rarity) : 0; }
  /* ---------- 출진 덱(run.deck = uid 목록) ---------- */
  function deckMin() { return Math.min(MIN_DECK, run.party.length); } // 보유<10이면 보유 전부가 최소
  function activeDeckUids() { // 선택 덱을 정규화: 유효 uid만 · 최대 30 · 부족하면 보유 순서로 자동 채움(최소치까지)
    var order = run.party.map(function (h) { return h.uid; });
    var own = {}; order.forEach(function (u) { own[u] = true; });
    var seen = {}, deck = [];
    (run.deck || []).forEach(function (u) { if (own[u] && !seen[u]) { seen[u] = true; deck.push(u); } });
    if (deck.length > MAX_DECK) deck = deck.slice(0, MAX_DECK);
    var need = deckMin();
    for (var i = 0; i < order.length && deck.length < need; i++) if (!seen[order[i]]) { seen[order[i]] = true; deck.push(order[i]); }
    return deck;
  }
  function syncDeck() { run.deck = activeDeckUids(); } // 정규화 결과를 run.deck에 반영(자동 채움 포함)
  var BASE_CRIT = 0.01; // 기본 치명타 확률 1%
  function critChance(h) { return Math.min(0.5, BASE_CRIT + (h ? wpnVal(h, 'crit') : 0) + relicSum('crit')); } // 치명타 확률 최대 50%(유물 합산)
  function rollCrit(chance) { return Math.random() < chance; }
  function heroWpnIds(h) { return (h && h.weapons) ? h.weapons : []; }
  function heroWpns(h) { return heroWpnIds(h).map(function (id) { return HW_WEAPON_BY_ID[id]; }).filter(Boolean); }
  function wpnVal(h, key) { return heroWpns(h).reduce(function (s, w) { return s + (w.effect[key] || 0); }, 0); }
  function hasWpnFlag(h, key) { return heroWpns(h).some(function (w) { return !!w.effect[key]; }); }
  function effAtk(h) { var c = run.combat; return h.atk + wpnVal(h, 'atk') + (c ? (c.atkBuff || 0) + ((c.tempAtk && c.tempAtk.turns > 0) ? c.tempAtk.val : 0) + ((c.cardBuff && h.uid && c.cardBuff[h.uid]) ? c.cardBuff[h.uid] : 0) : 0); }
  function lordMaxHp() { return HW_LORD.hp + run.party.reduce(function (s, h) { return s + wpnVal(h, 'lordHp'); }, 0) + relicSum('maxHp'); }
  function lordMaxMp() { return HW_LORD.mp + run.party.reduce(function (s, h) { return s + wpnVal(h, 'lordMp'); }, 0) + relicSum('maxMp'); }
  function lordEvade() { return Math.min(0.2, run.party.reduce(function (s, h) { return s + wpnVal(h, 'evade'); }, 0)); } // 회피(무기 합산, 최대 20%)
  function skillMp(sk) { var m = 2 + (sk.cost || 1); var base = (sk.type === 'buff' && sk.scope === 'army') ? m * 5 : m + 3; return Math.max(1, base - 1); } // 전반 -1(전군 버프 포함)
  function ownedHeroIds() { return run.party.map(function (h) { return h.def.id; }); } // 중복 수집 방지
  // 보유 무기 중 아직 장착되지 않은 복사본들(중복 보유 허용 — 장수마다 1개씩 나눠 장착 가능)
  function freeWeaponIds() {
    var owned = (run.weapons || []).slice();
    run.party.forEach(function (h) {
      heroWpnIds(h).forEach(function (wid) { var i = owned.indexOf(wid); if (i !== -1) owned.splice(i, 1); });
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
    ['mapScreen', 'combatScreen', 'rewardScreen', 'restScreen', 'shopScreen', 'tavernScreen', 'eventScreen'].forEach(function (s) {
      document.getElementById(s).hidden = (s !== id);
    });
    if (window.BGMEngine) BGMEngine.play(id === 'combatScreen' ? 'heroes' : 'heroes_lobby');
  }
  function updateTop() {
    var gp = document.getElementById('goldPill'); if (gp) gp.textContent = '💰 ' + run.gold;
    var st = HW_STAGES[run.mainStage];
    var md = HW_MODES[run.mode] || HW_MODES.normal;
    var fp = document.getElementById('floorPill');
    if (fp) fp.textContent = st
      ? (md.emoji + ' ' + (run.mainStage + 1) + '/' + HW_STAGES.length + ' ' + st.name + ' · ' + (run.subStage + 1) + '/' + SUB_COUNT)
      : TCG.t('hx.unifiedWorld');
    var dp = document.getElementById('diffPill'); if (dp) dp.textContent = md.emoji + ' ' + md.label;
  }

  /* ---------- collection (도감, 모험과 무관하게 영구 보존) ---------- */
  function loadCollected(key) {
    try { var a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  var collectedHeroes = loadCollected('hw_collected_heroes');
  var collectedWeapons = loadCollected('hw_collected_weapons');
  var collectedRelics = loadCollected('hw_collected_relics');
  function syncCollection() {
    var changed = false;
    if (run) {
      run.party.forEach(function (h) { if (collectedHeroes.indexOf(h.def.id) === -1) { collectedHeroes.push(h.def.id); changed = true; } });
      (run.weapons || []).forEach(function (id) { if (collectedWeapons.indexOf(id) === -1) { collectedWeapons.push(id); changed = true; } });
      (run.relics || []).forEach(function (r) { if (r && collectedRelics.indexOf(r.id) === -1) { collectedRelics.push(r.id); changed = true; } });
    }
    if (changed) {
      try {
        localStorage.setItem('hw_collected_heroes', JSON.stringify(collectedHeroes));
        localStorage.setItem('hw_collected_weapons', JSON.stringify(collectedWeapons));
        localStorage.setItem('hw_collected_relics', JSON.stringify(collectedRelics));
      } catch (e) {}
    }
  }

  /* ---------- save / continue ---------- */
  function saveRun() {
    try {
      if (!run) return;
      syncCollection();
      localStorage.setItem('hw_save', JSON.stringify({
        v: 3, diff: diff,
        party: run.party.map(function (h) { return { id: h.def.id, atk: h.atk, uid: h.uid, weapons: heroWpnIds(h).slice(), train: h.train || 0 }; }),
        deck: (run.deck || []).slice(),
        tavern: run.tavern || null,
        gold: run.gold, mainStage: run.mainStage, subStage: run.subStage,
        relics: run.relics.map(function (r) { return r.id; }),
        weapons: run.weapons.slice(), items: (run.items || []).slice(), sorties: run.sorties || 0,
        treasureMain: (run.treasureMain != null ? run.treasureMain : -1),
        lordHp: run.lordHp, lordMp: run.lordMp, mode: run.mode || 'normal',
        shop: run.shop || null, shopStamp: (run.shopStamp != null ? run.shopStamp : -1), shopRerolls: run.shopRerolls || 0
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
        var slots = slotsForRarity(HW_BY_ID[h.id].rarity);
        var ws = Array.isArray(h.weapons) ? h.weapons.slice() : (h.weapon ? [h.weapon] : []); // 구버전 호환
        ws = ws.filter(function (id) { return HW_WEAPON_BY_ID[id]; }).slice(0, slots);
        return { uid: h.uid || (h.id + '_' + Math.random().toString(36).slice(2, 7)), def: HW_BY_ID[h.id], atk: h.atk, weapons: ws, train: h.train || 0 };
      }),
      gold: d.gold || 0,
      mainStage: Math.min(Math.max(0, d.mainStage || 0), HW_STAGES.length - 1),
      subStage: Math.min(Math.max(0, d.subStage || 0), SUB_COUNT - 1),
      relics: (d.relics || []).map(function (id) { return relicById[id]; }).filter(Boolean),
      weapons: (d.weapons || []).filter(function (id) { return HW_WEAPON_BY_ID[id]; }),
      items: (d.items || []).filter(function (id) { return HW_CONS_BY_ID[id]; }).slice(0, HW_ITEM_MAX),
      sorties: d.sorties || 0,
      treasureMain: (typeof d.treasureMain === 'number') ? d.treasureMain : -1,
      deck: Array.isArray(d.deck) ? d.deck.slice() : [],
      tavern: (d.tavern && Array.isArray(d.tavern.items)) ? d.tavern : null,
      shop: Array.isArray(d.shop) ? d.shop : null, // 상점 진열 유지(새로고침/스테이지 진행 때만 갱신)
      shopStamp: (typeof d.shopStamp === 'number') ? d.shopStamp : -1,
      shopRerolls: d.shopRerolls || 0,
      stageShopped: false, combat: null
    };
    run.lordHp = (typeof d.lordHp === 'number') ? Math.min(d.lordHp, lordMaxHp()) : lordMaxHp();
    run.lordMp = (typeof d.lordMp === 'number') ? Math.min(d.lordMp, lordMaxMp()) : lordMaxMp();
    run.mode = HW_MODES[d.mode] ? d.mode : 'normal';
    syncDeck();
    showMap();
  }

  /* ---------- 모드(노멀/하드/극악) 해금 ---------- */
  function unlockedMode() { try { var m = localStorage.getItem('hw_mode_unlocked'); return HW_MODES[m] ? m : 'normal'; } catch (e) { return 'normal'; } }
  function isModeUnlocked(key) { return HW_MODE_ORDER.indexOf(key) <= HW_MODE_ORDER.indexOf(unlockedMode()); }
  function unlockMode(key) { try { if (HW_MODE_ORDER.indexOf(key) > HW_MODE_ORDER.indexOf(unlockedMode())) localStorage.setItem('hw_mode_unlocked', key); } catch (e) {} }

  /* ---------- run lifecycle ---------- */
  function newRun(mode) {
    // 새 게임 시작 시 금화: 이전 모험의 금화가 100 초과면 유지, 100 이하(또는 초기화 후)면 100으로 시작
    var prevGold = 0; try { var _ex = JSON.parse(localStorage.getItem('hw_save') || 'null'); if (_ex && typeof _ex.gold === 'number') prevGold = _ex.gold; } catch (e) {}
    var startGold = Math.max(100, prevGold);
    clearSave();
    // 시작 장수 + 지정 경로(전투 보상·저잣거리 외 = 전용)로만 얻는 장수 중 이미 도감에 열린 장수는 시작 시 합류
    var startIds = HW_STARTERS.slice();
    HW_HEROES.forEach(function (d) {
      if (d.exclusive && collectedHeroes.indexOf(d.id) !== -1 && startIds.indexOf(d.id) === -1) startIds.push(d.id);
    });
    run = { party: startIds.map(mkHero), deck: [], gold: startGold, mainStage: 0, subStage: 0, relics: [], weapons: [], items: [], sorties: 0, treasureMain: -1, stageShopped: false, combat: null };
    // 특수 경로로 도감에 수집된 전용 장비는 새 게임 시작 시 자동 보유(데이터 초기화 시에만 사라짐)
    HW_WEAPONS.forEach(function (w) { if (w.exclusive && collectedWeapons.indexOf(w.id) !== -1 && run.weapons.indexOf(w.id) === -1) run.weapons.push(w.id); });
    run.mode = (HW_MODES[mode] && isModeUnlocked(mode)) ? mode : unlockedMode(); // 미지정 시 최고 해금 난이도(노멀→하드→극악 자동 진행)
    run.lordHp = lordMaxHp(); // 주공 HP는 모험 내내 유지(스테이지마다 일부 회복)
    run.lordMp = lordMaxMp(); // 주공 MP도 모험 내내 유지(전투 시작 시 10% 회복)
    syncDeck();
    showMap();
  }

  /* ---------- MAP ---------- */
  function hpBar(u, foe) {
    var pct = Math.max(0, Math.round(u.hp / u.maxHp * 100));
    return '<div class="hpbar' + (foe ? ' foe' : '') + '"><i style="width:' + pct + '%"></i></div>';
  }
  function miniHero(h) {
    var ws = heroWpns(h).map(function (w) { return w.emoji; }).join('');
    return '<div class="mini-hero" data-uid="' + h.uid + '">' +
      '<span class="mh-rar rar-' + h.def.rarity + '">' + h.def.rarity + '</span>' +
      TCG.portrait(h.def.emoji, h.def.id, '', h.def.name) +
      '<div class="mh-name">' + h.def.name + '</div>' +
      '<div class="mh-stats">⚔' + effAtk(h) + (ws ? ' <span class="mh-wpn">' + ws + '</span>' : '') + '</div></div>';
  }
  // 히어로즈 블러드 결과로 적립된 보너스 골드를 모험 골드에 반영(승리=가산, 패배=차감)
  function applyBonusGold() {
    try {
      var b = parseInt(localStorage.getItem('hw_bonus_gold') || '0', 10);
      if (b) {
        localStorage.setItem('hw_bonus_gold', '0');
        var before = run.gold;
        run.gold = Math.max(0, run.gold + b);
        var delta = run.gold - before;
        TCG.toast(TCG.t('hx.hbSettleGold', { sign: (b > 0 ? '+' : ''), n: b }) + (delta !== b ? TCG.t('hx.applied', { n: delta }) : ''));
      }
    } catch (e) {}
  }
  // 다른 모드(히어로즈 블러드 3연승=제갈량, 대장전 보스 격파=전용 장수)에서 해금된 장수를 영입
  function applyPendingGrants() {
    try {
      var raw = localStorage.getItem('hw_grant_heroes');
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list) || !list.length) return;
      var remaining = [];
      list.forEach(function (id) {
        if (!HW_BY_ID[id]) return;
        if (collectedHeroes.indexOf(id) === -1) collectedHeroes.push(id);
        if (run.party.some(function (h) { return h.def.id === id; })) return; // 이미 파티에 있음
        if (run.party.length < MAX_PARTY) {
          run.party.push(mkHero(id));
          TCG.toast(TCG.t('hx.specialJoin', { name: HW_BY_ID[id].name }));
        } else {
          remaining.push(id);
          TCG.toast(TCG.t('hx.recruitWaiting', { name: HW_BY_ID[id].name }));
        }
      });
      localStorage.setItem('hw_grant_heroes', JSON.stringify(remaining));
      localStorage.setItem('hw_collected_heroes', JSON.stringify(collectedHeroes));
    } catch (e) {}
  }
  // 히어로즈 블러드 10연승 등으로 해금된 유물을 현재 모험에 영입(hw_grant_relics → run.relics)
  function applyPendingRelics() {
    try {
      var raw = localStorage.getItem('hw_grant_relics');
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list) || !list.length) return;
      var relicById = {}; HW_RELICS.forEach(function (r) { relicById[r.id] = r; });
      list.forEach(function (id) {
        var r = relicById[id]; if (!r) return;
        if (collectedRelics.indexOf(id) === -1) collectedRelics.push(id);
        if (!run.relics.some(function (x) { return x.id === id; })) {
          run.relics.push(r);
          TCG.toast('🏺 ' + TCG.t('hx.specialRelicGet', { name: r.name }));
        }
      });
      localStorage.setItem('hw_grant_relics', '[]');
      localStorage.setItem('hw_collected_relics', JSON.stringify(collectedRelics));
    } catch (e) {}
  }
  function pushGrant(id) {
    try { var g = JSON.parse(localStorage.getItem('hw_grant_heroes') || '[]'); if (!Array.isArray(g)) g = []; if (g.indexOf(id) === -1) g.push(id); localStorage.setItem('hw_grant_heroes', JSON.stringify(g)); } catch (e) {}
  }
  // 특수 획득 장수(여포 등) — 조건 달성 시 호출. toParty=true면 진행 중 파티에 즉시 합류, 아니면 다음 진입 시 합류 대기
  function unlockSpecialHero(id, reason, toParty) {
    if (!HW_BY_ID[id]) return;
    var already = collectedHeroes.indexOf(id) !== -1;
    if (!already) { collectedHeroes.push(id); try { localStorage.setItem('hw_collected_heroes', JSON.stringify(collectedHeroes)); } catch (e) {} }
    if (toParty && run && run.party && !run.party.some(function (h) { return h.def.id === id; }) && run.party.length < MAX_PARTY) {
      run.party.push(mkHero(id));
    } else {
      pushGrant(id);
    }
    TCG.toast((HW_BY_ID[id].emoji || '🎖') + ' ' + reason + ' — ' + HW_BY_ID[id].name + (already ? TCG.t('hx.joinSuffix') : TCG.t('hx.getSuffix')));
  }
  // 장수 컬렉션 100% 완료 → 전국옥새 지급(다른 경로로는 획득 불가)
  function checkCollectionReward() {
    if (!run) return;
    syncCollection();
    var allHeroes = HW_HEROES.every(function (d) { return collectedHeroes.indexOf(d.id) !== -1; });
    if (!allHeroes) return;
    if (collectedWeapons.indexOf('yuxi') === -1) {
      collectedWeapons.push('yuxi');
      try { localStorage.setItem('hw_collected_weapons', JSON.stringify(collectedWeapons)); } catch (e) {}
    }
    if ((run.weapons || []).indexOf('yuxi') === -1) {
      run.weapons.push('yuxi');
      TCG.toast('🌟 ' + TCG.t('hx.collectionReward'));
    }
  }
  // 히어로즈 블러드 20연승 등으로 해금된 장비를 현재 모험에 영입(hw_grant_weapons → run.weapons)
  function applyPendingWeapons() {
    try {
      var raw = localStorage.getItem('hw_grant_weapons');
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list) || !list.length) return;
      list.forEach(function (id) {
        if (!HW_WEAPON_BY_ID[id]) return;
        if (collectedWeapons.indexOf(id) === -1) collectedWeapons.push(id);
        if (!run.weapons) run.weapons = [];
        if (run.weapons.indexOf(id) === -1) { run.weapons.push(id); TCG.toast('🗡️ ' + TCG.t('hx.specialGearGet', { name: HW_WEAPON_BY_ID[id].name })); }
      });
      localStorage.setItem('hw_grant_weapons', '[]');
      localStorage.setItem('hw_collected_weapons', JSON.stringify(collectedWeapons));
    } catch (e) {}
  }
  function showMap() {
    applyBonusGold();
    applyPendingGrants();
    applyPendingRelics();
    applyPendingWeapons();
    checkCollectionReward();
    updateTop();
    var mt = document.getElementById('mapTitle');
    if (mt) { var md = HW_MODES[run.mode] || HW_MODES.normal; mt.textContent = TCG.t('map.title') + ' · ' + md.emoji + ' ' + md.label; }
    var msub = document.getElementById('mapSub'); if (msub) msub.textContent = TCG.t('map.sub');
    renderCampaign();
    show('mapScreen');
    scrollToCurrentStage();
    saveRun();
  }
  // 대기실 진입 시 출진 지역 목록을 진행 중(current) 스테이지로 스크롤
  function scrollToCurrentStage() {
    if (typeof requestAnimationFrame !== 'function') return;
    requestAnimationFrame(function () {
      var tl = document.querySelector('#mapTrack .wr-timeline');
      var cur = tl && tl.querySelector('.wr-row.current');
      if (!tl || !cur) return;
      tl.scrollTop = Math.max(0, cur.offsetTop - (tl.clientHeight - cur.offsetHeight) / 2);
    });
  }
  function renderCampaign() {
    var m = run.mainStage, s = run.subStage, st = HW_STAGES[m];
    var isBoss = s === SUB_COUNT - 1;
    var A = 'assets/img/heroes/';
    var maxHp = lordMaxHp(), maxMp = lordMaxMp();
    var hp = (run.lordHp != null ? run.lordHp : maxHp), mp = (run.lordMp != null ? run.lordMp : maxMp);
    var hpPct = Math.max(0, Math.min(100, Math.round(hp / maxHp * 100)));
    var mpPct = Math.max(0, Math.min(100, Math.round(mp / Math.max(1, maxMp) * 100)));
    // 메인 전역 칩 (해금/진행/평정)
    var lockSvg = '<svg class="wr-lock" width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 018 0v3" stroke-width="2"/></svg>';
    var chips = HW_STAGES.map(function (x, i) {
      var cl = i < m ? 'done' : (i === m ? 'current' : (i === m + 1 ? 'next' : 'locked'));
      var inner = i < m ? '✔' : (i === m ? (i + 1) : lockSvg);
      return '<div class="wr-camp ' + cl + '">' + inner + '</div>';
    }).join('');
    // 스테이지 타임라인 (11)
    var rows = '';
    for (var i = 0; i < SUB_COUNT; i++) {
      var state = i < s ? 'done' : (i === s ? 'current' : 'locked');
      var isMid = (i === 4 || i === 9), isB = (i === SUB_COUNT - 1);
      var type = isB ? 'boss' : (isMid ? 'elite' : 'normal');
      var name, kind;
      if (isB) { name = HW_COMMANDERS[st.boss] ? HW_COMMANDERS[st.boss].name : TCG.t('hx.stageBoss'); kind = TCG.t('hx.kindStageBoss', { n: i + 1 }); }
      else if (isMid) { var mb = (HW_MID_BOSSES[m] || [])[i === 9 ? 1 : 0]; name = mb ? mb.name : TCG.t('hx.elite'); kind = TCG.t('hx.kindStageElite', { n: i + 1 }); }
      else { name = (st.regions && st.regions[i]) ? st.regions[i] : TCG.t('hx.stageN', { n: i + 1 }); kind = TCG.t('hx.kindStageBattle', { m: m + 1, n: i + 1 }); }
      var marker = isB
        ? '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 8l4 3 5-6 5 6 4-3-2 12H5z" fill="#f0c33c"/></svg>'
        : '<img src="' + A + (isMid ? 'ic-ninja' : 'ic-tower') + '.png" alt="">';
      var clickable = isMid || isB;
      rows += '<div class="wr-row ' + type + ' ' + state + (clickable ? ' info' : '') + '"' + (clickable ? ' data-sub="' + i + '"' : '') + '>' +
          '<div class="wr-mark">' + marker + (state === 'done' ? '<span class="wr-done">✔</span>' : '') + '</div>' +
          '<div class="wr-row-body">' +
            '<div class="wr-kind">' + kind + '</div>' +
            '<div class="wr-name">' + name + '</div>' +
          '</div>' +
          (state === 'current' ? '<span class="wr-march" data-act="battle">' + TCG.t('hx.march') + '</span>'
            : (isB ? '<span class="wr-badge boss">BOSS</span>' : (isMid ? '<span class="wr-badge elite">' + TCG.t('hx.elite') + '</span>' : ''))) +
        '</div>';
    }
    var html =
      '<div class="wr-top">' +
        '<a class="wr-icbtn" href="index.html" title="' + TCG.t('hx.home') + '" aria-label="' + TCG.t('hx.home') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11.5L12 4l9 7.5" stroke="#f0c33c" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10v9h13v-9" stroke="#f0c33c" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 19v-5h4v5" stroke="#f0c33c" stroke-width="1.7" stroke-linejoin="round"/></svg></a>' +
        '<button class="wr-icbtn" data-act="guide" title="' + TCG.t('hx.guide') + '" aria-label="' + TCG.t('hx.guide') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#f0c33c" stroke-width="1.8"/><path d="M9.2 9.2a2.8 2.8 0 015.4 1c0 1.8-2.6 2.2-2.6 4" stroke="#f0c33c" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1.05" fill="#f0c33c"/></svg></button>' +
        '<div class="wr-chip gold"><img src="' + A + 'coin-gold2.png" alt=""><b>' + run.gold + '</b></div>' +
        '<span class="wr-spacer"></span>' +
        '<button class="wr-chip" data-act="roster"><img src="' + A + 'ic-general.png" alt=""><b>' + run.party.length + '</b></button>' +
        '<button class="wr-chip" data-act="gear"><img src="' + A + 'ic-swords.png" alt=""><b>' + (run.weapons || []).length + '</b></button>' +
      '</div>' +
      '<div class="wr-camps">' + chips + '</div>' +
      '<div class="wr-banner' + (isBoss ? ' boss' : '') + '"><span class="wr-bno">' + (m + 1) + '</span>' +
        '<div class="wr-btitle"><b>' + st.name + '</b><small>' + TCG.t('map.subInfo', { year: st.year, n: s + 1, max: SUB_COUNT }) + '</small></div></div>' +
      '<div class="wr-lord">' +
        '<div class="wr-bar"><span class="wr-bl hp">HP</span><div class="wr-track"><i class="hp" style="width:' + hpPct + '%"></i></div><span class="wr-bv">' + hp + '/' + maxHp + '</span></div>' +
        '<div class="wr-bar"><span class="wr-bl mp">MP</span><div class="wr-track"><i class="mp" style="width:' + mpPct + '%"></i></div><span class="wr-bv">' + mp + '/' + maxMp + '</span></div>' +
        '<div class="wr-lbtns">' +
          '<button data-act="roster"><img src="' + A + 'ic-general.png" alt="">' + TCG.t('camp.officers') + '</button>' +
          '<button data-act="gear"><img src="' + A + 'ic-swords.png" alt="">' + TCG.t('camp.gear') + '</button>' +
          '<button data-act="relic"><img src="' + A + 'ic-gear.png" alt="">' + TCG.t('camp.bonus') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="wr-timeline"><div class="wr-inner">' + rows + '</div></div>' +
      '<div class="wr-actions">' +
        '<button class="wr-act primary" data-act="battle"><img src="' + A + 'ped-chuljin.png" alt="">' + TCG.t('camp.battle') + '</button>' +
        '<button class="wr-act" data-act="formation"><img src="' + A + 'ped-jinhyeong.png" alt="">' + TCG.t('camp.formation') + '</button>' +
        '<button class="wr-act" data-act="shop"><img src="' + A + 'ped-shop.png" alt="">' + TCG.t('camp.shop') + '</button>' +
        '<button class="wr-act" data-act="tavern"><img src="' + A + 'ped-tavern.png" alt="">' + TCG.t('camp.tavern') + '</button>' +
        '<button class="wr-act" data-act="codex"><img src="' + A + 'ped-codex.png" alt="">' + TCG.t('camp.codex') + '</button>' +
      '</div>';
    document.getElementById('mapTrack').innerHTML = html;
    var rc = document.getElementById('rosterCount'); if (rc) rc.textContent = run.party.length;
    var gc = document.getElementById('gearCount'); if (gc) gc.textContent = (run.weapons || []).length;
  }
  // 추가 능력 상세 팝업 — 유물 효과 + 아이템(장비)으로 적용되는 주공 능력치
  function statRow(label, val, bonus) {
    return '<div style="display:flex;justify-content:space-between;background:rgba(0,0,0,.25);border-radius:8px;padding:7px 10px;margin-bottom:6px"><span>' + label + '</span><b>' + val +
      (bonus ? ' <span style="color:#8effb0;font-weight:700">' + TCG.t('hx.itemBonus', { n: bonus }) + '</span>' : '') + '</b></div>';
  }
  function sectionHead(t) { return '<div style="text-align:left;font-size:12px;color:var(--gold);font-weight:800;margin:12px 2px 5px">' + t + '</div>'; }
  function showRelicsInfo() {
    var rs = run.relics || [];
    var inRun = {}; rs.forEach(function (r) { inRun[r.id] = true; });
    var evadePct = Math.round(lordEvade() * 100);
    var critPct = Math.round((BASE_CRIT + relicSum('crit')) * 100);
    // 주공 적용 능력치 요약(핸드오프)
    var sum = '<div class="wr-relic-sum"><div class="rs-h">👑 ' + TCG.t('hx.lordStats') + '</div><div class="rs-grid">' +
      '<div class="rs-cell"><span>❤️</span><small>' + TCG.t('hx.maxHp') + '</small><b style="color:#7ef0b5">' + lordMaxHp() + '</b></div>' +
      '<div class="rs-cell"><span>🔷</span><small>' + TCG.t('hx.maxMp') + '</small><b style="color:#9fd4ff">' + lordMaxMp() + '</b></div>' +
      '<div class="rs-cell"><span>💨</span><small>' + TCG.t('hx.evadeRate') + '</small><b style="color:var(--ink)">' + evadePct + '%</b></div>' +
      '<div class="rs-cell"><span>🎯</span><small>' + TCG.t('hx.critRate') + '</small><b style="color:#ffb37e">' + critPct + '%</b></div>' +
      '</div></div>';
    // 유물 목록 — 이번 모험 보유(✦) / 미보유(🔒)
    var list = HW_RELICS.map(function (r) {
      var on = !!inRun[r.id];
      return '<div class="wr-relic-row' + (on ? '' : ' off') + '">' +
        '<div class="rr-ico">' + r.emoji + '</div>' +
        '<div class="rr-info"><div class="rr-name">' + r.name + '</div><div class="rr-desc">' + r.desc + '</div></div>' +
        '<span class="rr-chk" style="color:' + (on ? 'var(--gold)' : 'var(--ink-dim)') + '">' + (on ? '✦' : '🔒') + '</span>' +
        '</div>';
    }).join('');
    if (!rs.length) list = '<div class="wr-relic-empty">' + TCG.t('hx.relicEmpty') + '</div>' + list;
    document.getElementById('relicTitleCount').textContent = rs.length + '/' + HW_RELICS.length;
    document.getElementById('relicBody').innerHTML = sum + list;
    document.getElementById('relicModal').hidden = false;
  }
  document.getElementById('mapTrack').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (btn && !btn.disabled) {
      var act = btn.dataset.act;
      TCG.sfx('tap');
      if (act === 'battle') return startStageCombat();
      if (act === 'formation') return openFormation();
      if (act === 'shop') return showShop();
      if (act === 'tavern') return showTavern();
      if (act === 'roster') return openRoster();
      if (act === 'gear') return openGear();
      if (act === 'relic') return showRelicsInfo();
      if (act === 'codex') return openCodex('hero');
      if (act === 'guide') { document.getElementById('guideModal').hidden = false; return; }
      return;
    }
    var dot = e.target.closest('.wr-row.info'); // 정예/보스 스테이지 → 적 정보 미리보기
    if (dot) { TCG.sfx('tap'); showStageEnemyInfo(parseInt(dot.dataset.sub, 10)); return; }
  });
  // 첫 화면에서 중간보스/적장 칸 탭 → 적 정보 팝업
  function showStageEnemyInfo(sub) {
    var main = run.mainStage, st = HW_STAGES[main];
    var md = HW_MODES[run.mode] || HW_MODES.normal;
    var prog = main * SUB_COUNT + sub;
    var hpM = DCFG.eHp * (1 + prog * 0.020) * md.hpMult;
    var atkM = DCFG.eAtk * (1 + prog * 0.005);
    var body, isBoss = (sub === SUB_COUNT - 1);
    if (isBoss) {
      var cmd = HW_COMMANDERS[st.boss];
      var bhp = Math.round(cmd.hp * hpM * HW_BOSS_MULT.hpMult * 1.3), batk = Math.max(1, Math.round(cmd.atk * atkM * md.bossAtkMult * HW_BOSS_MULT.atkMult * 2 * 1.5));
      var bsk = (cmd.hero && HW_BY_ID[cmd.hero]) ? HW_BY_ID[cmd.hero].skill : null;
      var bAtkIsSkill = bsk && (bsk.type === 'strike' || bsk.type === 'aoe' || bsk.type === 'multi');
      var bAtkName = bAtkIsSkill ? bsk.name : TCG.t('hx.assault');
      var bAtkDesc = bAtkIsSkill ? bsk.desc : TCG.t('hx.strikeLord');
      var bPierce = (run.mode === 'hard' || run.mode === 'extreme') ? ' <span style="color:#ff9a7e">' + TCG.t('hx.pierce') + '</span>' : '';
      body = TCG.portrait(cmd.emoji, (cmd.hero && HW_BY_ID[cmd.hero]) ? cmd.hero : cmd.name, 'modal-portrait', cmd.name) +
        '<h2>👑 ' + cmd.name + ' <span class="rar-SSR" style="font-size:13px">' + TCG.t('hx.commander') + '</span></h2>' +
        '<p>' + TCG.t('hx.finalBoss', { stage: st.name }) + (cmd.aoe ? ' · 💥 ' + TCG.t('hx.aoe') : '') + '</p>' +
        '<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px;text-align:left;font-size:13px;line-height:1.55">' +
        '❤ HP ' + bhp + ' · ⚔ ' + TCG.t('hx.attackStat') + ' ' + batk +
        '<br>⚔ <b style="color:var(--gold)">' + TCG.t('hx.attackSkill') + '</b> 「' + bAtkName + '」 ' + bAtkDesc + bPierce +
        '<br>✨ <b style="color:var(--gold)">' + TCG.t('hx.supportSkill') + '</b> ' + TCG.t('hx.bossSupportDesc') +
        '<br><span style="color:var(--ink-dim)">' + TCG.t('hx.bossSkillNote') + '</span></div>';
    } else {
      var idx = (sub === 9) ? 1 : 0, mb = (HW_MID_BOSSES[main] || [])[idx];
      if (!mb) { return; }
      var mhp = Math.round(mb.hp * hpM * HW_MID.hpMult * 1.3), matk = Math.max(1, Math.round(mb.atk * atkM * HW_MID.atkMult * 1.2 * 2 * 1.5));
      var msk = HW_MID_SKILLS[(main * 2 + idx) % HW_MID_SKILLS.length];
      var mbHero = (mb.hid && HW_BY_ID[mb.hid]) ? HW_BY_ID[mb.hid] : null;
      var recruitTxt = mbHero ? ('<br><span style="color:#d9b3ff">🃏 ' + TCG.t('hx.recruitOnDefeat') + ' — ' + mbHero.name + ' <span class="rar-' + mbHero.rarity + '">' + mbHero.rarity + '</span> (' + (idx === 0 ? TCG.t('hx.diffNormal') : TCG.t('hx.diffHard')) + ')</span>') : '';
      body = TCG.portrait(mb.emoji, mb.hid || mb.name, 'modal-portrait', mb.name) +
        '<h2>⚜ ' + mb.name + ' <span class="rar-SR" style="font-size:13px">' + TCG.t('hx.midBoss') + '</span></h2>' +
        '<p>' + TCG.t('hx.stageSortie', { stage: st.name, n: sub + 1 }) + (mb.aoe ? ' · 💥 ' + TCG.t('hx.aoe') : '') + '</p>' +
        '<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px;text-align:left;font-size:13px">' +
        '❤ HP ' + mhp + ' · ⚔ ' + TCG.t('hx.attackStat') + ' ' + matk + '<br><b style="color:var(--gold)">「' + msk.name + '」</b> ' + msk.desc +
        '<br><span style="color:var(--ink-dim)">' + TCG.t('hx.midBossNote') + '</span>' + recruitTxt + '</div>';
    }
    document.getElementById('heroModalBody').innerHTML = body +
      '<button class="btn primary" id="heroModalClose" style="margin-top:14px">' + TCG.t('hx.close') + '</button>';
    var modal = document.getElementById('heroModal'); modal.hidden = false;
    document.getElementById('heroModalClose').addEventListener('click', function () { modal.hidden = true; });
  }

  /* ---------- 장수(수집 목록) — 탭하면 정보·장비 장착 ---------- */
  /* ---------- 정렬(도감·수집·출진 덱 편성) ---------- */
  function rarityRank(r) { return ({ C: 0, R: 1, SR: 2, SSR: 3 })[r] || 0; }
  var codexSort = { key: 'rarity', dir: 'desc' };  // 도감 기본: 등급 내림차순
  var rosterSort = { key: 'acquire', dir: 'asc' };  // 수집/덱: 기본 습득순
  var formSort = { key: 'acquire', dir: 'asc' };
  function paintSortBar(barId, st) {
    var bar = document.getElementById(barId); if (!bar) return;
    bar.querySelectorAll('.sort-btn').forEach(function (b) {
      if (b.dataset.label == null) b.dataset.label = b.textContent;
      var on = b.dataset.sort === st.key;
      b.classList.toggle('active', on);
      b.textContent = b.dataset.label + (on ? (st.dir === 'asc' ? ' ▲' : ' ▼') : '');
    });
  }
  function applySortClick(st, key) { if (st.key === key) st.dir = (st.dir === 'asc' ? 'desc' : 'asc'); else { st.key = key; st.dir = (key === 'acquire' ? 'asc' : 'desc'); } }
  function sortPartyList(list, st) {
    var idx = {}; run.party.forEach(function (h, i) { idx[h.uid] = i; }); // 습득 순서 = party 인덱스
    var a = list.slice();
    a.sort(function (x, y) {
      var v = 0;
      if (st.key === 'atk') v = effAtk(x) - effAtk(y);
      else if (st.key === 'rarity') v = rarityRank(x.def.rarity) - rarityRank(y.def.rarity);
      if (v === 0) v = idx[x.uid] - idx[y.uid];
      return v;
    });
    if (st.dir === 'desc') a.reverse();
    return a;
  }
  function sortDefList(defs, st) {
    var a = defs.slice();
    a.sort(function (x, y) {
      var v = st.key === 'atk' ? (x.atk - y.atk) : (rarityRank(x.rarity) - rarityRank(y.rarity));
      if (v === 0) v = HW_HEROES.indexOf(x) - HW_HEROES.indexOf(y);
      return v;
    });
    if (st.dir === 'desc') a.reverse();
    return a;
  }
  function renderRoster() {
    document.getElementById('rosterTitleCount').textContent = '· ' + TCG.t('hx.collected', { n: run.party.length, max: HW_HEROES.length });
    document.getElementById('rosterGrid').innerHTML = sortPartyList(run.party, rosterSort).map(miniHero).join('');
    paintSortBar('rosterSort', rosterSort);
  }
  function openRoster() {
    TCG.sfx('tap');
    renderRoster();
    document.getElementById('rosterModal').hidden = false;
  }
  /* ---------- 진형(출진 덱 편성) ---------- */
  function renderFormationGrid() {
    var deck = run.deck || [];
    var inDeck = {}; deck.forEach(function (u) { inDeck[u] = true; });
    document.getElementById('formationTitle').textContent =
      '· ' + TCG.t('hx.sortieDeck', { n: deck.length, max: MAX_DECK, min: deckMin() });
    document.getElementById('formationGrid').innerHTML = sortPartyList(run.party, formSort).map(function (h) {
      var ws = heroWpns(h).map(function (w) { return w.emoji; }).join('');
      var on = !!inDeck[h.uid];
      return '<div class="mini-hero deck-pick' + (on ? ' in-deck' : '') + '" data-uid="' + h.uid + '">' +
        '<span class="mh-rar rar-' + h.def.rarity + '">' + h.def.rarity + '</span>' +
        '<span class="deck-check">' + (on ? '✓' : '+') + '</span>' +
        TCG.portrait(h.def.emoji, h.def.id, '', h.def.name) +
        '<div class="mh-name">' + h.def.name + '</div>' +
        '<div class="mh-stats">⚔' + effAtk(h) + (ws ? ' <span class="mh-wpn">' + ws + '</span>' : '') + '</div>' +
        '<button class="mh-equip" data-equip="' + h.uid + '">🗡 ' + TCG.t('hx.gear') + '</button>' +
        '</div>';
    }).join('');
    paintSortBar('formationSort', formSort);
  }
  function toggleDeck(uid) {
    if (!run.deck) run.deck = [];
    var i = run.deck.indexOf(uid);
    if (i >= 0) {
      if (run.deck.length <= deckMin()) { TCG.toast(TCG.t('hx.deckMin', { n: deckMin() })); return; }
      run.deck.splice(i, 1);
    } else {
      if (run.deck.length >= MAX_DECK) { TCG.toast(TCG.t('hx.deckMax', { n: MAX_DECK })); return; }
      run.deck.push(uid);
    }
    TCG.sfx('tap'); saveRun(); renderFormationGrid();
  }
  function openFormation() {
    TCG.sfx('tap');
    syncDeck(); saveRun(); // 보유<10이면 자동 채움 등 정규화 후 표시
    renderFormationGrid();
    document.getElementById('formationModal').hidden = false;
  }
  function refreshRosterIfOpen() {
    if (!document.getElementById('rosterModal').hidden) renderRoster();
    if (!document.getElementById('formationModal').hidden) renderFormationGrid();
  }
  function openGear() {
    TCG.sfx('tap');
    var inv = run.weapons || [];
    var html;
    if (!inv.length) {
      html = '<div class="gear-empty">' + TCG.t('hx.gearEmpty') + '</div>';
    } else {
      html = HW_WEAPONS.map(function (w) {
        var owned = inv.filter(function (id) { return id === w.id; }).length;
        if (!owned) return '';
        var wearers = [];
        run.party.forEach(function (h) {
          heroWpnIds(h).forEach(function (id) { if (id === w.id) wearers.push(h.def.name); });
        });
        var free = owned - wearers.length;
        var wearTxt = wearers.length
          ? '<span class="gear-on">' + TCG.t('hx.equippedBy', { names: wearers.join(', ') }) + '</span>' + (free > 0 ? ' <span class="gear-free">· ' + TCG.t('hx.unequippedN', { n: free }) + '</span>' : '')
          : '<span class="gear-free">' + TCG.t('hx.unequipped') + '</span>';
        return '<div class="gear-row">' +
          '<div class="gear-emoji">' + w.emoji + '</div>' +
          '<div class="gear-info">' +
            '<div class="gear-name">' + w.name + ' <span class="gear-own">×' + owned + '</span></div>' +
            '<div class="gear-desc">' + w.desc + '</div>' +
            '<div class="gear-wear">' + wearTxt + '</div>' +
          '</div></div>';
      }).join('');
    }
    document.getElementById('gearList').innerHTML = html;
    var ownedKinds = {}; inv.forEach(function (id) { ownedKinds[id] = true; });
    document.getElementById('gearTitleCount').textContent = Object.keys(ownedKinds).length + '/' + HW_WEAPONS.length;
    document.getElementById('gearModal').hidden = false;
  }
  var _rb = document.getElementById('rosterBtn'); if (_rb) _rb.addEventListener('click', openRoster);
  var _gb = document.getElementById('gearBtn'); if (_gb) _gb.addEventListener('click', openGear);
  document.getElementById('rosterSort').addEventListener('click', function (e) { var b = e.target.closest('.sort-btn'); if (!b) return; TCG.sfx('tap'); applySortClick(rosterSort, b.dataset.sort); renderRoster(); });
  document.getElementById('formationSort').addEventListener('click', function (e) { var b = e.target.closest('.sort-btn'); if (!b) return; TCG.sfx('tap'); applySortClick(formSort, b.dataset.sort); renderFormationGrid(); });
  document.getElementById('heroColSort').addEventListener('click', function (e) { var b = e.target.closest('.sort-btn'); if (!b) return; TCG.sfx('tap'); applySortClick(codexSort, b.dataset.sort); renderHeroCodex(); });
  document.getElementById('rosterGrid').addEventListener('click', function (e) {
    var m = e.target.closest('.mini-hero'); if (!m) return; // 장수 카드 탭 → 상세/장비
    var h = heroByUid(m.dataset.uid); if (h) showHeroModal(h);
  });
  document.getElementById('formationGrid').addEventListener('click', function (e) {
    var eq = e.target.closest('[data-equip]');
    if (eq) { var h = heroByUid(eq.dataset.equip); if (h) showHeroModal(h); return; } // 🗡 장비 버튼 → 상세/장착
    var card = e.target.closest('.deck-pick'); if (!card) return;
    toggleDeck(card.dataset.uid); // 카드 본문 탭 → 출진 덱에 넣고 빼기
  });
  // 대기실 팝업(장수·진형·장비·추가능력) 닫기 — ✕ 버튼/바깥(scrim) 모두 data-close로 처리
  ['rosterModal', 'formationModal', 'gearModal', 'relicModal'].forEach(function (id) {
    var modal = document.getElementById(id);
    modal.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) { TCG.sfx('tap'); modal.hidden = true; } });
  });

  /* ---------- 컬렉션(도감): 전체 카탈로그 + 수집 여부 + 획득 경로 ---------- */
  function midBossInfoByHid(hid) {
    for (var m = 0; m < HW_MID_BOSSES.length; m++) {
      var pair = HW_MID_BOSSES[m];
      for (var i = 0; i < pair.length; i++) { if (pair[i].hid === hid) return { main: m, idx: i }; }
    }
    return null;
  }
  function heroPath(d) {
    if (HW_STARTERS.indexOf(d.id) !== -1) return '🏳️ ' + TCG.t('hx.pathStarter');
    if (d.exclusive === 'qb') return '🃏 ' + TCG.t('hx.pathQb3');
    if (d.exclusive === 'raid') {
      var rb = null; HW_RAID.bosses.forEach(function (b) { if (b.reward === d.id) rb = b; });
      return '👹 ' + TCG.t('hx.pathRaid', { name: (rb ? HW_COMMANDERS[rb.key].name : TCG.t('hx.commander')) });
    }
    if (d.exclusive === 'special') return '🐎 ' + TCG.t('hx.pathSpecial');
    if (d.exclusive === 'normalclear') return '💃 ' + TCG.t('hx.pathNormalClear');
    if (d.exclusive === 'mid') {
      var mi = midBossInfoByHid(d.id);
      if (mi) {
        var stage = HW_STAGES[mi.main] ? HW_STAGES[mi.main].name : '';
        return '⚜ ' + TCG.t('hx.pathMid', { stage: stage, sortie: (mi.idx === 0 ? TCG.t('hx.sortie5') : TCG.t('hx.sortie10')), diff: (mi.idx === 0 ? TCG.t('hx.diffNormal') : TCG.t('hx.diffHard')) });
      }
      return '⚜ ' + TCG.t('hx.pathMidGeneric');
    }
    return '⚔️ ' + TCG.t('hx.pathBattleTavern');
  }
  function weaponPath(w) {
    if (w.exclusive === 'collection') return '📕 ' + TCG.t('hx.pathCollection');
    if (w.exclusive === 'qb20') return '🃏 ' + TCG.t('hx.pathQb20');
    return '💎 ' + TCG.t('hx.pathTreasureShop');
  }
  function relicPath(r) {
    if (r.exclusive === 'qb') return '🃏 ' + TCG.t('hx.pathQb10');
    return '👑 ' + TCG.t('hx.pathRelicDefault');
  }
  function renderHeroCodex() {
    document.getElementById('heroColTitle').textContent = '(' + collectedHeroes.length + ' / ' + HW_HEROES.length + ')';
    document.getElementById('heroColGrid').innerHTML = sortDefList(HW_HEROES, codexSort).map(function (d) {
      var got = collectedHeroes.indexOf(d.id) !== -1;
      return '<div class="col-card' + (got ? '' : ' locked') + '" data-id="' + d.id + '">' +
        '<div class="col-port">' + TCG.portrait(d.emoji, d.id, '', d.name) +
          '<span class="col-badge" style="background:' + rarBg(d.rarity) + '">' + d.rarity + '</span>' +
          (got ? '' : '<div class="col-lockov">🔒</div>') + '</div>' +
        '<div class="col-name">' + d.name + '</div>' +
        '<div class="col-cls">' + (got ? d.cls : TCG.t('hx.undiscovered')) + '</div>' +
        '</div>';
    }).join('');
    paintSortBar('heroColSort', codexSort);
  }
  function codexListRow(it, got, pickClass) {
    return '<div class="gear-row ' + pickClass + (got ? '' : ' locked') + '" data-id="' + it.id + '">' +
      '<div class="gear-emoji">' + it.emoji + '</div>' +
      '<div class="gear-info">' +
        '<div class="gear-name">' + it.name + '</div>' +
        '<div class="gear-desc">' + it.desc + '</div>' +
      '</div>' +
      '<span class="col-mark" style="color:' + (got ? 'var(--gold)' : 'var(--ink-dim)') + '">' + (got ? '✦' : '🔒') + '</span>' +
      '</div>';
  }
  function renderWeaponCodex() {
    document.getElementById('weaponColTitle').textContent = '(' + collectedWeapons.length + ' / ' + HW_WEAPONS.length + ')';
    document.getElementById('weaponColList').innerHTML = HW_WEAPONS.map(function (w) {
      return codexListRow(w, collectedWeapons.indexOf(w.id) !== -1, 'col-pick');
    }).join('');
  }
  function renderRelicCodex() {
    document.getElementById('relicColTitle').textContent = '(' + collectedRelics.length + ' / ' + HW_RELICS.length + ')';
    document.getElementById('relicColList').innerHTML = HW_RELICS.map(function (r) {
      return codexListRow(r, collectedRelics.indexOf(r.id) !== -1, 'col-relic-pick');
    }).join('');
  }
  function showCodexTab(tab) {
    document.getElementById('codexHeroPanel').hidden = tab !== 'hero';
    document.getElementById('codexWeaponPanel').hidden = tab !== 'weapon';
    document.getElementById('codexRelicPanel').hidden = tab !== 'relic';
    document.getElementById('codexTabHero').classList.toggle('active', tab === 'hero');
    document.getElementById('codexTabWeapon').classList.toggle('active', tab === 'weapon');
    document.getElementById('codexTabRelic').classList.toggle('active', tab === 'relic');
  }
  function codexPct() {
    var tot = HW_HEROES.length + HW_WEAPONS.length + HW_RELICS.length;
    var got = collectedHeroes.length + collectedWeapons.length + collectedRelics.length;
    return tot ? Math.round(got / tot * 100) : 0;
  }
  function openCodex(tab) {
    TCG.sfx('tap'); syncCollection();
    renderHeroCodex(); renderWeaponCodex(); renderRelicCodex();
    var pe = document.getElementById('codexPct'); if (pe) pe.textContent = codexPct() + '%';
    showCodexTab(tab || 'hero');
    document.getElementById('codexModal').hidden = false;
  }
  var _cb = document.getElementById('codexBtn'); if (_cb) _cb.addEventListener('click', function () { openCodex('hero'); });
  document.getElementById('codexTabHero').addEventListener('click', function () { TCG.sfx('tap'); showCodexTab('hero'); });
  document.getElementById('codexTabWeapon').addEventListener('click', function () { TCG.sfx('tap'); showCodexTab('weapon'); });
  document.getElementById('codexTabRelic').addEventListener('click', function () { TCG.sfx('tap'); showCodexTab('relic'); });
  var _cdxX = '<button class="wr-pop-x cdx-x" data-close>✕</button>';
  function showCodexDetail(html, accent) {
    var panel = document.querySelector('#codexDetailModal .modal');
    if (panel && accent) panel.style.borderColor = accent;
    document.getElementById('codexDetailBody').innerHTML = html;
    document.getElementById('codexDetailModal').hidden = false;
    TCG.sfx('tap');
  }
  // 장수 상세(핸드오프 카드형 — 초상·스탯·스킬·획득 경로)
  function codexHeroDetail(d) {
    var got = collectedHeroes.indexOf(d.id) !== -1, rc = rarBg(d.rarity);
    return '<div class="cdx-pop-port">' + TCG.portrait(d.emoji, d.id, '', d.name) +
        '<span class="cdx-pop-rb" style="background:' + rc + '">' + d.rarity + '</span>' + _cdxX +
        '<span class="cdx-pop-own" style="color:' + (got ? '#7ef0b5' : '#c4ab90') + '">' + (got ? TCG.t('hx.owned') : TCG.t('hx.notOwned')) + '</span></div>' +
      '<div style="padding:13px 15px 16px">' +
        '<div class="cdx-pop-h"><b>' + d.name + '</b><small>' + d.cls + '</small></div>' +
        '<div class="cdx-pop-stats"><div class="atk"><div class="lbl">' + TCG.t('hx.atkPower') + '</div><div class="val">⚔ ' + d.atk + '</div></div></div>' +
        '<div class="cdx-pop-box"><div class="sk">✦ ' + d.skill.name + ' <span style="color:#8a7560;font-weight:700;font-size:11px">MP ' + skillMp(d.skill) + '</span></div><div class="skd">' + d.skill.desc + '</div></div>' +
        '<div class="cdx-pop-src"><span style="font-size:14px">📍</span><div><div class="lbl">' + TCG.t('hx.acquirePath') + '</div><div class="v">' + heroPath(d) + '</div></div></div>' +
      '</div>';
  }
  // 장비/유물 상세(핸드오프 카드형)
  function codexItemDetail(it, kind) {
    var isW = kind === 'weapon';
    var got = (isW ? collectedWeapons : collectedRelics).indexOf(it.id) !== -1;
    var accent = isW ? '#c77bff' : '#f0c33c';
    var src = isW ? weaponPath(it) : relicPath(it);
    var effHtml = it.desc + (isW ? ' · 💰 ' + TCG.t('hx.valueGold', { n: weaponCost(it) }) : '');
    return _cdxX +
      '<div style="padding:18px 16px 16px">' +
        '<div class="cdx-pop-item-head"><div class="cdx-pop-ico" style="box-shadow:inset 0 0 0 1.5px ' + accent + ';' + (got ? '' : 'filter:grayscale(1) brightness(.6)') + '">' + it.emoji + '</div>' +
          '<div style="flex:1;min-width:0"><div class="cdx-pop-kind" style="color:' + accent + '">' + (isW ? TCG.t('hx.kindGear') : TCG.t('hx.kindRelic')) + '</div>' +
            '<div class="nm">' + it.name + '</div><div class="ow" style="color:' + (got ? '#7ef0b5' : '#c4ab90') + '">' + (got ? TCG.t('hx.owned') : TCG.t('hx.notOwned')) + '</div></div></div>' +
        '<div class="cdx-pop-box"><div class="lbl" style="font-size:9px;font-weight:700;color:#8a7560">' + TCG.t('hx.effect') + '</div><div style="font-size:12px;color:#e6d8c4;margin-top:3px;line-height:1.5">' + effHtml + '</div></div>' +
        '<div class="cdx-pop-src"><span style="font-size:14px">📍</span><div><div class="lbl">' + TCG.t('hx.acquirePath') + '</div><div class="v">' + src + '</div></div></div>' +
      '</div>';
  }
  document.getElementById('relicColList').addEventListener('click', function (e) {
    var c = e.target.closest('.col-relic-pick'); if (!c) return;
    var r = HW_RELICS.find(function (x) { return x.id === c.dataset.id; }); if (!r) return;
    showCodexDetail(codexItemDetail(r, 'relic'), '#f0c33c');
  });
  document.getElementById('heroColGrid').addEventListener('click', function (e) {
    var c = e.target.closest('.col-card'); if (!c) return;
    var d = HW_BY_ID[c.dataset.id]; if (!d) return;
    showCodexDetail(codexHeroDetail(d), rarBg(d.rarity));
  });
  document.getElementById('weaponColList').addEventListener('click', function (e) {
    var c = e.target.closest('.col-pick'); if (!c) return;
    var w = HW_WEAPON_BY_ID[c.dataset.id]; if (!w) return;
    showCodexDetail(codexItemDetail(w, 'weapon'), '#c77bff');
  });
  (function () {
    var dm = document.getElementById('codexDetailModal');
    dm.addEventListener('click', function (e) { if (e.target === dm || e.target.closest('[data-close]')) dm.hidden = true; });
  })();
  var codexOnBack = null; // 홈→도감 진입 시, 도감을 닫으면 영웅전 정상 진입을 지연 실행
  document.getElementById('codexBack').addEventListener('click', function () {
    TCG.sfx('tap'); document.getElementById('codexModal').hidden = true;
    if (codexOnBack) { var f = codexOnBack; codexOnBack = null; f(); }
  });
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
      run.lordHp = lordMaxHp(); run.lordMp = lordMaxMp(); // 전역 평정 시 주공 HP·MP 완전 회복
      TCG.toast(TCG.t('hx.stageCleared', { cleared: cleared.name, next: HW_STAGES[run.mainStage].name }));
    }
    showMap();
  }

  /* ---------- COMBAT ---------- */
  function genSubEnemies(main, sub) {
    var st = HW_STAGES[main];
    var isBoss = sub === SUB_COUNT - 1;
    var prog = main * SUB_COUNT + sub; // 0..(8*12-1) 전체 진행도
    var md = HW_MODES[run.mode] || HW_MODES.normal; // 노멀/하드/극악
    var hpM = DCFG.eHp * (1 + prog * 0.020) * md.hpMult;          // 모드: 모든 적 HP 배수
    var atkM = DCFG.eAtk * (1 + prog * 0.005);
    var isMid = (sub === 4 || sub === 9); // 5·10번째 출전 = 중간보스
    function inst(d, boss, mid) {
      var hpx = boss ? HW_BOSS_MULT.hpMult : (mid ? HW_MID.hpMult : 1);
      var atkx = boss ? HW_BOSS_MULT.atkMult : (mid ? (HW_MID.atkMult * 1.2) : 1);
      var bbHp = (boss || mid) ? 1.3 : 1;   // 보스·중간보스 HP 1.3배 상향
      var bbAtk = (boss || mid) ? 1.5 : 1;  // 보스·중간보스 공격력 1.5배 상향
      var hp = Math.round(d.hp * hpM * hpx * bbHp);
      var atk = Math.max(1, Math.round(d.atk * atkM * (boss ? md.bossAtkMult : 1) * atkx * 2 * bbAtk)); // 적 공격력 일괄 2배 + 보스/중간보스 1.5배
      var e = { def: d, name: (mid ? '⚜ ' + d.name : d.name), emoji: d.emoji, face: (d.hid || d.hero || d.id || null), maxHp: hp, hp: hp,
        atk: atk, aoe: !!d.aoe, boss: !!boss, mid: !!mid, quote: d.quote || null, crit: (boss ? Math.max(0.15, md.bossCrit) : BASE_CRIT), block: 0, intent: null }; // 적장(보스) 치명타 최소 15%
      if (boss && d.hero && HW_BY_ID[d.hero]) { // 적장: 공격 스킬 + 보조(행동불능/회복) 2종 보유
        var bc = HW_BOSS[diff] || HW_BOSS.normal;
        var heroSk = HW_BY_ID[d.hero].skill;
        var hardPlus = (run.mode === 'hard' || run.mode === 'extreme'); // 하드 이상: 공격 스킬 방어 관통
        var atkSk;
        if (heroSk.type === 'strike' || heroSk.type === 'aoe' || heroSk.type === 'multi') {
          atkSk = { name: heroSk.name, type: heroSk.type, val: Math.round(heroSk.val * 1.5), desc: heroSk.desc, pierce: hardPlus }; // 공격 스킬 1.5배
        } else {
          atkSk = { name: TCG.t('hx.assault'), type: 'strike', val: Math.max(6, Math.round(atk * 0.7)), desc: TCG.t('hx.strikeLord'), pierce: hardPlus };
        }
        var supPool = [
          { name: TCG.t('hx.skRegroup'), type: 'heal', val: Math.max(8, Math.round(hp * 0.18)), desc: TCG.t('hx.skRegroupDesc') },
          { name: TCG.t('hx.skBewitch'), type: 'p_charm', desc: TCG.t('hx.skBewitchDesc') }
        ];
        e.skills = [atkSk, TCG.pick(supPool)];
        e.skill = atkSk; e.maxMp = bc.mp; e.mp = bc.mp; e.skillChance = bc.skillChance; e.atk0 = atk;
      }
      if (mid) { // 중간보스: MP(스테이지별 20~50) + 아군 카드 상태이상 스킬 1종
        e.midSkill = HW_MID_SKILLS[(main * 2 + (sub === 9 ? 1 : 0)) % HW_MID_SKILLS.length];
        e.maxMp = Math.min(50, 20 + main * 4); e.mp = e.maxMp; e.skillChance = HW_MID.skillChance;
      }
      return e;
    }
    var out = [];
    if (isBoss) {
      out.push(inst(TCG.pick(HW_ENEMIES.basic)));
      out.push(inst(HW_COMMANDERS[st.boss], true)); // 적장 — 3명일 때 가운데 배치
      out.push(inst(TCG.pick(HW_ENEMIES.basic)));
    } else if (isMid) {
      var mbIdx = (sub === 9) ? 1 : 0; // 5출전=0 · 10출전=1
      var mbSet = HW_MID_BOSSES[main] || HW_MID_BOSSES[HW_MID_BOSSES.length - 1];
      out.push(inst(HW_ENEMIES.basic[(main + mbIdx) % HW_ENEMIES.basic.length])); // 고정 일반 적 1명
      out.push(inst(mbSet[mbIdx], false, true)); // 고정 네임드 중간보스
    } else {
      var n = (sub <= 3) ? 2 : 3; // 1~4출진=적 2명 · 6~9출진=적 3명 (5·10=중간보스, 11=적장 별도)
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
    var deckUids = activeDeckUids(); run.deck = deckUids; saveRun(); // 출진 덱 정규화(자동 채움) + 저장
    var enemies = genSubEnemies(run.mainStage, s);
    var mhp = lordMaxHp(), mmp = lordMaxMp();
    if (typeof run.lordHp !== 'number') run.lordHp = mhp;
    if (typeof run.lordMp !== 'number') run.lordMp = mmp;
    var startHp = Math.max(1, Math.min(run.lordHp, mhp)); // HP·MP 모두 모험 내내 유지
    var startMp = Math.min(mmp, run.lordMp + Math.round(mmp * 0.10)); // 전투 시작 시 MP 10% 회복
    run.combat = {
      main: run.mainStage, sub: s, enemies: enemies, round: 0,
      lord: { hp: startHp, maxHp: mhp, mp: startMp, maxMp: mmp, block: relicSum('startBlock') }, // 주공(나)
      atkBuff: relicSum('startAtk'),
      draw: TCG.shuffle(deckUids.slice()), // 뽑을 카드 풀(왼쪽) = 출진 덱(선택한 10~30장)
      center: [], used: [],                                              // 가운데 3장 / 사용한 풀(오른쪽)
      sel: null, targeting: false, pending: null, phase: 'player', log: [],
      cstat: {}, sealed: null, sealUsed: false, itemUsed: false, tempAtk: null // 아군 카드 상태이상 / 소모품
    };
    applyStartPoison(run.combat.enemies); // 독항아리(유물) — 전투 시작 시 임의의 적 1명 중독
    show('combatScreen');
    if (isBoss) {
      fxBanner(TCG.t('cmb.bannerBoss', { name: HW_COMMANDERS[st.boss].name }), 'boss', 1500); shake('big');
      logMsg(TCG.t('cmb.bannerBoss', { name: HW_COMMANDERS[st.boss].name }));
    } else {
      var region = (st.regions && st.regions[s]) ? st.regions[s] : '';
      var sortieTxt = TCG.t('cmb.bannerSortie', { stage: st.name, n: s + 1, max: SUB_COUNT }) + (region ? ' — ' + region : '');
      fxBanner(sortieTxt, 'round', 1000);
      logMsg(sortieTxt);
    }
    beginRound();
    // 보스/중간보스 등장 대사 — 카드 아래 말풍선 2초 (보스 위치가 가운데여도 동작)
    var lead = null;
    for (var li = 0; li < enemies.length; li++) { if (enemies[li].boss || enemies[li].mid) { lead = enemies[li]; break; } }
    if (lead && lead.quote) {
      var leadIdx = enemies.indexOf(lead);
      setTimeout(function () { fxQuote(enemyEl(leadIdx), lead.quote, 5000); }, isBoss ? 1100 : 700);
    }
  }

  // 독항아리(유물): 전투 시작 시 살아있는 적 1명을 임의로 골라 중독 부여
  function applyStartPoison(enemies) {
    var p = relicSum('startPoison'); if (!p) return;
    var alive = (enemies || []).filter(function (e) { return e.hp > 0; });
    if (!alive.length) return;
    var target = TCG.pick(alive);
    target.poison = (target.poison || 0) + p;
    logMsg('☠ ' + TCG.t('hx.poisonJar', { name: target.name, n: p }));
  }

  /* ---------- card piles: 뽑을 풀(draw) / 가운데(center,3장) / 사용한 풀(used) ---------- */
  function centerSize() { return 3 + relicSum('energy'); } // 가운데 카드 수 (유물로 증가 가능)
  function heroByUid(uid) { return run.party.find(function (h) { return h.uid === uid; }); }
  function aliveUid(uid) { return !!heroByUid(uid) && !(run.combat && run.combat.sealed === uid); } // 봉인(사신)된 카드는 덱에서 제외
  function cstat(uid) { var c = run.combat; if (!c.cstat) c.cstat = {}; if (!c.cstat[uid]) c.cstat[uid] = { stun: 0, poison: 0, cause: '' }; return c.cstat[uid]; }
  function cardStunned(uid) { var c = run.combat; return !!(c.cstat && c.cstat[uid] && c.cstat[uid].stun > 0); }
  function cleanPiles() {
    var c = run.combat;
    c.center = c.center.filter(aliveUid); c.draw = c.draw.filter(aliveUid); c.used = c.used.filter(aliveUid);
  }
  function drawOne() {
    var c = run.combat;
    if (!c.draw.length) {
      if (!c.used.length) return false;
      c.draw = TCG.shuffle(c.used); c.used = [];   // 뽑을 풀이 비면 사용한 풀을 랜덤 섞어 이동
      logMsg(TCG.t('hx.deckReshuffled'));
    }
    while (c.draw.length && !aliveUid(c.draw[c.draw.length - 1])) c.draw.pop();
    if (!c.draw.length) return false;
    c.center.push(c.draw.pop());
    return true;
  }
  function refillCenter() {
    var c = run.combat;
    cleanPiles();
    var cap = Math.min(centerSize(), c.draw.length + c.center.length + c.used.length);
    var guard = 0;
    while (c.center.length < cap && guard++ < 60) { if (!drawOne()) break; }
  }

  function beginRound() {
    var c = run.combat;
    c.round++;
    if (c.round > 1) c.lord.block = 0; // 라운드 시작 시 주공 블록 초기화(1R은 startBlock 유지) — MP 자동 재생 없음
    c.itemUsed = false; // 소모성 아이템은 턴당 1개
    c.cardBuff = {}; // 아군 1명 공격 버프는 1턴만 유지
    if (c.tempAtk && c.tempAtk.turns > 0) { c.tempAtk.turns--; }
    // 중독된 아군 카드 → 주공이 턴마다 지속 피해(턴마다 1씩 약화, 해독초로 즉시 해제)
    if (c.cstat) {
      var pTot = 0; Object.keys(c.cstat).forEach(function (uid) { if (c.cstat[uid].poison > 0 && heroByUid(uid)) pTot += c.cstat[uid].poison; });
      if (pTot > 0 && c.round > 1) {
        c.lord.hp = Math.max(0, c.lord.hp - pTot); fxHitHero(lordEl(), pTot, 0, false); logMsg(TCG.t('hx.poisonLordDmg', { n: pTot }));
        Object.keys(c.cstat).forEach(function (uid) { if (c.cstat[uid].poison > 0) c.cstat[uid].poison--; });
        if (c.lord.hp <= 0) { setTimeout(gameOver, 400); return; }
      }
    }
    refillCenter();
    rollIntents();
    c.sel = null; c.targeting = false; c.pending = null;
    renderCombat();
    if (c.round >= 2) fxBanner(TCG.t('cmb.bannerRound', { n: c.round }), 'round', 850);
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
  function fxQuote(unitEl, text, ms) { // 보스/중간보스 등장 대사(말풍선) — 카드 아래에 표시
    if (!TCG.isDialogueOn() || !text) return;
    var p = rectOf(unitEl); if (!p) return;
    var d = spawn('fx-quote', p.x, p.y + p.h / 2 + 8, '', ms || 2000);
    if (d) d.textContent = text;
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
    var cls = level === 'huge' ? 'shake-huge' : (level === 'big' ? 'shake-big' : 'shake-sm');
    sc.classList.add(cls);
    setTimeout(function () { sc.classList.remove(cls); }, level === 'huge' ? 560 : (level === 'big' ? 420 : 240));
  }
  function fxFlash(color) {
    var layer = fxLayerEl(); if (!layer || typeof document.createElement !== 'function') return;
    var d = document.createElement('div'); if (!d) return;
    d.className = 'fx-flash'; if (d.style) d.style.background = color || 'rgba(255,211,77,0.28)';
    layer.appendChild(d); setTimeout(function () { if (d.remove) d.remove(); }, 300);
  }
  function fxCritBoom(x, y) { // 치명타 강조 연출
    fxRing(x, y, '#ffd34d'); fxRing(x, y, '#fff2b0'); fxBurst(x, y, '#ffd34d');
    fxParticles(x, y, 18, '#ffe89a'); fxFlash('rgba(255,211,77,0.32)'); shake('huge');
  }
  // impact effect on an enemy at element `el`; physical=slash, else colored burst
  function fxHitEnemy(el, dmg, kind) {
    var p = rectOf(el); if (!p) return;
    if (kind === 'crit') {
      fxSlash(p.x, p.y); fxCritBoom(p.x, p.y);
      fxFloat(p.x, p.y - 24, TCG.t('cmb.crit'), '#ffd34d', true);
      fxFloat(p.x, p.y, '-' + dmg, '#ffd34d', true);
      fxBanner(TCG.t('cmb.crit'), 'crit', 650);
    } else if (kind === 'aoe') { fxBurst(p.x, p.y, '#ff8a4c'); fxParticles(p.x, p.y, 8, '#ffcaa0'); fxFloat(p.x, p.y, '-' + dmg, '#ff9a9a', false); }
    else { fxSlash(p.x, p.y); fxBurst(p.x, p.y, '#ffffff'); fxParticles(p.x, p.y, 7, '#ffc6c6'); fxFloat(p.x, p.y, '-' + dmg, '#ff9a9a', true); }
  }
  function fxHitHero(el, dmg, blocked, crit) {
    var p = rectOf(el); if (!p) return;
    if (blocked) fxFloat(p.x, p.y - 14, '🛡' + blocked, '#9fd2ff');
    if (dmg > 0) {
      fxSlash(p.x, p.y); fxBurst(p.x, p.y, crit ? '#ffd34d' : '#ff6b6b');
      if (crit) { fxCritBoom(p.x, p.y); fxFloat(p.x, p.y - 24, TCG.t('cmb.crit'), '#ffd34d', true); fxBanner(TCG.t('cmb.crit'), 'crit', 650); }
      else fxParticles(p.x, p.y, 6, '#ffb0b0');
      fxFloat(p.x, p.y, '-' + dmg, crit ? '#ffd34d' : '#ff9a9a', true);
    }
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
    // 상단 헤더 — 전역/스테이지명 + 턴 수
    var chd = document.getElementById('combatHead');
    if (chd) {
      var cst = HW_STAGES[c.main];
      var tier = c.enemies.some(function (e) { return e.boss; }) ? TCG.t('hx.tierCommander') : (c.enemies.some(function (e) { return e.mid; }) ? TCG.t('hx.tierElite') : TCG.t('hx.tierBattle'));
      chd.innerHTML =
        '<button class="ch-back" id="combatBack" aria-label="' + TCG.t('hx.back') + '" title="' + TCG.t('hx.toCamp') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#f0c33c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<div class="ch-info"><div class="ch-sub">' + TCG.t('hx.regionStage', { m: c.main + 1, n: c.sub + 1 }) + '</div>' +
        '<div class="ch-name">' + (cst ? cst.name : '') + ' · ' + tier + '</div></div>' +
        '<div class="ch-turn"><span>' + TCG.t('cmb.turnLabel') + '</span><b>' + Math.max(1, c.round) + '</b></div>';
      var cb = document.getElementById('combatBack');
      if (cb) cb.onclick = function () {
        if (window.confirm(TCG.t('hx.abandonConfirm'))) { TCG.sfx('tap'); showMap(); }
      };
    }
    // enemies (적장은 주공을 공격)
    document.getElementById('enemyRow').innerHTML = c.enemies.map(function (e, idx) {
      var dead = e.hp <= 0;
      var tgt = c.targeting && c.pending && c.pending.side === 'enemy' && !dead;
      var charmed = e.charmed > 0;
      var confd = e.confused > 0;
      var intentTxt = charmed ? '💤 ' + TCG.t('hx.stCharm') : (confd ? '💤 ' + TCG.t('hx.stConfuse') : (e.intent ? (e.intent.type === 'aoe' ? '💥' + e.intent.dmg : '⚔️' + e.intent.dmg) : ''));
      var statuses = (charmed ? '<span class="u-st charm">💗 ' + TCG.t('hx.stCharm') + ' ' + e.charmed + '</span>' : '') +
        (confd ? '<span class="u-st charm">💫 ' + TCG.t('hx.stConfuse') + ' ' + e.confused + '</span>' : '') +
        (e.poison > 0 ? '<span class="u-st pois">☠ ' + TCG.t('hx.stPoison') + ' ' + e.poison + '</span>' : '');
      return '<div class="unit enemy' + (dead ? ' dead' : '') + (tgt ? ' targetable' : '') + ((charmed || confd) ? ' charmed' : '') + (e.boss ? ' is-boss' : '') + (e.mid ? ' is-mid' : '') + '" data-side="enemy" data-idx="' + idx + '">' +
        (e.mid ? '<div class="u-tag mid">' + TCG.t('cmb.tagMid') + '</div>' : (e.boss ? '<div class="u-tag boss">' + TCG.t('cmb.tagBoss') + '</div>' : '')) +
        (dead ? '' : '<div class="u-intent">' + intentTxt + '</div>') +
        (e.block > 0 ? '<div class="u-block">🛡' + e.block + '</div>' : '') +
        TCG.portrait(e.emoji, e.face || e.name) +
        '<div class="u-name">' + e.name + '</div>' +
        hpBar({ hp: Math.max(0, e.hp), maxHp: e.maxHp }, true) +
        '<div class="u-stat"><span class="u-hp-text">♥ ' + Math.max(0, e.hp) + '/' + e.maxHp + '</span>' +
          (e.maxMp ? '<span class="u-mp-text">◈ ' + Math.max(0, e.mp) + '/' + e.maxMp + '</span>' : '') + '</div>' +
        (statuses ? '<div class="u-statuses">' + statuses + '</div>' : '') + '</div>';
    }).join('');

    // 주공(나) 상태 바 — 적의 공격 대상
    var L = c.lord;
    var hpPct = Math.max(0, Math.round(L.hp / L.maxHp * 100));
    var mpPct = Math.max(0, Math.round(L.mp / Math.max(1, L.maxMp) * 100));
    document.getElementById('lordBar').innerHTML =
      '<div class="lord">' +
        TCG.portrait('👑', 'lord', 'lord-art') +
        '<div class="lord-info">' +
          '<div class="lord-name">' + TCG.t('hx.lordMe') + (L.block > 0 ? ' <span class="lord-block">🛡' + L.block + '</span>' : '') + '</div>' +
          '<div class="lbar hp"><i style="width:' + hpPct + '%"></i><span>❤ ' + Math.max(0, L.hp) + ' / ' + L.maxHp + '</span></div>' +
          '<div class="lbar mp"><i style="width:' + mpPct + '%"></i><span>💧 MP ' + Math.max(0, L.mp) + ' / ' + L.maxMp + '</span></div>' +
        '</div></div>';

    renderPiles();
    renderActionBar();
    renderItemBar();
    document.getElementById('endTurnBtn').disabled = (c.phase === 'enemy' || c.busy);
    var hint = document.getElementById('combatHint');
    if (c.phase === 'enemy') hint.textContent = TCG.t('cmb.hintEnemy');
    else if (c.targeting) hint.textContent = TCG.t('cmb.hintTarget');
    else if (c.sel) hint.textContent = TCG.t('cmb.hintAction');
    else hint.textContent = TCG.t('cmb.hintIdle');
  }

  function defenseOf(h) { return 3 + Math.floor(effAtk(h) / 3); }

  function renderPiles() {
    var c = run.combat;
    // 왼쪽: 뽑을 카드 풀 (겹친 더미)
    var drawStack = '';
    for (var i = 0; i < Math.min(c.draw.length, 5); i++) drawStack += '<div class="pile-card" style="--i:' + i + '"></div>';
    document.getElementById('drawPile').innerHTML =
      drawStack + '<div class="pile-label">' + TCG.t('hx.drawPile') + ' <b>' + c.draw.length + '</b></div>';

    // 가운데: 공격/방어 덱 (3장 이상이면 가로 스크롤)
    var canAct = c.phase !== 'enemy' && !c.targeting && !c.busy;
    var centerHtml = c.center.map(function (uid) {
      var h = heroByUid(uid); if (!h) return '';
      var sk = h.def.skill;
      var st = c.cstat && c.cstat[uid];
      var stunned = st && st.stun > 0, pois = st && st.poison > 0;
      var sel = c.sel && c.sel.uid === uid; // 대상 지정 중에도 선택된 카드 강조 유지
      var cls = 'combat-card' + (sel ? ' selected' : '') + ((canAct && !stunned) ? '' : ' unplayable') + (stunned ? ' stunned' : '');
      var ws = heroWpns(h);
      var wEmoji = ws.map(function (w) { return w.emoji; }).join('');
      var wName = ws.map(function (w) { return w.name; }).join(', ');
      var badge = (stunned || pois) ? '<div class="cc-status">' +
        (stunned ? '<span class="cc-stun">' + (st.cause === '매혹' ? '💗' : '💫') + '</span>' : '') +
        (pois ? '<span class="cc-pois">☠' + st.poison + '</span>' : '') +
        '</div>' : '';
      return '<div class="' + cls + '" data-uid="' + uid + '">' + badge +
        TCG.portrait(h.def.emoji, h.def.id, 'cc-art', h.def.name) +
        '<div class="cc-name">' + h.def.name + '</div>' +
        '<div class="cc-atk">⚔' + effAtk(h) + '</div>' +
        (wEmoji ? '<div class="cc-wpn" title="' + wName + '">' + wEmoji + '</div>' : '') +
        '<div class="cc-skill">' + sk.name + '</div></div>';
    }).join('');
    document.getElementById('centerCards').innerHTML = centerHtml
      ? '<div class="center-inner">' + centerHtml + '</div>'
      : '<div class="center-empty">' + TCG.t('hx.noCards') + '</div>';

    // 오른쪽: 사용한 카드 풀 (겹친 더미, 시작 시 빈 영역)
    var usedStack = '';
    for (var j = 0; j < Math.min(c.used.length, 5); j++) usedStack += '<div class="pile-card used" style="--i:' + j + '"></div>';
    document.getElementById('usedPile').innerHTML =
      usedStack + '<div class="pile-label">' + TCG.t('hx.usedPile') + ' <b>' + c.used.length + '</b></div>';
    // 핸드오프: 뽑을/사용 카드 수는 하단 액션 바에 숫자로 표시
    var dcEl = document.getElementById('drawCount'); if (dcEl) dcEl.textContent = c.draw.length;
    var ucEl = document.getElementById('usedCount'); if (ucEl) ucEl.textContent = c.used.length;
  }

  function renderItemBar() {
    var bar = document.getElementById('itemBar'); if (!bar) return;
    var c = run.combat, items = run.items || [];
    var used = c && (c.itemUsed || c.phase === 'enemy' || c.targeting);
    var slots = '';
    for (var i = 0; i < HW_ITEM_MAX; i++) {
      var id = items[i], it = id ? HW_CONS_BY_ID[id] : null;
      if (it) slots += '<button class="item-slot' + (used ? ' used' : '') + '" data-i="' + i + '" title="' + it.name + ' · ' + it.desc + '"><span class="is-emoji">' + it.emoji + '</span></button>';
      else slots += '<span class="item-slot empty">＋</span>';
    }
    bar.innerHTML = slots;
  }
  function applyItem(it) {
    var c = run.combat, L = c.lord, tag = it.emoji + ' ' + it.name + ' — ';
    if (it.kind === 'hp') { if (L.hp >= L.maxHp) { TCG.toast(TCG.t('hx.hpFull')); return false; } L.hp = Math.min(L.maxHp, L.hp + it.val); fxSupport(lordEl(), '+' + it.val, '#7ef0b5'); logMsg(tag + TCG.t('hx.lordHpUp', { n: it.val })); }
    else if (it.kind === 'mp') { if (L.mp >= L.maxMp) { TCG.toast(TCG.t('hx.mpFull')); return false; } L.mp = Math.min(L.maxMp, L.mp + it.val); fxSupport(lordEl(), '💧+' + it.val, '#9fd2ff'); logMsg(tag + TCG.t('hx.lordMpUp', { n: it.val })); }
    else if (it.kind === 'cure_poison') { var n = 0; if (c.cstat) Object.keys(c.cstat).forEach(function (u) { if (c.cstat[u].poison > 0) { c.cstat[u].poison = 0; n++; } }); if (!n) { TCG.toast(TCG.t('hx.noPoisonedCards')); return false; } logMsg(tag + TCG.t('hx.curePoison', { n: n })); }
    else if (it.kind === 'cure_confuse') { var m = 0; if (c.cstat) Object.keys(c.cstat).forEach(function (u) { if (c.cstat[u].stun > 0) { c.cstat[u].stun = 0; c.cstat[u].cause = ''; m++; } }); if (!m) { TCG.toast(TCG.t('hx.noConfusedCards')); return false; } logMsg(tag + TCG.t('hx.cureConfuse', { n: m })); }
    else if (it.kind === 'atk') { c.tempAtk = { val: it.val, turns: it.turns }; fxSupport(lordEl(), '⚔+' + it.val, '#ffd86b'); logMsg(tag + TCG.t('hx.armyAtkUp', { turns: it.turns, n: it.val })); }
    else if (it.kind === 'shield') { L.block += it.val; fxSupport(lordEl(), '🛡+' + it.val, '#9fd2ff', 'shield'); logMsg(tag + TCG.t('hx.lordShieldUp', { n: it.val })); }
    else return false;
    return true;
  }
  var pendingItemIdx = -1;
  function askItemConfirm(idx, it) {
    pendingItemIdx = idx;
    document.getElementById('itemConfirmBody').innerHTML =
      '<div style="font-size:46px;line-height:1;margin-bottom:6px">' + it.emoji + '</div>' +
      '<h2 style="margin-bottom:6px">' + it.name + '</h2>' +
      '<p style="color:var(--ink-dim)">' + it.desc + '</p>' +
      '<p style="font-size:12px;color:var(--ink-dim);margin-top:8px">' + TCG.t('uiItemConfirm') + '</p>';
    document.getElementById('itemConfirm').hidden = false;
  }
  document.getElementById('itemBar').addEventListener('click', function (e) {
    var b = e.target.closest('.item-slot'); if (!b || !b.dataset.i) return;
    var c = run.combat; if (!c || c.phase === 'enemy' || c.targeting || c.busy) return;
    if (c.itemUsed) { TCG.toast(TCG.t('hx.itemAlreadyUsed')); return; }
    var idx = parseInt(b.dataset.i, 10), it = HW_CONS_BY_ID[run.items[idx]]; if (!it) return;
    TCG.sfx('tap'); askItemConfirm(idx, it); // 아이콘만 보고 잘못 누르는 것 방지 — 확인 후 사용
  });
  (function () {
    var modal = document.getElementById('itemConfirm'); if (!modal) return;
    function close() { modal.hidden = true; pendingItemIdx = -1; }
    document.getElementById('itemConfirmNo').addEventListener('click', function () { TCG.sfx('tap'); close(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.getElementById('itemConfirmYes').addEventListener('click', function () {
      var c = run.combat; modal.hidden = true;
      if (pendingItemIdx < 0 || !c || c.phase === 'enemy' || c.targeting || c.busy || c.itemUsed) { pendingItemIdx = -1; return; }
      var it = HW_CONS_BY_ID[run.items[pendingItemIdx]]; if (!it) { pendingItemIdx = -1; return; }
      if (!applyItem(it)) { pendingItemIdx = -1; return; } // 사용 불가(HP 가득 등)면 소모하지 않음
      run.items.splice(pendingItemIdx, 1); c.itemUsed = true; pendingItemIdx = -1; TCG.sfx('heal'); saveRun(); renderCombat();
    });
  })();
  function renderActionBar() {
    var c = run.combat;
    var bar = document.getElementById('actionBar');
    if (!c.sel) { bar.hidden = true; return; }
    var h = heroByUid(c.sel.uid);
    if (!h) { bar.hidden = true; return; }
    var sk = h.def.skill;
    var buffDone = sk.type === 'buff' && sk.scope === 'army' && c.buffApplied && c.buffApplied[h.uid]; // 전군 버프는 전투당 1회
    var mp = skillMp(sk);
    var canSkill = !buffDone && c.lord.mp >= mp;
    var mpLabel = buffDone ? TCG.t('cmb.applied') : ('💧' + mp);
    var critPct = Math.round(critChance(h) * 100);
    var tgt = c.targeting && c.pending; // 대상 지정 중 — 선택한 행동을 강조
    var atkSel = tgt && c.pending.kind === 'attack', skSel = tgt && c.pending.kind === 'skill';
    bar.hidden = false;
    bar.innerHTML =
      '<div class="ab-title">' + h.def.name + ' — ' + TCG.t('cmb.chooseAction') + '</div>' +
      '<div class="ab-row">' +
        '<button class="act-btn' + (atkSel ? ' chosen' : '') + '" data-act="attack">⚔ ' + TCG.t('cmb.attack') + '<small>' + TCG.t('cmb.dmg') + ' ' + effAtk(h) + (hasWpnFlag(h, 'tripleStrike') ? ' ×3' : (hasWpnFlag(h, 'doubleStrike') ? ' ×2' : '')) + (wpnVal(h, 'poison') ? ' ☠' + wpnVal(h, 'poison') : '') + (critPct > 1 ? ' 💥' + critPct + '%' : '') + ' · 💧0</small></button>' +
        '<button class="act-btn skill' + (skSel ? ' chosen' : '') + '" data-act="skill"' + (canSkill ? '' : ' disabled') + '>✦ ' + sk.name + '<small>' + mpLabel + ' · ' + sk.desc + '</small></button>' +
      '</div>' +
      '<button class="act-btn cancel" data-act="cancel">' + TCG.t('cmb.cancel') + '</button>';
  }

  // input — 적장만 대상 선택(아군 스킬은 주공에게 자동 적용)
  document.getElementById('enemyRow').addEventListener('click', function (e) { onUnitClick(e); });
  function onUnitClick(e) {
    var c = run.combat; if (!c || c.phase === 'enemy' || !c.targeting || c.busy) return;
    var u = e.target.closest('.unit'); if (!u) return;
    if (c.pending.side === 'enemy' && u.dataset.side === 'enemy' && u.classList.contains('targetable')) {
      executeOn('enemy', parseInt(u.dataset.idx, 10));
    }
  }
  document.getElementById('centerCards').addEventListener('click', function (e) {
    var c = run.combat; if (!c || c.phase === 'enemy' || c.targeting || c.busy) return;
    var card = e.target.closest('.combat-card'); if (!card) return;
    var uid = card.dataset.uid;
    if (cardStunned(uid)) { var cs = c.cstat[uid]; TCG.toast(TCG.t('hx.cardStunnedToast', { cause: (cs.cause === '매혹' ? TCG.t('hx.stCharm') : TCG.t('hx.stConfuse')) })); return; }
    c.sel = (c.sel && c.sel.uid === uid) ? null : { uid: uid };
    renderCombat();
  });
  document.getElementById('actionBar').addEventListener('click', function (e) {
    var b = e.target.closest('.act-btn'); if (!b || b.disabled) return;
    e.stopPropagation(); // 바깥 클릭 닫기 핸들러로 전파 방지(재렌더로 버튼이 분리되어 오작동하는 것 방지)
    var c = run.combat; if (!c.sel || c.busy) return;
    var act = b.dataset.act;
    if (act === 'cancel') { c.sel = null; c.targeting = false; c.pending = null; renderCombat(); return; }
    var h = heroByUid(c.sel.uid); if (!h) return;
    if (act === 'attack') { beginTarget('enemy', 'attack'); return; }
    // skill (회복 스킬은 MP 소모 없음, 그 외는 MP 소모)
    var sk = h.def.skill;
    if (sk.type === 'buff' && sk.scope === 'army' && c.buffApplied && c.buffApplied[h.uid]) { TCG.toast(TCG.t('hx.buffOncePerBattle', { sk: sk.name })); return; }
    if (c.lord.mp < skillMp(sk)) { TCG.toast(TCG.t('hx.mpNotEnough')); return; }
    if (sk.type === 'strike' || sk.type === 'charm' || sk.type === 'confuse') beginTarget('enemy', 'skill'); // 단일 적 대상
    else doSkill(h, null); // aoe(전체)·multi(무작위)·heal/shield/buff(주공) 자동 처리
  });
  // 행동 선택 창 바깥(창·카드·대상 지정 클릭 외)을 클릭하면 닫기
  document.addEventListener('click', function (e) {
    var c = run.combat; if (!c || !c.sel || c.busy) return;
    var bar = document.getElementById('actionBar'); if (!bar || bar.hidden) return;
    if (e.target.closest('#actionBar')) return;               // 창 내부
    if (e.target.closest('.combat-card')) return;             // 카드 선택은 별도 처리
    if (c.targeting && e.target.closest('#enemyRow')) return; // 대상 지정 클릭
    c.sel = null; c.targeting = false; c.pending = null; renderCombat();
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
  // 적의 공격은 주공(나)을 노린다 — 블록으로 먼저 흡수 후 HP 감소. pierce=방어 관통(블록 무시)
  function dmgLord(dmg, crit, pierce) {
    var c = run.combat, L = c.lord;
    if (Math.random() < lordEvade()) { fxSupport(lordEl(), TCG.t('hx.evade'), '#8effb0'); return true; } // 회피
    var d = dmg, blocked = 0;
    if (!pierce && L.block > 0) { var ab = Math.min(L.block, d); L.block -= ab; d -= ab; blocked = ab; }
    L.hp = Math.max(0, L.hp - d);
    fxHitHero(lordEl(), d, blocked, crit);
    return false;
  }
  function enemyEl(idx) { return document.querySelector('#enemyRow .unit[data-idx="' + idx + '"]'); }
  function lordEl() { return document.querySelector('#lordBar .lord-art'); }

  function doAttack(h, enemy) {
    var c = run.combat;
    var dmg = effAtk(h);
    var hits = hasWpnFlag(h, 'tripleStrike') ? 3 : (hasWpnFlag(h, 'doubleStrike') ? 2 : 1);
    c.busy = true; // 다회 공격은 타격마다 끊어서 연출
    var total = 0, anyCrit = false, k = 0, tgt = enemy;
    function step() {
      if (k >= hits) { return done(); }
      if (tgt.hp <= 0) { // 현재 대상이 죽으면 남은 타격은 다른 살아있는 적에게
        var pool = living(c.enemies);
        if (!pool.length) { return done(); } // 남은 적이 없으면 종료
        tgt = TCG.pick(pool);
      }
      k++;
      TCG.sfx('attack');
      var crit = rollCrit(critChance(h)); // 치명타: 공격력 2배
      var hitDmg = crit ? dmg * 2 : dmg;
      if (crit) anyCrit = true;
      dmgEnemy(tgt, hitDmg, enemyEl(c.enemies.indexOf(tgt)), crit ? 'crit' : null);
      if (!crit) shake('sm');
      total += hitDmg;
      renderCombat();
      setTimeout(step, hits > 1 ? 240 : 120);
    }
    function done() {
      var pv = wpnVal(h, 'poison');
      if (pv && tgt.hp > 0) { tgt.poison = (tgt.poison || 0) + pv; logMsg(TCG.t('hx.logPoisonApply', { name: tgt.name, n: pv })); }
      logMsg(TCG.t('hx.logAttack', { name: h.def.name, target: enemy.name, dmg: total }) + (anyCrit ? TCG.t('hx.critSuffix') : ''));
      c.busy = false;
      finishPlay();
    }
    step();
  }
  function doSkill(h, target) {
    var c = run.combat; var sk = h.def.skill;
    c.lord.mp = Math.max(0, c.lord.mp - skillMp(sk)); // 모든 스킬은 MP 소모(회복 포함)
    var shl = relicSum('skillHeal'); // 유물: 스킬 사용 시 주공 HP 회복
    if (shl) { c.lord.hp = Math.min(c.lord.maxHp, c.lord.hp + shl); fxSupport(lordEl(), '+' + shl, '#7ef0b5'); }
    TCG.sfx(sk.type === 'heal' ? 'heal' : 'skill');
    fxBanner('✨ ' + h.def.name + ' 「' + sk.name + '」', 'skill-cast', 1000); // 스킬 발동 강조 (이름·스킬명은 데이터)
    fxFlash('rgba(150,200,255,0.16)');
    var hp0 = rectOf(lordEl()); if (hp0) fxRing(hp0.x, hp0.y, '#9fd2ff');
    var pw = effAtk(h);
    if (sk.type === 'strike') {
      var scrit = rollCrit(critChance(h)); // 스킬도 치명타 적용
      var sdmg = (pw + sk.val) * (scrit ? 2 : 1);
      dmgEnemy(target, sdmg, enemyEl(c.enemies.indexOf(target)), scrit ? 'crit' : null); shake('big');
      logMsg(TCG.t('hx.logSkillDmg', { name: h.def.name, sk: sk.name, dmg: sdmg }) + (scrit ? TCG.t('hx.critSuffix') : ''));
    } else if (sk.type === 'aoe') {
      var acrit = rollCrit(critChance(h)); var aval = sk.val * (acrit ? 2 : 1);
      living(c.enemies).forEach(function (e) { dmgEnemy(e, aval, enemyEl(c.enemies.indexOf(e)), acrit ? 'crit' : 'aoe'); }); shake('big');
      logMsg(TCG.t('hx.logSkillAoe', { name: h.def.name, sk: sk.name, dmg: aval }) + (acrit ? TCG.t('hx.critSuffix') : ''));
    } else if (sk.type === 'multi') {
      // 다회 공격 스킬은 타격당 공격력의 70% × 타수(타격 수)만큼 공격
      var perHit = Math.max(1, Math.round(pw * 0.7));
      c.busy = true; var mi = 0; // 타격마다 끊어서 연출
      (function mhit() {
        var alive = living(c.enemies);
        if (mi >= sk.val || !alive.length) { logMsg(TCG.t('hx.logSkillMulti', { name: h.def.name, sk: sk.name, hits: sk.val, per: perHit })); c.busy = false; finishPlay(); return; }
        mi++;
        var e2 = TCG.pick(alive);
        TCG.sfx('attack');
        var mcrit = rollCrit(critChance(h)); // 다회 스킬도 타격마다 치명타 판정
        dmgEnemy(e2, mcrit ? perHit * 2 : perHit, enemyEl(c.enemies.indexOf(e2)), mcrit ? 'crit' : null);
        shake('sm'); renderCombat();
        setTimeout(mhit, 210);
      })();
      return; // 비동기 처리 — 아래 공통 finishPlay 건너뜀
    } else if (sk.type === 'heal') {
      c.lord.hp = Math.min(c.lord.maxHp, c.lord.hp + sk.val); // HP만 회복(MP 회복 없음)
      if (h.def.id === 'oracle') c.lord.block += 5;
      fxSupport(lordEl(), '+' + sk.val, '#7ef0b5');
      logMsg(TCG.t('hx.logSkillHeal', { name: h.def.name, sk: sk.name, n: sk.val }));
    } else if (sk.type === 'shield') {
      c.lord.block += sk.val;
      fxSupport(lordEl(), '🛡+' + sk.val, '#9fd2ff', 'shield');
      logMsg(TCG.t('hx.logSkillShield', { name: h.def.name, sk: sk.name, n: sk.val }));
    } else if (sk.type === 'buff' && sk.scope === 'army') {
      // 전군 버프: 전투당 1회만 적용(중첩 방지) — 같은 장수를 매 턴 다시 써도 누적되지 않음
      if (!c.buffApplied) c.buffApplied = {};
      if (!c.buffApplied[h.uid]) {
        c.buffApplied[h.uid] = true;
        c.atkBuff = (c.atkBuff || 0) + sk.val;
        fxSupport(lordEl(), '⚔+' + sk.val, '#ffd86b');
        logMsg(TCG.t('hx.logArmyBuff', { name: h.def.name, sk: sk.name, n: sk.val }));
      } else {
        logMsg(TCG.t('hx.logBuffAlready', { name: h.def.name, sk: sk.name }));
      }
    } else if (sk.type === 'buff') {
      // 아군 1명 버프: 현재 출진(가운데) 카드 중 1장(시전자 제외)에 1턴만 공격력 +val
      if (!c.cardBuff) c.cardBuff = {};
      var pool = c.center.filter(function (u) { return u !== h.uid && aliveUid(u) && !cardStunned(u); });
      if (!pool.length) pool = c.center.filter(function (u) { return u !== h.uid && aliveUid(u); });
      var tgtUid = pool.reduce(function (best, u) { return (best == null || effAtk(heroByUid(u)) > effAtk(heroByUid(best))) ? u : best; }, null);
      if (tgtUid) {
        c.cardBuff[tgtUid] = (c.cardBuff[tgtUid] || 0) + sk.val;
        var th = heroByUid(tgtUid), tel = document.querySelector('.combat-card[data-uid="' + tgtUid + '"]');
        if (tel) fxSupport(tel, '⚔+' + sk.val, '#ffd86b');
        logMsg(TCG.t('hx.logCardBuff', { name: h.def.name, sk: sk.name, target: (th ? th.def.name : ''), n: sk.val }));
      } else {
        logMsg(TCG.t('hx.logNoBuffTarget', { name: h.def.name, sk: sk.name }));
      }
    } else if (sk.type === 'charm') {
      // 적을 매혹 — 행동 불가. 중첩 방지: 마지막 1개만 적용(혼란과도 배타)
      if (target && target.hp > 0) {
        target.confused = 0; target.charmed = sk.val;
        var cel = enemyEl(c.enemies.indexOf(target));
        fxSupport(cel, '💗 ' + TCG.t('hx.stCharm'), '#ff9ad0');
        if (cel && cel.classList) cel.classList.add('charmed');
        var clog = TCG.t('hx.logCharm', { name: h.def.name, sk: sk.name, target: target.name });
        if (sk.poison) { target.poison = (target.poison || 0) + sk.poison; clog += TCG.t('hx.logPlusPoison', { n: sk.poison }); } // 매혹 + 중독(초선)
        logMsg(clog);
      }
    } else if (sk.type === 'confuse') {
      // 적을 혼란 — 행동 불가. 중첩 방지: 마지막 1개만 적용(매혹과도 배타)
      if (target && target.hp > 0) {
        target.charmed = 0; target.confused = sk.val;
        var cel2 = enemyEl(c.enemies.indexOf(target));
        fxSupport(cel2, '💫 ' + TCG.t('hx.stConfuse'), '#c9a8ff');
        if (cel2 && cel2.classList) cel2.classList.add('charmed');
        logMsg(TCG.t('hx.logConfuse', { name: h.def.name, sk: sk.name, target: target.name }));
      }
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

  // 턴 종료: 가운데 남은 카드는 사용한 풀로 버려진다(방어 기능 제거) → 적의 턴
  document.getElementById('endTurnBtn').addEventListener('click', function () {
    var c = run.combat; if (!c || c.phase === 'enemy' || c.targeting || c.busy) return;
    var deployed = c.center.slice(); // 이번 턴에 출진(가운데)한 카드들
    deployed.forEach(function (uid) { c.used.push(uid); });
    c.center = [];
    c.sel = null;
    // 행동 불가(혼란·매혹)는 '출진한' 카드만 1회 소모 — 턴 무관, 덱에 묻혀 있으면 계속 유지
    if (c.cstat) deployed.forEach(function (uid) { if (c.cstat[uid] && c.cstat[uid].stun > 0) { c.cstat[uid].stun--; if (c.cstat[uid].stun <= 0) c.cstat[uid].cause = ''; } });
    enemyPhase();
  });

  // 중간보스가 아군 카드(장수)에 상태이상을 부여. 사용 시 true.
  function enemyMidSkill(e, msOverride) {
    var c = run.combat, ms = msOverride || e.midSkill;
    function pickUid(excludeStunned) {
      var pool = c.center.filter(function (u) { return aliveUid(u) && (!excludeStunned || !cardStunned(u)); });
      if (!pool.length) pool = c.draw.concat(c.center, c.used).filter(function (u) { return aliveUid(u) && (!excludeStunned || !cardStunned(u)); });
      return pool.length ? TCG.pick(pool) : null;
    }
    if (ms.type === 'p_seal' && c.sealUsed) return false; // 봉인은 전투당 1회 — 이미 썼으면 일반 공격
    e.mp = Math.max(0, e.mp - 3);
    fxBanner('👹 ' + e.name + ' 「' + ms.name + '」', 'boss', 950);
    TCG.sfx('skill');
    if (ms.type === 'p_seal') {
      var su = pickUid(false); if (!su) { return false; }
      var sh = heroByUid(su);
      c.sealed = su; c.sealUsed = true;
      c.center = c.center.filter(function (u) { return u !== su; });
      c.draw = c.draw.filter(function (u) { return u !== su; });
      c.used = c.used.filter(function (u) { return u !== su; });
      shake('big');
      logMsg(TCG.t('hx.logSeal', { name: e.name, sk: ms.name, target: (sh ? sh.def.name : TCG.t('hx.card')) }));
    } else {
      var u = pickUid(ms.type !== 'p_poison'); if (!u) { return false; }
      var st = cstat(u), hh = heroByUid(u);
      if (ms.type === 'p_charm') { st.stun = Math.max(st.stun, 1); st.cause = '매혹'; logMsg(TCG.t('hx.logEnemyCharm', { name: e.name, sk: ms.name, target: (hh ? hh.def.name : TCG.t('hx.card')) })); }
      else if (ms.type === 'p_confuse') { st.stun = Math.max(st.stun, 1); st.cause = '혼란'; logMsg(TCG.t('hx.logEnemyConfuse', { name: e.name, sk: ms.name, target: (hh ? hh.def.name : TCG.t('hx.card')) })); }
      else if (ms.type === 'p_poison') { st.poison += (ms.val || 4); logMsg(TCG.t('hx.logEnemyPoison', { name: e.name, sk: ms.name, target: (hh ? hh.def.name : TCG.t('hx.card')), n: (ms.val || 4) })); }
      shake('sm');
    }
    return true;
  }

  // 적장이 보유 스킬을 사용(주공 대상). 사용 시 true. skOverride로 특정 스킬 지정 가능
  function bossUseSkill(e) {
    var atkSk = e.skills[0], supSk = e.skills[1];
    function mpOf(sk) { return (sk.type && sk.type.indexOf('p_') === 0) ? 3 : skillMp(sk); }
    var lowHp = e.hp < e.maxHp * 0.5;
    var useSup = (supSk.type === 'heal' && lowHp) ? (Math.random() < 0.6) : (Math.random() < 0.4);
    var sk = useSup ? supSk : atkSk;
    if (e.mp < mpOf(sk)) sk = (sk === supSk) ? atkSk : supSk; // MP 부족하면 다른 스킬로
    if (e.mp < mpOf(sk)) return false;
    if (sk.type.indexOf('p_') === 0) return enemyMidSkill(e, sk); // 행동불가/사신 등 카드 대상
    return enemySkill(e, sk);
  }
  function enemySkill(e, skOverride) {
    var c = run.combat, sk = skOverride || e.skill;
    e.mp = Math.max(0, e.mp - skillMp(sk));
    fxBanner('👑 ' + e.name + ' 「' + sk.name + '」', 'boss', 950);
    TCG.sfx(sk.type === 'heal' || sk.type === 'shield' ? 'heal' : 'skill');
    var idx = c.enemies.indexOf(e), el = enemyEl(idx);
    if (sk.type === 'strike') {
      var crit = rollCrit(e.crit != null ? e.crit : BASE_CRIT);
      var d = e.atk + Math.round(sk.val * 0.5); if (crit) d *= 2;
      shake('big'); var ev = dmgLord(d, crit, sk.pierce);
      logMsg(ev ? TCG.t('hx.logEnemyEvaded', { name: e.name, sk: sk.name }) : (TCG.t('hx.logEnemyStrike', { name: e.name, sk: sk.name, dmg: d }) + (sk.pierce ? TCG.t('hx.pierceSuffix') : '') + (crit ? TCG.t('hx.critSuffix') : '')));
    } else if (sk.type === 'aoe') {
      var d2 = Math.round(sk.val * 0.6) + Math.round(e.atk * 0.3); shake('big'); var ev2 = dmgLord(d2, false);
      logMsg(ev2 ? TCG.t('hx.logEnemyEvaded', { name: e.name, sk: sk.name }) : TCG.t('hx.logEnemyStrike', { name: e.name, sk: sk.name, dmg: d2 }));
    } else if (sk.type === 'multi') {
      var tot = 0; for (var i = 0; i < sk.val; i++) { if (c.lord.hp <= 0) break; var dd = Math.max(1, Math.round(e.atk * 0.5)); if (!dmgLord(dd, false)) tot += dd; }
      shake('sm'); logMsg(TCG.t('hx.logEnemyMulti', { name: e.name, sk: sk.name, hits: sk.val, dmg: tot }));
    } else if (sk.type === 'heal') {
      e.hp = Math.min(e.maxHp, e.hp + sk.val); fxSupport(el, '+' + sk.val, '#7ef0b5');
      logMsg(TCG.t('hx.logEnemyHeal', { name: e.name, sk: sk.name, n: sk.val }));
    } else if (sk.type === 'shield') {
      e.block += sk.val; fxSupport(el, '🛡+' + sk.val, '#9fd2ff', 'shield');
      logMsg(TCG.t('hx.logEnemyShield', { name: e.name, sk: sk.name, n: sk.val }));
    } else if (sk.type === 'buff') {
      var cap = (e.atk0 || e.atk) + Math.round((e.atk0 || e.atk) * 0.6); // 공격 버프 누적 상한(기본의 +60%)
      var gain = Math.min(sk.val, Math.max(0, cap - e.atk));
      if (gain > 0) { e.atk += gain; fxSupport(el, '⚔+' + gain, '#ffd86b'); logMsg(TCG.t('hx.logEnemyBuff', { name: e.name, sk: sk.name, n: gain })); }
      else { var bd = Math.max(1, Math.round(e.atk * 0.7)); dmgLord(bd, false); logMsg(TCG.t('hx.logEnemyStrike', { name: e.name, sk: sk.name, dmg: bd })); }
    } else { // charm 등: 주공 교란(소량 피해)
      var d3 = Math.max(1, Math.round(e.atk * 0.5)); dmgLord(d3, false);
      logMsg(TCG.t('hx.logEnemyDisrupt', { name: e.name, sk: sk.name, dmg: d3 }));
    }
    return true;
  }
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
        logMsg(TCG.t('hx.logEnemyPoisonDmg', { name: e.name, n: e.poison }));
      }
    });
    renderCombat();
    if (living(c.enemies).length === 0) { setTimeout(winCombat, 550); return; }
    fxBanner(TCG.t('hx.enemyTurn'), 'foe-turn', 850);
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
      if (e.charmed > 0 || e.confused > 0) { // 매혹·혼란된 적은 이번 턴 쉰다
        var was = e.charmed > 0 ? TCG.t('hx.stCharm') : TCG.t('hx.stConfuse');
        if (e.charmed > 0) e.charmed--; else e.confused--;
        fxSupport(enemyEl(c.enemies.indexOf(e)), '💤 ' + was, '#ff9ad0');
        logMsg(TCG.t('hx.logEnemyStunned', { name: e.name, cause: was }));
        renderCombat();
        setTimeout(next, 360); return;
      }
      // 적장/중간보스는 일정 확률로 스킬 사용(MP 충분할 때) — 중간보스는 아군 카드에 상태이상
      var usedSkill = false;
      if (e.midSkill && e.mp >= 3 && Math.random() < (e.skillChance || 0)) usedSkill = enemyMidSkill(e);
      else if (e.skills && e.mp >= 3 && Math.random() < (e.skillChance || 0)) usedSkill = bossUseSkill(e);
      else if (e.skill && e.mp >= skillMp(e.skill) && Math.random() < (e.skillChance || 0)) usedSkill = enemySkill(e);
      if (!usedSkill) {
        var intent = e.intent;
        var crit = rollCrit(e.crit != null ? e.crit : BASE_CRIT); // 적장은 모드별 치명타 확률
        var dmg = crit ? intent.dmg * 2 : intent.dmg;
        TCG.sfx('hit');
        shake(crit || intent.type === 'aoe' ? 'big' : 'sm');
        var evaded = dmgLord(dmg, crit);
        logMsg(evaded ? TCG.t('hx.logEnemyAtkEvaded', { name: e.name }) : (TCG.t('hx.logEnemyAtk', { name: e.name, dmg: dmg }) + (crit ? TCG.t('hx.critSuffix') : '')));
      }
      renderCombat();
      if (c.lord.hp <= 0) { setTimeout(gameOver, 400); return; }
      setTimeout(next, usedSkill ? 620 : 480);
    }
    next();
  }

  function winCombat() {
    var c = run.combat;
    // 적장(보스) 격파 시 마지막 대사를 먼저 보여준 뒤 보상 처리
    if (!c.bossDeathShown && c.sub === SUB_COUNT - 1) {
      c.bossDeathShown = true;
      var bossKey = (HW_STAGES[c.main] || {}).boss;
      var dq = bossKey && HW_BOSS_DEATH[bossKey];
      if (dq && TCG.isDialogueOn()) {
        var bidx = -1; for (var bi = 0; bi < c.enemies.length; bi++) { if (c.enemies[bi].boss) { bidx = bi; break; } }
        if (bidx >= 0) fxQuote(enemyEl(bidx), dq, 2400);
        setTimeout(winCombat, 2300);
        return;
      }
    }
    TCG.sfx('win');
    if (window.BGMEngine) BGMEngine.stinger('victory');
    // 여포: 어떤 전역이든 적장(보스)을 주공 풀 HP로 격파하면 획득
    if (c.sub === SUB_COUNT - 1 && c.lord.hp >= c.lord.maxHp) {
      unlockSpecialHero('lubu', TCG.t('hx.reasonBossFullHp'), true);
    }
    // 주공 HP는 모험 내내 유지 — 전투 후 기본 회복 없음(로그라이크 소모전). 군량미(유물) 보유 시에만 회복.
    var heal = relicSum('winHeal'); // 기본 패시브 회복 제거 — 유물 효과만 적용
    run.lordHp = Math.min(c.lord.maxHp, c.lord.hp + heal);
    run.lordMp = Math.min(c.lord.maxMp, c.lord.mp + relicSum('winMp')); // MP는 남은 대로 유지 + 옥천수(유물) 회복
    // gold + reward cadence
    var isBoss = c.sub === SUB_COUNT - 1;
    var isMid = (c.sub === 4 || c.sub === 9);
    var prog = c.main * SUB_COUNT + c.sub;
    var gold = Math.round(((6 + prog * 1.5) * DCFG.gold * ((HW_MODES[run.mode] || HW_MODES.normal).gold) * (isMid ? 1.5 : 1) + 20) * (1 + relicSum('goldBonus'))); // 출진 클리어 골드 +20 · 천자의 밀서(유물) +%
    run.gold += gold;
    run.sorties = (run.sorties || 0) + 1; // 누적 출진 횟수
    updateTop();
    run.pendingGold = gold; run.pendingBoss = isBoss;
    if (c.sub === 8) run.pendingCamp = true; // 9스테이지(9번째 출진) 클리어 후 캠프 — 보상 처리 후 캠프로 이동
    // 출진 5회·10회 뒤 보물상자(무기) 개봉
    if (run.sorties === 5 || run.sorties === 10) { showWeaponPick(gold); return; }
    if (isBoss && c.main === HW_STAGES.length - 1) { victory(); return; } // 최종 적장 격파
    if (isBoss) { showRelicPick(gold); return; }            // 메인 적장 처치 → 유물(대기실 팝업)
    if (isMid) { grantMidBoss(c.main, c.sub); showHeroPick(gold); return; } // 중간보스 격파 → 중간보스 카드 습득 + 장수 영입(대기실 팝업)
    // 9스테이지 클리어 → 캠프(현재 스테이지에서 정비, 선택 시 다음 스테이지로)
    if (run.pendingCamp) { run.pendingCamp = false; showCamp(); showGoldPopup(gold); return; }
    // (일반 출진은 장수 영입 보상을 주지 않고 골드 보상으로 처리 — 장수 영입은 중간보스·주막·특수 경로로만)
    // 보물 발견 이벤트 — 메인 전역당 최대 1회, 약 10% 확률로 등장(히어로즈 블러드 승리 시 유물 획득)
    var TREASURE_CHANCE = 0.10; // 보물 발견 확률 10%
    if (run.treasureMain !== run.mainStage && Math.random() < TREASURE_CHANCE) {
      run.treasureMain = run.mainStage;
      showTreasure(); return;
    }
    advanceStage();                                         // 일반 서브 → 바로 다음 (골드만 보상)
    showGoldPopup(gold);
  }

  // 보상이 골드만 있는 경우 대기실에서 3초 뒤 자동으로 사라지는 팝업
  function showGoldPopup(gold) {
    var pop = document.getElementById('goldPopup');
    if (!pop) return;
    document.getElementById('goldPopupText').textContent = TCG.t('ui.goldGet', { n: gold });
    pop.hidden = false;
    clearTimeout(showGoldPopup._t);
    showGoldPopup._t = setTimeout(function () { pop.hidden = true; }, 3000);
  }
  (function () {
    var pop = document.getElementById('goldPopup');
    if (pop) pop.addEventListener('click', function () { clearTimeout(showGoldPopup._t); pop.hidden = true; });
  })();

  // 중간보스 격파 보상: 5출진(idx0)=노멀 · 10출진(idx1)=하드에서 격파 시 그 중간보스 카드 영입.
  // 이미 보유했으면 골드 +50. (주막에는 출현하지 않음 · 대장전과 컬렉션 공유)
  function grantMidBoss(main, sub) {
    var idx = (sub === 9) ? 1 : 0;
    var mb = (HW_MID_BOSSES[main] || [])[idx];
    if (!mb || !mb.hid || !HW_BY_ID[mb.hid]) return;
    var hid = mb.hid;
    if (collectedHeroes.indexOf(hid) !== -1) { // 이미 습득 → 골드 +50
      run.gold += 50; updateTop();
      TCG.toast('💰 ' + TCG.t('hx.midAlreadyOwned', { name: mb.name }));
      return;
    }
    var eligible = (idx === 0) ? (run.mode === 'normal') : (run.mode === 'hard' || run.mode === 'extreme');
    if (eligible) {
      unlockSpecialHero(hid, '⚜ ' + TCG.t('hx.reasonMidDefeat', { name: mb.name }), true);
    } else {
      TCG.toast(TCG.t('hx.midRecruitHint', { name: mb.name, diff: (idx === 0 ? TCG.t('hx.diffNormal') : TCG.t('hx.diffHard')) }));
    }
  }

  /* ---------- 적장 격파 유물 보상 — 대기실 팝업 ---------- */
  function showRelicPick(gold) {
    var owned = run.relics.map(function (r) { return r.id; });
    var avail = TCG.shuffle(HW_RELICS.filter(function (r) { return !r.exclusive && owned.indexOf(r.id) === -1; })).slice(0, 3);
    advanceStage(); // 먼저 대기실로 이동(전역 평정 → 다음 전역)
    var pop = document.getElementById('relicPickPopup'); if (!pop) { if (gold) showGoldPopup(gold); return; }
    if (!avail.length) { if (gold) showGoldPopup(gold); return; } // 모든 유물 보유 → 골드 팝업만
    var sub = document.getElementById('relicPickSub');
    if (sub) sub.textContent = TCG.t('hx.chooseRelic') + (gold ? ' · 💰+' + gold : '');
    document.getElementById('relicPickBody').innerHTML = avail.map(function (r) {
      return '<div class="reward-card" data-relic="' + r.id + '">' +
        '<div class="rc-emoji">' + r.emoji + '</div>' +
        '<div class="rc-name">' + r.name + '</div>' +
        '<div class="rc-skill">' + r.desc + '</div></div>';
    }).join('');
    pop.hidden = false;
  }
  (function () {
    var body = document.getElementById('relicPickBody'); if (!body) return;
    body.addEventListener('click', function (e) {
      var card = e.target.closest('.reward-card'); if (!card) return;
      var r = HW_RELICS.find(function (x) { return x.id === card.dataset.relic; }); if (!r) return;
      TCG.sfx('reward'); run.relics.push(r); saveRun(); TCG.toast(TCG.t('hx.relicGet', { name: r.name }));
      document.getElementById('relicPickPopup').hidden = true;
    });
  })();

  /* ---------- 중간보스 격파 영웅 영입 — 대기실 팝업 ---------- */
  function showHeroPick(gold) {
    var have = ownedHeroIds();
    var hpool = TCG.shuffle(HW_HEROES.filter(function (d) { return !d.exclusive && have.indexOf(d.id) === -1; })).slice(0, 3);
    // 먼저 대기실(또는 5스테이지 후 캠프)로 이동한 뒤 팝업 표시
    if (run.pendingCamp) { run.pendingCamp = false; showCamp(); } else advanceStage();
    var pop = document.getElementById('heroPickPopup');
    if (!pop || !hpool.length) { if (gold) showGoldPopup(gold); return; } // 팝업 없음/영입 가능 영웅 없음 → 골드 팝업만
    run.heroPickPool = hpool; run.pendingRecruit = null;
    var sub = document.getElementById('heroPickSub');
    if (sub) sub.textContent = TCG.t('hx.chooseHero') + (gold ? ' · 💰+' + gold : '');
    document.getElementById('heroPickBody').innerHTML = hpool.map(function (d) { return heroRewardCard(d); }).join('');
    pop.hidden = false;
  }
  (function () {
    var pop = document.getElementById('heroPickPopup'); if (!pop) return;
    var body = document.getElementById('heroPickBody');
    body.addEventListener('click', function (e) {
      var mini = e.target.closest('.mini-hero');
      if (mini && run.pendingRecruit) { // 파티 교체 선택
        var i = run.party.findIndex(function (x) { return x.uid === mini.dataset.uid; });
        if (i >= 0) { run.party[i] = mkHero(run.pendingRecruit); run.pendingRecruit = null; saveRun(); TCG.sfx('reward'); TCG.toast(TCG.t('hx.replaceDone')); pop.hidden = true; }
        return;
      }
      var card = e.target.closest('.reward-card'); if (!card || !card.dataset.hero) return;
      var id = card.dataset.hero;
      TCG.sfx('reward');
      if (run.party.length < MAX_PARTY) {
        run.party.push(mkHero(id)); saveRun(); TCG.toast(TCG.t('hx.recruited', { name: HW_BY_ID[id].name })); pop.hidden = true;
      } else { // 파티가 가득 참 → 교체 대상 선택
        run.pendingRecruit = id;
        var sub = document.getElementById('heroPickSub');
        if (sub) sub.textContent = TCG.t('hx.partyFullReplace', { name: HW_BY_ID[id].name });
        body.innerHTML = '<div class="party-bar">' + run.party.map(miniHero).join('') + '</div>';
      }
    });
  })();

  /* ---------- 보물상자(무기) 보상 — 대기실 팝업 ---------- */
  function showWeaponPick(gold) {
    var ownW = run.weapons || [];
    var wpool = TCG.shuffle(HW_WEAPONS.filter(function (w) { return !w.exclusive && ownW.indexOf(w.id) === -1; })).slice(0, 3);
    if (run.pendingCamp) { run.pendingCamp = false; showCamp(); } else advanceStage();
    var pop = document.getElementById('weaponPickPopup');
    if (!pop || !wpool.length) { if (gold) showGoldPopup(gold); return; } // 팝업 없음/획득 가능 장비 없음 → 골드 팝업만
    var sub = document.getElementById('weaponPickSub');
    if (sub) sub.textContent = TCG.t('hx.chooseTreasure') + (gold ? ' · 💰+' + gold : '');
    document.getElementById('weaponPickBody').innerHTML = wpool.map(function (w) {
      return '<div class="reward-card" data-weapon="' + w.id + '">' +
        '<div class="rc-emoji">' + w.emoji + '</div>' +
        '<div class="rc-name">' + w.name + '</div>' +
        '<div class="rc-skill">' + w.desc + '</div></div>';
    }).join('');
    pop.hidden = false;
  }
  (function () {
    var pop = document.getElementById('weaponPickPopup'); if (!pop) return;
    document.getElementById('weaponPickBody').addEventListener('click', function (e) {
      var card = e.target.closest('.reward-card'); if (!card || !card.dataset.weapon) return;
      var w = HW_WEAPON_BY_ID[card.dataset.weapon]; if (!w) return;
      TCG.sfx('reward');
      if (run.weapons.indexOf(w.id) === -1) run.weapons.push(w.id); // 중복 획득 방지
      saveRun(); TCG.toast(TCG.t('hx.treasureGet', { name: w.name }));
      pop.hidden = true;
    });
  })();

  /* ---------- REWARD ---------- */
  function showReward(mode, gold) {
    run.rewardMode = mode; run.pendingRecruit = null;
    document.getElementById('rewardTitle').textContent = (mode === 'weapon' ? '💎 ' + TCG.t('hx.treasureChestTitle') + ' +💰' : '🎉 ' + TCG.t('hx.victoryTitle') + ' +💰') + gold;
    var box = document.getElementById('rewardCards');
    if (mode === 'hero') {
      // 이미 보유한 장수는 중복으로 제시하지 않음
      var have = ownedHeroIds();
      var hpool = TCG.shuffle(HW_HEROES.filter(function (d) { return !d.exclusive && have.indexOf(d.id) === -1; })).slice(0, 3);
      if (!hpool.length) { showReward('weapon', gold); return; } // 모두 보유 → 보물로 대체
      document.getElementById('rewardSub').textContent = TCG.t('hx.chooseHero');
      box.innerHTML = hpool.map(function (d) { return heroRewardCard(d); }).join('');
    } else if (mode === 'weapon') {
      document.getElementById('rewardSub').textContent = TCG.t('hx.chooseTreasureEquip');
      var ownW = run.weapons || [];
      var wpool = TCG.shuffle(HW_WEAPONS.filter(function (w) { return !w.exclusive && ownW.indexOf(w.id) === -1; })).slice(0, 3); // 이미 보유한 장비는 중복 제시 안 함
      if (!wpool.length) { afterReward(); return; } // 모든 장비 보유 → 건너뜀
      box.innerHTML = wpool.map(function (w) {
        return '<div class="reward-card" data-weapon="' + w.id + '">' +
          '<div class="rc-emoji">' + w.emoji + '</div>' +
          '<div class="rc-name">' + w.name + '</div>' +
          '<div class="rc-skill">' + w.desc + '</div></div>';
      }).join('');
    } else {
      document.getElementById('rewardSub').textContent = TCG.t('hx.chooseRelic');
      var owned = run.relics.map(function (r) { return r.id; });
      var avail = HW_RELICS.filter(function (r) { return !r.exclusive && owned.indexOf(r.id) === -1; });
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
      TCG.portrait(d.emoji, d.id, 'rc-portrait', d.name) +
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
      run.relics.push(r); TCG.toast(TCG.t('hx.relicGet', { name: r.name })); afterReward(); return;
    }
    if (run.rewardMode === 'weapon') {
      var w = HW_WEAPON_BY_ID[card.dataset.weapon];
      if (run.weapons.indexOf(w.id) === -1) run.weapons.push(w.id); // 중복 획득 방지
      TCG.toast(TCG.t('hx.treasureGet', { name: w.name })); afterReward(); return;
    }
    var id = card.dataset.hero;
    if (run.party.length < MAX_PARTY) { run.party.push(mkHero(id)); TCG.toast(TCG.t('hx.recruited', { name: HW_BY_ID[id].name })); afterReward(); }
    else {
      run.pendingRecruit = id;
      document.getElementById('rewardSub').textContent = TCG.t('hx.partyFullReplaceBar');
      showReplaceBar();
    }
  });
  function showReplaceBar() {
    var box = document.getElementById('rewardCards');
    box.innerHTML = '<div class="party-bar">' + run.party.map(miniHero).join('') + '</div>' +
      '<p class="screen-sub" style="width:100%">' + TCG.t('hx.replaceTapHint', { name: HW_BY_ID[run.pendingRecruit].name }) + '</p>';
    box.querySelectorAll('.mini-hero').forEach(function (m) {
      m.addEventListener('click', function () {
        var i = run.party.findIndex(function (x) { return x.uid === m.dataset.uid; });
        if (i >= 0) { run.party[i] = mkHero(run.pendingRecruit); TCG.toast(TCG.t('hx.replaceDone')); afterReward(); }
      });
    });
  }
  document.getElementById('rewardSkip').addEventListener('click', function () {
    if (run.pendingRecruit) { run.pendingRecruit = null; }
    afterReward();
  });
  function afterReward() { if (run.pendingCamp) { run.pendingCamp = false; showCamp(); } else advanceStage(); }

  /* ---------- REST ---------- */
  function showCamp() {
    run.restMode = null;
    document.getElementById('restTrain').classList.remove('chosen');
    document.getElementById('restParty').innerHTML = '';
    show('restScreen');
  }
  document.getElementById('restHeal').addEventListener('click', function () {
    var mhp = lordMaxHp(), mmp = lordMaxMp();
    if (typeof run.lordHp !== 'number') run.lordHp = mhp;
    if (typeof run.lordMp !== 'number') run.lordMp = mmp;
    run.lordHp = Math.min(mhp, run.lordHp + Math.round(mhp * 0.30));
    run.lordMp = Math.min(mmp, run.lordMp + Math.round(mmp * 0.30));
    TCG.sfx('heal'); TCG.toast(TCG.t('hx.restHeal')); advanceStage();
  });
  document.getElementById('restTrain').addEventListener('click', function () {
    pickPartyHero(TCG.t('hx.trainTitle'), TCG.t('hx.trainSub'), function (h) {
      h.atk += 3; h.train = (h.train || 0) + 1; TCG.sfx('tap'); TCG.toast(TCG.t('hx.trainDone', { name: h.def.name, n: h.train, max: MAX_TRAIN })); advanceStage();
    });
  });

  /* ---------- 장수 선택 팝업(영웅 강화·캠프 훈련 공용) ---------- */
  var MAX_TRAIN = 10; // 장수당 강화 최대 횟수
  var _partyPickCb = null;
  function pickPartyHero(title, sub, cb) {
    _partyPickCb = cb;
    var t = document.getElementById('partyPickTitle'); if (t) t.textContent = title;
    var s = document.getElementById('partyPickSub'); if (s) s.textContent = sub || '';
    var body = document.getElementById('partyPickBody');
    if (body) body.innerHTML = run.party.map(function (h) {
      var n = h.train || 0, maxed = n >= MAX_TRAIN;
      return '<div class="pp-pick' + (maxed ? ' pp-maxed' : '') + '">' + miniHero(h) +
        '<div class="pp-train">' + TCG.t('hx.trainCount', { n: n, max: MAX_TRAIN }) + (maxed ? ' · MAX' : '') + '</div></div>';
    }).join('');
    var pop = document.getElementById('partyPickPopup'); if (pop) { pop.hidden = false; TCG.sfx('tap'); }
  }
  (function () {
    var pop = document.getElementById('partyPickPopup'); if (!pop) return;
    document.getElementById('partyPickBody').addEventListener('click', function (e) {
      var m = e.target.closest('.mini-hero'); if (!m) return;
      var h = run.party.find(function (x) { return x.uid === m.dataset.uid; }); if (!h) return;
      if ((h.train || 0) >= MAX_TRAIN) { TCG.toast(TCG.t('hx.trainMaxed', { name: h.def.name, max: MAX_TRAIN })); return; }
      var cb = _partyPickCb; _partyPickCb = null; pop.hidden = true; if (cb) cb(h);
    });
    document.getElementById('partyPickCancel').addEventListener('click', function () { _partyPickCb = null; pop.hidden = true; });
    pop.addEventListener('click', function (e) { if (e.target.id === 'partyPickPopup') { _partyPickCb = null; pop.hidden = true; } });
  })();

  /* ---------- SHOP ---------- */
  var CONS_SELL = 11; // 소모품 판매가 = 구매가(22)의 50%
  function genShop() {
    // 상점은 장수 외 품목만 판매(장수는 주막에서) — 무기 2 · 소모품 2 · 두강주 · 무기 강화
    // 장비는 이미 보유한 종류 제외(중복 획득 방지). 거의 다 보유 시엔 중복 허용으로 진열을 채움
    var allW = HW_WEAPONS.filter(function (w) { return !w.exclusive; });
    var ownedW = run.weapons || [];
    var wp = TCG.shuffle(allW.filter(function (w) { return ownedW.indexOf(w.id) === -1; }));
    if (wp.length < 2) wp = wp.concat(TCG.shuffle(allW));
    run.shop = [
      { kind: 'weapon', wid: wp[0].id, cost: weaponCost(wp[0]), sold: false },
      { kind: 'weapon', wid: wp[1].id, cost: weaponCost(wp[1]), sold: false },
      { kind: 'item', cid: TCG.pick(HW_CONSUMABLES).id, cost: 22, sold: false }, // 소모성 아이템(랜덤)
      { kind: 'item', cid: TCG.pick(HW_CONSUMABLES).id, cost: 22, sold: false },
      { kind: 'heal', cost: 24, sold: false },    // 치료 서비스: 주공 HP 50 회복
      { kind: 'dujiu', cost: 18, sold: false }    // 두강주: MP 20 회복
    ];
    // 영웅 강화 — 약 40% 확률로 진열. 한 번 사용하면 다음 스테이지 클리어까지 비활성(새로고침해도 유지)
    if (Math.random() < 0.4) run.shop.push({ kind: 'upgrade', cost: 28, sold: (run.upgradeUsedStamp === tavernStamp()) });
  }
  function rerollCost() { return (run.shopRerolls || 0) * 30; } // 첫 새로고침 무료, 이후 30·60·90… 30씩 증가
  function showShop() {
    if (!run.shop || run.shopStamp !== tavernStamp()) { genShop(); run.shopStamp = tavernStamp(); run.shopRerolls = 0; } // 스테이지 진행 시 진열 갱신 + 새로고침 비용 초기화
    renderShop();
    show('shopScreen');
  }
  function rerollShop() {
    var cost = rerollCost();
    if (run.gold < cost) { TCG.toast(TCG.t('hx.goldShortReroll', { n: cost })); return; }
    TCG.sfx('tap'); run.gold -= cost; run.shopRerolls = (run.shopRerolls || 0) + 1; genShop(); // 새로고침은 같은 스테이지 내 — 스탬프 유지
    updateTop(); saveRun(); renderShop();
  }
  /* ---------- 주막(TAVERN) — 장수 1~4장 판매(스테이지 진행 시 갱신) ---------- */
  function tavernStamp() { return run.mainStage * 100 + run.subStage; }
  function genTavern() {
    var have = ownedHeroIds();
    var pool = TCG.shuffle(HW_HEROES.filter(function (d) { return !d.exclusive && have.indexOf(d.id) === -1; }));
    var n = Math.min(pool.length, 1 + Math.floor(Math.random() * 4)); // 1~4장
    var cost = { C: 28, R: 42, SR: 60, SSR: 90 };
    run.tavern = { stamp: tavernStamp(), items: pool.slice(0, n).map(function (d) { return { id: d.id, cost: cost[d.rarity] || 40, sold: false }; }) };
  }
  function showTavern() {
    if (!run.tavern || run.tavern.stamp !== tavernStamp()) genTavern(); // 같은 스테이지면 유지, 진행하면 갱신
    renderTavern();
    show('tavernScreen');
  }
  function renderTavern() {
    document.getElementById('tavernGold').textContent = run.gold;
    var box = document.getElementById('tavernItems');
    if (!run.tavern.items.length) { box.innerHTML = '<div class="wr-empty">' + TCG.t('hx.tavernEmpty') + '</div>'; return; }
    box.innerHTML = run.tavern.items.map(function (it, i) {
      var d = HW_BY_ID[it.id], afford = run.gold >= it.cost;
      var bcls = it.sold ? 'sold' : (afford ? '' : 'poor');
      var price = it.sold ? TCG.t('hx.done') : ('💰 ' + it.cost);
      var bsub = it.sold ? TCG.t('hx.recruitedShort') : (afford ? TCG.t('hx.recruit') : TCG.t('hx.goldShort'));
      return '<div class="wr-recruit' + (it.sold ? ' sold' : '') + '" data-info="' + i + '">' +
        '<div class="wr-recruit-port">' + TCG.portrait(d.emoji, d.id, '', d.name) +
          '<span class="wr-rb" style="background:' + rarBg(d.rarity) + '">' + d.rarity + '</span></div>' +
        '<div class="wr-recruit-body">' +
          '<div class="wr-recruit-name"><b>' + d.name + '</b><small>' + d.cls + '</small></div>' +
          '<div class="wr-recruit-stats"><span class="a">⚔ ' + d.atk + '</span><span class="h">♥ ' + d.hp + '</span></div>' +
          '<div class="wr-recruit-sk">「' + d.skill.name + '」 · ' + d.skill.desc + '</div>' +
        '</div>' +
        '<button class="wr-buy ' + bcls + '" data-i="' + i + '"' + ((it.sold || !afford) ? ' disabled' : '') + '>' +
          '<span class="p">' + price + '</span><span class="s">' + bsub + '</span></button>' +
        '</div>';
    }).join('');
  }
  document.getElementById('tavernItems').addEventListener('click', function (e) {
    var b = e.target.closest('.wr-buy');
    if (!b) { var info = e.target.closest('.wr-recruit'); if (info) { var hi = run.tavern.items[parseInt(info.dataset.info, 10)]; if (hi) showHeroInfo(HW_BY_ID[hi.id]); } return; }
    if (b.disabled) return;
    var it = run.tavern.items[parseInt(b.dataset.i, 10)];
    if (!it || it.sold || run.gold < it.cost) return;
    if (ownedHeroIds().indexOf(it.id) !== -1) { TCG.toast(TCG.t('hx.alreadyOwnedHero')); it.sold = true; renderTavern(); return; }
    if (run.party.length >= MAX_PARTY) { TCG.toast(TCG.t('hx.partyFull')); return; }
    run.party.push(mkHero(it.id)); run.gold -= it.cost; it.sold = true;
    TCG.toast(TCG.t('hx.recruited', { name: HW_BY_ID[it.id].name })); updateTop(); saveRun(); renderTavern();
  });
  document.getElementById('tavernLeave').addEventListener('click', function () { TCG.sfx('tap'); showMap(); });
  function buyBtnHtml(it, i) {
    var afford = run.gold >= it.cost;
    var cls = it.sold ? 'sold' : (afford ? '' : 'poor');
    var price = it.sold ? TCG.t('hx.soldOut') : ('💰 ' + it.cost);
    var sub = it.sold ? TCG.t('hx.sold') : (afford ? TCG.t('hx.buy') : TCG.t('hx.goldShort'));
    return '<button class="wr-buy ' + cls + '" data-i="' + i + '"' + ((it.sold || !afford) ? ' disabled' : '') + '>' +
      '<span class="p">' + price + '</span><span class="s">' + sub + '</span></button>';
  }
  function shopGood(it, i) {
    var emoji, name, desc, rb = '';
    if (it.kind === 'weapon') { var w = HW_WEAPON_BY_ID[it.wid]; emoji = w.emoji; name = w.name; desc = w.desc; if (w.rarity) rb = '<span class="wr-rb" style="background:' + rarBg(w.rarity) + '">' + w.rarity + '</span>'; }
    else if (it.kind === 'item') { var ci = HW_CONS_BY_ID[it.cid]; emoji = ci.emoji; name = ci.name; desc = ci.desc; }
    else if (it.kind === 'heal') { emoji = '❤️‍🩹'; name = TCG.t('hx.healService'); desc = TCG.t('hx.healServiceDesc'); }
    else if (it.kind === 'dujiu') { emoji = '🍶'; name = TCG.t('hx.dujiu'); desc = TCG.t('hx.dujiuDesc'); }
    else { emoji = '⚒️'; name = TCG.t('hx.heroUpgrade'); desc = TCG.t('hx.heroUpgradeDesc'); }
    return '<div class="wr-good' + (it.sold ? ' sold' : '') + '">' +
      '<div class="wr-good-tile">' + emoji + '</div>' +
      '<div class="wr-good-info"><div class="wr-good-name">' + name + rb + '</div>' +
      '<div class="wr-good-desc">' + desc + '</div></div>' +
      buyBtnHtml(it, i) + '</div>';
  }
  function renderShop() {
    document.getElementById('shopGold').textContent = run.gold;
    var cost = rerollCost();
    var lbl = document.getElementById('rerollLabel'); if (lbl) lbl.textContent = cost === 0 ? TCG.t('hx.rerollFree') : TCG.t('hx.rerollCost', { n: cost });
    var rr = document.getElementById('shopReroll'); if (rr) rr.disabled = cost > 0 && run.gold < cost;
    // 섹션: 장비 / 소모품 / 상단 서비스
    var secs = [
      { icon: '🗡️', title: TCG.t('hx.secGear'), kinds: ['weapon'] },
      { icon: '🎒', title: TCG.t('hx.secConsumable'), kinds: ['item'] },
      { icon: '🏮', title: TCG.t('hx.secService'), kinds: ['heal', 'dujiu', 'upgrade'] }
    ];
    var html = secs.map(function (sec) {
      var rows = run.shop.map(function (it, i) { return sec.kinds.indexOf(it.kind) !== -1 ? shopGood(it, i) : ''; }).join('');
      if (!rows) return '';
      return '<div class="wr-sec"><div class="wr-sec-h"><span>' + sec.icon + ' ' + sec.title + '</span><i></i></div>' + rows + '</div>';
    }).join('');
    // 보유 소모품 판매(상시) — 구매가의 50%
    var inv = run.items || [];
    if (inv.length) {
      var sellRows = inv.map(function (cid, i) {
        var ci = HW_CONS_BY_ID[cid]; if (!ci) return '';
        return '<div class="wr-good">' +
          '<div class="wr-good-tile">' + ci.emoji + '</div>' +
          '<div class="wr-good-info"><div class="wr-good-name">' + ci.name + '</div>' +
          '<div class="wr-good-desc">' + ci.desc + '</div></div>' +
          '<button class="wr-buy wr-sell" data-sell="' + i + '"><span class="p">💰 +' + CONS_SELL + '</span><span class="s">' + TCG.t('hx.sell') + '</span></button></div>';
      }).join('');
      html += '<div class="wr-sec"><div class="wr-sec-h"><span>🪙 ' + TCG.t('hx.sellConsumables') + '</span><i></i></div>' + sellRows + '</div>';
    }
    document.getElementById('shopItems').innerHTML = html;
  }
  // 저잣거리 장수 카드 — 탭하면 상세 정보(읽기 전용)
  function showHeroInfo(d) {
    TCG.sfx('tap');
    var slots = slotsForRarity(d.rarity);
    document.getElementById('heroModalBody').innerHTML =
      TCG.portrait(d.emoji, d.id, 'modal-portrait', d.name) +
      '<h2>' + d.name + ' <span class="rar-' + d.rarity + '" style="font-size:14px">' + d.rarity + '</span></h2>' +
      '<p>' + d.cls + ' · ❤ ' + d.hp + ' · ⚔ ' + d.atk + ' · 🗡️ ' + TCG.t('hx.weaponSlots', { n: slots }) + '</p>' +
      '<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px;text-align:left;font-size:13px">' +
      '<b style="color:var(--gold)">「' + d.skill.name + '」</b> 💧' + skillMp(d.skill) + '<br>' +
      '<span style="color:var(--ink-dim)">' + d.skill.desc + '</span></div>' +
      '<p style="font-size:12px;color:var(--ink-dim);margin-top:10px">' + TCG.t('hx.acquirePathLabel', { path: heroPath(d) }) + '</p>' +
      '<button class="btn primary" id="heroModalClose" style="margin-top:14px">' + TCG.t('hx.close') + '</button>';
    var modal = document.getElementById('heroModal');
    modal.hidden = false;
    document.getElementById('heroModalClose').addEventListener('click', function () { modal.hidden = true; });
  }
  var _srr = document.getElementById('shopReroll'); if (_srr) _srr.addEventListener('click', rerollShop);
  document.getElementById('shopItems').addEventListener('click', function (e) {
    var sb = e.target.closest('[data-sell]'); // 보유 소모품 판매(상시)
    if (sb) {
      var si = parseInt(sb.dataset.sell, 10), cid = (run.items || [])[si]; if (cid == null) return;
      var ci = HW_CONS_BY_ID[cid]; run.items.splice(si, 1); run.gold += CONS_SELL;
      TCG.sfx('tap'); TCG.toast(TCG.t('hx.soldConsumable', { name: (ci ? ci.name : TCG.t('hx.consumable')), n: CONS_SELL })); updateTop(); saveRun(); renderShop();
      return;
    }
    var b = e.target.closest('.wr-buy'); if (!b || b.disabled) return;
    var it = run.shop[parseInt(b.dataset.i, 10)];
    if (it.sold || run.gold < it.cost) return;
    if (it.kind === 'weapon') {
      if (run.weapons.indexOf(it.wid) !== -1) { TCG.toast(TCG.t('hx.alreadyOwnedGear')); return; } // 장비 중복 획득 방지
      run.weapons.push(it.wid); TCG.toast(TCG.t('hx.treasureBought', { name: HW_WEAPON_BY_ID[it.wid].name }));
    } else if (it.kind === 'item') {
      if (!run.items) run.items = [];
      if (run.items.length >= HW_ITEM_MAX) { TCG.toast(TCG.t('hx.consumableFull', { max: HW_ITEM_MAX })); return; }
      run.items.push(it.cid); TCG.toast(TCG.t('hx.consumableBought', { name: HW_CONS_BY_ID[it.cid].name }));
    } else if (it.kind === 'heal') {
      if (typeof run.lordHp !== 'number') run.lordHp = lordMaxHp();
      if (run.lordHp >= lordMaxHp()) { TCG.toast(TCG.t('hx.lordHpAlreadyFull')); return; }
      run.lordHp = Math.min(lordMaxHp(), run.lordHp + 50); TCG.toast(TCG.t('hx.healServiceUsed'));
    } else if (it.kind === 'dujiu') {
      if (typeof run.lordMp !== 'number') run.lordMp = lordMaxMp();
      run.lordMp = Math.min(lordMaxMp(), run.lordMp + 20); TCG.toast(TCG.t('hx.dujiuUsed'));
    } else {
      // 영웅 강화 — 장수 선택 팝업. 선택 시 골드 차감·사용 처리(스테이지 단위 비활성 유지)
      pickPartyHero(TCG.t('hx.heroUpgrade'), TCG.t('hx.trainSub'), function (h) {
        h.atk += 3; h.train = (h.train || 0) + 1; run.gold -= it.cost; it.sold = true; run.upgradeUsedStamp = tavernStamp();
        TCG.sfx('tap'); TCG.toast(TCG.t('hx.trainDone', { name: h.def.name, n: h.train, max: MAX_TRAIN })); updateTop(); saveRun(); renderShop();
      });
      return; // 차감·렌더는 선택 콜백에서 처리
    }
    run.gold -= it.cost; it.sold = true; updateTop(); saveRun(); renderShop();
  });
  document.getElementById('shopLeave').addEventListener('click', function () { showMap(); });

  /* ---------- TREASURE — 히어로즈 블러드 도전 보상 ---------- */
  var pendingTreasureRelic = null;
  // 보물 발견 — 전투 종료 후 대기실(맵)로 복귀한 뒤 팝업으로 알림
  function showTreasure() {
    var owned = run.relics.map(function (r) { return r.id; });
    var avail = HW_RELICS.filter(function (r) { return !r.exclusive && owned.indexOf(r.id) === -1; });
    advanceStage(); // 먼저 대기실로 이동(다음 출진으로 진행 저장)
    var pop = document.getElementById('treasurePopup'); if (!pop) return;
    if (!avail.length) { // 모든 유물 보유 → 추가 골드로 대체
      var gold = Math.round((20 + run.mainStage * 4) * DCFG.gold * (1 + relicSum('goldBonus')));
      run.gold += gold; updateTop(); saveRun();
      pendingTreasureRelic = null;
      document.getElementById('treasureTitle').textContent = '💎 ' + TCG.t('hx.treasureFound') + ' +💰' + gold;
      document.getElementById('treasureSub').textContent = TCG.t('hx.treasureAllRelics');
      document.getElementById('treasureBody').innerHTML = '';
      document.getElementById('treasureChoices').innerHTML = '<button class="btn primary" data-tre="close">' + TCG.t('hx.continue') + '</button>';
      pop.hidden = false; return;
    }
    var prize = TCG.pick(avail);
    pendingTreasureRelic = prize; saveRun();
    document.getElementById('treasureTitle').textContent = '💎 ' + TCG.t('hx.treasureFound');
    document.getElementById('treasureSub').innerHTML = TCG.t('hx.treasureHbWin');
    document.getElementById('treasureBody').innerHTML =
      '<div class="reward-card" style="pointer-events:none;margin:0 auto"><div class="rc-emoji">' + prize.emoji + '</div><div class="rc-name">' + prize.name + '</div><div class="rc-skill">' + prize.desc + '</div></div>';
    document.getElementById('treasureChoices').innerHTML =
      '<button class="btn primary" data-tre="challenge">🃏 ' + TCG.t('hx.hbChallenge') + '</button>' +
      '<button class="btn ghost" data-tre="skip">' + TCG.t('hx.justLeave') + '</button>';
    pop.hidden = false;
  }
  document.getElementById('treasureChoices').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tre]'); if (!b) return;
    var act = b.dataset.tre;
    document.getElementById('treasurePopup').hidden = true;
    if (act === 'challenge' && pendingTreasureRelic) {
      try { localStorage.setItem('hw_treasure_relic', JSON.stringify({ id: pendingTreasureRelic.id, name: pendingTreasureRelic.name, emoji: pendingTreasureRelic.emoji })); } catch (e2) {}
      location.href = 'herosblood.html?treasure=1'; // 진행은 advanceStage에서 이미 저장됨
      return;
    }
    pendingTreasureRelic = null; // 그냥 떠나기/계속 — 대기실 유지
  });

  /* ---------- end states ---------- */
  function gameOver() {
    clearSave();
    TCG.sfx('lose');
    if (window.BGMEngine) BGMEngine.stinger('defeat');
    var fst = HW_STAGES[Math.min(run.mainStage, HW_STAGES.length - 1)];
    document.getElementById('overTitle').textContent = '💀 ' + TCG.t('hx.lordFallen');
    document.getElementById('overText').textContent = TCG.t('hx.gameOverText', { stage: (fst ? fst.name : ''), n: run.subStage + 1, max: SUB_COUNT });
    document.getElementById('overModal').hidden = false;
  }
  function victory() {
    // 초선: 노멀 모드 천하통일 시 획득(다음 진입 시 합류 대기 · 히어로즈 블러드 5연승으로도 획득)
    if ((run.mode || 'normal') === 'normal') unlockSpecialHero('diaochan', TCG.t('hx.reasonNormalClear'), false);
    showCredits();
  }

  /* ---------- 엔딩 크레딧 (천하통일 후) ---------- */
  function showCredits() {
    clearSave();
    TCG.sfx('win');
    // 현재 모드 클리어 → 다음 모드 해금
    var curMode = HW_MODES[run.mode] || HW_MODES.normal;
    var ci = HW_MODE_ORDER.indexOf(run.mode);
    var nextMode = (ci >= 0 && ci < HW_MODE_ORDER.length - 1) ? HW_MODE_ORDER[ci + 1] : null;
    var newlyUnlocked = nextMode && !isModeUnlocked(nextMode);
    if (nextMode) unlockMode(nextMode);
    var modeLine = '<div class="cr-h">— ' + TCG.t('hx.crMode') + ' —</div><div class="cr-list">' + TCG.t('hx.crModeClear', { mode: curMode.emoji + ' ' + curMode.label }) +
      (newlyUnlocked ? '<br><span style="color:var(--gold)">🔓 ' + TCG.t('hx.crModeUnlocked', { mode: HW_MODES[nextMode].emoji + ' ' + HW_MODES[nextMode].label }) + '</span>' : '') + '</div>';
    var st = HW_STAGES.map(function (x) { return '⚔ ' + x.name + ' <span class="cr-year">' + x.year + '</span>'; }).join('<br>');
    var roster = run.party.map(function (h) {
      return h.def.emoji + ' <b>' + h.def.name + '</b> <span class="rar-' + h.def.rarity + '">' + h.def.rarity + '</span>';
    }).join('<br>');
    var relics = run.relics.length ? run.relics.map(function (r) { return r.emoji + ' ' + r.name; }).join(' · ') : TCG.t('hx.none');
    var totalGen = run.party.length;
    var roll = document.getElementById('creditsRoll');
    roll.innerHTML =
      '<div class="cr-block cr-big">👑 ' + TCG.t('hx.unifiedWorld') + '</div>' +
      '<div class="cr-block cr-sub">— ' + TCG.t('hx.crGameName') + ' —</div>' +
      '<div class="cr-block cr-story">' + TCG.t('hx.crStory') + '</div>' +
      '<div class="cr-h">— ' + TCG.t('hx.crClearedStages') + ' —</div>' +
      '<div class="cr-list">' + st + '</div>' +
      '<div class="cr-h">— ' + TCG.t('hx.crOfficers', { n: totalGen }) + ' —</div>' +
      '<div class="cr-list">' + roster + '</div>' +
      '<div class="cr-h">— ' + TCG.t('hx.crRelics') + ' —</div>' +
      '<div class="cr-list">' + relics + '</div>' +
      '<div class="cr-h">— ' + TCG.t('hx.crDifficulty') + ' —</div>' +
      '<div class="cr-list">' + TCG.diffLabel(diff) + '</div>' +
      modeLine +
      '<div class="cr-block cr-story" style="margin-top:30px">' + TCG.t('hx.crCredits') + '</div>' +
      '<div class="cr-block cr-sub">' + TCG.t('hx.crThanks') + '</div>' +
      '<div class="cr-block cr-big" style="margin:40px 0">— 完 —</div>';
    // 애니메이션 재시작
    roll.classList.remove('rolling');
    void (roll.offsetWidth || 0);
    roll.classList.add('rolling');
    document.getElementById('creditsModal').hidden = false;
  }
  document.getElementById('overAgain').addEventListener('click', function () {
    document.getElementById('overModal').hidden = true; newRun();
  });
  document.getElementById('creditsAgain').addEventListener('click', function () {
    document.getElementById('creditsModal').hidden = true; newRun();
  });
  document.getElementById('creditsSkip').addEventListener('click', function () {
    var roll = document.getElementById('creditsRoll');
    roll.classList.toggle('paused');
  });

  /* ---------- hero detail ---------- */
  function showHeroModal(h) {
    var d = h.def;
    var slots = weaponSlots(h);
    var equipped = heroWpnIds(h);
    var free = freeWeaponIds();
    var totalAtkBonus = wpnVal(h, 'atk');
    // 무기 장착 영역 (장착 수: C=0 · R=1 · SR=2 · SSR=3)
    var slotLabel = slots === 0 ? TCG.t('hx.slotNone') : TCG.t('hx.slotCount', { rarity: d.rarity, n: slots });
    var wpnHtml = '<div class="wpn-box"><div class="wpn-title">🗡️ ' + TCG.t('hx.weapon') + ' (' + slotLabel + ')</div>';
    if (slots === 0) {
      wpnHtml += '<div class="wpn-empty">' + TCG.t('hx.cRankNoWeapon') + '</div>';
    } else {
      // 장착 슬롯
      for (var s = 0; s < slots; s++) {
        var wid = equipped[s];
        if (wid) {
          var w = HW_WEAPON_BY_ID[wid];
          wpnHtml += '<div class="wpn-cur"><span>' + w.emoji + ' <b>' + w.name + '</b> — ' + w.desc + '</span>' +
            '<button class="btn ghost wpn-act" data-wact="unequip" data-slot="' + s + '">' + TCG.t('hx.unequip') + '</button></div>';
        } else {
          wpnHtml += '<div class="wpn-cur none">' + TCG.t('hx.emptySlot') + '</div>';
        }
      }
      // 장착 가능한 무기 목록(빈 슬롯이 있을 때만) — 이 장수가 이미 가진 이름은 제외, 같은 이름은 한 번만
      var seenOpt = {};
      var equippable = free.filter(function (id) {
        if (seenOpt[id] || equipped.indexOf(id) !== -1) return false;
        seenOpt[id] = true;
        return true;
      });
      if (equipped.length < slots) {
        if (equippable.length) {
          wpnHtml += '<div class="wpn-list">' + equippable.map(function (id) {
            var fw = HW_WEAPON_BY_ID[id];
            return '<button class="wpn-opt" data-wact="equip" data-wid="' + id + '">' + fw.emoji + ' ' + fw.name +
              '<small>' + fw.desc + '</small></button>';
          }).join('') + '</div>';
        } else {
          wpnHtml += '<div class="wpn-empty">' + TCG.t('hx.noOwnedWeapons') + '</div>';
        }
      }
    }
    wpnHtml += '</div>';
    document.getElementById('heroModalBody').innerHTML =
      TCG.portrait(d.emoji, d.id, 'modal-portrait', d.name) +
      '<h2>' + d.name + ' <span class="rar-' + d.rarity + '" style="font-size:14px">' + d.rarity + '</span></h2>' +
      '<p>' + d.cls + ' · ⚔ ' + effAtk(h) + (totalAtkBonus ? ' ' + TCG.t('hx.weaponBonus', { n: totalAtkBonus }) : '') + '</p>' +
      '<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px;text-align:left;font-size:13px">' +
      '<b style="color:var(--gold)">「' + d.skill.name + '」</b> 💧' + skillMp(d.skill) + '<br>' +
      '<span style="color:var(--ink-dim)">' + d.skill.desc + '</span></div>' +
      wpnHtml +
      '<button class="btn primary" id="heroModalClose" style="margin-top:14px">' + TCG.t('hx.close') + '</button>';
    var modal = document.getElementById('heroModal');
    modal.hidden = false;
    document.getElementById('heroModalClose').addEventListener('click', function () { modal.hidden = true; refreshRosterIfOpen(); });
    document.getElementById('heroModalBody').querySelectorAll('[data-wact]').forEach(function (b) {
      b.addEventListener('click', function () {
        TCG.sfx('tap');
        var oldMaxHp = lordMaxHp(), oldMaxMp = lordMaxMp(); // 장착 전 주공 최대치
        if (b.dataset.wact === 'unequip') {
          h.weapons.splice(parseInt(b.dataset.slot, 10), 1);
        } else if (h.weapons.length < weaponSlots(h) && h.weapons.indexOf(b.dataset.wid) === -1 && freeWeaponIds().indexOf(b.dataset.wid) !== -1) {
          h.weapons.push(b.dataset.wid); // 장수당 같은 이름 장비는 1개만 장착 가능
        }
        // 주공 최대 HP/MP 변화량을 현재치에도 반영(대기실 즉시 반영 · 장착/해제 왕복 시 순증가 없음)
        var dHp = lordMaxHp() - oldMaxHp, dMp = lordMaxMp() - oldMaxMp;
        if (typeof run.lordHp === 'number') run.lordHp = Math.max(0, Math.min(lordMaxHp(), run.lordHp + dHp));
        if (typeof run.lordMp === 'number') run.lordMp = Math.max(0, Math.min(lordMaxMp(), run.lordMp + dMp));
        saveRun();
        renderCampaign(); // 대기실 주공 능력치 바 갱신
        showHeroModal(h); // 다시 렌더
      });
    });
  }
  document.getElementById('heroModal').addEventListener('click', function (e) {
    if (e.target.id === 'heroModal') { e.currentTarget.hidden = true; refreshRosterIfOpen(); }
  });

  /* ---------- boot ---------- */
  TCG.initFloatMenu();
  // 게임 가이드/소리/대사/데이터 초기화는 홈 화면 설정으로 이동 — 인게임에는 홈 버튼만 노출(요소 없으면 안전하게 건너뜀)
  // 게임 가이드 — 대기실 헤더의 가이드 버튼(data-act="guide")으로 열고, 닫기/바깥클릭은 항상 연결
  (function () {
    var gm = document.getElementById('guideModal'); if (!gm) return;
    var gc = document.getElementById('guideClose'); if (gc) gc.addEventListener('click', function () { gm.hidden = true; });
    gm.addEventListener('click', function (e) { if (e.target.id === 'guideModal') e.currentTarget.hidden = true; });
  })();
  // 데이터 초기화: 영웅전·대장전 진행 + 컬렉션 + 모드 해금 전부 삭제 후 새로고침
  function resetAllData() {
    ['hw_save', 'hw_raid_cleared', 'hw_mode_unlocked', 'hw_collected_heroes', 'hw_collected_weapons', 'hw_grant_heroes', 'hw_grant_weapons', 'hw_bonus_gold']
      .forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
  }
  var _resetBtn = document.getElementById('resetBtn');
  if (_resetBtn) {
    _resetBtn.addEventListener('click', function () { TCG.sfx('tap'); document.getElementById('resetConfirm').hidden = false; });
    document.getElementById('resetConfirmNo').addEventListener('click', function () { document.getElementById('resetConfirm').hidden = true; });
    document.getElementById('resetConfirm').addEventListener('click', function (e) { if (e.target.id === 'resetConfirm') e.currentTarget.hidden = true; });
    document.getElementById('resetConfirmYes').addEventListener('click', function () {
      resetAllData(); TCG.toast(TCG.t('hx.dataReset')); location.reload();
    });
  }
  var muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.textContent = (TCG.isMuted() ? '🔇 ' : '🔊 ') + TCG.t('hx.sound');
    muteBtn.addEventListener('click', function () {
      var m = TCG.toggleMute(); muteBtn.textContent = (m ? '🔇 ' : '🔊 ') + TCG.t('hx.sound');
      TCG.audioResume(); if (!m) TCG.sfx('tap');
    });
  }
  var dlgBtn = document.getElementById('dialogueBtn');
  if (dlgBtn) {
    dlgBtn.textContent = '💬 ' + (TCG.isDialogueOn() ? TCG.t('hx.dialogueOn') : TCG.t('hx.dialogueOff'));
    dlgBtn.addEventListener('click', function () {
      var on = TCG.toggleDialogue(); dlgBtn.textContent = '💬 ' + (on ? TCG.t('hx.dialogueOn') : TCG.t('hx.dialogueOff')); TCG.sfx('tap');
    });
  }
  var saved = loadSave();
  function renderModeSel() {
    var el = document.getElementById('modeSel'); if (!el) return;
    el.innerHTML = HW_MODE_ORDER.map(function (k) {
      var m = HW_MODES[k], un = isModeUnlocked(k);
      return '<button class="mode-btn mode-' + k + (un ? '' : ' locked') + '" data-mode="' + k + '"' + (un ? '' : ' disabled') + '>' +
        '<b>' + m.emoji + ' ' + m.label + '</b><small>' + (un ? m.desc : '🔒 ' + TCG.t('hx.modeLocked')) + '</small></button>';
    }).join('');
  }
  function startNew(mode) { document.getElementById('startModal').hidden = true; TCG.audioResume(); newRun(mode); }
  var pendingMode = null;
  function requestNew(mode) {
    if (saved) { // 저장된 진행이 있으면 새 모험 전 확인
      pendingMode = mode;
      var smd = HW_MODES[saved.mode] || HW_MODES.normal;
      document.getElementById('newRunConfirmText').textContent =
        TCG.t('hx.newRunConfirm', { mode: smd.emoji + smd.label, n: (saved.mainStage || 0) + 1 });
      document.getElementById('newRunConfirm').hidden = false;
    } else { startNew(mode); }
  }
  document.getElementById('modeSel').addEventListener('click', function (e) {
    var b = e.target.closest('.mode-btn'); if (!b || b.disabled) return;
    TCG.sfx('tap'); requestNew(b.dataset.mode);
  });
  document.getElementById('newRunConfirmYes').addEventListener('click', function () {
    document.getElementById('newRunConfirm').hidden = true;
    startNew(pendingMode || 'normal');
  });
  document.getElementById('newRunConfirmNo').addEventListener('click', function () {
    document.getElementById('newRunConfirm').hidden = true; // 취소 → 시작 모달 유지
  });
  document.getElementById('newRunConfirm').addEventListener('click', function (e) {
    if (e.target.id === 'newRunConfirm') e.currentTarget.hidden = true;
  });
  document.getElementById('continueBtn').addEventListener('click', function () {
    document.getElementById('startModal').hidden = true;
    TCG.audioResume();
    if (saved) resumeRun(saved); else newRun('normal');
  });
  document.getElementById('newRunBtn').addEventListener('click', function () { startNew('normal'); }); // 호환
  renderModeSel();
  function autoEnter() {
    // 시작 모달 없이: 이어하기가 있으면 자동 이어하기, 없으면 자동 새 게임(최고 해금 난이도)
    TCG.audioResume();
    if (saved) resumeRun(saved); else newRun();
  }
  // 홈 화면 진입 파라미터: ?mode=난이도(새 게임) · ?go=codex|shop|tavern · ?resume=1
  var modeParam = (location.search.match(/[?&]mode=(normal|hard|extreme)/) || [])[1];
  var goParam = (location.search.match(/[?&]go=(codex|shop|tavern)/) || [])[1];
  var adminParam = /[?&]admin=1\b/.test(location.search);
  // 진입 파라미터는 일회성 — 처리 후 URL에서 제거해 새로고침 시 새 게임/딥링크가 재실행되지 않게 함(저장된 모험 유지)
  if (modeParam || goParam || adminParam) {
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }
  if (adminParam) {
    // 관리자: 모든 장수 영입 + 모든 장비/유물 보유 + 컬렉션 전체 해금, 극악·마지막 전역 출진 1, 금화 10000
    TCG.audioResume(); newRun('extreme');
    HW_HEROES.forEach(function (d) {
      if (collectedHeroes.indexOf(d.id) === -1) collectedHeroes.push(d.id);
      if (!run.party.some(function (h) { return h.def.id === d.id; })) run.party.push(mkHero(d.id));
    });
    run.weapons = HW_WEAPONS.map(function (w) { return w.id; });
    run.relics = HW_RELICS.slice();
    collectedWeapons = HW_WEAPONS.map(function (w) { return w.id; });
    collectedRelics = HW_RELICS.map(function (r) { return r.id; });
    try {
      localStorage.setItem('hw_collected_heroes', JSON.stringify(collectedHeroes));
      localStorage.setItem('hw_collected_weapons', JSON.stringify(collectedWeapons));
      localStorage.setItem('hw_collected_relics', JSON.stringify(collectedRelics));
    } catch (e) {}
    run.mainStage = HW_STAGES.length - 1; run.subStage = 0; run.gold = 10000;
    run.lordHp = lordMaxHp(); run.lordMp = lordMaxMp();
    syncDeck(); saveRun(); showMap();
  } else if (modeParam) {
    // 홈 난이도 선택 → 해당 난이도로 새 게임
    TCG.audioResume(); newRun(modeParam);
  } else if (goParam === 'shop' || goParam === 'tavern') {
    // 상점·주막은 진행 중 모험이 필요 — 이어하기(없으면 새 게임) 후 진입
    TCG.audioResume();
    if (saved) resumeRun(saved); else newRun();
    if (goParam === 'shop') showShop(); else showTavern();
  } else if (goParam === 'codex') {
    // 도감은 모험과 무관하게 열람 — 닫으면 자동 진입
    codexOnBack = autoEnter;
    openCodex('hero');
  } else {
    autoEnter();
  }
})();
