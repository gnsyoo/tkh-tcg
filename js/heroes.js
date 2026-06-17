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
  function critChance(h) { return BASE_CRIT + (h ? wpnVal(h, 'crit') : 0); }
  function rollCrit(chance) { return Math.random() < chance; }
  function heroWpnIds(h) { return (h && h.weapons) ? h.weapons : []; }
  function heroWpns(h) { return heroWpnIds(h).map(function (id) { return HW_WEAPON_BY_ID[id]; }).filter(Boolean); }
  function wpnVal(h, key) { return heroWpns(h).reduce(function (s, w) { return s + (w.effect[key] || 0); }, 0); }
  function hasWpnFlag(h, key) { return heroWpns(h).some(function (w) { return !!w.effect[key]; }); }
  function effAtk(h) { var c = run.combat; return h.atk + wpnVal(h, 'atk') + (c ? (c.atkBuff || 0) + ((c.tempAtk && c.tempAtk.turns > 0) ? c.tempAtk.val : 0) + ((c.cardBuff && h.uid && c.cardBuff[h.uid]) ? c.cardBuff[h.uid] : 0) : 0); }
  function lordMaxHp() { return HW_LORD.hp + run.party.reduce(function (s, h) { return s + wpnVal(h, 'lordHp'); }, 0); }
  function lordMaxMp() { return HW_LORD.mp + run.party.reduce(function (s, h) { return s + wpnVal(h, 'lordMp'); }, 0); }
  function lordEvade() { return Math.min(0.6, run.party.reduce(function (s, h) { return s + wpnVal(h, 'evade'); }, 0)); } // 회피(무기 합산, 최대 60%)
  function skillMp(sk) { return 2 + (sk.cost || 1); } // 스킬 MP 비용 3~5
  function ownedHeroIds() { return run.party.map(function (h) { return h.def.id; }); } // 중복 수집 방지
  // 보유 무기 중 아직 장착되지 않은 것들(중복 보유 허용)
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
  }
  function updateTop() {
    document.getElementById('goldPill').textContent = '💰 ' + run.gold;
    var st = HW_STAGES[run.mainStage];
    var md = HW_MODES[run.mode] || HW_MODES.normal;
    document.getElementById('floorPill').textContent = st
      ? (md.emoji + ' ' + (run.mainStage + 1) + '/' + HW_STAGES.length + ' ' + st.name + ' · ' + (run.subStage + 1) + '/' + SUB_COUNT)
      : '천하통일';
    var dp = document.getElementById('diffPill'); if (dp) dp.textContent = md.emoji + ' ' + md.label;
  }

  /* ---------- collection (도감, 모험과 무관하게 영구 보존) ---------- */
  function loadCollected(key) {
    try { var a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  var collectedHeroes = loadCollected('hw_collected_heroes');
  var collectedWeapons = loadCollected('hw_collected_weapons');
  function syncCollection() {
    var changed = false;
    if (run) {
      run.party.forEach(function (h) { if (collectedHeroes.indexOf(h.def.id) === -1) { collectedHeroes.push(h.def.id); changed = true; } });
      (run.weapons || []).forEach(function (id) { if (collectedWeapons.indexOf(id) === -1) { collectedWeapons.push(id); changed = true; } });
    }
    if (changed) {
      try {
        localStorage.setItem('hw_collected_heroes', JSON.stringify(collectedHeroes));
        localStorage.setItem('hw_collected_weapons', JSON.stringify(collectedWeapons));
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
        party: run.party.map(function (h) { return { id: h.def.id, atk: h.atk, uid: h.uid, weapons: heroWpnIds(h).slice() }; }),
        deck: (run.deck || []).slice(),
        tavern: run.tavern || null,
        gold: run.gold, mainStage: run.mainStage, subStage: run.subStage,
        relics: run.relics.map(function (r) { return r.id; }),
        weapons: run.weapons.slice(), items: (run.items || []).slice(), sorties: run.sorties || 0,
        lordHp: run.lordHp, lordMp: run.lordMp, mode: run.mode || 'normal'
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
        return { uid: h.uid || (h.id + '_' + Math.random().toString(36).slice(2, 7)), def: HW_BY_ID[h.id], atk: h.atk, weapons: ws };
      }),
      gold: d.gold || 0,
      mainStage: Math.min(Math.max(0, d.mainStage || 0), HW_STAGES.length - 1),
      subStage: Math.min(Math.max(0, d.subStage || 0), SUB_COUNT - 1),
      relics: (d.relics || []).map(function (id) { return relicById[id]; }).filter(Boolean),
      weapons: (d.weapons || []).filter(function (id) { return HW_WEAPON_BY_ID[id]; }),
      items: (d.items || []).filter(function (id) { return HW_CONS_BY_ID[id]; }).slice(0, HW_ITEM_MAX),
      sorties: d.sorties || 0,
      deck: Array.isArray(d.deck) ? d.deck.slice() : [],
      tavern: (d.tavern && Array.isArray(d.tavern.items)) ? d.tavern : null,
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
    clearSave();
    // 시작 장수 + 지정 경로(전투 보상·저잣거리 외 = 전용)로만 얻는 장수 중 이미 도감에 열린 장수는 시작 시 합류
    var startIds = HW_STARTERS.slice();
    HW_HEROES.forEach(function (d) {
      if (d.exclusive && collectedHeroes.indexOf(d.id) !== -1 && startIds.indexOf(d.id) === -1) startIds.push(d.id);
    });
    run = { party: startIds.map(mkHero), deck: [], gold: DCFG.startGold, mainStage: 0, subStage: 0, relics: [], weapons: [], items: [], sorties: 0, stageShopped: false, combat: null };
    run.mode = (HW_MODES[mode] && isModeUnlocked(mode)) ? mode : 'normal';
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
        TCG.toast('히어로즈 블러드 정산 골드 ' + (b > 0 ? '+' : '') + b + (delta !== b ? ' (적용 ' + delta + ')' : ''));
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
          TCG.toast('특별 영입: ' + HW_BY_ID[id].name + ' 합류!');
        } else {
          remaining.push(id);
          TCG.toast(HW_BY_ID[id].name + ' 영입 대기 (파티가 가득 찼습니다)');
        }
      });
      localStorage.setItem('hw_grant_heroes', JSON.stringify(remaining));
      localStorage.setItem('hw_collected_heroes', JSON.stringify(collectedHeroes));
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
    TCG.toast('🐎 ' + reason + ' — ' + HW_BY_ID[id].name + (already ? ' 합류!' : ' 획득!'));
  }
  // 장수 컬렉션 100% 완료 → 자웅일대검 지급(다른 경로로는 획득 불가)
  function checkCollectionReward() {
    if (!run) return;
    syncCollection();
    var allHeroes = HW_HEROES.every(function (d) { return collectedHeroes.indexOf(d.id) !== -1; });
    if (!allHeroes) return;
    if (collectedWeapons.indexOf('cixiong') === -1) {
      collectedWeapons.push('cixiong');
      try { localStorage.setItem('hw_collected_weapons', JSON.stringify(collectedWeapons)); } catch (e) {}
    }
    if ((run.weapons || []).indexOf('cixiong') === -1) {
      run.weapons.push('cixiong');
      TCG.toast('🌟 장수 컬렉션 완료 보상 — 자웅일대검 획득!');
    }
  }
  function showMap() {
    applyBonusGold();
    applyPendingGrants();
    checkCollectionReward();
    updateTop();
    var mt = document.getElementById('mapTitle');
    if (mt) { var md = HW_MODES[run.mode] || HW_MODES.normal; mt.textContent = '📜 연대기 · ' + md.emoji + ' ' + md.label; }
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
      var isMidDot = (i === 4 || i === 9);
      var clickable = isMidDot || (i === SUB_COUNT - 1); // 중간보스·적장 칸은 탭하면 적 정보
      dots += '<span class="sub-dot' + dc + (i === SUB_COUNT - 1 ? ' boss' : (isMidDot ? ' mid' : '')) + (clickable ? ' info' : '') + '"' + (clickable ? ' data-sub="' + i + '"' : '') + '>' + (isMidDot ? '⚜' : (i === SUB_COUNT - 1 ? '👑' : '')) + '</span>';
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
        '<button class="camp-btn" data-act="formation">🎴 진형</button>' +
        '<button class="camp-btn" data-act="shop">🏪 상점</button>' +
        '<button class="camp-btn" data-act="tavern">🏮 주막</button>' +
      '</div>' +
      '<div class="map-lord-status">' +
        '<span class="mls hp">❤ ' + (run.lordHp != null ? run.lordHp : lordMaxHp()) + ' / ' + lordMaxHp() + '</span>' +
        '<span class="mls mp">💧 ' + (run.lordMp != null ? run.lordMp : lordMaxMp()) + ' / ' + lordMaxMp() + '</span>' +
        '<span class="mls gold">💰 ' + run.gold + '</span>' +
      '</div>';
    document.getElementById('mapTrack').innerHTML = html;
    document.getElementById('rosterCount').textContent = run.party.length;
    document.getElementById('gearCount').textContent = (run.weapons || []).length;
  }
  document.getElementById('mapTrack').addEventListener('click', function (e) {
    var dot = e.target.closest('.sub-dot.info');
    if (dot) { TCG.sfx('tap'); showStageEnemyInfo(parseInt(dot.dataset.sub, 10)); return; } // 중간보스/적장 정보
    var btn = e.target.closest('.camp-btn');
    if (!btn || btn.disabled) return;
    var act = btn.dataset.act;
    TCG.sfx('tap');
    if (act === 'battle') return startStageCombat();
    if (act === 'formation') return openFormation();
    if (act === 'shop') return showShop();
    if (act === 'tavern') return showTavern();
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
      var bhp = Math.round(cmd.hp * hpM), batk = Math.max(1, Math.round(cmd.atk * atkM * md.bossAtkMult));
      var bsk = (cmd.hero && HW_BY_ID[cmd.hero]) ? HW_BY_ID[cmd.hero].skill : null;
      body = TCG.portrait(cmd.emoji, (cmd.hero && HW_BY_ID[cmd.hero]) ? cmd.hero : cmd.name, 'modal-portrait', cmd.name) +
        '<h2>👑 ' + cmd.name + ' <span class="rar-SSR" style="font-size:13px">적장</span></h2>' +
        '<p>' + st.name + ' 최종 보스' + (cmd.aoe ? ' · 💥 광역' : '') + '</p>' +
        '<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px;text-align:left;font-size:13px">' +
        '❤ HP ' + bhp + ' · ⚔ 공격 ' + batk + (bsk ? '<br><b style="color:var(--gold)">「' + bsk.name + '」</b> ' + bsk.desc : '') +
        '<br><span style="color:var(--ink-dim)">MP 보유 · 확률로 스킬 시전</span></div>';
    } else {
      var idx = (sub === 9) ? 1 : 0, mb = (HW_MID_BOSSES[main] || [])[idx];
      if (!mb) { return; }
      var mhp = Math.round(mb.hp * hpM * HW_MID.hpMult), matk = Math.max(1, Math.round(mb.atk * atkM * HW_MID.atkMult));
      var msk = HW_MID_SKILLS[(main * 2 + idx) % HW_MID_SKILLS.length];
      body = TCG.portrait(mb.emoji, mb.name, 'modal-portrait', mb.name) +
        '<h2>⚜ ' + mb.name + ' <span class="rar-SR" style="font-size:13px">중간보스</span></h2>' +
        '<p>' + st.name + ' · ' + (sub + 1) + '번째 출진' + (mb.aoe ? ' · 💥 광역' : '') + '</p>' +
        '<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px;text-align:left;font-size:13px">' +
        '❤ HP ' + mhp + ' · ⚔ 공격 ' + matk + '<br><b style="color:var(--gold)">「' + msk.name + '」</b> ' + msk.desc +
        '<br><span style="color:var(--ink-dim)">일반 적 1명과 함께 등장(고정)</span></div>';
    }
    document.getElementById('heroModalBody').innerHTML = body +
      '<button class="btn primary" id="heroModalClose" style="margin-top:14px">닫기</button>';
    var modal = document.getElementById('heroModal'); modal.hidden = false;
    document.getElementById('heroModalClose').addEventListener('click', function () { modal.hidden = true; });
  }

  /* ---------- 장수(수집 목록) — 탭하면 정보·장비 장착 ---------- */
  function openRoster() {
    TCG.sfx('tap');
    document.getElementById('rosterTitleCount').textContent = '· 수집 ' + run.party.length + ' / ' + HW_HEROES.length;
    document.getElementById('rosterGrid').innerHTML = run.party.map(miniHero).join('');
    document.getElementById('rosterModal').hidden = false;
  }
  /* ---------- 진형(출진 덱 편성) ---------- */
  function renderFormationGrid() {
    var deck = run.deck || [];
    var inDeck = {}; deck.forEach(function (u) { inDeck[u] = true; });
    document.getElementById('formationTitle').textContent =
      '· 출진 덱 ' + deck.length + ' / ' + MAX_DECK + ' (최소 ' + deckMin() + ')';
    document.getElementById('formationGrid').innerHTML = run.party.map(function (h) {
      var ws = heroWpns(h).map(function (w) { return w.emoji; }).join('');
      var on = !!inDeck[h.uid];
      return '<div class="mini-hero deck-pick' + (on ? ' in-deck' : '') + '" data-uid="' + h.uid + '">' +
        '<span class="mh-rar rar-' + h.def.rarity + '">' + h.def.rarity + '</span>' +
        '<span class="deck-check">' + (on ? '✓' : '+') + '</span>' +
        TCG.portrait(h.def.emoji, h.def.id, '', h.def.name) +
        '<div class="mh-name">' + h.def.name + '</div>' +
        '<div class="mh-stats">⚔' + effAtk(h) + (ws ? ' <span class="mh-wpn">' + ws + '</span>' : '') + '</div>' +
        '<button class="mh-equip" data-equip="' + h.uid + '">🗡 장비</button>' +
        '</div>';
    }).join('');
  }
  function toggleDeck(uid) {
    if (!run.deck) run.deck = [];
    var i = run.deck.indexOf(uid);
    if (i >= 0) {
      if (run.deck.length <= deckMin()) { TCG.toast('출진 덱은 최소 ' + deckMin() + '장이어야 합니다'); return; }
      run.deck.splice(i, 1);
    } else {
      if (run.deck.length >= MAX_DECK) { TCG.toast('출진 덱은 최대 ' + MAX_DECK + '장입니다'); return; }
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
    if (!document.getElementById('rosterModal').hidden) document.getElementById('rosterGrid').innerHTML = run.party.map(miniHero).join('');
    if (!document.getElementById('formationModal').hidden) renderFormationGrid();
  }
  function openGear() {
    TCG.sfx('tap');
    var inv = run.weapons || [];
    var html;
    if (!inv.length) {
      html = '<div class="gear-empty">보유한 장비가 없습니다.<br>출진 5·10회 보물상자나 저잣거리에서 무기를 얻으세요.</div>';
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
          ? '<span class="gear-on">착용: ' + wearers.join(', ') + '</span>' + (free > 0 ? ' <span class="gear-free">· 미장착 ' + free + '</span>' : '')
          : '<span class="gear-free">미장착</span>';
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
    document.getElementById('gearModal').hidden = false;
  }
  document.getElementById('rosterBtn').addEventListener('click', openRoster);
  document.getElementById('gearBtn').addEventListener('click', openGear);
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
  document.getElementById('formationClose').addEventListener('click', function () { document.getElementById('formationModal').hidden = true; });
  document.getElementById('formationModal').addEventListener('click', function (e) { if (e.target.id === 'formationModal') e.currentTarget.hidden = true; });
  document.getElementById('rosterClose').addEventListener('click', function () { document.getElementById('rosterModal').hidden = true; });
  document.getElementById('gearClose').addEventListener('click', function () { document.getElementById('gearModal').hidden = true; });
  document.getElementById('rosterModal').addEventListener('click', function (e) { if (e.target.id === 'rosterModal') e.currentTarget.hidden = true; });
  document.getElementById('gearModal').addEventListener('click', function (e) { if (e.target.id === 'gearModal') e.currentTarget.hidden = true; });

  /* ---------- 컬렉션(도감): 전체 카탈로그 + 수집 여부 + 획득 경로 ---------- */
  function heroPath(d) {
    if (HW_STARTERS.indexOf(d.id) !== -1) return '🏳️ 시작 장수 (처음부터 보유)';
    if (d.exclusive === 'qb') return '🃏 히어로즈 블러드 3연승 보상';
    if (d.exclusive === 'raid') {
      var rb = null; HW_RAID.bosses.forEach(function (b) { if (b.reward === d.id) rb = b; });
      return '👹 삼국 대장전 — ' + (rb ? HW_COMMANDERS[rb.key].name : '적장') + ' 격파 보상 (대장전에서만 획득)';
    }
    if (d.exclusive === 'special') return '🐎 화웅(첫 적장)을 주공 풀 HP로 격파 또는 노멀 모드 천하통일';
    return '⚔️ 전투 보상 영입 · 🏪 저잣거리 구매';
  }
  function weaponPath(w) {
    if (w.exclusive === 'collection') return '📕 장수 컬렉션 100% 완료 보상';
    return '💎 보물상자(출진 5·10회) · 🏪 저잣거리';
  }
  function renderHeroCodex() {
    document.getElementById('heroColTitle').textContent = '(' + collectedHeroes.length + ' / ' + HW_HEROES.length + ')';
    document.getElementById('heroColGrid').innerHTML = HW_HEROES.map(function (d) {
      var got = collectedHeroes.indexOf(d.id) !== -1;
      return '<div class="col-card' + (got ? '' : ' locked') + '" data-id="' + d.id + '">' +
        TCG.portrait(d.emoji, d.id, '', d.name) +
        '<div class="col-name">' + d.name + '</div>' +
        '<div class="col-rar rar-' + d.rarity + '">' + d.rarity + ' · ' + d.cls + '</div>' +
        (got ? '' : '<div class="col-lock">🔒</div>') +
        '</div>';
    }).join('');
    document.getElementById('heroColDetail').innerHTML = '👆 장수를 선택하면 <b>능력치·획득 경로</b>가 표시됩니다';
  }
  function renderWeaponCodex() {
    document.getElementById('weaponColTitle').textContent = '(' + collectedWeapons.length + ' / ' + HW_WEAPONS.length + ')';
    document.getElementById('weaponColList').innerHTML = HW_WEAPONS.map(function (w) {
      var got = collectedWeapons.indexOf(w.id) !== -1;
      return '<div class="gear-row col-pick' + (got ? '' : ' locked') + '" data-id="' + w.id + '">' +
        '<div class="gear-emoji">' + w.emoji + '</div>' +
        '<div class="gear-info">' +
          '<div class="gear-name">' + w.name + (got ? '' : ' 🔒') + '</div>' +
          '<div class="gear-desc">' + w.desc + '</div>' +
        '</div></div>';
    }).join('');
    document.getElementById('weaponColDetail').innerHTML = '👆 장비를 선택하면 <b>획득 경로</b>가 표시됩니다';
  }
  function showCodexTab(tab) {
    var hero = tab !== 'weapon';
    document.getElementById('codexHeroPanel').hidden = !hero;
    document.getElementById('codexWeaponPanel').hidden = hero;
    document.getElementById('codexTabHero').classList.toggle('active', hero);
    document.getElementById('codexTabWeapon').classList.toggle('active', !hero);
  }
  function openCodex(tab) {
    TCG.sfx('tap'); syncCollection();
    renderHeroCodex(); renderWeaponCodex();
    showCodexTab(tab || 'hero');
    document.getElementById('codexModal').hidden = false;
  }
  document.getElementById('codexBtn').addEventListener('click', function () { openCodex('hero'); });
  document.getElementById('codexTabHero').addEventListener('click', function () { TCG.sfx('tap'); showCodexTab('hero'); });
  document.getElementById('codexTabWeapon').addEventListener('click', function () { TCG.sfx('tap'); showCodexTab('weapon'); });
  document.getElementById('heroColGrid').addEventListener('click', function (e) {
    var c = e.target.closest('.col-card'); if (!c) return;
    var d = HW_BY_ID[c.dataset.id]; if (!d) return;
    var got = collectedHeroes.indexOf(d.id) !== -1;
    var slots = slotsForRarity(d.rarity);
    document.getElementById('heroColDetail').innerHTML =
      '<b>' + d.emoji + ' ' + d.name + '</b> <span class="rar-' + d.rarity + '">' + d.rarity + '</span> · ' + (got ? '<span class="cd-got">보유 중</span>' : '<span class="cd-no">미보유</span>') +
      '<br><span class="cd-sub">' + d.cls + ' · ❤️ HP ' + d.hp + ' · ⚔️ 공격 ' + d.atk + ' · 🗡️ 무기 슬롯 ' + slots + '</span>' +
      '<br><span class="cd-sub">✨ ' + d.skill.name + ' (MP ' + d.skill.cost + '): ' + d.skill.desc + '</span>' +
      '<br><span class="cd-path">획득 경로: ' + heroPath(d) + '</span>';
    TCG.sfx('tap');
  });
  document.getElementById('weaponColList').addEventListener('click', function (e) {
    var c = e.target.closest('.col-pick'); if (!c) return;
    var w = HW_WEAPON_BY_ID[c.dataset.id]; if (!w) return;
    var got = collectedWeapons.indexOf(w.id) !== -1;
    document.getElementById('weaponColDetail').innerHTML =
      '<b>' + w.emoji + ' ' + w.name + '</b> · ' + (got ? '<span class="cd-got">보유 중</span>' : '<span class="cd-no">미보유</span>') +
      '<br><span class="cd-sub">' + w.desc + '</span>' +
      '<br><span class="cd-sub">💰 가치 ' + weaponCost(w) + ' 골드</span>' +
      '<br><span class="cd-path">획득 경로: ' + weaponPath(w) + '</span>';
    TCG.sfx('tap');
  });
  document.getElementById('codexClose').addEventListener('click', function () { document.getElementById('codexModal').hidden = true; });
  document.getElementById('codexModal').addEventListener('click', function (e) { if (e.target.id === 'codexModal') e.currentTarget.hidden = true; });
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
      TCG.toast('「' + cleared.name + '」 평정! 주공 완전 회복 · 「' + HW_STAGES[run.mainStage].name + '」 해금');
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
      var hpx = mid ? HW_MID.hpMult : 1, atkx = mid ? HW_MID.atkMult : 1;
      var hp = Math.round(d.hp * hpM * hpx);
      var atk = Math.max(1, Math.round(d.atk * atkM * (boss ? md.bossAtkMult : 1) * atkx)); // 모드: 적장 공격 배수
      var e = { def: d, name: (mid ? '⚜ ' + d.name : d.name), emoji: d.emoji, maxHp: hp, hp: hp,
        atk: atk, aoe: !!d.aoe, boss: !!boss, mid: !!mid, quote: d.quote || null, crit: (boss ? md.bossCrit : BASE_CRIT), block: 0, intent: null };
      if (boss && d.hero && HW_BY_ID[d.hero]) { // 적장은 대응 장수의 원래 스킬 + MP 보유
        var bc = HW_BOSS[diff] || HW_BOSS.normal;
        e.skill = HW_BY_ID[d.hero].skill; e.maxMp = bc.mp; e.mp = bc.mp; e.skillChance = bc.skillChance; e.atk0 = atk;
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
      out.push(inst(TCG.pick(HW_ENEMIES.basic)));
      out.push(inst(HW_COMMANDERS[st.boss], true)); // 적장
    } else if (isMid) {
      var mbIdx = (sub === 9) ? 1 : 0; // 5출전=0 · 10출전=1
      var mbSet = HW_MID_BOSSES[main] || HW_MID_BOSSES[HW_MID_BOSSES.length - 1];
      out.push(inst(HW_ENEMIES.basic[(main + mbIdx) % HW_ENEMIES.basic.length])); // 고정 일반 적 1명
      out.push(inst(mbSet[mbIdx], false, true)); // 고정 네임드 중간보스
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
    show('combatScreen');
    if (isBoss) {
      fxBanner('👑 적장 ' + HW_COMMANDERS[st.boss].name, 'boss', 1500); shake('big');
      logMsg(st.name + ' — 적장 ' + HW_COMMANDERS[st.boss].name + ' 토벌전!');
    } else {
      fxBanner('⚔ ' + st.name + ' ' + (s + 1) + '/' + SUB_COUNT, 'round', 1000);
      logMsg(st.name + ' 서브 ' + (s + 1) + ' 개전!');
    }
    beginRound();
    // 보스/중간보스 등장 대사 — 카드 아래 말풍선 2초
    var lead = enemies[enemies.length - 1];
    if (lead && lead.quote && (lead.boss || lead.mid)) {
      setTimeout(function () { fxQuote(enemyEl(enemies.length - 1), lead.quote, 2000); }, isBoss ? 1100 : 700);
    }
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
    var cap = Math.min(centerSize(), c.draw.length + c.center.length + c.used.length);
    var guard = 0;
    while (c.center.length < cap && guard++ < 60) { if (!drawOne()) break; }
  }

  function beginRound() {
    var c = run.combat;
    c.round++;
    if (c.round > 1) {
      c.lord.block = 0; // 라운드 시작 시 주공 블록 초기화(1R은 startBlock 유지)
      c.lord.mp = Math.min(c.lord.maxMp, c.lord.mp + Math.max(2, Math.round(c.lord.maxMp * 0.035))); // 턴마다 MP 재생(스킬 MP 소모 보전)
    }
    c.itemUsed = false; // 소모성 아이템은 턴당 1개
    c.cardBuff = {}; // 아군 1명 공격 버프는 1턴만 유지
    if (c.tempAtk && c.tempAtk.turns > 0) { c.tempAtk.turns--; }
    // 중독된 아군 카드 → 주공이 턴마다 지속 피해(턴마다 1씩 약화, 해독초로 즉시 해제)
    if (c.cstat) {
      var pTot = 0; Object.keys(c.cstat).forEach(function (uid) { if (c.cstat[uid].poison > 0 && heroByUid(uid)) pTot += c.cstat[uid].poison; });
      if (pTot > 0 && c.round > 1) {
        c.lord.hp = Math.max(0, c.lord.hp - pTot); fxHitHero(lordEl(), pTot, 0, false); logMsg('중독 — 주공 ' + pTot + ' 피해');
        Object.keys(c.cstat).forEach(function (uid) { if (c.cstat[uid].poison > 0) c.cstat[uid].poison--; });
        if (c.lord.hp <= 0) { setTimeout(gameOver, 400); return; }
      }
    }
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
      fxFloat(p.x, p.y - 24, '💥 치명타!', '#ffd34d', true);
      fxFloat(p.x, p.y, '-' + dmg, '#ffd34d', true);
      fxBanner('💥 치명타!', 'crit', 650);
    } else if (kind === 'aoe') { fxBurst(p.x, p.y, '#ff8a4c'); fxParticles(p.x, p.y, 8, '#ffcaa0'); fxFloat(p.x, p.y, '-' + dmg, '#ff9a9a', false); }
    else { fxSlash(p.x, p.y); fxBurst(p.x, p.y, '#ffffff'); fxParticles(p.x, p.y, 7, '#ffc6c6'); fxFloat(p.x, p.y, '-' + dmg, '#ff9a9a', true); }
  }
  function fxHitHero(el, dmg, blocked, crit) {
    var p = rectOf(el); if (!p) return;
    if (blocked) fxFloat(p.x, p.y - 14, '🛡' + blocked, '#9fd2ff');
    if (dmg > 0) {
      fxSlash(p.x, p.y); fxBurst(p.x, p.y, crit ? '#ffd34d' : '#ff6b6b');
      if (crit) { fxCritBoom(p.x, p.y); fxFloat(p.x, p.y - 24, '💥 치명타!', '#ffd34d', true); fxBanner('💥 치명타!', 'crit', 650); }
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
    // enemies (적장은 주공을 공격)
    document.getElementById('enemyRow').innerHTML = c.enemies.map(function (e, idx) {
      var dead = e.hp <= 0;
      var tgt = c.targeting && c.pending && c.pending.side === 'enemy' && !dead;
      var charmed = e.charmed > 0;
      var confd = e.confused > 0;
      var intentTxt = charmed ? '💤 매혹' : (confd ? '💤 혼란' : (e.intent ? (e.intent.type === 'aoe' ? '💥' + e.intent.dmg : '⚔️' + e.intent.dmg) : ''));
      return '<div class="unit enemy' + (dead ? ' dead' : '') + (tgt ? ' targetable' : '') + ((charmed || confd) ? ' charmed' : '') + (e.boss ? ' is-boss' : '') + (e.mid ? ' is-mid' : '') + '" data-side="enemy" data-idx="' + idx + '">' +
        (e.mid ? '<div class="u-tag mid">중간보스</div>' : (e.boss ? '<div class="u-tag boss">적장</div>' : '')) +
        (dead ? '' : '<div class="u-intent">' + intentTxt + '</div>') +
        (e.block > 0 ? '<div class="u-block">🛡' + e.block + '</div>' : '') +
        (charmed ? '<div class="u-charm">💗' + e.charmed + '</div>' : '') +
        (e.poison > 0 ? '<div class="u-poison">☠' + e.poison + '</div>' : '') +
        TCG.portrait(e.emoji, e.name) +
        '<div class="u-name">' + e.name + '</div>' +
        '<div class="u-hp-text">❤ ' + Math.max(0, e.hp) + '/' + e.maxHp + '</div>' +
        (e.maxMp ? '<div class="u-mp-text">💧 ' + Math.max(0, e.mp) + '/' + e.maxMp + '</div>' : '') +
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
    renderItemBar();
    document.getElementById('endTurnBtn').disabled = (c.phase === 'enemy' || c.busy);
    var hint = document.getElementById('combatHint');
    if (c.phase === 'enemy') hint.textContent = '적이 행동 중…';
    else if (c.targeting) hint.textContent = '대상을 선택하세요';
    else if (c.sel) hint.textContent = '공격 행동을 선택하세요';
    else hint.textContent = '가운데 카드를 선택해 공격하거나, 턴을 종료하세요';
  }

  function defenseOf(h) { return 3 + Math.floor(effAtk(h) / 3); }

  function renderPiles() {
    var c = run.combat;
    // 왼쪽: 뽑을 카드 풀 (겹친 더미)
    var drawStack = '';
    for (var i = 0; i < Math.min(c.draw.length, 5); i++) drawStack += '<div class="pile-card" style="--i:' + i + '"></div>';
    document.getElementById('drawPile').innerHTML =
      drawStack + '<div class="pile-label">뽑을 카드 <b>' + c.draw.length + '</b></div>';

    // 가운데: 공격/방어 덱 (3장 이상이면 가로 스크롤)
    var canAct = c.phase !== 'enemy' && !c.targeting && !c.busy;
    var centerHtml = c.center.map(function (uid) {
      var h = heroByUid(uid); if (!h) return '';
      var sk = h.def.skill;
      var st = c.cstat && c.cstat[uid];
      var stunned = st && st.stun > 0, pois = st && st.poison > 0;
      var sel = c.sel && c.sel.uid === uid && !c.targeting;
      var cls = 'combat-card' + (sel ? ' selected' : '') + ((canAct && !stunned) ? '' : ' unplayable') + (stunned ? ' stunned' : '');
      var ws = heroWpns(h);
      var wEmoji = ws.map(function (w) { return w.emoji; }).join('');
      var wName = ws.map(function (w) { return w.name; }).join(', ');
      var badge = (stunned ? '<div class="cc-stun">' + (st.cause === '매혹' ? '💗' : '💫') + '</div>' : '') +
        (pois ? '<div class="cc-pois">☠' + st.poison + '</div>' : '');
      return '<div class="' + cls + '" data-uid="' + uid + '">' + badge +
        TCG.portrait(h.def.emoji, h.def.id, 'cc-art', h.def.name) +
        '<div class="cc-name">' + h.def.name + '</div>' +
        '<div class="cc-atk">⚔' + effAtk(h) + '</div>' +
        (wEmoji ? '<div class="cc-wpn" title="' + wName + '">' + wEmoji + '</div>' : '') +
        '<div class="cc-skill">' + sk.name + '</div></div>';
    }).join('');
    document.getElementById('centerCards').innerHTML = centerHtml
      ? '<div class="center-inner">' + centerHtml + '</div>'
      : '<div class="center-empty">카드 없음</div>';

    // 오른쪽: 사용한 카드 풀 (겹친 더미, 시작 시 빈 영역)
    var usedStack = '';
    for (var j = 0; j < Math.min(c.used.length, 5); j++) usedStack += '<div class="pile-card used" style="--i:' + j + '"></div>';
    document.getElementById('usedPile').innerHTML =
      usedStack + '<div class="pile-label">사용한 카드 <b>' + c.used.length + '</b></div>';
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
    var c = run.combat, L = c.lord;
    if (it.kind === 'hp') { if (L.hp >= L.maxHp) { TCG.toast('HP가 가득 찼습니다'); return false; } L.hp = Math.min(L.maxHp, L.hp + it.val); fxSupport(lordEl(), '+' + it.val, '#7ef0b5'); logMsg('🧪 회복약 — 주공 HP +' + it.val); }
    else if (it.kind === 'mp') { if (L.mp >= L.maxMp) { TCG.toast('MP가 가득 찼습니다'); return false; } L.mp = Math.min(L.maxMp, L.mp + it.val); fxSupport(lordEl(), '💧+' + it.val, '#9fd2ff'); logMsg('💧 마력약 — 주공 MP +' + it.val); }
    else if (it.kind === 'cure_poison') { var n = 0; if (c.cstat) Object.keys(c.cstat).forEach(function (u) { if (c.cstat[u].poison > 0) { c.cstat[u].poison = 0; n++; } }); if (!n) { TCG.toast('중독된 카드가 없습니다'); return false; } logMsg('🌿 해독초 — 중독 ' + n + '장 해제'); }
    else if (it.kind === 'cure_confuse') { var m = 0; if (c.cstat) Object.keys(c.cstat).forEach(function (u) { if (c.cstat[u].stun > 0) { c.cstat[u].stun = 0; c.cstat[u].cause = ''; m++; } }); if (!m) { TCG.toast('혼란·매혹된 카드가 없습니다'); return false; } logMsg('🔔 안신향 — 혼란/매혹 ' + m + '장 해제'); }
    else if (it.kind === 'atk') { c.tempAtk = { val: it.val, turns: it.turns }; fxSupport(lordEl(), '⚔+' + it.val, '#ffd86b'); logMsg('🍷 전투주 — ' + it.turns + '턴간 전군 공격력 +' + it.val); }
    else if (it.kind === 'shield') { L.block += it.val; fxSupport(lordEl(), '🛡+' + it.val, '#9fd2ff', 'shield'); logMsg('🛡️ 철벽부 — 주공 방어막 +' + it.val); }
    else return false;
    return true;
  }
  document.getElementById('itemBar').addEventListener('click', function (e) {
    var b = e.target.closest('.item-slot'); if (!b || !b.dataset.i) return;
    var c = run.combat; if (!c || c.phase === 'enemy' || c.targeting || c.busy) return;
    if (c.itemUsed) { TCG.toast('이번 턴에는 이미 아이템을 사용했습니다'); return; }
    var idx = parseInt(b.dataset.i, 10), it = HW_CONS_BY_ID[run.items[idx]]; if (!it) return;
    if (!applyItem(it)) return;
    run.items.splice(idx, 1); c.itemUsed = true; TCG.sfx('heal'); saveRun(); renderCombat();
  });
  function renderActionBar() {
    var c = run.combat;
    var bar = document.getElementById('actionBar');
    if (!c.sel || c.targeting) { bar.hidden = true; return; }
    var h = heroByUid(c.sel.uid);
    if (!h) { bar.hidden = true; return; }
    var sk = h.def.skill;
    var buffDone = sk.type === 'buff' && sk.scope === 'army' && c.buffApplied && c.buffApplied[h.uid]; // 전군 버프는 전투당 1회
    var mp = skillMp(sk);
    var canSkill = !buffDone && c.lord.mp >= mp;
    var mpLabel = buffDone ? '✓ 적용됨' : ('💧' + mp);
    var critPct = Math.round(critChance(h) * 100);
    bar.hidden = false;
    bar.innerHTML =
      '<button class="act-btn" data-act="attack">기본 공격<small>피해 ' + effAtk(h) + (hasWpnFlag(h, 'doubleStrike') ? ' ×2' : '') + (wpnVal(h, 'poison') ? ' ☠' + wpnVal(h, 'poison') : '') + (critPct > 1 ? ' 💥' + critPct + '%' : '') + '</small></button>' +
      '<button class="act-btn skill" data-act="skill"' + (canSkill ? '' : ' disabled') + '>' + sk.name + '<small>' + mpLabel + ' · ' + sk.desc + '</small></button>' +
      '<button class="act-btn cancel" data-act="cancel">취소</button>';
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
    if (cardStunned(uid)) { var cs = c.cstat[uid]; TCG.toast('이 카드는 ' + (cs.cause || '혼란') + ' 상태 — 이번 턴 행동 불능'); return; }
    c.sel = (c.sel && c.sel.uid === uid) ? null : { uid: uid };
    renderCombat();
  });
  document.getElementById('actionBar').addEventListener('click', function (e) {
    var b = e.target.closest('.act-btn'); if (!b || b.disabled) return;
    var c = run.combat; if (!c.sel || c.busy) return;
    var act = b.dataset.act;
    if (act === 'cancel') { c.sel = null; c.targeting = false; c.pending = null; renderCombat(); return; }
    var h = heroByUid(c.sel.uid); if (!h) return;
    if (act === 'attack') { beginTarget('enemy', 'attack'); return; }
    // skill (회복 스킬은 MP 소모 없음, 그 외는 MP 소모)
    var sk = h.def.skill;
    if (sk.type === 'buff' && sk.scope === 'army' && c.buffApplied && c.buffApplied[h.uid]) { TCG.toast('「' + sk.name + '」 버프는 전투당 1회만 적용됩니다 (중첩 불가)'); return; }
    if (c.lord.mp < skillMp(sk)) { TCG.toast('MP가 부족합니다'); return; }
    if (sk.type === 'strike' || sk.type === 'charm' || sk.type === 'confuse') beginTarget('enemy', 'skill'); // 단일 적 대상
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
  function dmgLord(dmg, crit) {
    var c = run.combat, L = c.lord;
    if (Math.random() < lordEvade()) { fxSupport(lordEl(), '회피!', '#8effb0'); return true; } // 회피
    var d = dmg, blocked = 0;
    if (L.block > 0) { var ab = Math.min(L.block, d); L.block -= ab; d -= ab; blocked = ab; }
    L.hp = Math.max(0, L.hp - d);
    fxHitHero(lordEl(), d, blocked, crit);
    return false;
  }
  function enemyEl(idx) { return document.querySelector('#enemyRow .unit[data-idx="' + idx + '"]'); }
  function lordEl() { return document.querySelector('#lordBar .lord-art'); }

  function doAttack(h, enemy) {
    var c = run.combat;
    var dmg = effAtk(h);
    var hits = hasWpnFlag(h, 'doubleStrike') ? 2 : 1;
    c.busy = true; // 다회 공격은 타격마다 끊어서 연출
    var total = 0, anyCrit = false, k = 0;
    function step() {
      if (k >= hits || enemy.hp <= 0) { return done(); }
      k++;
      TCG.sfx('attack');
      var crit = rollCrit(critChance(h)); // 치명타: 공격력 2배
      var hitDmg = crit ? dmg * 2 : dmg;
      if (crit) anyCrit = true;
      dmgEnemy(enemy, hitDmg, enemyEl(c.enemies.indexOf(enemy)), crit ? 'crit' : null);
      if (!crit) shake('sm');
      total += hitDmg;
      renderCombat();
      setTimeout(step, hits > 1 ? 240 : 120);
    }
    function done() {
      var pv = wpnVal(h, 'poison');
      if (pv && enemy.hp > 0) { enemy.poison = (enemy.poison || 0) + pv; logMsg(enemy.name + '에 독 +' + pv); }
      var ls = relicSum('lifesteal');
      if (ls) { c.lord.hp = Math.min(c.lord.maxHp, c.lord.hp + ls); fxSupport(lordEl(), '+' + ls, '#7ef0b5'); }
      logMsg(h.def.name + ' → ' + enemy.name + ' ' + total + ' 피해' + (anyCrit ? ' (치명타!)' : ''));
      c.busy = false;
      finishPlay();
    }
    step();
  }
  function doSkill(h, target) {
    var c = run.combat; var sk = h.def.skill;
    c.lord.mp = Math.max(0, c.lord.mp - skillMp(sk)); // 모든 스킬은 MP 소모(회복 포함)
    TCG.sfx(sk.type === 'heal' ? 'heal' : 'skill');
    fxBanner('✨ ' + h.def.name + ' 「' + sk.name + '」', 'skill-cast', 1000); // 스킬 발동 강조
    fxFlash('rgba(150,200,255,0.16)');
    var hp0 = rectOf(lordEl()); if (hp0) fxRing(hp0.x, hp0.y, '#9fd2ff');
    var pw = effAtk(h);
    if (sk.type === 'strike') {
      var scrit = rollCrit(critChance(h)); // 스킬도 치명타 적용
      var sdmg = (pw + sk.val) * (scrit ? 2 : 1);
      dmgEnemy(target, sdmg, enemyEl(c.enemies.indexOf(target)), scrit ? 'crit' : null); shake('big');
      logMsg(h.def.name + ' 「' + sk.name + '」 ' + sdmg + ' 피해' + (scrit ? ' (치명타!)' : ''));
    } else if (sk.type === 'aoe') {
      var acrit = rollCrit(critChance(h)); var aval = sk.val * (acrit ? 2 : 1);
      living(c.enemies).forEach(function (e) { dmgEnemy(e, aval, enemyEl(c.enemies.indexOf(e)), acrit ? 'crit' : 'aoe'); }); shake('big');
      logMsg(h.def.name + ' 「' + sk.name + '」 전체 ' + aval + ' 피해' + (acrit ? ' (치명타!)' : ''));
    } else if (sk.type === 'multi') {
      // 다회 공격 스킬은 타격당 기본 공격력의 1/N(반올림) — N=타격 수
      var perHit = Math.max(1, Math.round(pw / sk.val));
      c.busy = true; var mi = 0; // 타격마다 끊어서 연출
      (function mhit() {
        var alive = living(c.enemies);
        if (mi >= sk.val || !alive.length) { logMsg(h.def.name + ' 「' + sk.name + '」 ' + sk.val + '회 공격(타격당 ' + perHit + ')'); c.busy = false; finishPlay(); return; }
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
      logMsg(h.def.name + ' 「' + sk.name + '」 주공 ' + sk.val + ' 회복');
    } else if (sk.type === 'shield') {
      c.lord.block += sk.val;
      fxSupport(lordEl(), '🛡+' + sk.val, '#9fd2ff', 'shield');
      logMsg(h.def.name + ' 「' + sk.name + '」 주공 방어막 +' + sk.val);
    } else if (sk.type === 'buff' && sk.scope === 'army') {
      // 전군 버프: 전투당 1회만 적용(중첩 방지) — 같은 장수를 매 턴 다시 써도 누적되지 않음
      if (!c.buffApplied) c.buffApplied = {};
      if (!c.buffApplied[h.uid]) {
        c.buffApplied[h.uid] = true;
        c.atkBuff = (c.atkBuff || 0) + sk.val;
        fxSupport(lordEl(), '⚔+' + sk.val, '#ffd86b');
        logMsg(h.def.name + ' 「' + sk.name + '」 전군 공격력 +' + sk.val + ' (전투 동안)');
      } else {
        logMsg(h.def.name + ' 「' + sk.name + '」 — 이미 적용됨(중첩 불가)');
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
        logMsg(h.def.name + ' 「' + sk.name + '」 ' + (th ? th.def.name : '') + ' 공격력 +' + sk.val + ' (1턴)');
      } else {
        logMsg(h.def.name + ' 「' + sk.name + '」 — 강화할 공격 카드가 없습니다');
      }
    } else if (sk.type === 'charm') {
      // 적을 매혹 — 행동 불가. 중첩 방지: 마지막 1개만 적용(혼란과도 배타)
      if (target && target.hp > 0) {
        target.confused = 0; target.charmed = sk.val;
        var cel = enemyEl(c.enemies.indexOf(target));
        fxSupport(cel, '💗 매혹', '#ff9ad0');
        if (cel && cel.classList) cel.classList.add('charmed');
        logMsg(h.def.name + ' 「' + sk.name + '」 ' + target.name + ' 매혹(행동 불가)');
      }
    } else if (sk.type === 'confuse') {
      // 적을 혼란 — 행동 불가. 중첩 방지: 마지막 1개만 적용(매혹과도 배타)
      if (target && target.hp > 0) {
        target.charmed = 0; target.confused = sk.val;
        var cel2 = enemyEl(c.enemies.indexOf(target));
        fxSupport(cel2, '💫 혼란', '#c9a8ff');
        if (cel2 && cel2.classList) cel2.classList.add('charmed');
        logMsg(h.def.name + ' 「' + sk.name + '」 ' + target.name + ' 혼란(행동 불가)');
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
  function enemyMidSkill(e) {
    var c = run.combat, ms = e.midSkill;
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
      logMsg(e.name + ' 「' + ms.name + '」 — ' + (sh ? sh.def.name : '카드') + ' 이번 전투 봉인!');
    } else {
      var u = pickUid(ms.type !== 'p_poison'); if (!u) { return false; }
      var st = cstat(u), hh = heroByUid(u);
      if (ms.type === 'p_charm') { st.stun = Math.max(st.stun, 1); st.cause = '매혹'; logMsg(e.name + ' 「' + ms.name + '」 — ' + (hh ? hh.def.name : '카드') + ' 매혹(다음 턴 행동 불능)'); }
      else if (ms.type === 'p_confuse') { st.stun = Math.max(st.stun, 1); st.cause = '혼란'; logMsg(e.name + ' 「' + ms.name + '」 — ' + (hh ? hh.def.name : '카드') + ' 혼란(다음 턴 행동 불능)'); }
      else if (ms.type === 'p_poison') { st.poison += (ms.val || 4); logMsg(e.name + ' 「' + ms.name + '」 — ' + (hh ? hh.def.name : '카드') + ' 중독 +' + (ms.val || 4)); }
      shake('sm');
    }
    return true;
  }

  // 적장이 대응 장수의 원래 스킬을 사용(주공 대상). 사용 시 true.
  function enemySkill(e) {
    var c = run.combat, sk = e.skill;
    e.mp = Math.max(0, e.mp - skillMp(sk));
    fxBanner('👑 ' + e.name + ' 「' + sk.name + '」', 'boss', 950);
    TCG.sfx(sk.type === 'heal' || sk.type === 'shield' ? 'heal' : 'skill');
    var idx = c.enemies.indexOf(e), el = enemyEl(idx);
    if (sk.type === 'strike') {
      var crit = rollCrit(e.crit != null ? e.crit : BASE_CRIT);
      var d = e.atk + Math.round(sk.val * 0.5); if (crit) d *= 2;
      shake('big'); var ev = dmgLord(d, crit);
      logMsg(ev ? (e.name + ' 「' + sk.name + '」 회피!') : (e.name + ' 「' + sk.name + '」 주공 ' + d + ' 피해' + (crit ? ' (치명타!)' : '')));
    } else if (sk.type === 'aoe') {
      var d2 = Math.round(sk.val * 0.6) + Math.round(e.atk * 0.3); shake('big'); var ev2 = dmgLord(d2, false);
      logMsg(ev2 ? (e.name + ' 「' + sk.name + '」 회피!') : (e.name + ' 「' + sk.name + '」 주공 ' + d2 + ' 피해'));
    } else if (sk.type === 'multi') {
      var tot = 0; for (var i = 0; i < sk.val; i++) { if (c.lord.hp <= 0) break; var dd = Math.max(1, Math.round(e.atk * 0.5)); if (!dmgLord(dd, false)) tot += dd; }
      shake('sm'); logMsg(e.name + ' 「' + sk.name + '」 ' + sk.val + '연타 ' + tot + ' 피해');
    } else if (sk.type === 'heal') {
      e.hp = Math.min(e.maxHp, e.hp + sk.val); fxSupport(el, '+' + sk.val, '#7ef0b5');
      logMsg(e.name + ' 「' + sk.name + '」 ' + sk.val + ' 회복');
    } else if (sk.type === 'shield') {
      e.block += sk.val; fxSupport(el, '🛡+' + sk.val, '#9fd2ff', 'shield');
      logMsg(e.name + ' 「' + sk.name + '」 방어막 +' + sk.val);
    } else if (sk.type === 'buff') {
      var cap = (e.atk0 || e.atk) + Math.round((e.atk0 || e.atk) * 0.6); // 공격 버프 누적 상한(기본의 +60%)
      var gain = Math.min(sk.val, Math.max(0, cap - e.atk));
      if (gain > 0) { e.atk += gain; fxSupport(el, '⚔+' + gain, '#ffd86b'); logMsg(e.name + ' 「' + sk.name + '」 공격력 +' + gain); }
      else { var bd = Math.max(1, Math.round(e.atk * 0.7)); dmgLord(bd, false); logMsg(e.name + ' 「' + sk.name + '」 주공 ' + bd + ' 피해'); }
    } else { // charm 등: 주공 교란(소량 피해)
      var d3 = Math.max(1, Math.round(e.atk * 0.5)); dmgLord(d3, false);
      logMsg(e.name + ' 「' + sk.name + '」 주공 교란 ' + d3 + ' 피해');
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
      if (e.charmed > 0 || e.confused > 0) { // 매혹·혼란된 적은 이번 턴 쉰다
        var was = e.charmed > 0 ? '매혹' : '혼란';
        if (e.charmed > 0) e.charmed--; else e.confused--;
        fxSupport(enemyEl(c.enemies.indexOf(e)), '💤 ' + was, '#ff9ad0');
        logMsg(e.name + ' ' + was + '되어 행동 불가');
        renderCombat();
        setTimeout(next, 360); return;
      }
      // 적장/중간보스는 일정 확률로 스킬 사용(MP 충분할 때) — 중간보스는 아군 카드에 상태이상
      var usedSkill = false;
      if (e.midSkill && e.mp >= 3 && Math.random() < (e.skillChance || 0)) usedSkill = enemyMidSkill(e);
      else if (e.skill && e.mp >= skillMp(e.skill) && Math.random() < (e.skillChance || 0)) usedSkill = enemySkill(e);
      if (!usedSkill) {
        var intent = e.intent;
        var crit = rollCrit(e.crit != null ? e.crit : BASE_CRIT); // 적장은 모드별 치명타 확률
        var dmg = crit ? intent.dmg * 2 : intent.dmg;
        TCG.sfx('hit');
        shake(crit || intent.type === 'aoe' ? 'big' : 'sm');
        var evaded = dmgLord(dmg, crit);
        logMsg(evaded ? (e.name + ' 공격 회피!') : (e.name + ' → 주공 ' + dmg + ' 피해' + (crit ? ' (치명타!)' : '')));
      }
      renderCombat();
      if (c.lord.hp <= 0) { setTimeout(gameOver, 400); return; }
      setTimeout(next, usedSkill ? 620 : 480);
    }
    next();
  }

  function winCombat() {
    var c = run.combat;
    TCG.sfx('win');
    // 여포: 첫 스테이지(반동탁) 적장 화웅을 주공 풀 HP로 격파하면 획득
    if (c.sub === SUB_COUNT - 1 && c.main === 0 && c.lord.hp >= c.lord.maxHp) {
      unlockSpecialHero('lubu', '화웅을 풀 HP로 격파', true);
    }
    // 주공 HP는 모험 내내 유지 — 승리 시 일부만 회복(로그라이크 소모전)
    var heal = Math.round(c.lord.maxHp * 0.115) + relicSum('winHeal'); // 카드 방어 제거 보정(승리 회복↑)
    run.lordHp = Math.min(c.lord.maxHp, c.lord.hp + heal);
    run.lordMp = Math.min(c.lord.maxMp, c.lord.mp); // MP는 전투에서 남은 대로 유지
    // gold + reward cadence
    var isBoss = c.sub === SUB_COUNT - 1;
    var isMid = (c.sub === 4 || c.sub === 9);
    var prog = c.main * SUB_COUNT + c.sub;
    var gold = Math.round((6 + prog * 1.5) * DCFG.gold * ((HW_MODES[run.mode] || HW_MODES.normal).gold) * (isMid ? 1.5 : 1));
    run.gold += gold;
    run.sorties = (run.sorties || 0) + 1; // 누적 출진 횟수
    updateTop();
    run.pendingGold = gold; run.pendingBoss = isBoss;
    // 출진 5회·10회 뒤 보물상자(무기) 개봉
    if (run.sorties === 5 || run.sorties === 10) { showReward('weapon', gold); return; }
    if (isBoss && c.main === HW_STAGES.length - 1) { victory(); return; } // 최종 적장 격파
    if (isBoss) { showReward('relic', gold); return; }      // 메인 적장 처치 → 유물
    if (isMid) { showReward('hero', gold); return; }        // 중간보스 격파 → 장수 영입
    if ((c.sub + 1) % 4 === 0) { showReward('hero', gold); return; } // 4서브마다 장수 영입
    advanceStage();                                         // 일반 서브 → 바로 다음
  }

  /* ---------- REWARD ---------- */
  function showReward(mode, gold) {
    run.rewardMode = mode; run.pendingRecruit = null;
    document.getElementById('rewardTitle').textContent = (mode === 'weapon' ? '💎 보물상자! +💰' : '🎉 승리! +💰') + gold;
    var box = document.getElementById('rewardCards');
    if (mode === 'hero') {
      // 이미 보유한 장수는 중복으로 제시하지 않음
      var have = ownedHeroIds();
      var hpool = TCG.shuffle(HW_HEROES.filter(function (d) { return !d.exclusive && have.indexOf(d.id) === -1; })).slice(0, 3);
      if (!hpool.length) { showReward('weapon', gold); return; } // 모두 보유 → 보물로 대체
      document.getElementById('rewardSub').textContent = '영입할 영웅 카드를 선택하세요 (중복 없음)';
      box.innerHTML = hpool.map(function (d) { return heroRewardCard(d); }).join('');
    } else if (mode === 'weapon') {
      document.getElementById('rewardSub').textContent = '획득할 보물(무기/보패)을 선택하세요 — 장수 상세에서 장착할 수 있습니다';
      var wpool = TCG.shuffle(HW_WEAPONS.filter(function (w) { return !w.exclusive; })).slice(0, 3);
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
    // 상점은 장수 외 품목만 판매(장수는 주막에서) — 무기 2 · 소모품 2 · 두강주 · 무기 강화
    var wpns = TCG.shuffle(HW_WEAPONS.filter(function (w) { return !w.exclusive; }));
    run.shop = [
      { kind: 'weapon', wid: wpns[0].id, cost: weaponCost(wpns[0]), sold: false },
      { kind: 'weapon', wid: wpns[1].id, cost: weaponCost(wpns[1]), sold: false },
      { kind: 'item', cid: TCG.pick(HW_CONSUMABLES).id, cost: 22, sold: false }, // 소모성 아이템(랜덤)
      { kind: 'item', cid: TCG.pick(HW_CONSUMABLES).id, cost: 22, sold: false },
      { kind: 'dujiu', cost: 18, sold: false },   // 두강주: MP 20 회복
      { kind: 'upgrade', cost: 28, sold: false }
    ];
    renderShop();
    show('shopScreen');
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
    var box = document.getElementById('tavernItems');
    if (!run.tavern.items.length) { box.innerHTML = '<p class="screen-sub">영입할 수 있는 장수가 없습니다 (모두 보유).</p>'; return; }
    box.innerHTML = run.tavern.items.map(function (it, i) {
      var d = HW_BY_ID[it.id], afford = run.gold >= it.cost && !it.sold;
      return '<div class="shop-item shop-hero' + (it.sold ? ' sold' : '') + '" data-info="' + i + '" title="탭하면 상세 정보">' +
        TCG.portrait(d.emoji, d.id, 'rc-portrait', d.name) +
        '<div class="si-name">' + d.name + ' <span class="rar-' + d.rarity + '" style="font-size:11px">' + d.rarity + '</span></div>' +
        '<div class="si-desc">' + d.cls + ' · ❤' + d.hp + ' ⚔' + d.atk + '<br>「' + d.skill.name + '」 ⓘ</div>' +
        '<button class="btn primary si-buy" data-i="' + i + '"' + (afford ? '' : ' disabled') + '>' + (it.sold ? '영입완료' : '💰 ' + it.cost) + '</button></div>';
    }).join('');
  }
  document.getElementById('tavernItems').addEventListener('click', function (e) {
    var info = e.target.closest('.shop-hero');
    if (info && !e.target.closest('.si-buy')) { var hi = run.tavern.items[parseInt(info.dataset.info, 10)]; if (hi) showHeroInfo(HW_BY_ID[hi.id]); return; }
    var b = e.target.closest('.si-buy'); if (!b || b.disabled) return;
    var it = run.tavern.items[parseInt(b.dataset.i, 10)];
    if (!it || it.sold || run.gold < it.cost) return;
    if (ownedHeroIds().indexOf(it.id) !== -1) { TCG.toast('이미 보유한 장수입니다'); it.sold = true; renderTavern(); return; }
    if (run.party.length >= MAX_PARTY) { TCG.toast('파티가 가득 찼습니다'); return; }
    run.party.push(mkHero(it.id)); run.gold -= it.cost; it.sold = true;
    TCG.toast('영입: ' + HW_BY_ID[it.id].name); updateTop(); saveRun(); renderTavern();
  });
  document.getElementById('tavernLeave').addEventListener('click', function () { TCG.sfx('tap'); showMap(); });
  function renderShop() {
    document.getElementById('shopItems').innerHTML = run.shop.map(function (it, i) {
      var afford = run.gold >= it.cost && !it.sold;
      var buyBtn = '<button class="btn primary si-buy" data-i="' + i + '"' + (afford ? '' : ' disabled') + '>' + (it.sold ? '구매완료' : '💰 ' + it.cost) + '</button>';
      if (it.kind === 'hero') { // 장수는 카드 형태(탭하면 정보)
        var d = it.def;
        return '<div class="shop-item shop-hero' + (it.sold ? ' sold' : '') + '" data-info="' + i + '" title="탭하면 상세 정보">' +
          TCG.portrait(d.emoji, d.id, 'rc-portrait', d.name) +
          '<div class="si-name">' + d.name + ' <span class="rar-' + d.rarity + '" style="font-size:11px">' + d.rarity + '</span></div>' +
          '<div class="si-desc">' + d.cls + ' · ❤' + d.hp + ' ⚔' + d.atk + '<br>「' + d.skill.name + '」 ⓘ</div>' +
          buyBtn + '</div>';
      }
      var emoji, name, desc;
      if (it.kind === 'weapon') { var w = HW_WEAPON_BY_ID[it.wid]; emoji = w.emoji; name = w.name; desc = w.desc; }
      else if (it.kind === 'item') { var ci = HW_CONS_BY_ID[it.cid]; emoji = ci.emoji; name = ci.name + ' (소모품)'; desc = ci.desc; }
      else if (it.kind === 'dujiu') { emoji = '🍶'; name = '두강주'; desc = '주공 MP 20 회복'; }
      else { emoji = '⚒️'; name = '무기 강화'; desc = '무작위 영웅 공격력 +3'; }
      return '<div class="shop-item' + (it.sold ? ' sold' : '') + '">' +
        '<div class="si-emoji">' + emoji + '</div>' +
        '<div class="si-name">' + name + '</div>' +
        '<div class="si-desc">' + desc + '</div>' + buyBtn + '</div>';
    }).join('');
  }
  // 저잣거리 장수 카드 — 탭하면 상세 정보(읽기 전용)
  function showHeroInfo(d) {
    TCG.sfx('tap');
    var slots = slotsForRarity(d.rarity);
    document.getElementById('heroModalBody').innerHTML =
      TCG.portrait(d.emoji, d.id, 'modal-portrait', d.name) +
      '<h2>' + d.name + ' <span class="rar-' + d.rarity + '" style="font-size:14px">' + d.rarity + '</span></h2>' +
      '<p>' + d.cls + ' · ❤ ' + d.hp + ' · ⚔ ' + d.atk + ' · 🗡️ 무기 슬롯 ' + slots + '개</p>' +
      '<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px;text-align:left;font-size:13px">' +
      '<b style="color:var(--gold)">「' + d.skill.name + '」</b> 💧' + skillMp(d.skill) + '<br>' +
      '<span style="color:var(--ink-dim)">' + d.skill.desc + '</span></div>' +
      '<p style="font-size:12px;color:var(--ink-dim);margin-top:10px">획득 경로: ' + heroPath(d) + '</p>' +
      '<button class="btn primary" id="heroModalClose" style="margin-top:14px">닫기</button>';
    var modal = document.getElementById('heroModal');
    modal.hidden = false;
    document.getElementById('heroModalClose').addEventListener('click', function () { modal.hidden = true; });
  }
  document.getElementById('shopItems').addEventListener('click', function (e) {
    var info = e.target.closest('.shop-hero');
    if (info && !e.target.closest('.si-buy')) { var hi = run.shop[parseInt(info.dataset.info, 10)]; if (hi && hi.def) showHeroInfo(hi.def); return; }
    var b = e.target.closest('.si-buy'); if (!b || b.disabled) return;
    var it = run.shop[parseInt(b.dataset.i, 10)];
    if (it.sold || run.gold < it.cost) return;
    if (it.kind === 'hero') {
      if (run.party.length >= MAX_PARTY) { TCG.toast('파티가 가득 찼습니다 (최대 ' + MAX_PARTY + '명)'); return; }
      run.party.push(mkHero(it.def.id));
    } else if (it.kind === 'weapon') {
      run.weapons.push(it.wid); TCG.toast('보물 구입: ' + HW_WEAPON_BY_ID[it.wid].name);
    } else if (it.kind === 'item') {
      if (!run.items) run.items = [];
      if (run.items.length >= HW_ITEM_MAX) { TCG.toast('소모품이 가득 찼습니다 (최대 ' + HW_ITEM_MAX + '개)'); return; }
      run.items.push(it.cid); TCG.toast('소모품 구입: ' + HW_CONS_BY_ID[it.cid].name);
    } else if (it.kind === 'dujiu') {
      if (typeof run.lordMp !== 'number') run.lordMp = lordMaxMp();
      run.lordMp = Math.min(lordMaxMp(), run.lordMp + 20); TCG.toast('두강주 — 주공 MP 20 회복');
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
    // 여포: 노멀 모드 천하통일 시 획득(다음 진입 시 합류 대기)
    if ((run.mode || 'normal') === 'normal') unlockSpecialHero('lubu', '노멀 모드 천하통일', false);
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
    var modeLine = '<div class="cr-h">— 모드 —</div><div class="cr-list">' + curMode.emoji + ' ' + curMode.label + ' 클리어' +
      (newlyUnlocked ? '<br><span style="color:var(--gold)">🔓 ' + HW_MODES[nextMode].emoji + ' ' + HW_MODES[nextMode].label + ' 모드 해금!</span>' : '') + '</div>';
    var st = HW_STAGES.map(function (x) { return '⚔ ' + x.name + ' <span class="cr-year">' + x.year + '</span>'; }).join('<br>');
    var roster = run.party.map(function (h) {
      return h.def.emoji + ' <b>' + h.def.name + '</b> <span class="rar-' + h.def.rarity + '">' + h.def.rarity + '</span>';
    }).join('<br>');
    var relics = run.relics.length ? run.relics.map(function (r) { return r.emoji + ' ' + r.name; }).join(' · ') : '없음';
    var totalGen = run.party.length;
    var roll = document.getElementById('creditsRoll');
    roll.innerHTML =
      '<div class="cr-block cr-big">👑 천하통일</div>' +
      '<div class="cr-block cr-sub">— 삼국 영웅전 —</div>' +
      '<div class="cr-block cr-story">8개의 역사 전역을 모두 평정하고<br>주공께서 마침내 <b>천하를 통일</b>하셨습니다.<br><br>위·촉·오를 아우른 영웅들이<br>주공의 이름 아래 환호합니다.</div>' +
      '<div class="cr-h">— 평정한 전역 —</div>' +
      '<div class="cr-list">' + st + '</div>' +
      '<div class="cr-h">— 함께한 장수 (' + totalGen + '명) —</div>' +
      '<div class="cr-list">' + roster + '</div>' +
      '<div class="cr-h">— 수집한 병법 —</div>' +
      '<div class="cr-list">' + relics + '</div>' +
      '<div class="cr-h">— 난이도 —</div>' +
      '<div class="cr-list">' + TCG.diffLabel(diff) + '</div>' +
      modeLine +
      '<div class="cr-block cr-story" style="margin-top:30px">제작 · 기획 · 밸런싱<br><b>삼국지 카드 게임 팀</b></div>' +
      '<div class="cr-block cr-sub">감사합니다 — 플레이해 주셔서 고맙습니다</div>' +
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
    var slotLabel = slots === 0 ? 'C등급 — 장착 불가' : (d.rarity + ' — ' + slots + '개 장착 가능');
    var wpnHtml = '<div class="wpn-box"><div class="wpn-title">🗡️ 무기 (' + slotLabel + ')</div>';
    if (slots === 0) {
      wpnHtml += '<div class="wpn-empty">C등급 장수는 무기를 장착할 수 없습니다.</div>';
    } else {
      // 장착 슬롯
      for (var s = 0; s < slots; s++) {
        var wid = equipped[s];
        if (wid) {
          var w = HW_WEAPON_BY_ID[wid];
          wpnHtml += '<div class="wpn-cur"><span>' + w.emoji + ' <b>' + w.name + '</b> — ' + w.desc + '</span>' +
            '<button class="btn ghost wpn-act" data-wact="unequip" data-slot="' + s + '">해제</button></div>';
        } else {
          wpnHtml += '<div class="wpn-cur none">빈 슬롯</div>';
        }
      }
      // 장착 가능한 무기 목록(빈 슬롯이 있을 때만)
      if (equipped.length < slots) {
        if (free.length) {
          wpnHtml += '<div class="wpn-list">' + free.map(function (id) {
            var fw = HW_WEAPON_BY_ID[id];
            return '<button class="wpn-opt" data-wact="equip" data-wid="' + id + '">' + fw.emoji + ' ' + fw.name +
              '<small>' + fw.desc + '</small></button>';
          }).join('') + '</div>';
        } else {
          wpnHtml += '<div class="wpn-empty">보유한 무기가 없습니다 (보물상자에서 획득)</div>';
        }
      }
    }
    wpnHtml += '</div>';
    document.getElementById('heroModalBody').innerHTML =
      TCG.portrait(d.emoji, d.id, 'modal-portrait', d.name) +
      '<h2>' + d.name + ' <span class="rar-' + d.rarity + '" style="font-size:14px">' + d.rarity + '</span></h2>' +
      '<p>' + d.cls + ' · ⚔ ' + effAtk(h) + (totalAtkBonus ? ' (무기 +' + totalAtkBonus + ')' : '') + '</p>' +
      '<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px;text-align:left;font-size:13px">' +
      '<b style="color:var(--gold)">「' + d.skill.name + '」</b> 💧' + skillMp(d.skill) + '<br>' +
      '<span style="color:var(--ink-dim)">' + d.skill.desc + '</span></div>' +
      wpnHtml +
      '<button class="btn primary" id="heroModalClose" style="margin-top:14px">닫기</button>';
    var modal = document.getElementById('heroModal');
    modal.hidden = false;
    document.getElementById('heroModalClose').addEventListener('click', function () { modal.hidden = true; refreshRosterIfOpen(); });
    document.getElementById('heroModalBody').querySelectorAll('[data-wact]').forEach(function (b) {
      b.addEventListener('click', function () {
        TCG.sfx('tap');
        if (b.dataset.wact === 'unequip') {
          h.weapons.splice(parseInt(b.dataset.slot, 10), 1);
        } else if (h.weapons.length < weaponSlots(h)) {
          h.weapons.push(b.dataset.wid);
        }
        saveRun();
        showHeroModal(h); // 다시 렌더
      });
    });
  }
  document.getElementById('heroModal').addEventListener('click', function (e) {
    if (e.target.id === 'heroModal') { e.currentTarget.hidden = true; refreshRosterIfOpen(); }
  });

  /* ---------- boot ---------- */
  TCG.initFloatMenu();
  document.getElementById('guideBtn').addEventListener('click', function () { TCG.sfx('tap'); document.getElementById('guideModal').hidden = false; });
  document.getElementById('guideClose').addEventListener('click', function () { document.getElementById('guideModal').hidden = true; });
  document.getElementById('guideModal').addEventListener('click', function (e) { if (e.target.id === 'guideModal') e.currentTarget.hidden = true; });
  // 데이터 초기화: 영웅전·대장전 진행 + 컬렉션 + 모드 해금 전부 삭제 후 새로고침
  function resetAllData() {
    ['hw_save', 'hw_raid_cleared', 'hw_mode_unlocked', 'hw_collected_heroes', 'hw_collected_weapons', 'hw_grant_heroes', 'hw_bonus_gold']
      .forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
  }
  document.getElementById('resetBtn').addEventListener('click', function () { TCG.sfx('tap'); document.getElementById('resetConfirm').hidden = false; });
  document.getElementById('resetConfirmNo').addEventListener('click', function () { document.getElementById('resetConfirm').hidden = true; });
  document.getElementById('resetConfirm').addEventListener('click', function (e) { if (e.target.id === 'resetConfirm') e.currentTarget.hidden = true; });
  document.getElementById('resetConfirmYes').addEventListener('click', function () {
    resetAllData(); TCG.toast('데이터를 초기화했습니다'); location.reload();
  });
  var muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.textContent = TCG.isMuted() ? '🔇 소리' : '🔊 소리';
    muteBtn.addEventListener('click', function () {
      var m = TCG.toggleMute(); muteBtn.textContent = m ? '🔇 소리' : '🔊 소리';
      TCG.audioResume(); if (!m) TCG.sfx('tap');
    });
  }
  var dlgBtn = document.getElementById('dialogueBtn');
  if (dlgBtn) {
    dlgBtn.textContent = TCG.isDialogueOn() ? '💬 대사 켜짐' : '💬 대사 꺼짐';
    dlgBtn.addEventListener('click', function () {
      var on = TCG.toggleDialogue(); dlgBtn.textContent = on ? '💬 대사 켜짐' : '💬 대사 꺼짐'; TCG.sfx('tap');
    });
  }
  var saved = loadSave();
  function renderModeSel() {
    var el = document.getElementById('modeSel'); if (!el) return;
    el.innerHTML = HW_MODE_ORDER.map(function (k) {
      var m = HW_MODES[k], un = isModeUnlocked(k);
      return '<button class="mode-btn mode-' + k + (un ? '' : ' locked') + '" data-mode="' + k + '"' + (un ? '' : ' disabled') + '>' +
        '<b>' + m.emoji + ' ' + m.label + '</b><small>' + (un ? m.desc : '🔒 이전 모드 천하통일 시 해금') + '</small></button>';
    }).join('');
  }
  function startNew(mode) { document.getElementById('startModal').hidden = true; TCG.audioResume(); newRun(mode); }
  var pendingMode = null;
  function requestNew(mode) {
    if (saved) { // 저장된 진행이 있으면 새 모험 전 확인
      pendingMode = mode;
      var smd = HW_MODES[saved.mode] || HW_MODES.normal;
      document.getElementById('newRunConfirmText').textContent =
        '진행 중인 모험(' + smd.emoji + smd.label + ' · ' + ((saved.mainStage || 0) + 1) + '스테이지)이 있습니다. 새로 시작하면 기존 진행이 삭제됩니다.';
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
  var multiMode = HW_MODE_ORDER.filter(isModeUnlocked).length > 1;
  if (saved) {
    var sst = HW_STAGES[Math.min(saved.mainStage || 0, HW_STAGES.length - 1)];
    var smd = HW_MODES[saved.mode] || HW_MODES.normal;
    document.getElementById('continueBtn').hidden = false;
    document.getElementById('startText').textContent =
      '진행 중: ' + smd.emoji + smd.label + ' · ' + ((saved.mainStage || 0) + 1) + '. ' + (sst ? sst.name : '') + ' 서브 ' + ((saved.subStage || 0) + 1) + '/' + SUB_COUNT + ' · 장수 ' + saved.party.length + '명';
    document.getElementById('startModal').hidden = false;
  } else if (multiMode) {
    // 저장은 없지만 상위 모드가 해금됨 → 모드 선택 화면
    document.getElementById('continueBtn').hidden = true;
    document.getElementById('startText').textContent = '도전할 모드를 선택하세요.';
    document.getElementById('startModal').hidden = false;
  } else {
    newRun('normal'); // 첫 플레이(노멀만 해금) → 바로 시작
  }
})();
