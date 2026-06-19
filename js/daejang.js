/* ===== 삼국 대장전 (레이드) — 영웅전 덱 공유, 거대 보스 격파로 전용 장수 획득 ===== */
(function () {
  var diff = TCG.getDifficulty();
  var DCFG = HW_DIFF[diff];
  var combat = null;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- 공유 덱(영웅전 파티) ---------- */
  function slotsForRarity(r) { return r === 'SSR' ? 3 : r === 'SR' ? 2 : r === 'R' ? 1 : 0; }
  function mkHero(id) { var d = HW_BY_ID[id]; return { uid: id + '_' + Math.random().toString(36).slice(2, 7), def: d, atk: d.atk, weapons: [] }; }
  function loadParty() {
    try {
      var d = JSON.parse(lsGet('hw_save') || 'null');
      if (d && Array.isArray(d.party) && d.party.length) {
        return d.party.filter(function (h) { return HW_BY_ID[h.id]; }).map(function (h) {
          var slots = slotsForRarity(HW_BY_ID[h.id].rarity);
          var ws = Array.isArray(h.weapons) ? h.weapons.slice() : (h.weapon ? [h.weapon] : []);
          ws = ws.filter(function (id) { return HW_WEAPON_BY_ID[id]; }).slice(0, slots);
          return { uid: h.uid || (h.id + '_' + Math.random().toString(36).slice(2, 7)), def: HW_BY_ID[h.id], atk: h.atk, weapons: ws };
        });
      }
    } catch (e) {}
    return HW_STARTERS.map(mkHero); // 영웅전 진행이 없으면 시작 장수 4명
  }
  var party = loadParty();

  /* ---------- 출진 덱(영웅전과 공유: hw_save.deck) ---------- */
  var MIN_DECK = 10, MAX_DECK = 30;
  function loadDeck() { try { var d = JSON.parse(lsGet('hw_save') || 'null'); if (d && Array.isArray(d.deck)) return d.deck.slice(); } catch (e) {} return []; }
  var deck = loadDeck();
  function deckMin() { return Math.min(MIN_DECK, party.length); }
  function activeDeckUids() {
    var order = party.map(function (h) { return h.uid; });
    var own = {}; order.forEach(function (u) { own[u] = true; });
    var seen = {}, out = [];
    deck.forEach(function (u) { if (own[u] && !seen[u]) { seen[u] = true; out.push(u); } });
    if (out.length > MAX_DECK) out = out.slice(0, MAX_DECK);
    var need = deckMin();
    for (var i = 0; i < order.length && out.length < need; i++) if (!seen[order[i]]) { seen[order[i]] = true; out.push(order[i]); }
    return out;
  }
  function saveDeck() { // 정규화 후 공유 저장(hw_save가 있을 때만)
    deck = activeDeckUids();
    try { var raw = lsGet('hw_save'); if (!raw) return; var d = JSON.parse(raw); if (!d) return; d.deck = deck.slice(); lsSet('hw_save', JSON.stringify(d)); } catch (e) {}
  }

  /* ---------- 소모성 아이템(영웅전과 공유: hw_save.items) ---------- */
  function loadItems() { try { var d = JSON.parse(lsGet('hw_save') || 'null'); if (d && Array.isArray(d.items)) return d.items.filter(function (id) { return HW_CONS_BY_ID[id]; }).slice(0, HW_ITEM_MAX); } catch (e) {} return []; }
  var items = loadItems();
  function saveItems() { try { var raw = lsGet('hw_save'); if (!raw) return; var d = JSON.parse(raw); if (!d) return; d.items = items.slice(); lsSet('hw_save', JSON.stringify(d)); } catch (e) {} }

  /* ---------- 영웅전 런 데이터(유물·골드·주공 HP/MP) — hw_save 공유 ---------- */
  var SAVE = (function () { try { return JSON.parse(lsGet('hw_save') || 'null') || {}; } catch (e) { return {}; } })();
  var relicById = {}; (typeof HW_RELICS !== 'undefined' ? HW_RELICS : []).forEach(function (r) { relicById[r.id] = r; });
  var relics = (SAVE.relics || []).map(function (id) { return relicById[id]; }).filter(Boolean);
  function relicSum(key) { return relics.reduce(function (s, r) { return s + (r.effect[key] || 0); }, 0); }
  function dStatRow(label, val, bonus) {
    return '<div style="display:flex;justify-content:space-between;background:rgba(0,0,0,.25);border-radius:8px;padding:7px 10px;margin-bottom:6px"><span>' + label + '</span><b>' + val +
      (bonus ? ' <span style="color:#8effb0;font-weight:700">(아이템 +' + bonus + ')</span>' : '') + '</b></div>';
  }
  function dSectionHead(t) { return '<div style="text-align:left;font-size:12px;color:var(--gold);font-weight:800;margin:12px 2px 5px">' + t + '</div>'; }
  function showRelicsInfo() { // 추가 능력 상세 팝업 — 유물 효과 + 아이템(장비)으로 적용되는 주공 능력치
    var hpBonus = lordMaxHp() - HW_LORD.hp, mpBonus = lordMaxMp() - HW_LORD.mp;
    var critPct = Math.round((BASE_CRIT + relicSum('crit')) * 100);
    document.getElementById('bossModalBody').innerHTML =
      '<h2 style="text-align:center;">✨ 추가 능력</h2>' +
      dSectionHead('🏺 유물 효과 <span style="color:var(--ink-dim);font-weight:600">' + relics.length + '개</span>') +
      (relics.length
        ? '<div style="text-align:left;font-size:13px;line-height:1.5">' + relics.map(function (r) {
            return '<div style="background:rgba(0,0,0,.25);border-radius:8px;padding:8px 10px;margin-bottom:6px"><b>' + r.emoji + ' ' + r.name + '</b><br><span style="color:var(--ink-dim)">' + r.desc + '</span></div>';
          }).join('') + '</div>'
        : '<p style="color:var(--ink-dim);font-size:13px;text-align:left;margin:2px 2px 8px">적용된 유물이 없습니다. 영웅전에서 유물을 획득하세요.</p>') +
      dSectionHead('🛡 적용된 주공 능력치') +
      dStatRow('❤ 최대 HP', lordMaxHp(), hpBonus) +
      dStatRow('💧 최대 MP', lordMaxMp(), mpBonus) +
      dStatRow('💥 치명타 확률', critPct + '%', 0) +
      '<div style="text-align:center;margin-top:14px;"><button class="btn primary" id="relicInfoClose">닫기</button></div>';
    var m = document.getElementById('bossModal'); m.hidden = false;
    document.getElementById('relicInfoClose').addEventListener('click', function () { m.hidden = true; });
  }
  document.getElementById('raidLordStatus').addEventListener('click', function (e) {
    if (e.target.closest('.relic-pick')) { TCG.sfx('tap'); showRelicsInfo(); }
  });
  function renderItemBar() {
    var bar = document.getElementById('itemBar'); if (!bar) return;
    var c = combat, used = c && (c.itemUsed || c.phase === 'enemy' || c.targeting || c.lordStun > 0);
    var slots = '';
    for (var i = 0; i < HW_ITEM_MAX; i++) {
      var id = items[i], it = id ? HW_CONS_BY_ID[id] : null;
      if (it) slots += '<button class="item-slot' + (used ? ' used' : '') + '" data-i="' + i + '" title="' + it.name + ' · ' + it.desc + '"><span class="is-emoji">' + it.emoji + '</span></button>';
      else slots += '<span class="item-slot empty">＋</span>';
    }
    bar.innerHTML = slots;
  }
  function applyItem(it) {
    var c = combat, L = c.lord;
    if (it.kind === 'hp') { if (L.hp >= L.maxHp) { TCG.toast('HP가 가득 찼습니다'); return false; } L.hp = Math.min(L.maxHp, L.hp + it.val); fxSupport(lordEl(), '+' + it.val, '#7ef0b5'); logMsg('🧪 회복약 — 주공 HP +' + it.val); }
    else if (it.kind === 'mp') { if (L.mp >= L.maxMp) { TCG.toast('MP가 가득 찼습니다'); return false; } L.mp = Math.min(L.maxMp, L.mp + it.val); fxSupport(lordEl(), '💧+' + it.val, '#9fd2ff'); logMsg('💧 마력약 — 주공 MP +' + it.val); }
    else if (it.kind === 'atk') { c.tempAtk = { val: it.val, turns: it.turns }; fxSupport(lordEl(), '⚔+' + it.val, '#ffd86b'); logMsg('🍷 전투주 — ' + it.turns + '턴간 전군 공격력 +' + it.val); }
    else if (it.kind === 'shield') { L.block += it.val; fxSupport(lordEl(), '🛡+' + it.val, '#9fd2ff'); logMsg('🛡️ 철벽부 — 주공 방어막 +' + it.val); }
    else if (it.kind === 'cure_poison' || it.kind === 'cure_confuse') { TCG.toast('대장전에서는 해제할 상태이상이 없습니다'); return false; }
    else return false;
    return true;
  }
  document.getElementById('itemBar').addEventListener('click', function (e) {
    var b = e.target.closest('.item-slot'); if (!b || !b.dataset.i) return;
    var c = combat; if (!c || c.phase === 'enemy' || c.targeting || c.busy || c.lordStun > 0) return;
    if (c.itemUsed) { TCG.toast('이번 턴에는 이미 아이템을 사용했습니다'); return; }
    var idx = parseInt(b.dataset.i, 10), it = HW_CONS_BY_ID[items[idx]]; if (!it) return;
    if (!applyItem(it)) return;
    items.splice(idx, 1); c.itemUsed = true; TCG.sfx('heal'); saveItems(); renderCombat();
  });

  /* ---------- stat/weapon helpers (영웅전과 동일 규칙) ---------- */
  function heroWpnIds(h) { return (h && h.weapons) ? h.weapons : []; }
  function heroWpns(h) { return heroWpnIds(h).map(function (id) { return HW_WEAPON_BY_ID[id]; }).filter(Boolean); }
  function wpnVal(h, key) { return heroWpns(h).reduce(function (s, w) { return s + (w.effect[key] || 0); }, 0); }
  function hasWpnFlag(h, key) { return heroWpns(h).some(function (w) { return !!w.effect[key]; }); }
  function effAtk(h) { var c = combat; return h.atk + wpnVal(h, 'atk') + (c ? (c.atkBuff || 0) + ((c.tempAtk && c.tempAtk.turns > 0) ? c.tempAtk.val : 0) + ((c.cardBuff && h.uid && c.cardBuff[h.uid]) ? c.cardBuff[h.uid] : 0) : 0); }
  function lordMaxHp() { return HW_LORD.hp + party.reduce(function (s, h) { return s + wpnVal(h, 'lordHp'); }, 0) + relicSum('maxHp'); }
  function lordMaxMp() { return HW_LORD.mp + party.reduce(function (s, h) { return s + wpnVal(h, 'lordMp'); }, 0) + relicSum('maxMp'); }
  function skillMp(sk) { var m = 2 + (sk.cost || 1); return (sk.type === 'buff' && sk.scope === 'army') ? m * 5 : m + 3; } // 모든 스킬 +3, 전군 버프는 현재의 5배
  var BASE_CRIT = 0.01;
  function critChance(h) { return Math.min(0.5, BASE_CRIT + wpnVal(h, 'crit') + relicSum('crit')); } // 치명타 확률 최대 50%(유물 합산)
  function rollCrit(c) { return Math.random() < c; }
  function defenseOf(h) { return 3 + Math.floor(effAtk(h) / 3); }
  function heroByUid(uid) { return party.find(function (h) { return h.uid === uid; }); }

  /* ---------- 대장전 전용 스킬 치환 (보스가 면역인 혼란→계책 / 매혹→구휼) ---------- */
  var RAID_SUB_CONFUSE = { name:'계책', cost:2, type:'buff', val:5, target:'ally', desc:'공격 카드 1장 공격력 +5 (1턴)' };
  var RAID_SUB_CHARM   = { name:'구휼', cost:1, type:'heal', val:12, target:'lowestAlly', desc:'주공 12 회복' };
  function raidSkill(h) { // 대장전에서는 행동 불가 스킬을 다른 스킬로 교체
    var sk = h.def.skill;
    if (sk.type === 'confuse') return RAID_SUB_CONFUSE;
    if (sk.type === 'charm') return RAID_SUB_CHARM;
    return sk;
  }
  // 보스 인물화 = 대응 장수와 같은 절차적 얼굴(hero id 시드)
  function bossFace(cmd, extraClass) {
    var hd = (cmd && cmd.hero && HW_BY_ID[cmd.hero]) ? HW_BY_ID[cmd.hero] : null;
    return hd ? TCG.portrait(hd.emoji, hd.id, extraClass, hd.name) : TCG.portrait(cmd.emoji, cmd.name, extraClass, cmd.name);
  }
  function skillKindLabel(t) { return (t === 'shield') ? '방어' : (t === 'heal') ? '회복' : (t === 'confuse' || t === 'charm') ? '행동 불가' : (t === 'cardstun') ? '카드 행동 불가' : '공격'; }
  function pickBossSkill(b) { // 두 스킬 중 상황에 맞게 하나 선택
    var aff = (b.skills || []).filter(function (s) { return b.mp >= skillMp(s); });
    if (!aff.length) return null;
    var lowHp = b.hp < b.maxHp * 0.45;
    var sustain = aff.filter(function (s) { return s.type === 'heal' || s.type === 'shield'; });
    if (lowHp && sustain.length && Math.random() < 0.6) return TCG.pick(sustain);
    var aggro = aff.filter(function (s) { return s.type !== 'heal' && s.type !== 'shield'; });
    return TCG.pick(aggro.length ? aggro : aff);
  }
  // 하후돈(레이드 3번째)부터 추가되는 보스 3번째 스킬 — 공격 또는 카드 행동 불가(cardstun)
  var RAID_EXTRA_SKILLS = {
    cmd_xiahoudun:  { name: '철기 돌격', type: 'strike',   val: 14, cost: 2 },
    cmd_caocao:     { name: '위왕의 위압', type: 'cardstun', val: 1,  cost: 3 },
    cmd_xiahouyuan: { name: '난사 연발', type: 'multi',    val: 3,  cost: 2 },
    cmd_luxun:      { name: '연환 폭화', type: 'aoe',      val: 18, cost: 3 },
    cmd_simayi:     { name: '심리 교란', type: 'cardstun', val: 1,  cost: 3 },
    cmd_simayan:    { name: '천하 통일포', type: 'strike',  val: 18, cost: 3 }
  };
  function raidBossSkills(b) { // 레이드 보스 스킬(하후돈부터 3종)
    var s = (HW_COMMANDERS[b.key].skills || []).slice();
    if (RAID_EXTRA_SKILLS[b.key]) s.push(RAID_EXTRA_SKILLS[b.key]);
    return s;
  }
  function raidBossAtk(cmd, idx) { // 공격력 = (기본 × 배수 + 레이드 순번 × 2) × 1.3
    return Math.round((Math.max(2, Math.round(cmd.atk * HW_RAID.atkMult * DCFG.eAtk)) + (idx + 1) * 2) * 1.3);
  }
  function raidBossHp(cmd) { return Math.round(cmd.hp * HW_RAID.hpMult * 1.1); } // HP +10%
  // 하후돈(레이드 3번째)부터 보스 양옆에 등장하는 졸병 1~2기
  var RAID_ADD_TYPES = [ { name: '적 보병', emoji: '🪖' }, { name: '적 궁병', emoji: '🏹' }, { name: '적 창병', emoji: '🛡️' } ];
  function makeRaidAdds(idx, bossHp, bossAtk) {
    if (idx < 2) return [];
    var count = 1 + ((Math.random() < (idx >= 4 ? 0.8 : 0.45)) ? 1 : 0); // 한두 명
    var hp = Math.max(8, Math.round(bossHp * 0.06)), atk = Math.max(2, Math.round(bossAtk * 0.35));
    var adds = [];
    for (var i = 0; i < count; i++) {
      var t = RAID_ADD_TYPES[Math.floor(Math.random() * RAID_ADD_TYPES.length)];
      adds.push({ name: t.name, emoji: t.emoji, maxHp: hp, hp: hp, atk: atk, block: 0, poison: 0 });
    }
    return adds;
  }

  /* ---------- raid clear / grant storage ---------- */
  function clearedSet() { try { var a = JSON.parse(lsGet('hw_raid_cleared') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function isCleared(key) { return clearedSet().indexOf(key) !== -1; }
  function markCleared(key) { var a = clearedSet(); if (a.indexOf(key) === -1) { a.push(key); lsSet('hw_raid_cleared', JSON.stringify(a)); } }
  function collected(id) { try { var a = JSON.parse(lsGet('hw_collected_heroes') || '[]'); return Array.isArray(a) && a.indexOf(id) !== -1; } catch (e) { return false; } }
  function grantHero(id) {
    try {
      var g = JSON.parse(lsGet('hw_grant_heroes') || '[]'); if (!Array.isArray(g)) g = [];
      if (g.indexOf(id) === -1) g.push(id); lsSet('hw_grant_heroes', JSON.stringify(g));
      var c = JSON.parse(lsGet('hw_collected_heroes') || '[]'); if (!Array.isArray(c)) c = [];
      if (c.indexOf(id) === -1) { c.push(id); lsSet('hw_collected_heroes', JSON.stringify(c)); }
    } catch (e) {}
  }

  /* ---------- screens ---------- */
  function show(id) {
    ['selectScreen', 'combatScreen'].forEach(function (s) { document.getElementById(s).hidden = (s !== id); });
  }

  function renderSelect() {
    var dpl = document.getElementById('deckPill'); if (dpl) dpl.textContent = '출진 덱 ' + activeDeckUids().length;
    var rc = document.getElementById('rosterCount'); if (rc) rc.textContent = party.length; // 장수 버튼 카운트(0 표시 버그 수정)
    var dp = document.getElementById('diffPill'); if (dp) dp.textContent = '난이도 ' + TCG.diffLabel(diff);
    var ls = document.getElementById('raidLordStatus');
    if (ls) {
      var mhp = lordMaxHp(), mmp = lordMaxMp();
      var lhp = (typeof SAVE.lordHp === 'number') ? Math.min(SAVE.lordHp, mhp) : mhp;
      var lmp = (typeof SAVE.lordMp === 'number') ? Math.min(SAVE.lordMp, mmp) : mmp;
      ls.innerHTML =
        '<div class="map-lord-status">' +
          '<span class="mls hp">❤ ' + lhp + ' / ' + mhp + '</span>' +
          '<span class="mls mp">💧 ' + lmp + ' / ' + mmp + '</span>' +
          '<span class="mls relic relic-pick" title="탭하면 추가 능력 상세">✨ 추가 능력</span>' +
        '</div>';
    }
    var html = HW_RAID.bosses.map(function (b, i) {
      var cmd = HW_COMMANDERS[b.key];
      var rew = HW_BY_ID[b.reward];
      var done = isCleared(b.key);
      var got = collected(b.reward);
      // 순차 진행: 첫 보스이거나 이전 보스를 격파해야 도전 가능
      var unlocked = (i === 0) || isCleared(HW_RAID.bosses[i - 1].key);
      var hp = Math.round(cmd.hp * HW_RAID.hpMult);
      var badge = done ? '<span class="raid-clear">✔ 격파</span>' : (unlocked ? '' : '<span class="raid-lock">🔒</span>');
      var btn = unlocked
        ? '<button class="camp-btn primary raid-go" data-i="' + i + '">⚔️ ' + (done ? '재도전' : '도전') + '</button>'
        : '<button class="camp-btn raid-go" data-i="' + i + '" disabled>🔒 이전 보스 격파 필요</button>';
      return '<div class="raid-card' + (done ? ' done' : '') + (unlocked ? '' : ' locked') + '" data-i="' + i + '">' +
        '<div class="raid-boss">' + (unlocked ? bossFace(cmd, 'raid-art') : TCG.portrait('❓', b.key, 'raid-art')) +
          '<div class="raid-bossinfo"><b>' + (unlocked ? cmd.name : '???') + '</b><small>' + b.title + ' · ❤ ' + hp + (cmd.aoe ? ' · 광역' : '') + '</small></div>' +
          badge +
        '</div>' +
        '<div class="raid-reward' + (got ? '' : ' locked') + '">🎁 보상 장수: <b>' + (unlocked ? rew.name : '???') + '</b> <span class="rar-' + rew.rarity + '">' + rew.rarity + '</span>' + (got ? ' <span class="raid-owned">보유</span>' : '') + '</div>' +
        btn +
        '</div>';
    }).join('');
    document.getElementById('raidList').innerHTML = html;
    show('selectScreen');
  }
  function raidUnlocked(i) { return (i === 0) || isCleared(HW_RAID.bosses[i - 1].key); }
  document.getElementById('raidList').addEventListener('click', function (e) {
    var btn = e.target.closest('.raid-go');
    if (btn && !btn.disabled) {
      var bi = parseInt(btn.dataset.i, 10);
      if (!raidUnlocked(bi)) { TCG.toast('이전 보스를 먼저 격파하세요'); return; }
      TCG.sfx('tap'); startRaid(bi); return;
    }
    var card = e.target.closest('.raid-card'); if (!card) return; // 카드 본문 탭 → 보스 정보
    var i = parseInt(card.dataset.i, 10);
    if (!raidUnlocked(i)) { TCG.toast('이전 보스를 먼저 격파하세요'); return; }
    showBossInfo(i);
  });
  function showBossInfo(i) {
    var b = HW_RAID.bosses[i], cmd = HW_COMMANDERS[b.key], rew = HW_BY_ID[b.reward];
    var hp = raidBossHp(cmd);
    var atk = raidBossAtk(cmd, i);
    var got = collected(b.reward), done = isCleared(b.key);
    var skills = raidBossSkills(b);
    var skillsHtml = skills.map(function (s) {
      return '<div class="bi-skill"><b>「' + s.name + '」</b> <span class="bi-kind">' + skillKindLabel(s.type) + '</span>' +
        (s.type === 'heal' ? ' · 회복 ' + s.val : s.type === 'shield' ? ' · 방어막 ' + s.val : (s.type === 'confuse' || s.type === 'charm') ? ' · 주공 ' + (s.val || 1) + '턴 행동 불가' : s.type === 'cardstun' ? ' · 카드 1장 ' + (s.val || 1) + '턴 행동 불가' : ' · 위력 ' + s.val) + '</div>';
    }).join('');
    document.getElementById('bossModalBody').innerHTML =
      bossFace(cmd, 'bi-portrait') +
      '<h2>' + cmd.name + ' <span class="rar-SSR" style="font-size:13px;">레이드</span></h2>' +
      '<p class="bi-title">' + b.title + (done ? ' · <span class="cd-got">격파함</span>' : '') + '</p>' +
      '<div class="bi-stat">❤ HP ' + hp + ' · ⚔ 공격 ' + atk + (cmd.aoe ? ' · 💥 광역' : '') + (i >= 2 ? ' · 🪖 졸병 동반' : '') + '</div>' +
      '<div class="bi-sec">👹 보스 스킬 ' + skills.length + '종</div>' + skillsHtml +
      '<div class="bi-sec">🎁 격파 보상</div>' +
      '<div class="bi-skill">전용 장수 <b>' + rew.name + '</b> <span class="rar-' + rew.rarity + '">' + rew.rarity + '</span>' + (got ? ' <span class="raid-owned">보유 중 — 재도전 시 골드</span>' : '') + '</div>' +
      '<button class="btn primary" id="bossModalClose" style="margin-top:14px;">닫기</button>';
    var m = document.getElementById('bossModal'); m.hidden = false;
    document.getElementById('bossModalClose').addEventListener('click', function () { m.hidden = true; });
    TCG.sfx('tap');
  }

  /* ---------- combat ---------- */
  function startRaid(idx) {
    var b = HW_RAID.bosses[idx];
    var cmd = HW_COMMANDERS[b.key];
    var hp = raidBossHp(cmd);
    var atk = raidBossAtk(cmd, idx);
    var mhp = lordMaxHp(), mmp = lordMaxMp();
    var bc = HW_BOSS[diff] || HW_BOSS.normal;
    var bmp = Math.max(0, bc.mp - 20) + 10; // 대장전 레이드 보스 MP -20 후 +10
    combat = {
      raidIdx: idx, boss: { def: cmd, name: cmd.name, emoji: cmd.emoji, maxHp: hp, hp: hp, atk: atk, atk0: atk, aoe: !!cmd.aoe, block: 0, poison: 0, charmed: 0, intent: null,
        skills: raidBossSkills(b), mp: bmp, maxMp: bmp, skillChance: bc.skillChance },
      adds: makeRaidAdds(idx, hp, atk), tgtIdx: 0,
      round: 0, lord: { hp: mhp, maxHp: mhp, mp: mmp, maxMp: mmp, block: relicSum('startBlock') }, atkBuff: relicSum('startAtk'), lordStun: 0,
      draw: TCG.shuffle(activeDeckUids().slice()), center: [], used: [], cstat: {},
      sel: null, targeting: false, phase: 'player', log: [], over: false, itemUsed: false, tempAtk: null, cardBuff: {}
    };
    (function () { // 독항아리(유물) — 전투 시작 시 보스 중독
      var p = relicSum('startPoison');
      if (p && combat.boss.hp > 0) { combat.boss.poison = (combat.boss.poison || 0) + p; logMsg('☠ 독항아리 — ' + combat.boss.name + ' 중독 +' + p); }
    })();
    show('combatScreen');
    fxBanner(TCG.t('cmb.raidBanner', { name: cmd.name }), 'boss', 1400); shake('big');
    logMsg(b.title + ' ' + cmd.name + ' 토벌전 개전!');
    beginRound();
    if (cmd.quote) setTimeout(function () { fxQuote(bossEl(), cmd.quote, 5000); }, 1100); // 보스 등장 대사(5초)
  }

  function centerSize() { return 3 + relicSum('energy'); }
  function drawOne() {
    var c = combat;
    if (!c.draw.length) { if (!c.used.length) return false; c.draw = TCG.shuffle(c.used); c.used = []; logMsg('덱을 다시 섞었습니다'); }
    if (!c.draw.length) return false;
    c.center.push(c.draw.pop()); return true;
  }
  function refillCenter() { var c = combat, cap = Math.min(centerSize(), c.draw.length + c.center.length + c.used.length), g = 0; while (c.center.length < cap && g++ < 40) { if (!drawOne()) break; } }
  function beginRound() {
    var c = combat; c.round++;
    if (c.round > 1) c.lord.block = 0; // MP 자동 재생 없음
    c.itemUsed = false; c.cardBuff = {}; // 아이템 턴당 1개 · 1턴 버프 초기화
    if (c.tempAtk && c.tempAtk.turns > 0) c.tempAtk.turns--;
    refillCenter();
    var b = c.boss;
    if (b.aoe && c.round % 3 === 0) b.intent = { type: 'aoe', dmg: Math.max(2, Math.round(b.atk * 0.85)) };
    else b.intent = { type: 'attack', dmg: b.atk };
    c.sel = null; c.targeting = false;
    renderCombat();
    if (c.round >= 2) fxBanner(TCG.t('cmb.bannerRound', { n: c.round }), 'round', 800);
  }
  function logMsg(m) {
    var c = combat; c.log.push(m); if (c.log.length > 6) c.log.shift();
    var el = document.getElementById('combatLog'); el.innerHTML = c.log.map(function (x) { return '· ' + x; }).join('<br>'); el.scrollTop = el.scrollHeight;
  }

  /* ---------- FX (trimmed) ---------- */
  function fxLayerEl() { return document.getElementById('fxLayer'); }
  function rectOf(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    var layer = fxLayerEl(); if (!layer || typeof layer.getBoundingClientRect !== 'function') return null;
    var r = el.getBoundingClientRect(), lr = layer.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left - lr.left + r.width / 2, y: r.top - lr.top + r.height / 2 };
  }
  function spawn(cls, x, y, ms) {
    var layer = fxLayerEl(); if (!layer || typeof layer.appendChild !== 'function' || typeof document.createElement !== 'function') return null;
    var d = document.createElement('div'); if (!d || !d.style) return null;
    d.className = 'fx ' + cls; d.style.left = x + 'px'; d.style.top = y + 'px'; layer.appendChild(d);
    setTimeout(function () { if (d.remove) d.remove(); }, ms || 900); return d;
  }
  function fxFloat(x, y, t, color, big) { var d = spawn('fx-float' + (big ? ' big' : ''), x, y, 1000); if (d) { d.textContent = t; d.style.color = color || '#fff'; } }
  function fxSlash(x, y) { spawn('fx-slash', x, y, 420); }
  function fxBurst(x, y, color) { var d = spawn('fx-burst', x, y, 500); if (d) d.style.setProperty('--c', color || '#fff'); }
  function fxParticles(x, y, n, color) { for (var i = 0; i < (n || 6); i++) { var a = Math.random() * 6.28, dist = 14 + Math.random() * 24, d = spawn('fx-particle', x, y, 600); if (d) { d.style.setProperty('--c', color || '#ffd0d0'); d.style.setProperty('--dx', (Math.cos(a) * dist) + 'px'); d.style.setProperty('--dy', (Math.sin(a) * dist) + 'px'); } } }
  function fxBanner(text, cls, ms) { var layer = fxLayerEl(); if (!layer || typeof document.createElement !== 'function') return; var d = document.createElement('div'); if (!d) return; d.className = 'fx-banner ' + (cls || ''); d.textContent = text; layer.appendChild(d); setTimeout(function () { if (d.remove) d.remove(); }, ms || 1100); }
  function shake(level) { var sc = document.getElementById('combatScreen'); if (!sc || !sc.classList) return; var cls = level === 'big' ? 'shake-big' : 'shake-sm'; sc.classList.add(cls); setTimeout(function () { sc.classList.remove(cls); }, level === 'big' ? 420 : 240); }
  function fxQuote(unitEl, text, ms) { // 보스 등장 대사 말풍선(카드 아래)
    if (!TCG.isDialogueOn() || !text || !unitEl || typeof unitEl.getBoundingClientRect !== 'function') return;
    var layer = fxLayerEl(); if (!layer || typeof layer.getBoundingClientRect !== 'function') return;
    var r = unitEl.getBoundingClientRect(), lr = layer.getBoundingClientRect();
    if (!r.width && !r.height) return;
    var d = spawn('fx-quote', r.left - lr.left + r.width / 2, r.top - lr.top + r.height + 8, ms || 2000);
    if (d) d.textContent = text;
  }
  function bossEl() { return document.querySelector('#enemyRow .unit'); }
  function lordEl() { return document.querySelector('#lordBar .lord-art'); }
  function fxHitBoss(dmg, crit) { var p = rectOf(bossEl()); if (!p) return; fxSlash(p.x, p.y); fxBurst(p.x, p.y, crit ? '#ffd34d' : '#fff'); fxParticles(p.x, p.y, crit ? 10 : 7, crit ? '#ffe89a' : '#ffc6c6'); if (crit) fxFloat(p.x, p.y - 16, TCG.t('cmb.crit'), '#ffd34d', true); fxFloat(p.x, p.y, '-' + dmg, crit ? '#ffd34d' : '#ff9a9a', true); }
  function fxHitLord(dmg, blocked, crit) { var p = rectOf(lordEl()); if (!p) return; if (blocked) fxFloat(p.x, p.y - 14, '🛡' + blocked, '#9fd2ff'); if (dmg > 0) { fxSlash(p.x, p.y); fxBurst(p.x, p.y, crit ? '#ffd34d' : '#ff6b6b'); fxParticles(p.x, p.y, 6, '#ffb0b0'); if (crit) fxFloat(p.x, p.y - 16, TCG.t('cmb.crit'), '#ffd34d', true); fxFloat(p.x, p.y, '-' + dmg, crit ? '#ffd34d' : '#ff9a9a', true); } }
  function fxSupport(el, t, color) { var p = rectOf(el); if (!p) return; fxFloat(p.x, p.y, t, color); }

  /* ---------- render ---------- */
  function renderCombat() {
    var c = combat, b = c.boss;
    document.getElementById('energyBox').innerHTML = '🎴 가운데 카드를 선택해 <b>공격</b>하거나, 턴을 종료하세요';
    var dead = b.hp <= 0, charmed = b.charmed > 0 || b.confused > 0;
    var tgt = c.targeting && !dead;
    var intentTxt = (b.confused > 0) ? '💤 혼란' : (b.charmed > 0) ? '💤 매혹' : (b.intent ? (b.intent.type === 'aoe' ? '💥' + b.intent.dmg : '⚔️' + b.intent.dmg) : '');
    var pct = Math.max(0, Math.round(b.hp / b.maxHp * 100));
    var bossHtml =
      '<div class="unit enemy raid-boss-unit' + (dead ? ' dead' : '') + (tgt ? ' targetable' : '') + (charmed ? ' charmed' : '') + '" data-side="enemy" data-idx="0">' +
        (dead ? '' : '<div class="u-intent">' + intentTxt + '</div>') +
        (b.block > 0 ? '<div class="u-block">🛡' + b.block + '</div>' : '') +
        (charmed ? '<div class="u-charm">💗' + b.charmed + '</div>' : '') +
        (b.poison > 0 ? '<div class="u-poison">☠' + b.poison + '</div>' : '') +
        bossFace(b.def, '') +
        '<div class="u-name">' + b.name + '</div>' +
        '<div class="u-hp-text">❤ ' + Math.max(0, b.hp) + ' / ' + b.maxHp + '</div>' +
        (b.maxMp ? '<div class="u-mp-text">💧 ' + Math.max(0, b.mp) + ' / ' + b.maxMp + '</div>' : '') +
        '<div class="hpbar foe"><i style="width:' + pct + '%"></i></div></div>';
    var addsHtml = (c.adds || []).map(function (a, i) {
      var adead = a.hp <= 0, atgt = c.targeting && !adead, apct = Math.max(0, Math.round(a.hp / a.maxHp * 100));
      return '<div class="unit enemy raid-add' + (adead ? ' dead' : '') + (atgt ? ' targetable' : '') + '" data-side="enemy" data-idx="' + (i + 1) + '">' +
        (adead ? '' : '<div class="u-intent">⚔️' + a.atk + '</div>') +
        (a.block > 0 ? '<div class="u-block">🛡' + a.block + '</div>' : '') +
        (a.poison > 0 ? '<div class="u-poison">☠' + a.poison + '</div>' : '') +
        TCG.portrait(a.emoji, 'add' + i, '', a.name) +
        '<div class="u-name">' + a.name + '</div>' +
        '<div class="u-hp-text">❤ ' + Math.max(0, a.hp) + ' / ' + a.maxHp + '</div>' +
        '<div class="hpbar foe"><i style="width:' + apct + '%"></i></div></div>';
    }).join('');
    document.getElementById('enemyRow').innerHTML = bossHtml + addsHtml;

    var L = c.lord;
    var hp = Math.max(0, Math.round(L.hp / L.maxHp * 100)), mp = Math.max(0, Math.round(L.mp / Math.max(1, L.maxMp) * 100));
    document.getElementById('lordBar').innerHTML =
      '<div class="lord">' + TCG.portrait('👑', 'lord', 'lord-art') +
        '<div class="lord-info"><div class="lord-name">주공 (나)' + (L.block > 0 ? ' <span class="lord-block">🛡' + L.block + '</span>' : '') + (c.lordStun > 0 ? ' <span class="lord-block" style="background:rgba(199,155,255,.3)">💫' + c.lordStun + '</span>' : '') + '</div>' +
          '<div class="lbar hp"><i style="width:' + hp + '%"></i><span>❤ ' + Math.max(0, L.hp) + ' / ' + L.maxHp + '</span></div>' +
          '<div class="lbar mp"><i style="width:' + mp + '%"></i><span>💧 MP ' + Math.max(0, L.mp) + ' / ' + L.maxMp + '</span></div>' +
        '</div></div>';
    renderPiles();
    renderActionBar();
    renderItemBar();
    document.getElementById('endTurnBtn').disabled = (c.phase === 'enemy' || c.busy);
    var hint = document.getElementById('combatHint');
    hint.textContent = c.phase === 'enemy' ? TCG.t('cmb.hintBossActing') : (c.lordStun > 0 ? TCG.t('cmb.hintStunned') : (c.targeting ? TCG.t('cmb.hintTarget') : (c.sel ? TCG.t('cmb.hintAction') : TCG.t('cmb.hintIdle'))));
  }
  function renderPiles() {
    var c = combat;
    var ds = ''; for (var i = 0; i < Math.min(c.draw.length, 5); i++) ds += '<div class="pile-card" style="--i:' + i + '"></div>';
    document.getElementById('drawPile').innerHTML = ds + '<div class="pile-label">뽑을 카드 <b>' + c.draw.length + '</b></div>';
    var canAct = c.phase !== 'enemy' && !c.targeting && !c.busy && !(c.lordStun > 0);
    var cardsHtml = c.center.map(function (uid) {
      var h = heroByUid(uid); if (!h) return ''; var sk = raidSkill(h);
      var stunned = c.cstat && c.cstat[uid] && c.cstat[uid].stun > 0; // 보스 카드 봉쇄
      var sel = c.sel && c.sel.uid === uid; // 대상 지정 중에도 선택 강조 유지
      var cls = 'combat-card' + (sel ? ' selected' : '') + ((canAct && !stunned) ? '' : ' unplayable') + (stunned ? ' stunned' : '');
      var ws = heroWpns(h), wE = ws.map(function (w) { return w.emoji; }).join(''), wN = ws.map(function (w) { return w.name; }).join(', ');
      return '<div class="' + cls + '" data-uid="' + uid + '">' + (stunned ? '<div class="cc-stun">💫</div>' : '') + TCG.portrait(h.def.emoji, h.def.id, 'cc-art', h.def.name) +
        '<div class="cc-name">' + h.def.name + '</div><div class="cc-atk">⚔' + effAtk(h) + '</div>' +
        (wE ? '<div class="cc-wpn" title="' + wN + '">' + wE + '</div>' : '') + '<div class="cc-skill">' + sk.name + '</div></div>';
    }).join('');
    document.getElementById('centerCards').innerHTML = cardsHtml ? '<div class="center-inner">' + cardsHtml + '</div>' : '<div class="center-empty">카드 없음</div>';
    var us = ''; for (var j = 0; j < Math.min(c.used.length, 5); j++) us += '<div class="pile-card used" style="--i:' + j + '"></div>';
    document.getElementById('usedPile').innerHTML = us + '<div class="pile-label">사용한 카드 <b>' + c.used.length + '</b></div>';
  }
  function renderActionBar() {
    var c = combat, bar = document.getElementById('actionBar');
    if (!c.sel) { bar.hidden = true; return; }
    var h = heroByUid(c.sel.uid); if (!h) { bar.hidden = true; return; }
    var sk = raidSkill(h), mp = skillMp(sk);
    var immune = (sk.type === 'charm' || sk.type === 'confuse'); // 레이드 보스는 행동 불가(혼란·매혹) 면역
    var buffDone = sk.type === 'buff' && sk.scope === 'army' && c.buffApplied && c.buffApplied[h.uid]; // 전군 버프는 전투당 1회
    var canSkill = !immune && !buffDone && c.lord.mp >= mp;
    var mpLabel = buffDone ? '✓ 적용됨' : (immune ? '🛡 면역' : ('💧' + mp));
    var skDesc = immune ? '레이드 보스는 혼란·매혹에 면역' : sk.desc;
    var critPct = Math.round(critChance(h) * 100);
    var atkSel = c.targeting && c.pendKind === 'attack', skSel = c.targeting && c.pendKind === 'skill';
    bar.hidden = false;
    bar.innerHTML =
      '<button class="act-btn' + (atkSel ? ' chosen' : '') + '" data-act="attack">기본 공격<small>피해 ' + effAtk(h) + (hasWpnFlag(h, 'doubleStrike') ? ' ×2' : '') + (wpnVal(h, 'poison') ? ' ☠' + wpnVal(h, 'poison') : '') + (critPct > 1 ? ' 💥' + critPct + '%' : '') + '</small></button>' +
      '<button class="act-btn skill' + (skSel ? ' chosen' : '') + '" data-act="skill"' + (canSkill ? '' : ' disabled') + '>' + sk.name + '<small>' + mpLabel + ' · ' + skDesc + '</small></button>' +
      '<button class="act-btn cancel" data-act="cancel">취소</button>';
  }

  /* ---------- input ---------- */
  document.getElementById('enemyRow').addEventListener('click', function (e) {
    var c = combat; if (!c || c.phase === 'enemy' || !c.targeting || c.busy) return;
    var u = e.target.closest('.unit'); if (!u || !u.classList.contains('targetable')) return;
    c.tgtIdx = parseInt(u.dataset.idx, 10) || 0; // 보스(0) 또는 졸병(1~)
    executeOn();
  });
  document.getElementById('centerCards').addEventListener('click', function (e) {
    var c = combat; if (!c || c.phase === 'enemy' || c.targeting || c.busy) return;
    if (c.lordStun > 0) { TCG.toast('행동 불가 — 이번 턴은 턴 종료만 가능합니다'); return; }
    var card = e.target.closest('.combat-card'); if (!card) return;
    var uid = card.dataset.uid;
    if (c.cstat && c.cstat[uid] && c.cstat[uid].stun > 0) { TCG.toast('행동 불가 상태인 카드입니다'); return; }
    c.sel = (c.sel && c.sel.uid === uid) ? null : { uid: uid }; renderCombat();
  });
  document.getElementById('actionBar').addEventListener('click', function (e) {
    var b = e.target.closest('.act-btn'); if (!b || b.disabled) return;
    var c = combat; if (!c.sel || c.busy) return;
    var act = b.dataset.act;
    if (act === 'cancel') { c.sel = null; c.targeting = false; renderCombat(); return; }
    var h = heroByUid(c.sel.uid); if (!h) return;
    if (act === 'attack') { c.targeting = true; c.pendKind = 'attack'; renderCombat(); return; }
    var sk = raidSkill(h);
    if (sk.type === 'charm' || sk.type === 'confuse') { TCG.toast('레이드 보스는 혼란·매혹(행동 불가)에 면역입니다'); return; }
    if (sk.type === 'buff' && sk.scope === 'army' && c.buffApplied && c.buffApplied[h.uid]) { TCG.toast('「' + sk.name + '」 버프는 전투당 1회만 적용됩니다 (중첩 불가)'); return; }
    if (c.lord.mp < skillMp(sk)) { TCG.toast('MP가 부족합니다'); return; }
    if (sk.type === 'strike' || sk.type === 'multi') { c.targeting = true; c.pendKind = 'skill'; renderCombat(); }
    else doSkill(h, true);
  });
  function executeOn() {
    var c = combat, h = heroByUid(c.sel.uid); if (!h) return;
    if (c.pendKind === 'attack') doAttack(h); else doSkill(h, true);
  }

  function enemyByIdx(i) { return i === 0 ? combat.boss : (combat.adds || [])[i - 1]; }
  function enemyIdxList() { var l = [0]; (combat.adds || []).forEach(function (_, i) { l.push(i + 1); }); return l; }
  function enemyElByIdx(i) { var els = document.querySelectorAll('#enemyRow .unit'); return (els && els[i]) ? els[i] : bossEl(); }
  function fxHitEnemyEl(el, dmg, crit) { var p = rectOf(el); if (!p) return; fxSlash(p.x, p.y); fxBurst(p.x, p.y, crit ? '#ffd34d' : '#fff'); fxParticles(p.x, p.y, crit ? 10 : 7, crit ? '#ffe89a' : '#ffc6c6'); if (crit) fxFloat(p.x, p.y - 16, TCG.t('cmb.crit'), '#ffd34d', true); fxFloat(p.x, p.y, '-' + dmg, crit ? '#ffd34d' : '#ff9a9a', true); }
  function dmgTarget(i, dmg, crit) {
    var t = enemyByIdx(i); if (!t) return;
    var d = dmg; if (t.block > 0) { var ab = Math.min(t.block, d); t.block -= ab; d -= ab; }
    t.hp = Math.max(0, t.hp - d);
    fxHitEnemyEl(enemyElByIdx(i), dmg, crit);
  }
  function dmgBoss(dmg, crit) { dmgTarget(0, dmg, crit); }
  function doAttack(h) {
    var c = combat, ti = c.tgtIdx || 0; if (!enemyByIdx(ti) || enemyByIdx(ti).hp <= 0) ti = 0;
    var t = enemyByIdx(ti), dmg = effAtk(h), hits = hasWpnFlag(h, 'doubleStrike') ? 2 : 1;
    c.busy = true; // 다회 공격은 타격마다 끊어서 연출
    var total = 0, anyCrit = false, k = 0;
    function step() {
      if (k >= hits || t.hp <= 0) { return done(); }
      k++;
      TCG.sfx('attack');
      var crit = rollCrit(critChance(h)); var hd = crit ? dmg * 2 : dmg;
      if (crit) anyCrit = true;
      dmgTarget(ti, hd, crit); shake(crit ? 'big' : 'sm'); total += hd;
      renderCombat();
      setTimeout(step, hits > 1 ? 240 : 120);
    }
    function done() {
      var pv = wpnVal(h, 'poison'); if (pv && t.hp > 0) { t.poison = (t.poison || 0) + pv; logMsg(t.name + '에 독 +' + pv); }
      var ls = relicSum('lifesteal'); if (ls && c.lord.hp > 0) { c.lord.hp = Math.min(c.lord.maxHp, c.lord.hp + ls); } // 오추마(유물)
      logMsg(h.def.name + ' → ' + t.name + ' ' + total + ' 피해' + (anyCrit ? ' (치명타!)' : ''));
      c.busy = false;
      finishPlay();
    }
    step();
  }
  function doSkill(h) {
    var c = combat, b = c.boss, sk = raidSkill(h);
    var ti = c.tgtIdx || 0; if (!enemyByIdx(ti) || enemyByIdx(ti).hp <= 0) ti = 0;
    var tName = (enemyByIdx(ti) || b).name;
    c.lord.mp = Math.max(0, c.lord.mp - skillMp(sk)); // 모든 스킬 MP 소모(회복 포함)
    TCG.sfx(sk.type === 'heal' ? 'heal' : 'skill');
    var pw = effAtk(h);
    if (sk.type === 'strike') { var sc = rollCrit(critChance(h)); var sd = (pw + sk.val) * (sc ? 2 : 1); dmgTarget(ti, sd, sc); shake('big'); logMsg(h.def.name + ' 「' + sk.name + '」 ' + tName + ' ' + sd + ' 피해' + (sc ? ' (치명타!)' : '')); }
    else if (sk.type === 'aoe') { var ac = rollCrit(critChance(h)); var av = sk.val * (ac ? 2 : 1); enemyIdxList().forEach(function (ei) { var en = enemyByIdx(ei); if (en && en.hp > 0) dmgTarget(ei, av, ac); }); shake('big'); logMsg(h.def.name + ' 「' + sk.name + '」 전체 ' + av + ' 피해' + (ac ? ' (치명타!)' : '')); }
    else if (sk.type === 'multi') {
      // 다회 공격 스킬은 타격당 기본 공격력의 1/N(반올림) — 선택한 대상 집중
      var perHit = Math.max(1, Math.round(pw / sk.val));
      c.busy = true; var mi = 0; // 타격마다 끊어서 연출
      (function mhit() {
        var tt = enemyByIdx(ti);
        if (mi >= sk.val || !tt || tt.hp <= 0) { logMsg(h.def.name + ' 「' + sk.name + '」 ' + sk.val + '회 공격(타격당 ' + perHit + ')'); c.busy = false; finishPlay(); return; }
        mi++; TCG.sfx('attack'); var mc = rollCrit(critChance(h)); dmgTarget(ti, mc ? perHit * 2 : perHit, mc); shake('sm'); renderCombat(); setTimeout(mhit, 210); })();
      return; // 비동기 처리 — 아래 공통 finishPlay 건너뜀
    }
    else if (sk.type === 'confuse' || sk.type === 'charm') { fxSupport(bossEl(), '🛡 면역', '#cfd8e3'); logMsg(b.name + ' — ' + (sk.type === 'charm' ? '매혹' : '혼란') + ' 면역!'); } // 레이드 보스는 행동 불가 면역
    else if (sk.type === 'heal') { c.lord.hp = Math.min(c.lord.maxHp, c.lord.hp + sk.val); if (h.def.id === 'oracle') c.lord.block += 5; fxSupport(lordEl(), '+' + sk.val, '#7ef0b5'); logMsg(h.def.name + ' 「' + sk.name + '」 주공 ' + sk.val + ' 회복'); }
    else if (sk.type === 'shield') { c.lord.block += sk.val; fxSupport(lordEl(), '🛡+' + sk.val, '#9fd2ff'); logMsg(h.def.name + ' 「' + sk.name + '」 주공 방어막 +' + sk.val); }
    else if (sk.type === 'buff' && sk.scope === 'army') { // 전군 버프: 전투당 1회(중첩 방지)
      if (!c.buffApplied) c.buffApplied = {};
      if (!c.buffApplied[h.uid]) { c.buffApplied[h.uid] = true; c.atkBuff = (c.atkBuff || 0) + sk.val; fxSupport(lordEl(), '⚔+' + sk.val, '#ffd86b'); logMsg(h.def.name + ' 「' + sk.name + '」 전군 공격력 +' + sk.val + ' (전투 동안)'); }
      else { logMsg(h.def.name + ' 「' + sk.name + '」 — 이미 적용됨(중첩 불가)'); }
    }
    else if (sk.type === 'buff') { // 아군 1명 버프: 출진(가운데) 카드 1장(시전자 제외)에 1턴 공격력 +val
      if (!c.cardBuff) c.cardBuff = {};
      var pool = c.center.filter(function (u) { return u !== h.uid && heroByUid(u); });
      var tgtUid = pool.reduce(function (best, u) { return (best == null || effAtk(heroByUid(u)) > effAtk(heroByUid(best))) ? u : best; }, null);
      if (tgtUid) {
        c.cardBuff[tgtUid] = (c.cardBuff[tgtUid] || 0) + sk.val;
        var th = heroByUid(tgtUid), tel = document.querySelector('.combat-card[data-uid="' + tgtUid + '"]');
        if (tel) fxSupport(tel, '⚔+' + sk.val, '#ffd86b');
        logMsg(h.def.name + ' 「' + sk.name + '」 ' + (th ? th.def.name : '') + ' 공격력 +' + sk.val + ' (1턴)');
      } else { logMsg(h.def.name + ' 「' + sk.name + '」 — 강화할 공격 카드가 없습니다'); }
    }
    finishPlay();
  }
  function finishPlay() {
    var c = combat;
    if (c.sel) { var i = c.center.indexOf(c.sel.uid); if (i !== -1) { c.center.splice(i, 1); c.used.push(c.sel.uid); } }
    c.sel = null; c.targeting = false;
    renderCombat();
    if (c.boss.hp <= 0) { setTimeout(winRaid, 550); }
  }

  // 턴 종료: 가운데 남은 카드는 사용한 풀로 버려진다(방어 기능 제거 — 영웅전과 동일) → 보스 턴
  document.getElementById('endTurnBtn').addEventListener('click', function () {
    var c = combat; if (!c || c.phase === 'enemy' || c.targeting || c.over || c.busy) return;
    c.center.slice().forEach(function (uid) {
      c.used.push(uid);
      if (c.cstat[uid] && c.cstat[uid].stun > 0) c.cstat[uid].stun--; // 출진한 카드의 봉쇄 1턴 소모
    });
    c.center = []; c.sel = null;
    if (c.lordStun > 0) c.lordStun--; // 행동 불가 1턴 소모
    bossPhase();
  });

  function dmgLord(dmg, crit) {
    var L = combat.lord, d = dmg, blocked = 0;
    if (L.block > 0) { var ab = Math.min(L.block, d); L.block -= ab; d -= ab; blocked = ab; }
    L.hp = Math.max(0, L.hp - d);
    fxHitLord(d, blocked, crit);
  }
  // 보스가 2종 스킬 중 하나를 시전(주공 대상). 사용 시 true.
  function bossCast(b, sk) {
    var c = combat;
    b.mp = Math.max(0, b.mp - skillMp(sk));
    fxBanner('👹 ' + b.name + ' 「' + sk.name + '」', 'boss', 1000);
    TCG.sfx(sk.type === 'heal' || sk.type === 'shield' ? 'heal' : 'skill');
    if (sk.type === 'strike') { var crit = rollCrit(BASE_CRIT); var d = b.atk + Math.round(sk.val * 0.5); if (crit) d *= 2; shake('big'); dmgLord(d, crit); logMsg(b.name + ' 「' + sk.name + '」 주공 ' + d + ' 피해' + (crit ? ' (치명타!)' : '')); }
    else if (sk.type === 'aoe') { var d2 = Math.round(sk.val * 0.6) + Math.round(b.atk * 0.3); shake('big'); dmgLord(d2, false); logMsg(b.name + ' 「' + sk.name + '」 주공 ' + d2 + ' 피해'); }
    else if (sk.type === 'multi') { var tot = 0; for (var i = 0; i < sk.val; i++) { if (c.lord.hp <= 0) break; var dd = Math.max(1, Math.round(b.atk * 0.5)); dmgLord(dd, false); tot += dd; } shake('sm'); logMsg(b.name + ' 「' + sk.name + '」 ' + sk.val + '연타 ' + tot + ' 피해'); }
    else if (sk.type === 'heal') { b.hp = Math.min(b.maxHp, b.hp + sk.val); fxSupport(bossEl(), '+' + sk.val, '#7ef0b5'); logMsg(b.name + ' 「' + sk.name + '」 ' + sk.val + ' 회복'); }
    else if (sk.type === 'shield') { b.block += sk.val; fxSupport(bossEl(), '🛡+' + sk.val, '#9fd2ff'); logMsg(b.name + ' 「' + sk.name + '」 방어막 +' + sk.val); }
    else if (sk.type === 'confuse' || sk.type === 'charm') { // 주공 행동 불가(공격 스킬 봉쇄). 카드는 방어만 가능
      var turns = sk.val || 1; c.lordStun = Math.max(c.lordStun || 0, turns);
      fxSupport(lordEl(), '💫 행동 불가', '#c79bff'); logMsg(b.name + ' 「' + sk.name + '」 — 주공 ' + turns + '턴 행동 불가!'); }
    else if (sk.type === 'cardstun') { // 아군 카드(장수) 1장 행동 불가 — 다음 출진 시 1턴
      var pool = c.draw.concat(c.center, c.used).filter(function (u) { return heroByUid(u) && !(c.cstat[u] && c.cstat[u].stun > 0); });
      if (pool.length) {
        var su = TCG.pick(pool), st = sk.val || 1, sh = heroByUid(su);
        c.cstat[su] = { stun: st };
        fxSupport(lordEl(), '💫 카드 봉쇄', '#c79bff'); logMsg(b.name + ' 「' + sk.name + '」 — ' + (sh ? sh.def.name : '카드') + ' ' + st + '턴 행동 불가!');
      } else { var dc = Math.max(1, Math.round(b.atk * 0.5)); dmgLord(dc, false); logMsg(b.name + ' 「' + sk.name + '」 주공 ' + dc + ' 피해'); }
    }
    else { var d3 = Math.max(1, Math.round(b.atk * 0.5)); dmgLord(d3, false); logMsg(b.name + ' 「' + sk.name + '」 주공 ' + d3 + ' 피해'); }
    return true;
  }
  function addsAttackLord() { // 졸병도 주공을 공격
    var c = combat;
    (c.adds || []).forEach(function (a) {
      if (a.hp > 0 && c.lord.hp > 0) {
        var crit = rollCrit(BASE_CRIT), dmg = crit ? a.atk * 2 : a.atk;
        TCG.sfx('hit'); dmgLord(dmg, crit);
        logMsg(a.name + ' → 주공 ' + dmg + ' 피해' + (crit ? ' (치명타!)' : ''));
      }
    });
  }
  function bossPhase() {
    var c = combat, b = c.boss;
    c.phase = 'enemy'; c.sel = null; c.targeting = false;
    if (b.poison > 0) { b.hp = Math.max(0, b.hp - b.poison); fxHitBoss(b.poison, false); logMsg(b.name + ' 독 피해 ' + b.poison); }
    (c.adds || []).forEach(function (a) { if (a.poison > 0 && a.hp > 0) { a.hp = Math.max(0, a.hp - a.poison); } }); // 졸병 독 피해
    renderCombat();
    if (b.hp <= 0) { setTimeout(winRaid, 550); return; }
    var skip = (b.charmed > 0 || b.confused > 0);
    if (skip) { var was = b.charmed > 0 ? '매혹' : '혼란'; if (b.charmed > 0) b.charmed--; else b.confused--; fxSupport(bossEl(), '💤 ' + was, '#ff9ad0'); logMsg(b.name + ' ' + was + '되어 행동 불가'); }
    fxBanner(TCG.t('cmb.bossTurn'), 'foe-turn', 800);
    setTimeout(function () {
      if (!skip) {
        var pick = (b.skills && b.skills.length && Math.random() < (b.skillChance || 0)) ? pickBossSkill(b) : null;
        var usedSkill = pick ? bossCast(b, pick) : false;
        if (!usedSkill) {
          var intent = b.intent, crit = rollCrit(BASE_CRIT), dmg = crit ? intent.dmg * 2 : intent.dmg;
          TCG.sfx('hit'); shake(crit || intent.type === 'aoe' ? 'big' : 'sm');
          dmgLord(dmg, crit);
          logMsg(b.name + ' → 주공 ' + dmg + ' 피해' + (crit ? ' (치명타!)' : ''));
        }
      }
      addsAttackLord();
      renderCombat();
      if (c.lord.hp <= 0) { setTimeout(loseRaid, 400); return; }
      c.phase = 'player'; beginRound();
    }, 520);
  }

  function addBonusGold(n) {
    try { var g = parseInt(lsGet('hw_bonus_gold') || '0', 10) || 0; lsSet('hw_bonus_gold', String(g + n)); } catch (e) {}
  }
  function winRaid() {
    var c = combat; if (c.over) return; c.over = true;
    TCG.sfx('win');
    var b = HW_RAID.bosses[c.raidIdx], rew = HW_BY_ID[b.reward];
    var firstClear = !isCleared(b.key); // 골드 보상은 첫 격파 시 1회
    markCleared(b.key);
    var already = collected(b.reward);
    if (!already) grantHero(b.reward);
    var goldHtml = '';
    if (firstClear) {
      var gold = Math.round((HW_BOSS[diff] || HW_BOSS.normal).raidGold * (1 + relicSum('goldBonus'))); // 천자의 밀서(유물) +%
      addBonusGold(gold);
      goldHtml = '<div class="raid-result-gold">💰 삼국 영웅전 골드 +' + gold + ' 적립 (다음 영웅전 진입 시 반영)</div>';
    } else if (already) { // 재도전 + 이미 보유 → 보스 단계별 보너스 골드(50~200)
      var n = HW_RAID.bosses.length - 1;
      var reGold = Math.round((50 + 150 * c.raidIdx / (n || 1)) / 10) * 10;
      reGold = Math.round(reGold * (1 + relicSum('goldBonus'))); // 천자의 밀서(유물) +%
      addBonusGold(reGold);
      goldHtml = '<div class="raid-result-gold">💰 재도전 보상 — 삼국 영웅전 골드 +' + reGold + ' 적립 (다음 영웅전 진입 시 반영)</div>';
    }
    document.getElementById('overTitle').textContent = '🏆 ' + c.boss.name + ' 격파!';
    document.getElementById('overText').textContent = b.title + ' ' + c.boss.name + '을(를) 토벌했습니다.';
    document.getElementById('overReward').innerHTML = (already
      ? '<div class="raid-result-rew owned">이미 보유한 장수입니다 — <b>' + rew.name + '</b></div>'
      : '<div class="raid-result-rew">🎁 전용 장수 <b>' + rew.name + '</b> <span class="rar-' + rew.rarity + '">' + rew.rarity + '</span> 획득!<br><small>삼국 영웅전에서 합류합니다</small></div>') + goldHtml;
    document.getElementById('overModal').hidden = false;
  }
  function loseRaid() {
    var c = combat; if (c.over) return; c.over = true;
    TCG.sfx('lose');
    document.getElementById('overTitle').textContent = '💀 주공 전사';
    document.getElementById('overText').textContent = c.boss.name + '에게 패배했습니다. 덱을 보강해 다시 도전하세요!';
    document.getElementById('overReward').innerHTML = '';
    document.getElementById('overModal').hidden = false;
  }
  document.getElementById('overAgain').addEventListener('click', function () {
    document.getElementById('overModal').hidden = true; combat = null; renderSelect();
  });

  /* ---------- 장수 / 장비 / 도감 (영웅전과 공유 데이터) ---------- */
  function lsArr(k) { try { var a = JSON.parse(lsGet(k) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function midBossInfoByHid(hid) {
    for (var m = 0; m < HW_MID_BOSSES.length; m++) {
      var pair = HW_MID_BOSSES[m];
      for (var i = 0; i < pair.length; i++) { if (pair[i].hid === hid) return { main: m, idx: i }; }
    }
    return null;
  }
  function heroPath(d) {
    if (HW_STARTERS.indexOf(d.id) !== -1) return '🏳️ 시작 장수 (처음부터 보유)';
    if (d.exclusive === 'qb') return '🃏 히어로즈 블러드 3연승 보상';
    if (d.exclusive === 'raid') {
      var rb = null; HW_RAID.bosses.forEach(function (b) { if (b.reward === d.id) rb = b; });
      return '👹 삼국 대장전 — ' + (rb ? HW_COMMANDERS[rb.key].name : '적장') + ' 격파 보상 (대장전에서만 획득)';
    }
    if (d.exclusive === 'special') return '🐎 화웅(첫 적장)을 주공 풀 HP로 격파 또는 노멀 모드 천하통일';
    if (d.exclusive === 'mid') {
      var mi = midBossInfoByHid(d.id);
      if (mi) {
        var stage = HW_STAGES[mi.main] ? HW_STAGES[mi.main].name : '';
        return '⚜ ' + stage + ' ' + (mi.idx === 0 ? '5출진' : '10출진') + ' 중간보스 — ' + (mi.idx === 0 ? '노멀' : '하드') + ' 난이도에서 격파 시 습득';
      }
      return '⚜ 중간보스 격파 보상';
    }
    return '⚔️ 전투 보상 영입 · 🏮 주막 영입';
  }
  function weaponPath(w) { return w.exclusive === 'collection' ? '📕 장수 컬렉션 100% 완료 보상' : '💎 보물상자(출진 5·10회) · 🏪 상점'; }
  function relicPath(r) { return r.exclusive === 'qb' ? '🃏 히어로즈 블러드 10연승 보상 (1회)' : '👑 영웅전 메인 적장 격파 보상 · 💎 보물 발견 이벤트(메인 전역당 ~10% 등장)'; }
  /* ---------- 정렬(도감·출진 덱 편성) ---------- */
  function rarityRank(r) { return ({ C: 0, R: 1, SR: 2, SSR: 3 })[r] || 0; }
  var codexSort = { key: 'rarity', dir: 'desc' };  // 도감 기본: 등급 내림차순
  var rosterSort = { key: 'acquire', dir: 'asc' };  // 수집/덱: 기본 습득순
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
    var idx = {}; party.forEach(function (h, i) { idx[h.uid] = i; }); // 습득 순서 = party 인덱스
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
  function renderRosterGrid() {
    var inDeck = {}; deck.forEach(function (u) { inDeck[u] = true; });
    var rt = document.getElementById('rosterTitleCount'); if (rt) rt.textContent = '· 출진 덱 ' + deck.length + ' / ' + MAX_DECK + ' (최소 ' + deckMin() + ')';
    document.getElementById('rosterCount').textContent = party.length;
    document.getElementById('rosterGrid').innerHTML = sortPartyList(party, rosterSort).map(function (h) {
      var ws = heroWpns(h).map(function (w) { return w.emoji; }).join('');
      var on = !!inDeck[h.uid];
      return '<div class="col-card deck-pick' + (on ? ' in-deck' : '') + '" data-uid="' + h.uid + '">' +
        '<span class="deck-check">' + (on ? '✓' : '+') + '</span>' +
        TCG.portrait(h.def.emoji, h.def.id, '', h.def.name) +
        '<div class="col-name">' + h.def.name + '</div>' +
        '<div class="col-rar rar-' + h.def.rarity + '">' + h.def.rarity + ' · ⚔' + effAtk(h) + (ws ? ' ' + ws : '') + '</div></div>';
    }).join('') || '<p class="screen-sub">장수가 없습니다</p>';
    paintSortBar('rosterSort', rosterSort);
  }
  function toggleDeck(uid) {
    var i = deck.indexOf(uid);
    if (i >= 0) {
      if (deck.length <= deckMin()) { TCG.toast('출진 덱은 최소 ' + deckMin() + '장이어야 합니다'); return; }
      deck.splice(i, 1);
    } else {
      if (deck.length >= MAX_DECK) { TCG.toast('출진 덱은 최대 ' + MAX_DECK + '장입니다'); return; }
      deck.push(uid);
    }
    TCG.sfx('tap'); saveDeck(); renderRosterGrid();
  }
  function openRoster() {
    TCG.sfx('tap');
    saveDeck(); // 보유<10이면 자동 채움 등 정규화 후 표시
    renderRosterGrid();
    document.getElementById('rosterModal').hidden = false;
  }
  function openGear() {
    TCG.sfx('tap');
    var map = {};
    party.forEach(function (h) { heroWpns(h).forEach(function (w) { (map[w.id] = map[w.id] || { w: w, who: [] }).who.push(h.def.name); }); });
    var keys = Object.keys(map);
    document.getElementById('gearList').innerHTML = keys.length ? keys.map(function (id) {
      var e = map[id];
      return '<div class="gear-row"><div class="gear-emoji">' + e.w.emoji + '</div><div class="gear-info">' +
        '<div class="gear-name">' + e.w.name + '</div><div class="gear-desc">' + e.w.desc + ' · 착용: ' + e.who.join(', ') + '</div></div></div>';
    }).join('') : '<p class="screen-sub">장착한 장비가 없습니다</p>';
    document.getElementById('gearModal').hidden = false;
  }
  function renderHeroCodex() {
    var col = lsArr('hw_collected_heroes');
    document.getElementById('heroColTitle').textContent = '(' + col.length + ' / ' + HW_HEROES.length + ')';
    document.getElementById('heroColGrid').innerHTML = sortDefList(HW_HEROES, codexSort).map(function (d) {
      var got = col.indexOf(d.id) !== -1;
      return '<div class="col-card' + (got ? '' : ' locked') + '" data-id="' + d.id + '">' + TCG.portrait(d.emoji, d.id, '', d.name) +
        '<div class="col-name">' + d.name + '</div><div class="col-rar rar-' + d.rarity + '">' + d.rarity + ' · ' + d.cls + '</div>' +
        (got ? '' : '<div class="col-lock">🔒</div>') + '</div>';
    }).join('');
    paintSortBar('heroColSort', codexSort);
    document.getElementById('heroColDetail').innerHTML = '👆 장수를 선택하면 <b>능력치·획득 경로</b>가 표시됩니다';
  }
  function renderWeaponCodex() {
    var col = lsArr('hw_collected_weapons');
    document.getElementById('weaponColTitle').textContent = '(' + col.length + ' / ' + HW_WEAPONS.length + ')';
    document.getElementById('weaponColList').innerHTML = HW_WEAPONS.map(function (w) {
      var got = col.indexOf(w.id) !== -1;
      return '<div class="gear-row col-pick' + (got ? '' : ' locked') + '" data-id="' + w.id + '"><div class="gear-emoji">' + w.emoji + '</div><div class="gear-info">' +
        '<div class="gear-name">' + w.name + (got ? '' : ' 🔒') + '</div><div class="gear-desc">' + w.desc + '</div></div></div>';
    }).join('');
    document.getElementById('weaponColDetail').innerHTML = '👆 장비를 선택하면 <b>획득 경로</b>가 표시됩니다';
  }
  function renderRelicCodex() {
    var col = lsArr('hw_collected_relics');
    document.getElementById('relicColTitle').textContent = '(' + col.length + ' / ' + HW_RELICS.length + ')';
    document.getElementById('relicColList').innerHTML = HW_RELICS.map(function (r) {
      var got = col.indexOf(r.id) !== -1;
      return '<div class="gear-row col-relic-pick' + (got ? '' : ' locked') + '" data-id="' + r.id + '"><div class="gear-emoji">' + r.emoji + '</div><div class="gear-info">' +
        '<div class="gear-name">' + r.name + (got ? '' : ' 🔒') + '</div><div class="gear-desc">' + r.desc + '</div></div></div>';
    }).join('');
    document.getElementById('relicColDetail').innerHTML = '👆 유물을 선택하면 <b>효과·획득 경로</b>가 표시됩니다';
  }
  function showCodexTab(tab) {
    document.getElementById('codexHeroPanel').hidden = tab !== 'hero';
    document.getElementById('codexWeaponPanel').hidden = tab !== 'weapon';
    document.getElementById('codexRelicPanel').hidden = tab !== 'relic';
    document.getElementById('codexTabHero').classList.toggle('active', tab === 'hero');
    document.getElementById('codexTabWeapon').classList.toggle('active', tab === 'weapon');
    document.getElementById('codexTabRelic').classList.toggle('active', tab === 'relic');
  }
  function openCodex(tab) { TCG.sfx('tap'); renderHeroCodex(); renderWeaponCodex(); renderRelicCodex(); showCodexTab(tab || 'hero'); document.getElementById('codexModal').hidden = false; }
  document.getElementById('rosterBtn').addEventListener('click', openRoster);
  document.getElementById('rosterSort').addEventListener('click', function (e) { var b = e.target.closest('.sort-btn'); if (!b) return; TCG.sfx('tap'); applySortClick(rosterSort, b.dataset.sort); renderRosterGrid(); });
  document.getElementById('heroColSort').addEventListener('click', function (e) { var b = e.target.closest('.sort-btn'); if (!b) return; TCG.sfx('tap'); applySortClick(codexSort, b.dataset.sort); renderHeroCodex(); });
  document.getElementById('rosterGrid').addEventListener('click', function (e) {
    var card = e.target.closest('.deck-pick'); if (!card) return;
    toggleDeck(card.dataset.uid);
  });
  document.getElementById('gearBtn').addEventListener('click', openGear);
  document.getElementById('codexBtn').addEventListener('click', function () { openCodex('hero'); });
  document.getElementById('codexTabHero').addEventListener('click', function () { TCG.sfx('tap'); showCodexTab('hero'); });
  document.getElementById('codexTabWeapon').addEventListener('click', function () { TCG.sfx('tap'); showCodexTab('weapon'); });
  document.getElementById('codexTabRelic').addEventListener('click', function () { TCG.sfx('tap'); showCodexTab('relic'); });
  function showCodexDetail(html) {
    document.getElementById('codexDetailBody').innerHTML = html;
    document.getElementById('codexDetailModal').hidden = false;
    TCG.sfx('tap');
  }
  document.getElementById('relicColList').addEventListener('click', function (e) {
    var c = e.target.closest('.col-relic-pick'); if (!c) return;
    var r = HW_RELICS.find(function (x) { return x.id === c.dataset.id; }); if (!r) return;
    var got = lsArr('hw_collected_relics').indexOf(r.id) !== -1;
    showCodexDetail(
      '<b>' + r.emoji + ' ' + r.name + '</b> · ' + (got ? '<span class="cd-got">보유 중</span>' : '<span class="cd-no">미보유</span>') +
      '<br><span class="cd-sub">' + r.desc + '</span>' +
      '<br><span class="cd-path">획득 경로: ' + relicPath(r) + '</span>');
  });
  document.getElementById('heroColGrid').addEventListener('click', function (e) {
    var c = e.target.closest('.col-card'); if (!c || !c.dataset.id) return;
    var d = HW_BY_ID[c.dataset.id]; if (!d) return;
    var got = lsArr('hw_collected_heroes').indexOf(d.id) !== -1, slots = slotsForRarity(d.rarity);
    showCodexDetail(
      '<b>' + d.emoji + ' ' + d.name + '</b> <span class="rar-' + d.rarity + '">' + d.rarity + '</span> · ' + (got ? '<span class="cd-got">보유 중</span>' : '<span class="cd-no">미보유</span>') +
      '<br><span class="cd-sub">' + d.cls + ' · ❤️ HP ' + d.hp + ' · ⚔️ 공격 ' + d.atk + ' · 🗡️ 무기 슬롯 ' + slots + '</span>' +
      '<br><span class="cd-sub">✨ ' + d.skill.name + ' (MP ' + d.skill.cost + '): ' + d.skill.desc + '</span>' +
      '<br><span class="cd-path">획득 경로: ' + heroPath(d) + '</span>');
  });
  document.getElementById('weaponColList').addEventListener('click', function (e) {
    var c = e.target.closest('.col-pick'); if (!c) return;
    var w = HW_WEAPON_BY_ID[c.dataset.id]; if (!w) return;
    var got = lsArr('hw_collected_weapons').indexOf(w.id) !== -1;
    showCodexDetail(
      '<b>' + w.emoji + ' ' + w.name + '</b> · ' + (got ? '<span class="cd-got">보유 중</span>' : '<span class="cd-no">미보유</span>') +
      '<br><span class="cd-sub">' + w.desc + '</span>' +
      '<br><span class="cd-sub">💰 가치 ' + weaponCost(w) + ' 골드</span>' +
      '<br><span class="cd-path">획득 경로: ' + weaponPath(w) + '</span>');
  });
  (function () {
    var dm = document.getElementById('codexDetailModal');
    document.getElementById('codexDetailClose').addEventListener('click', function () { dm.hidden = true; });
    dm.addEventListener('click', function (e) { if (e.target === dm) dm.hidden = true; });
  })();
  [['rosterClose', 'rosterModal'], ['gearClose', 'gearModal']].forEach(function (p) {
    document.getElementById(p[0]).addEventListener('click', function () { document.getElementById(p[1]).hidden = true; });
    document.getElementById(p[1]).addEventListener('click', function (e) { if (e.target.id === p[1]) e.currentTarget.hidden = true; });
  });
  // 도감은 전체 페이지 — 상단 '이전' 버튼으로 이전 화면 복귀
  document.getElementById('codexBack').addEventListener('click', function () { TCG.sfx('tap'); document.getElementById('codexModal').hidden = true; });
  document.getElementById('bossModal').addEventListener('click', function (e) { if (e.target.id === 'bossModal') e.currentTarget.hidden = true; });

  /* ---------- boot ---------- */
  TCG.initFloatMenu();
  var muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.textContent = TCG.isMuted() ? '🔇 소리' : '🔊 소리';
    muteBtn.addEventListener('click', function () { var m = TCG.toggleMute(); muteBtn.textContent = m ? '🔇 소리' : '🔊 소리'; TCG.audioResume(); if (!m) TCG.sfx('tap'); });
  }
  renderSelect();
})();
