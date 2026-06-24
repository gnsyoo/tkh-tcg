/* ===== 삼국 대장전 (레이드) — 영웅전 덱 공유, 거대 보스 격파로 전용 장수 획득 ===== */
(function () {
  var diff = TCG.getDifficulty();
  var DCFG = HW_DIFF[diff];
  var combat = null;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- 공유 덱(영웅전 파티) ---------- */
  function slotsForRarity(r) { return r === 'SSR' ? 3 : r === 'SR' ? 2 : r === 'R' ? 1 : 0; }
  var RAR_BG = { C: '#9aa0a6', R: '#5aa6ff', SR: '#c77bff', SSR: '#f0c33c' };
  function rarBg(r) { return RAR_BG[r] || '#9aa0a6'; }
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
      (bonus ? ' <span style="color:#8effb0;font-weight:700">(' + TCG.t('dx.itemBonus', { n: bonus }) + ')</span>' : '') + '</b></div>';
  }
  function dSectionHead(t) { return '<div style="text-align:left;font-size:12px;color:var(--gold);font-weight:800;margin:12px 2px 5px">' + t + '</div>'; }
  function showRelicsInfo() { // 추가 능력 — 영웅전과 동일(wr-pop relicModal)
    var rs = relics || [];
    var inRun = {}; rs.forEach(function (r) { inRun[r.id] = true; });
    var evadePct = Math.round(lordEvade() * 100);
    var critPct = Math.round((BASE_CRIT + relicSum('crit')) * 100);
    var sum = '<div class="wr-relic-sum"><div class="rs-h">👑 ' + TCG.t('dx.lordAppliedStats') + '</div><div class="rs-grid">' +
      '<div class="rs-cell"><span>❤️</span><small>' + TCG.t('dx.maxHp') + '</small><b style="color:#7ef0b5">' + lordMaxHp() + '</b></div>' +
      '<div class="rs-cell"><span>🔷</span><small>' + TCG.t('dx.maxMp') + '</small><b style="color:#9fd4ff">' + lordMaxMp() + '</b></div>' +
      '<div class="rs-cell"><span>💨</span><small>' + TCG.t('dx.evadeRate') + '</small><b style="color:var(--ink)">' + evadePct + '%</b></div>' +
      '<div class="rs-cell"><span>🎯</span><small>' + TCG.t('dx.critRate') + '</small><b style="color:#ffb37e">' + critPct + '%</b></div>' +
      '</div></div>';
    var list = HW_RELICS.map(function (r) {
      var on = !!inRun[r.id];
      return '<div class="wr-relic-row' + (on ? '' : ' off') + '">' +
        '<div class="rr-ico">' + r.emoji + '</div>' +
        '<div class="rr-info"><div class="rr-name">' + r.name + '</div><div class="rr-desc">' + r.desc + '</div></div>' +
        '<span class="rr-chk" style="color:' + (on ? 'var(--gold)' : 'var(--ink-dim)') + '">' + (on ? '✦' : '🔒') + '</span></div>';
    }).join('');
    if (!rs.length) list = '<div class="wr-relic-empty">' + TCG.t('dx.noRelics') + '</div>' + list;
    var tc = document.getElementById('relicTitleCount'); if (tc) tc.textContent = rs.length + '/' + HW_RELICS.length;
    document.getElementById('relicBody').innerHTML = sum + list;
    document.getElementById('relicModal').hidden = false;
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
    if (it.kind === 'hp') { if (L.hp >= L.maxHp) { TCG.toast(TCG.t('dx.hpFull')); return false; } L.hp = Math.min(L.maxHp, L.hp + it.val); fxSupport(lordEl(), '+' + it.val, '#7ef0b5'); logMsg('🧪 ' + TCG.t('dx.itemHpLog', { n: it.val })); }
    else if (it.kind === 'mp') { if (L.mp >= L.maxMp) { TCG.toast(TCG.t('dx.mpFull')); return false; } L.mp = Math.min(L.maxMp, L.mp + it.val); fxSupport(lordEl(), '💧+' + it.val, '#9fd2ff'); logMsg('💧 ' + TCG.t('dx.itemMpLog', { n: it.val })); }
    else if (it.kind === 'atk') { c.tempAtk = { val: it.val, turns: it.turns }; fxSupport(lordEl(), '⚔+' + it.val, '#ffd86b'); logMsg('🍷 ' + TCG.t('dx.itemAtkLog', { t: it.turns, n: it.val })); }
    else if (it.kind === 'shield') { L.block += it.val; fxSupport(lordEl(), '🛡+' + it.val, '#9fd2ff'); logMsg('🛡️ ' + TCG.t('dx.itemShieldLog', { n: it.val })); }
    else if (it.kind === 'cure_poison' || it.kind === 'cure_confuse') { TCG.toast(TCG.t('dx.noStatusToCure')); return false; }
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
    var c = combat; if (!c || c.phase === 'enemy' || c.targeting || c.busy || c.lordStun > 0) return;
    if (c.itemUsed) { TCG.toast(TCG.t('dx.itemAlreadyUsed')); return; }
    var idx = parseInt(b.dataset.i, 10), it = HW_CONS_BY_ID[items[idx]]; if (!it) return;
    TCG.sfx('tap'); askItemConfirm(idx, it); // 아이콘만 보고 잘못 누르는 것 방지 — 확인 후 사용
  });
  (function () {
    var modal = document.getElementById('itemConfirm'); if (!modal) return;
    function close() { modal.hidden = true; pendingItemIdx = -1; }
    document.getElementById('itemConfirmNo').addEventListener('click', function () { TCG.sfx('tap'); close(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.getElementById('itemConfirmYes').addEventListener('click', function () {
      var c = combat; modal.hidden = true;
      if (pendingItemIdx < 0 || !c || c.phase === 'enemy' || c.targeting || c.busy || c.lordStun > 0 || c.itemUsed) { pendingItemIdx = -1; return; }
      var it = HW_CONS_BY_ID[items[pendingItemIdx]]; if (!it) { pendingItemIdx = -1; return; }
      if (!applyItem(it)) { pendingItemIdx = -1; return; }
      items.splice(pendingItemIdx, 1); c.itemUsed = true; pendingItemIdx = -1; TCG.sfx('heal'); saveItems(); renderCombat();
    });
  })();

  /* ---------- stat/weapon helpers (영웅전과 동일 규칙) ---------- */
  function heroWpnIds(h) { return (h && h.weapons) ? h.weapons : []; }
  function heroWpns(h) { return heroWpnIds(h).map(function (id) { return HW_WEAPON_BY_ID[id]; }).filter(Boolean); }
  function wpnVal(h, key) { return heroWpns(h).reduce(function (s, w) { return s + (w.effect[key] || 0); }, 0); }
  function hasWpnFlag(h, key) { return heroWpns(h).some(function (w) { return !!w.effect[key]; }); }
  function effAtk(h) { var c = combat; return h.atk + wpnVal(h, 'atk') + (c ? (c.atkBuff || 0) + ((c.tempAtk && c.tempAtk.turns > 0) ? c.tempAtk.val : 0) + ((c.cardBuff && h.uid && c.cardBuff[h.uid]) ? c.cardBuff[h.uid] : 0) : 0); }
  function lordMaxHp() { return HW_LORD.hp + party.reduce(function (s, h) { return s + wpnVal(h, 'lordHp'); }, 0) + relicSum('maxHp'); }
  function lordMaxMp() { return HW_LORD.mp + party.reduce(function (s, h) { return s + wpnVal(h, 'lordMp'); }, 0) + relicSum('maxMp'); }
  function skillMp(sk) { var m = 2 + (sk.cost || 1); var base = (sk.type === 'buff' && sk.scope === 'army') ? m * 5 : m + 3; return Math.max(1, base - 1); } // 전반 -1(전군 버프 포함)
  var BASE_CRIT = 0.01;
  var BOSS_CRIT = 0.15; // 대장전 보스 치명타 확률(최소 15%)
  var CRIT_MULT = 1.5;  // 대장전 치명타 데미지 배수(영웅전 2배 → 대장전 1.5배)
  function lordCritSum() { return party.reduce(function (s, h) { return s + wpnVal(h, 'lordCrit'); }, 0); } // 전국옥새 등: 주공(전 영웅) 치명타
  function critChance(h) { return Math.min(0.5, BASE_CRIT + wpnVal(h, 'crit') + lordCritSum() + relicSum('crit')) * 0.5; } // 대장전: 치명타 확률 50% 감소
  function rollCrit(c) { return Math.random() < c; }
  // 속성 상성: 아군(h) → 적(e) 데미지 배수(대장전은 raid=true → ×1.25/×0.8)
  function affOf(h, e) { return affMult(elemOf(h.def), elemOf((e && e.def) || e), true); }
  function affFx(el, af) { if (af === 1 || !el) return; var p = rectOf(el); if (!p) return; fxFloat(p.x, p.y - 38, TCG.t(af > 1 ? 'cmb.superEff' : 'cmb.weakEff'), af > 1 ? '#7ef0b5' : '#9fb6c4', true); }
  function defenseOf(h) { return 3 + Math.floor(effAtk(h) / 3); }
  function heroByUid(uid) { return party.find(function (h) { return h.uid === uid; }); }
  function weaponSlots(h) { return h && h.def ? slotsForRarity(h.def.rarity) : 0; } // 장착 수: C=0·R=1·SR=2·SSR=3
  function freeWeaponIds() { // 보유 무기 중 어느 장수에게도 장착되지 않은 것
    var owned = (SAVE.weapons || []).slice();
    party.forEach(function (h) { heroWpnIds(h).forEach(function (wid) { var i = owned.indexOf(wid); if (i !== -1) owned.splice(i, 1); }); });
    return owned;
  }
  function saveParty() { // 장수 무기 장착 상태를 공유 저장(hw_save가 있을 때만)
    try {
      var raw = lsGet('hw_save'); if (!raw) return; var d = JSON.parse(raw); if (!d || !Array.isArray(d.party)) return;
      var byUid = {}; party.forEach(function (h) { byUid[h.uid] = h; });
      d.party.forEach(function (ph) { var h = byUid[ph.uid]; if (h) ph.weapons = heroWpnIds(h).slice(); });
      lsSet('hw_save', JSON.stringify(d));
    } catch (e) {}
  }

  /* ---------- 대장전 전용 스킬 치환 (보스가 면역인 혼란→계책 / 매혹→구휼) ---------- */
  var RAID_SUB_CONFUSE = { name:TCG.t('dx.skStratagem'), cost:2, type:'buff', val:5, target:'ally', desc:TCG.t('dx.skStratagemDesc') };
  var RAID_SUB_CHARM   = { name:TCG.t('dx.skRelief'), cost:1, type:'heal', val:12, target:'lowestAlly', desc:TCG.t('dx.skReliefDesc') };
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
  function skillKindLabel(t) { return (t === 'shield') ? TCG.t('dx.kindDefend') : (t === 'heal') ? TCG.t('dx.kindHeal') : (t === 'confuse' || t === 'charm') ? TCG.t('dx.kindStun') : (t === 'cardstun') ? TCG.t('dx.kindCardStun') : TCG.t('dx.kindAttack'); }
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
    cmd_xiahoudun:  { name: TCG.t('dx.exIronCharge'), type: 'strike',   val: 14, cost: 2 },
    cmd_caocao:     { name: TCG.t('dx.exWeiKingAwe'), type: 'cardstun', val: 1,  cost: 3 },
    cmd_xiahouyuan: { name: TCG.t('dx.exVolley'), type: 'multi',    val: 3,  cost: 2 },
    cmd_luxun:      { name: TCG.t('dx.exChainBlaze'), type: 'aoe',      val: 18, cost: 3 },
    cmd_simayi:     { name: TCG.t('dx.exMindDisrupt'), type: 'cardstun', val: 1,  cost: 3 },
    cmd_simayan:    { name: TCG.t('dx.exUnifyCannon'), type: 'strike',  val: 18, cost: 3 }
  };
  function raidBossSkills(b) { // 레이드 보스 스킬(하후돈부터 3종)
    var s = (HW_COMMANDERS[b.key].skills || []).slice();
    if (RAID_EXTRA_SKILLS[b.key]) s.push(RAID_EXTRA_SKILLS[b.key]);
    return s;
  }
  function raidBossAtk(cmd, idx) { // 공격력 = (기본 × 배수 + 레이드 순번 × 2) × 1.3 × 1.5(상향)
    return Math.round((Math.max(2, Math.round(cmd.atk * HW_RAID.atkMult * DCFG.eAtk)) + (idx + 1) * 2) * 1.3 * 1.5);
  }
  function raidBossHp(cmd) { return Math.round(cmd.hp * HW_RAID.hpMult * 1.1) + 50; } // HP +10% 후 +50 상향
  // 하후돈(레이드 3번째)부터 보스 양옆에 등장하는 졸병 1~2기
  var RAID_ADD_TYPES = [ { id: 'foe_inf', name: TCG.t('dx.addInfantry'), emoji: '🪖' }, { id: 'foe_arc', name: TCG.t('dx.addArcher'), emoji: '🏹' }, { id: 'foe_spr', name: TCG.t('dx.addSpear'), emoji: '🛡️' } ];
  function makeRaidAdds(idx, bossHp, bossAtk) {
    if (idx < 2) return [];
    var count = 1 + ((Math.random() < (idx >= 4 ? 0.8 : 0.45)) ? 1 : 0); // 한두 명
    var hp = Math.max(8, Math.round(bossHp * 0.06)), atk = Math.max(2, Math.round(bossAtk * 0.35));
    var adds = [];
    for (var i = 0; i < count; i++) {
      var t = RAID_ADD_TYPES[Math.floor(Math.random() * RAID_ADD_TYPES.length)];
      adds.push({ id: t.id, name: t.name, emoji: t.emoji, maxHp: hp, hp: hp, atk: atk, block: 0, poison: 0 });
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
    if (window.BGMEngine) BGMEngine.play(id === 'combatScreen' ? 'daejang' : 'heroes_lobby');
  }

  function renderSelect() {
    // 헤더 칩 — 금화 / 장수 수 / 장비 수(영웅전과 공유: hw_save)
    var goldEl = document.getElementById('raidGold'); if (goldEl) goldEl.textContent = SAVE.gold || 0;
    var rc = document.getElementById('rosterCount'); if (rc) rc.textContent = party.length;
    var gearEl = document.getElementById('raidGear'); if (gearEl) gearEl.textContent = (SAVE.weapons || []).length;
    // 주공 상태 — 👑 + HP/MP 바 + ✨추가 능력
    var ls = document.getElementById('raidLordStatus');
    if (ls) {
      var mhp = lordMaxHp(), mmp = lordMaxMp();
      var lhp = (typeof SAVE.lordHp === 'number') ? Math.min(SAVE.lordHp, mhp) : mhp;
      var lmp = (typeof SAVE.lordMp === 'number') ? Math.min(SAVE.lordMp, mmp) : mmp;
      var hpPct = Math.max(0, Math.min(100, Math.round(lhp / mhp * 100)));
      var mpPct = Math.max(0, Math.min(100, Math.round(lmp / Math.max(1, mmp) * 100)));
      ls.innerHTML =
        '<div class="rl-av">👑</div>' +
        '<div class="rl-bars">' +
          '<div class="rl-bar"><span class="rl-l hp">HP</span><div class="rl-track"><i class="hp" style="width:' + hpPct + '%"></i></div><span class="rl-v">' + lhp + '/' + mhp + '</span></div>' +
          '<div class="rl-bar"><span class="rl-l mp">MP</span><div class="rl-track"><i class="mp" style="width:' + mpPct + '%"></i></div><span class="rl-v">' + lmp + '/' + mmp + '</span></div>' +
        '</div>' +
        '<button class="rl-relic relic-pick" title="' + TCG.t('camp.bonus') + '"><span class="rl-rico">✨</span><span class="rl-rl">' + TCG.t('camp.bonus') + '</span></button>';
    }
    var html = HW_RAID.bosses.map(function (b, i) {
      var cmd = HW_COMMANDERS[b.key];
      var rew = HW_BY_ID[b.reward];
      var done = isCleared(b.key);
      var got = collected(b.reward);
      // 순차 진행: 첫 보스이거나 이전 보스를 격파해야 도전 가능
      var unlocked = (i === 0) || isCleared(HW_RAID.bosses[i - 1].key);
      var hp = Math.round(cmd.hp * HW_RAID.hpMult);
      var rc2 = rarBg(rew.rarity);
      var face = unlocked ? bossFace(cmd, 'rc-art') : TCG.portrait('❓', b.key, 'rc-art');
      var lockov = unlocked ? '' : '<div class="rc-lockov">🔒</div>';
      var clearedBadge = done ? '<span class="rc-cleared">✔ ' + TCG.t('dx.cleared') + '</span>' : '';
      var btn = unlocked
        ? '<button class="raid-go rc-go primary" data-i="' + i + '">⚔️ ' + (done ? TCG.t('dx.retry') : TCG.t('dx.challenge')) + '</button>'
        : '<button class="raid-go rc-go locked" data-i="' + i + '" disabled>🔒 ' + TCG.t('dx.needPrevBoss') + '</button>';
      return '<div class="raid-card' + (done ? ' done' : '') + (unlocked ? '' : ' locked') + '" data-i="' + i + '">' +
        '<div class="rc-row">' +
          '<div class="rc-face">' + face + lockov + '</div>' +
          '<div class="rc-info">' +
            '<div class="rc-name"><b>' + (unlocked ? cmd.name : '???') + '</b>' + clearedBadge + '</div>' +
            '<div class="rc-title">' + b.title + '</div>' +
            '<div class="rc-meta"><span class="rc-hp">❤ ' + hp + '</span>' +
              '<span class="rc-rew">🎁 ' + (unlocked ? rew.name : '???') + '</span>' +
              '<span class="rc-rar" style="background:' + rc2 + '">' + rew.rarity + '</span>' +
              (got ? '<span class="raid-owned">' + TCG.t('dx.owned') + '</span>' : '') + (cmd.aoe ? '<span class="rc-aoe">' + TCG.t('dx.aoe') + '</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' + btn +
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
      if (!raidUnlocked(bi)) { TCG.toast(TCG.t('dx.beatPrevFirst')); return; }
      TCG.sfx('tap'); startRaid(bi); return;
    }
    var card = e.target.closest('.raid-card'); if (!card) return; // 카드 본문 탭 → 보스 정보
    var i = parseInt(card.dataset.i, 10);
    if (!raidUnlocked(i)) { TCG.toast(TCG.t('dx.beatPrevFirst')); return; }
    showBossInfo(i);
  });
  function showBossInfo(i) {
    var b = HW_RAID.bosses[i], cmd = HW_COMMANDERS[b.key], rew = HW_BY_ID[b.reward];
    var hp = raidBossHp(cmd), atk = raidBossAtk(cmd, i);
    var got = collected(b.reward), done = isCleared(b.key);
    var skills = raidBossSkills(b);
    var skillsHtml = skills.map(function (s) {
      var d = (s.type === 'heal' ? TCG.t('dx.skHeal', { n: s.val }) : s.type === 'shield' ? TCG.t('dx.skShield', { n: s.val }) : (s.type === 'confuse' || s.type === 'charm') ? TCG.t('dx.skLordStun', { n: (s.val || 1) }) : s.type === 'cardstun' ? TCG.t('dx.skCardStun', { n: (s.val || 1) }) : TCG.t('dx.skPower', { n: s.val }));
      return '<div class="bi2-skill"><b>「' + s.name + '」</b> <span>' + d + '</span></div>';
    }).join('');
    document.getElementById('bossModalBody').innerHTML =
      '<div class="bi2-head">' + bossFace(cmd, 'bi2-face') +
        '<button class="bi2-x" data-bclose aria-label="' + TCG.t('dx.close') + '">✕</button>' +
        '<span class="bi2-tag">' + TCG.t('dx.raidBoss') + '</span></div>' +
      '<div class="bi2-body">' +
        '<div class="bi2-name"><b>' + cmd.name + '</b><small>' + b.title + (done ? ' · ' + TCG.t('dx.defeated') : '') + ' · ' + (HW_ELEM_ICON[elemOf(cmd)] || '') + ' ' + TCG.t('el.' + elemOf(cmd)) + ' (' + TCG.t('el.weakTo') + ' ' + (HW_ELEM_ICON[elemWeakTo(elemOf(cmd))] || '') + ')</small></div>' +
        '<div class="bi2-stats">' +
          '<div class="bi2-stat hp"><div class="lbl">' + TCG.t('dx.hpLabel') + '</div><div class="val">❤ ' + hp + '</div></div>' +
          '<div class="bi2-stat atk"><div class="lbl">' + TCG.t('dx.atkLabel') + '</div><div class="val">⚔ ' + atk + '</div></div>' +
        '</div>' +
        '<div class="bi2-sec purple">👹 ' + TCG.t('dx.bossSkills') + (cmd.aoe ? ' · 💥 ' + TCG.t('dx.aoe') : '') + (i >= 2 ? ' · 🪖 ' + TCG.t('dx.withAdds') : '') + '</div>' +
        '<div class="bi2-skills">' + skillsHtml + '</div>' +
        '<div class="bi2-sec gold">🎁 ' + TCG.t('dx.clearReward') + '</div>' +
        '<div class="bi2-reward">' + TCG.t('dx.exclusiveOfficer') + ' <b>' + rew.name + '</b> <span class="bi2-rar" style="background:' + rarBg(rew.rarity) + '">' + rew.rarity + '</span>' + (got ? '<span class="bi2-owned">' + TCG.t('dx.ownedGoldOnRetry') + '</span>' : '') + '</div>' +
        '<button class="bi2-go" data-bgo="' + i + '">⚔️ ' + (done ? TCG.t('dx.retry') : TCG.t('dx.challenge')) + '</button>' +
      '</div>';
    document.getElementById('bossModal').hidden = false;
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
    var bmp = Math.max(0, bc.mp - 20) + 10 + 10; // 대장전 레이드 보스 MP -20 후 +10, 추가 +10 상향
    combat = {
      raidIdx: idx, boss: { def: cmd, name: cmd.name, emoji: cmd.emoji, maxHp: hp, hp: hp, atk: atk, atk0: atk, aoe: !!cmd.aoe, block: 0, armor: Math.min(15, idx * 2), poison: 0, charmed: 0, stunned: 0, intent: null,
        skills: raidBossSkills(b), mp: bmp, maxMp: bmp, skillChance: bc.skillChance * 0.8 }, // 스킬 사용 빈도 약 20% 감소
      adds: makeRaidAdds(idx, hp, atk), tgtIdx: 0,
      round: 0, lord: { hp: mhp, maxHp: mhp, mp: mmp, maxMp: mmp, block: relicSum('startBlock') }, atkBuff: relicSum('startAtk'), lordStun: 0,
      draw: TCG.shuffle(activeDeckUids().slice()), center: [], used: [], cstat: {},
      sel: null, targeting: false, phase: 'player', log: [], over: false, itemUsed: false, tempAtk: null, cardBuff: {}
    };
    (function () { // 독항아리(유물) — 전투 시작 시 보스 중독
      var p = relicSum('startPoison');
      if (p && combat.boss.hp > 0) { combat.boss.poison = (combat.boss.poison || 0) + p; logMsg('☠ ' + TCG.t('dx.poisonJar', { name: combat.boss.name, n: p })); }
    })();
    show('combatScreen');
    fxBanner(TCG.t('cmb.raidBanner', { name: cmd.name }), 'boss', 1400); shake('big');
    logMsg(TCG.t('dx.raidStart', { title: b.title, name: cmd.name }));
    beginRound();
    if (cmd.quote) setTimeout(function () { fxQuote(bossEl(), cmd.quote, 5000); }, 1100); // 보스 등장 대사(5초)
  }

  function centerSize() { return 3 + relicSum('energy'); }
  function drawOne() {
    var c = combat;
    if (!c.draw.length) { if (!c.used.length) return false; c.draw = TCG.shuffle(c.used); c.used = []; logMsg(TCG.t('dx.deckReshuffled')); }
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
  function bossEl() { return document.querySelector('#enemyRow .raid-boss-unit') || document.querySelector('#enemyRow .unit'); }
  function lordEl() { return document.querySelector('#lordBar .lord-art'); }
  function fxHitBoss(dmg, crit) { var p = rectOf(bossEl()); if (!p) return; fxSlash(p.x, p.y); fxBurst(p.x, p.y, crit ? '#ffd34d' : '#fff'); fxParticles(p.x, p.y, crit ? 10 : 7, crit ? '#ffe89a' : '#ffc6c6'); if (crit) fxFloat(p.x, p.y - 16, TCG.t('cmb.crit'), '#ffd34d', true); fxFloat(p.x, p.y, '-' + dmg, crit ? '#ffd34d' : '#ff9a9a', true); }
  function fxHitLord(dmg, blocked, crit) { var p = rectOf(lordEl()); if (!p) return; if (blocked) fxFloat(p.x, p.y - 14, '🛡' + blocked, '#9fd2ff'); if (dmg > 0) { fxSlash(p.x, p.y); fxBurst(p.x, p.y, crit ? '#ffd34d' : '#ff6b6b'); fxParticles(p.x, p.y, 6, '#ffb0b0'); if (crit) fxFloat(p.x, p.y - 16, TCG.t('cmb.crit'), '#ffd34d', true); fxFloat(p.x, p.y, '-' + dmg, crit ? '#ffd34d' : '#ff9a9a', true); } }
  function fxSupport(el, t, color) { var p = rectOf(el); if (!p) return; fxFloat(p.x, p.y, t, color); }

  /* ---------- render ---------- */
  function renderCombat() {
    var c = combat, b = c.boss;
    var chd = document.getElementById('combatHead');
    if (chd) {
      chd.innerHTML =
        '<button class="ch-back" id="combatBack" aria-label="' + TCG.t('dx.back') + '" title="' + TCG.t('dx.toCamp') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#f0c33c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<div class="ch-info"><div class="ch-sub">' + TCG.t('cmb.raidLabel') + '</div>' +
        '<div class="ch-name">' + b.name + ' · ' + TCG.t('dx.subjugation') + '</div></div>' +
        '<div class="ch-turn"><span>' + TCG.t('cmb.turnLabel') + '</span><b>' + Math.max(1, c.round) + '</b></div>';
      var cb = document.getElementById('combatBack');
      if (cb) cb.onclick = function () {
        if (window.confirm(TCG.t('dx.confirmLeave'))) { TCG.sfx('tap'); combat = null; renderSelect(); }
      };
    }
    document.getElementById('energyBox').innerHTML = '🎴 ' + TCG.t('dx.energyHint');
    var dead = b.hp <= 0, charmed = b.charmed > 0 || b.confused > 0 || b.stunned > 0;
    var tgt = c.targeting && !dead;
    var intentTxt = (b.confused > 0) ? '💤 ' + TCG.t('dx.stConfuse') : (b.charmed > 0) ? '💤 ' + TCG.t('dx.stCharm') : (b.stunned > 0) ? '💤 ' + TCG.t('dx.stStun') : (b.intent ? (b.intent.type === 'aoe' ? '💥' + b.intent.dmg : '⚔️' + b.intent.dmg) : '');
    var pct = Math.max(0, Math.round(b.hp / b.maxHp * 100));
    var bossStatuses = (b.charmed > 0 ? '<span class="u-st charm">💗 ' + TCG.t('dx.stCharm') + ' ' + b.charmed + '</span>' : '') +
      (b.confused > 0 ? '<span class="u-st charm">💫 ' + TCG.t('dx.stConfuse') + ' ' + b.confused + '</span>' : '') +
      (b.stunned > 0 ? '<span class="u-st charm">💫 ' + TCG.t('dx.stStun') + ' ' + b.stunned + '</span>' : '') +
      (b.poison > 0 ? '<span class="u-st pois">☠ ' + TCG.t('dx.stPoison') + ' ' + b.poison + '</span>' : '');
    var bossHtml =
      '<div class="unit enemy raid-boss-unit' + (dead ? ' dead' : '') + (tgt ? ' targetable' : '') + (charmed ? ' charmed' : '') + '" data-side="enemy" data-idx="0">' +
        '<div class="u-tag boss">' + TCG.t('cmb.tagBoss') + '</div>' +
        (dead ? '' : '<div class="u-intent">' + intentTxt + '</div>') +
        (b.block > 0 ? '<div class="u-block">🛡' + b.block + '</div>' : '') +
        (b.armor > 0 ? '<div class="u-armor">🪖' + b.armor + '</div>' : '') +
        bossFace(b.def, '') +
        '<div class="u-name">' + (HW_ELEM_ICON[elemOf(b.def)] || '') + ' ' + b.name + '</div>' +
        '<div class="hpbar foe"><i style="width:' + pct + '%"></i></div>' +
        '<div class="u-stat"><span class="u-hp-text">♥ ' + Math.max(0, b.hp) + '/' + b.maxHp + '</span>' +
          (b.maxMp ? '<span class="u-mp-text">◈ ' + Math.max(0, b.mp) + '/' + b.maxMp + '</span>' : '') + '</div>' +
        (bossStatuses ? '<div class="u-statuses">' + bossStatuses + '</div>' : '') + '</div>';
    var addHtmls = (c.adds || []).map(function (a, i) {
      var adead = a.hp <= 0, atgt = c.targeting && !adead, apct = Math.max(0, Math.round(a.hp / a.maxHp * 100));
      var aStatuses = (a.stunned > 0 ? '<span class="u-st charm">💫 ' + TCG.t('dx.stStun') + ' ' + a.stunned + '</span>' : '') +
        (a.poison > 0 ? '<span class="u-st pois">☠ ' + TCG.t('dx.stPoison') + ' ' + a.poison + '</span>' : '');
      return '<div class="unit enemy raid-add' + (adead ? ' dead' : '') + (atgt ? ' targetable' : '') + (a.stunned > 0 ? ' charmed' : '') + '" data-side="enemy" data-idx="' + (i + 1) + '">' +
        (adead ? '' : '<div class="u-intent">' + (a.stunned > 0 ? '💤 ' + TCG.t('dx.stStun') : '⚔️' + a.atk) + '</div>') +
        (a.block > 0 ? '<div class="u-block">🛡' + a.block + '</div>' : '') +
        TCG.portrait(a.emoji, a.id || ('add' + i), '', a.name) +
        '<div class="u-name">' + (HW_ELEM_ICON[elemOf(a.def || a)] || '') + ' ' + a.name + '</div>' +
        '<div class="hpbar foe"><i style="width:' + apct + '%"></i></div>' +
        '<div class="u-stat"><span class="u-hp-text">♥ ' + Math.max(0, a.hp) + '/' + a.maxHp + '</span></div>' +
        (aStatuses ? '<div class="u-statuses">' + aStatuses + '</div>' : '') + '</div>';
    });
    // 보스를 가운데(3명) / 오른쪽(2명)에 배치 — 졸병 절반을 보스 앞에 둠 (data-idx는 유지되어 타겟팅 정상)
    var beforeN = Math.ceil(addHtmls.length / 2);
    document.getElementById('enemyRow').innerHTML = addHtmls.slice(0, beforeN).join('') + bossHtml + addHtmls.slice(beforeN).join('');

    var L = c.lord;
    var hp = Math.max(0, Math.round(L.hp / L.maxHp * 100)), mp = Math.max(0, Math.round(L.mp / Math.max(1, L.maxMp) * 100));
    document.getElementById('lordBar').innerHTML =
      '<div class="lord">' + TCG.portrait('👑', 'lord', 'lord-art') +
        '<div class="lord-info"><div class="lord-name">' + TCG.t('dx.lordMe') + (L.block > 0 ? ' <span class="lord-block">🛡' + L.block + '</span>' : '') + (c.lordStun > 0 ? ' <span class="lord-block" style="background:rgba(199,155,255,.3)">💫' + c.lordStun + '</span>' : '') + '</div>' +
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
    document.getElementById('drawPile').innerHTML = ds + '<div class="pile-label">' + TCG.t('dx.drawPile') + ' <b>' + c.draw.length + '</b></div>';
    var canAct = c.phase !== 'enemy' && !c.targeting && !c.busy && !(c.lordStun > 0);
    var cardsHtml = c.center.map(function (uid) {
      var h = heroByUid(uid); if (!h) return ''; var sk = raidSkill(h);
      var stunned = c.cstat && c.cstat[uid] && c.cstat[uid].stun > 0; // 보스 카드 봉쇄
      var sel = c.sel && c.sel.uid === uid; // 대상 지정 중에도 선택 강조 유지
      var cls = 'combat-card' + (sel ? ' selected' : '') + ((canAct && !stunned) ? '' : ' unplayable') + (stunned ? ' stunned' : '');
      var ws = heroWpns(h), wE = ws.map(function (w) { return w.emoji; }).join(''), wN = ws.map(function (w) { return w.name; }).join(', ');
      return '<div class="' + cls + '" data-uid="' + uid + '">' + (stunned ? '<div class="cc-status"><span class="cc-stun">💫</span></div>' : '') + TCG.portrait(h.def.emoji, h.def.id, 'cc-art', h.def.name) +
        '<div class="cc-name">' + (HW_ELEM_ICON[elemOf(h.def)] || '') + ' ' + h.def.name + '</div><div class="cc-atk">⚔' + effAtk(h) + '</div>' +
        (wE ? '<div class="cc-wpn" title="' + wN + '">' + wE + '</div>' : '') + '<div class="cc-skill">' + sk.name + '</div></div>';
    }).join('');
    document.getElementById('centerCards').innerHTML = cardsHtml ? '<div class="center-inner">' + cardsHtml + '</div>' : '<div class="center-empty">' + TCG.t('dx.noCards') + '</div>';
    var us = ''; for (var j = 0; j < Math.min(c.used.length, 5); j++) us += '<div class="pile-card used" style="--i:' + j + '"></div>';
    document.getElementById('usedPile').innerHTML = us + '<div class="pile-label">' + TCG.t('dx.usedPile') + ' <b>' + c.used.length + '</b></div>';
    var dcEl = document.getElementById('drawCount'); if (dcEl) dcEl.textContent = c.draw.length;
    var ucEl = document.getElementById('usedCount'); if (ucEl) ucEl.textContent = c.used.length;
  }
  function renderActionBar() {
    var c = combat, bar = document.getElementById('actionBar');
    if (!c.sel) { bar.hidden = true; return; }
    var h = heroByUid(c.sel.uid); if (!h) { bar.hidden = true; return; }
    var sk = raidSkill(h), mp = skillMp(sk);
    var immune = (sk.type === 'charm' || sk.type === 'confuse'); // 레이드 보스는 행동 불가(혼란·매혹) 면역
    var buffDone = sk.type === 'buff' && sk.scope === 'army' && c.buffApplied && c.buffApplied[h.uid]; // 전군 버프는 전투당 1회
    var canSkill = !immune && !buffDone && c.lord.mp >= mp;
    var mpLabel = buffDone ? TCG.t('cmb.applied') : (immune ? '🛡 ' + TCG.t('dx.immune') : ('💧' + mp));
    var skDesc = immune ? TCG.t('dx.immuneDesc') : sk.desc;
    var critPct = Math.round(critChance(h) * 100);
    var atkSel = c.targeting && c.pendKind === 'attack', skSel = c.targeting && c.pendKind === 'skill';
    bar.hidden = false;
    bar.innerHTML =
      '<div class="ab-title">' + h.def.name + ' — ' + TCG.t('cmb.chooseAction') + '</div>' +
      '<div class="ab-row">' +
        '<button class="act-btn' + (atkSel ? ' chosen' : '') + '" data-act="attack">⚔ ' + TCG.t('cmb.attack') + '<small>' + TCG.t('cmb.dmg') + ' ' + effAtk(h) + (hasWpnFlag(h, 'tripleStrike') ? ' ×3' : (hasWpnFlag(h, 'doubleStrike') ? ' ×2' : '')) + (wpnVal(h, 'poison') ? ' ☠' + wpnVal(h, 'poison') : '') + (hasWpnFlag(h, 'pierce') ? ' ⛏' : '') + (hasWpnFlag(h, 'chain') ? ' ⛓' : '') + (wpnVal(h, 'stun') ? ' 💫' + Math.round(wpnVal(h, 'stun') * 100) + '%' : '') + (wpnVal(h, 'splash') ? ' ↔' + Math.round(wpnVal(h, 'splash') * 100) + '%' : '') + (critPct > 1 ? ' 💥' + critPct + '%' : '') + ' · 💧0</small></button>' +
        '<button class="act-btn skill' + (skSel ? ' chosen' : '') + '" data-act="skill"' + (canSkill ? '' : ' disabled') + '>✦ ' + sk.name + '<small>' + mpLabel + ' · ' + skDesc + '</small></button>' +
      '</div>' +
      '<button class="act-btn cancel" data-act="cancel">' + TCG.t('cmb.cancel') + '</button>';
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
    if (c.lordStun > 0) { TCG.toast(TCG.t('dx.stunnedEndOnly')); return; }
    var card = e.target.closest('.combat-card'); if (!card) return;
    var uid = card.dataset.uid;
    if (c.cstat && c.cstat[uid] && c.cstat[uid].stun > 0) { TCG.toast(TCG.t('dx.cardStunned')); return; }
    c.sel = (c.sel && c.sel.uid === uid) ? null : { uid: uid }; renderCombat();
  });
  document.getElementById('actionBar').addEventListener('click', function (e) {
    var b = e.target.closest('.act-btn'); if (!b || b.disabled) return;
    e.stopPropagation(); // 바깥 클릭 닫기 핸들러로 전파 방지(재렌더로 버튼이 분리되어 오작동하는 것 방지)
    var c = combat; if (!c.sel || c.busy) return;
    var act = b.dataset.act;
    if (act === 'cancel') { c.sel = null; c.targeting = false; renderCombat(); return; }
    var h = heroByUid(c.sel.uid); if (!h) return;
    if (act === 'attack') { c.targeting = true; c.pendKind = 'attack'; renderCombat(); return; }
    var sk = raidSkill(h);
    if (sk.type === 'charm' || sk.type === 'confuse') { TCG.toast(TCG.t('dx.immuneToast')); return; }
    if (sk.type === 'buff' && sk.scope === 'army' && c.buffApplied && c.buffApplied[h.uid]) { TCG.toast(TCG.t('dx.buffOncePerBattle', { name: sk.name })); return; }
    if (c.lord.mp < skillMp(sk)) { TCG.toast(TCG.t('dx.notEnoughMp')); return; }
    if (sk.type === 'strike' || sk.type === 'multi') { c.targeting = true; c.pendKind = 'skill'; renderCombat(); }
    else doSkill(h, true);
  });
  // 행동 선택 창 바깥(창·카드·대상 지정 클릭 외)을 클릭하면 닫기
  document.addEventListener('click', function (e) {
    var c = combat; if (!c || !c.sel || c.busy) return;
    var bar = document.getElementById('actionBar'); if (!bar || bar.hidden) return;
    if (e.target.closest('#actionBar')) return;               // 창 내부
    if (e.target.closest('.combat-card')) return;             // 카드 선택은 별도 처리
    if (c.targeting && e.target.closest('#enemyRow')) return; // 대상 지정 클릭
    c.sel = null; c.targeting = false; renderCombat();
  });
  function executeOn() {
    var c = combat, h = heroByUid(c.sel.uid); if (!h) return;
    if (c.pendKind === 'attack') doAttack(h); else doSkill(h, true);
  }

  function enemyByIdx(i) { return i === 0 ? combat.boss : (combat.adds || [])[i - 1]; }
  function enemyIdxList() { var l = [0]; (combat.adds || []).forEach(function (_, i) { l.push(i + 1); }); return l; }
  function enemyElByIdx(i) { return document.querySelector('#enemyRow .unit[data-idx="' + i + '"]') || bossEl(); }
  function fxHitEnemyEl(el, dmg, crit) { var p = rectOf(el); if (!p) return; fxSlash(p.x, p.y); fxBurst(p.x, p.y, crit ? '#ffd34d' : '#fff'); fxParticles(p.x, p.y, crit ? 10 : 7, crit ? '#ffe89a' : '#ffc6c6'); if (crit) fxFloat(p.x, p.y - 16, TCG.t('cmb.crit'), '#ffd34d', true); fxFloat(p.x, p.y, '-' + dmg, crit ? '#ffd34d' : '#ff9a9a', true); }
  function dmgTarget(i, dmg, crit, pierce) {
    var t = enemyByIdx(i); if (!t) return 0;
    var d = dmg; if (t.block > 0) { var ab = Math.min(t.block, d); t.block -= ab; d -= ab; }
    if (!pierce && t.armor > 0 && d > 0) d = Math.max(1, d - t.armor); // 고유 방어력 차감(관통 시 무시)
    t.hp = Math.max(0, t.hp - d);
    fxHitEnemyEl(enemyElByIdx(i), d, crit);
    return d; // 실제 적용된 피해
  }
  function dmgBoss(dmg, crit) { dmgTarget(0, dmg, crit); }
  function doAttack(h) {
    var c = combat, ti = c.tgtIdx || 0; if (!enemyByIdx(ti) || enemyByIdx(ti).hp <= 0) ti = 0;
    var t = enemyByIdx(ti), dmg = effAtk(h);
    var pierce = hasWpnFlag(h, 'pierce'); // 방어 관통
    var chain = hasWpnFlag(h, 'chain');   // 연쇄(처치 시 재공격)
    var splash = wpnVal(h, 'splash');     // 인접 스플래시 비율
    var stunCh = wpnVal(h, 'stun');       // 기절 확률
    var baseHits = hasWpnFlag(h, 'tripleStrike') ? 3 : (hasWpnFlag(h, 'doubleStrike') ? 2 : 1);
    var mults = baseHits === 3 ? [1, 0.7, 0.5] : (baseHits === 2 ? [1, 0.7] : [1]); // 2·3타째 딜 감쇠
    var chainLeft = chain ? enemyIdxList().length : 0; // 연쇄 상한
    c.busy = true; // 다회 공격은 타격마다 끊어서 연출
    var total = 0, anyCrit = false, multi = (baseHits > 1);
    function step() {
      if (!mults.length) { return done(); }
      if (t.hp <= 0) { // 현재 대상이 죽으면 남은 타격은 다른 살아있는 적에게
        var pool = enemyIdxList().filter(function (ei) { var e = enemyByIdx(ei); return e && e.hp > 0; });
        if (!pool.length) { return done(); } // 남은 적이 없으면 종료
        ti = pool[0]; t = enemyByIdx(ti);
      }
      var mult = mults.shift();
      TCG.sfx('attack');
      var crit = rollCrit(critChance(h));
      var base = Math.max(1, Math.round(dmg * mult));
      var hd = crit ? Math.round(base * CRIT_MULT) : base;
      if (crit) anyCrit = true;
      var af = affOf(h, t); // 속성 상성
      total += dmgTarget(ti, Math.max(1, Math.round(hd * af)), crit, pierce); // 실제 적용 피해 합산(방어력 반영)
      if (af !== 1 && mult === 1) affFx(enemyElByIdx(ti), af); // 첫 타격에 상성 피드백
      if (splash > 0) { // 인접 적에게 기본 공격력 비율 피해
        [ti - 1, ti + 1].forEach(function (ai) { if (ai < 0) return; var ae = enemyByIdx(ai); if (ae && ae.hp > 0) dmgTarget(ai, Math.max(1, Math.round(dmg * splash * affOf(h, ae))), false, pierce); });
      }
      if (stunCh > 0 && t.hp > 0 && t !== c.boss && Math.random() < stunCh) { t.stunned = (t.stunned || 0) + 1; } // 기절 부여(레이드 보스는 면역, 졸병만)
      if (chain && chainLeft > 0 && t.hp <= 0) { mults.push(1); chainLeft--; } // 연쇄: 처치 시 추가 타격(전력)
      shake(crit ? 'big' : 'sm');
      renderCombat();
      setTimeout(step, (multi || mults.length) ? 240 : 120);
    }
    function done() {
      var pv = wpnVal(h, 'poison'); if (pv && t.hp > 0) { t.poison = (t.poison || 0) + pv; logMsg(TCG.t('dx.logPoisonApplied', { target: t.name, n: pv })); }
      logMsg(h.def.name + ' → ' + TCG.t('dx.logHitTarget', { target: t.name, n: total }) + (anyCrit ? ' ' + TCG.t('dx.critTag') : ''));
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
    var shl = relicSum('skillHeal'); if (shl && c.lord.hp > 0) { c.lord.hp = Math.min(c.lord.maxHp, c.lord.hp + shl); fxSupport(lordEl(), '+' + shl, '#7ef0b5'); } // 오추마·벽사부적(유물): 스킬 사용 시 회복
    TCG.sfx(sk.type === 'heal' ? 'heal' : 'skill');
    var pw = effAtk(h);
    var pierce = hasWpnFlag(h, 'pierce'); // 방어 관통(스킬 데미지도 적용)
    if (sk.type === 'strike') {
      var sc = rollCrit(critChance(h));
      var sbase = Math.round((pw + sk.val) * (sk.mult || 1)); // mult: 데미지 감쇠(개편 스킬 0.5)
      var sd = sc ? Math.round(sbase * CRIT_MULT) : sbase;
      var saf = affOf(h, enemyByIdx(ti)); // 속성 상성
      var sDealt = dmgTarget(ti, Math.max(1, Math.round(sd * saf)), sc, pierce); shake('big');
      if (saf !== 1) affFx(enemyElByIdx(ti), saf);
      if (sk.splash) { [ti - 1, ti + 1].forEach(function (ai) { if (ai < 0) return; var ae = enemyByIdx(ai); if (ae && ae.hp > 0) dmgTarget(ai, Math.max(1, Math.round(sd * sk.splash * affOf(h, ae))), false, pierce); }); } // 인접 스플래시
      var stg = enemyByIdx(ti);
      if (sk.stun && stg && stg.hp > 0 && stg !== c.boss && Math.random() < sk.stun) { stg.stunned = (stg.stunned || 0) + 1; } // 기절(보스 면역)
      if (sk.poisonHit && stg && stg.hp > 0) { stg.poison = (stg.poison || 0) + sDealt; } // 피해량만큼 중독
      logMsg(h.def.name + ' 「' + sk.name + '」 ' + TCG.t('dx.logHitTarget', { target: tName, n: sDealt }) + (sc ? ' ' + TCG.t('dx.critTag') : ''));
    }
    else if (sk.type === 'aoe') { var ac = rollCrit(critChance(h)); var av = Math.round(sk.val * (ac ? CRIT_MULT : 1)); enemyIdxList().forEach(function (ei) { var en = enemyByIdx(ei); if (en && en.hp > 0) { var aaf = affOf(h, en); dmgTarget(ei, Math.max(1, Math.round(av * aaf)), ac, pierce); if (aaf !== 1) affFx(enemyElByIdx(ei), aaf); } }); shake('big'); logMsg(h.def.name + ' 「' + sk.name + '」 ' + TCG.t('dx.logHitAll', { n: av }) + (ac ? ' ' + TCG.t('dx.critTag') : '')); }
    else if (sk.type === 'multi') {
      // 다회 공격 스킬은 타격당 공격력의 70% × 타수(타격 수) — 선택한 대상 집중
      var perHit = Math.max(1, Math.round(pw * 0.7));
      c.busy = true; var mi = 0; // 타격마다 끊어서 연출
      (function mhit() {
        var tt = enemyByIdx(ti);
        if (mi >= sk.val || !tt || tt.hp <= 0) { logMsg(h.def.name + ' 「' + sk.name + '」 ' + TCG.t('dx.logMultiHits', { hits: sk.val, per: perHit })); c.busy = false; finishPlay(); return; }
        mi++; TCG.sfx('attack'); var mc = rollCrit(critChance(h)); dmgTarget(ti, Math.max(1, Math.round((mc ? Math.round(perHit * CRIT_MULT) : perHit) * affOf(h, tt))), mc, pierce); shake('sm'); renderCombat(); setTimeout(mhit, 210); })();
      return; // 비동기 처리 — 아래 공통 finishPlay 건너뜀
    }
    else if (sk.type === 'confuse' || sk.type === 'charm') { fxSupport(bossEl(), '🛡 ' + TCG.t('dx.immune'), '#cfd8e3'); logMsg(b.name + ' — ' + TCG.t('dx.logImmune', { st: (sk.type === 'charm' ? TCG.t('dx.stCharm') : TCG.t('dx.stConfuse')) })); } // 레이드 보스는 행동 불가 면역
    else if (sk.type === 'heal') { c.lord.hp = Math.min(c.lord.maxHp, c.lord.hp + sk.val); if (h.def.id === 'oracle') c.lord.block += 5; fxSupport(lordEl(), '+' + sk.val, '#7ef0b5'); logMsg(h.def.name + ' 「' + sk.name + '」 ' + TCG.t('dx.logLordHeal', { n: sk.val })); }
    else if (sk.type === 'shield') { c.lord.block += sk.val; fxSupport(lordEl(), '🛡+' + sk.val, '#9fd2ff'); logMsg(h.def.name + ' 「' + sk.name + '」 ' + TCG.t('dx.logLordShield', { n: sk.val })); }
    else if (sk.type === 'buff' && sk.scope === 'army') { // 전군 버프: 전투당 1회(중첩 방지)
      if (!c.buffApplied) c.buffApplied = {};
      if (!c.buffApplied[h.uid]) { c.buffApplied[h.uid] = true; c.atkBuff = (c.atkBuff || 0) + sk.val; fxSupport(lordEl(), '⚔+' + sk.val, '#ffd86b'); logMsg(h.def.name + ' 「' + sk.name + '」 ' + TCG.t('dx.logArmyBuff', { n: sk.val })); }
      else { logMsg(h.def.name + ' 「' + sk.name + '」 — ' + TCG.t('dx.logAlreadyApplied')); }
    }
    else if (sk.type === 'buff') { // 아군 1명 버프: 출진(가운데) 카드 1장(시전자 제외)에 1턴 공격력 +val
      if (!c.cardBuff) c.cardBuff = {};
      var pool = c.center.filter(function (u) { return u !== h.uid && heroByUid(u); });
      var tgtUid = pool.reduce(function (best, u) { return (best == null || effAtk(heroByUid(u)) > effAtk(heroByUid(best))) ? u : best; }, null);
      if (tgtUid) {
        c.cardBuff[tgtUid] = (c.cardBuff[tgtUid] || 0) + sk.val;
        var th = heroByUid(tgtUid), tel = document.querySelector('.combat-card[data-uid="' + tgtUid + '"]');
        if (tel) fxSupport(tel, '⚔+' + sk.val, '#ffd86b');
        logMsg(h.def.name + ' 「' + sk.name + '」 ' + TCG.t('dx.logCardBuff', { name: (th ? th.def.name : ''), n: sk.val }));
      } else { logMsg(h.def.name + ' 「' + sk.name + '」 — ' + TCG.t('dx.logNoCardToBuff')); }
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

  function lordEvade() { return Math.min(0.2, party.reduce(function (s, h) { return s + wpnVal(h, 'evade'); }, 0)) * 0.5; } // 대장전: 주공 회피 50% 감소(무기 합산, 최대 10%)
  function dmgLord(dmg, crit) {
    var L = combat.lord;
    if (Math.random() < lordEvade()) { fxSupport(lordEl(), TCG.t('dx.evade'), '#8effb0'); return true; } // 회피 — 피해 무효
    var d = dmg, blocked = 0;
    if (L.block > 0) { var ab = Math.min(L.block, d); L.block -= ab; d -= ab; blocked = ab; }
    L.hp = Math.max(0, L.hp - d);
    fxHitLord(d, blocked, crit);
    return false;
  }
  // 보스가 2종 스킬 중 하나를 시전(주공 대상). 사용 시 true.
  function bossCast(b, sk) {
    var c = combat;
    b.mp = Math.max(0, b.mp - skillMp(sk));
    fxBanner('👹 ' + b.name + ' 「' + sk.name + '」', 'boss', 1000);
    TCG.sfx(sk.type === 'heal' || sk.type === 'shield' ? 'heal' : 'skill');
    if (sk.type === 'strike') { var crit = rollCrit(BOSS_CRIT); var d = b.atk + Math.round(sk.val * 0.5); if (crit) d *= 2; shake('big'); var ev = dmgLord(d, crit); logMsg(b.name + ' ' + (ev ? TCG.t('dx.logSkillEvade', { skill: sk.name }) : (TCG.t('dx.logSkillLordDmg', { skill: sk.name, n: d }) + (crit ? ' ' + TCG.t('dx.critTag') : '')))); }
    else if (sk.type === 'aoe') { var d2 = Math.round(sk.val * 0.6) + Math.round(b.atk * 0.3); shake('big'); var ev2 = dmgLord(d2, false); logMsg(b.name + ' ' + (ev2 ? TCG.t('dx.logSkillEvade', { skill: sk.name }) : TCG.t('dx.logSkillLordDmg', { skill: sk.name, n: d2 }))); }
    else if (sk.type === 'multi') { var tot = 0; for (var i = 0; i < sk.val; i++) { if (c.lord.hp <= 0) break; var dd = Math.max(1, Math.round(b.atk * 0.5)); if (!dmgLord(dd, false)) tot += dd; } shake('sm'); logMsg(b.name + ' 「' + sk.name + '」 ' + TCG.t('dx.logBossMulti', { hits: sk.val, n: tot })); }
    else if (sk.type === 'heal') { b.hp = Math.min(b.maxHp, b.hp + sk.val); fxSupport(bossEl(), '+' + sk.val, '#7ef0b5'); logMsg(b.name + ' 「' + sk.name + '」 ' + TCG.t('dx.logBossHeal', { n: sk.val })); }
    else if (sk.type === 'shield') { b.block += sk.val; fxSupport(bossEl(), '🛡+' + sk.val, '#9fd2ff'); logMsg(b.name + ' 「' + sk.name + '」 ' + TCG.t('dx.logBossShield', { n: sk.val })); }
    else if (sk.type === 'confuse' || sk.type === 'charm') { // 주공 행동 불가(공격 스킬 봉쇄). 카드는 방어만 가능
      var turns = sk.val || 1; c.lordStun = Math.max(c.lordStun || 0, turns);
      fxSupport(lordEl(), '💫 ' + TCG.t('dx.stun'), '#c79bff'); logMsg(b.name + ' 「' + sk.name + '」 — ' + TCG.t('dx.logLordStun', { n: turns })); }
    else if (sk.type === 'cardstun') { // 아군 카드(장수) 1장 행동 불가 — 다음 출진 시 1턴
      var pool = c.draw.concat(c.center, c.used).filter(function (u) { return heroByUid(u) && !(c.cstat[u] && c.cstat[u].stun > 0); });
      if (pool.length) {
        var su = TCG.pick(pool), st = sk.val || 1, sh = heroByUid(su);
        c.cstat[su] = { stun: st };
        fxSupport(lordEl(), '💫 ' + TCG.t('dx.cardSeal'), '#c79bff'); logMsg(b.name + ' 「' + sk.name + '」 — ' + TCG.t('dx.logCardStun', { name: (sh ? sh.def.name : TCG.t('dx.card')), n: st })); }
      else { var dc = Math.max(1, Math.round(b.atk * 0.5)); var evc = dmgLord(dc, false); logMsg(b.name + ' ' + (evc ? TCG.t('dx.logSkillEvade', { skill: sk.name }) : TCG.t('dx.logSkillLordDmg', { skill: sk.name, n: dc }))); }
    }
    else { var d3 = Math.max(1, Math.round(b.atk * 0.5)); var ev3 = dmgLord(d3, false); logMsg(b.name + ' ' + (ev3 ? TCG.t('dx.logSkillEvade', { skill: sk.name }) : TCG.t('dx.logSkillLordDmg', { skill: sk.name, n: d3 }))); }
    return true;
  }
  function addsAttackLord() { // 졸병도 주공을 공격
    var c = combat;
    (c.adds || []).forEach(function (a) {
      if (a.hp > 0 && c.lord.hp > 0) {
        if (a.stunned > 0) { a.stunned--; fxSupport(enemyElByIdx((c.adds.indexOf(a)) + 1), '💤 ' + TCG.t('dx.stStun'), '#ff9ad0'); return; } // 기절한 졸병은 행동 불가
        var crit = rollCrit(BASE_CRIT), dmg = crit ? Math.round(a.atk * CRIT_MULT) : a.atk;
        TCG.sfx('hit'); var evA = dmgLord(dmg, crit);
        logMsg(a.name + ' ' + (evA ? TCG.t('dx.logToLordEvade') : (TCG.t('dx.logToLordDmg', { n: dmg }) + (crit ? ' ' + TCG.t('dx.critTag') : ''))));
      }
    });
  }
  function bossPhase() {
    var c = combat, b = c.boss;
    c.phase = 'enemy'; c.sel = null; c.targeting = false;
    if (b.poison > 0) { b.hp = Math.max(0, b.hp - b.poison); fxHitBoss(b.poison, false); logMsg(b.name + ' ' + TCG.t('dx.logPoisonDmg', { n: b.poison })); }
    (c.adds || []).forEach(function (a) { if (a.poison > 0 && a.hp > 0) { a.hp = Math.max(0, a.hp - a.poison); } }); // 졸병 독 피해
    renderCombat();
    if (b.hp <= 0) { setTimeout(winRaid, 550); return; }
    var skip = (b.charmed > 0 || b.confused > 0 || b.stunned > 0);
    if (skip) { var was = b.charmed > 0 ? TCG.t('dx.stCharm') : (b.confused > 0 ? TCG.t('dx.stConfuse') : TCG.t('dx.stStun')); if (b.charmed > 0) b.charmed--; else if (b.confused > 0) b.confused--; else b.stunned--; fxSupport(bossEl(), '💤 ' + was, '#ff9ad0'); logMsg(TCG.t('dx.logStunnedSkip', { name: b.name, st: was })); }
    fxBanner(TCG.t('cmb.bossTurn'), 'foe-turn', 800);
    setTimeout(function () {
      if (!skip) {
        var pick = (b.skills && b.skills.length && Math.random() < (b.skillChance || 0)) ? pickBossSkill(b) : null;
        var usedSkill = pick ? bossCast(b, pick) : false;
        if (!usedSkill) {
          var intent = b.intent, crit = rollCrit(BOSS_CRIT), dmg = crit ? Math.round(intent.dmg * CRIT_MULT) : intent.dmg;
          TCG.sfx('hit'); shake(crit || intent.type === 'aoe' ? 'big' : 'sm');
          var evB = dmgLord(dmg, crit);
          logMsg(b.name + ' ' + (evB ? TCG.t('dx.logToLordEvade') : (TCG.t('dx.logToLordDmg', { n: dmg }) + (crit ? ' ' + TCG.t('dx.critTag') : ''))));
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
    var c = combat; if (!c || c.over) return;
    // 레이드 보스 마지막 대사 후 결과 표시
    if (!c.deathShown) {
      c.deathShown = true;
      var dq = HW_BOSS_DEATH[(HW_RAID.bosses[c.raidIdx] || {}).key];
      if (dq && TCG.isDialogueOn()) { fxQuote(bossEl(), dq, 2400); setTimeout(winRaid, 2300); return; }
    }
    c.over = true;
    TCG.sfx('win');
    if (window.BGMEngine) BGMEngine.stinger('victory');
    var b = HW_RAID.bosses[c.raidIdx], rew = HW_BY_ID[b.reward];
    var firstClear = !isCleared(b.key); // 골드 보상은 첫 격파 시 1회
    markCleared(b.key);
    var already = collected(b.reward);
    if (!already) grantHero(b.reward);
    var goldHtml = '';
    if (firstClear) {
      var gold = Math.round((HW_BOSS[diff] || HW_BOSS.normal).raidGold * (1 + relicSum('goldBonus'))); // 천자의 밀서(유물) +%
      addBonusGold(gold);
      goldHtml = '<div class="raid-result-gold">💰 ' + TCG.t('dx.goldAccrued', { n: gold }) + '</div>';
    } else if (already) { // 재도전 + 이미 보유 → 보스 단계별 보너스 골드(50~200)
      var n = HW_RAID.bosses.length - 1;
      var reGold = Math.round((50 + 150 * c.raidIdx / (n || 1)) / 10) * 10;
      reGold = Math.round(reGold * (1 + relicSum('goldBonus'))); // 천자의 밀서(유물) +%
      addBonusGold(reGold);
      goldHtml = '<div class="raid-result-gold">💰 ' + TCG.t('dx.goldAccruedRetry', { n: reGold }) + '</div>';
    }
    document.getElementById('overTitle').textContent = '🏆 ' + TCG.t('dx.bossDefeatedTitle', { name: c.boss.name });
    document.getElementById('overText').textContent = TCG.t('dx.bossSubjugatedText', { title: b.title, name: c.boss.name });
    document.getElementById('overReward').innerHTML = (already
      ? '<div class="raid-result-rew owned">' + TCG.t('dx.alreadyOwnedOfficer') + ' — <b>' + rew.name + '</b></div>'
      : '<div class="raid-result-rew">🎁 ' + TCG.t('dx.exclusiveOfficer') + ' <b>' + rew.name + '</b> <span class="rar-' + rew.rarity + '">' + rew.rarity + '</span> ' + TCG.t('dx.acquired') + '<br><small>' + TCG.t('dx.joinsHeroes') + '</small></div>') + goldHtml;
    document.getElementById('overModal').hidden = false;
  }
  function loseRaid() {
    var c = combat; if (c.over) return; c.over = true;
    TCG.sfx('lose');
    if (window.BGMEngine) BGMEngine.stinger('defeat');
    document.getElementById('overTitle').textContent = '💀 ' + TCG.t('dx.lordFallen');
    document.getElementById('overText').textContent = TCG.t('dx.defeatedBy', { name: c.boss.name });
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
    if (HW_STARTERS.indexOf(d.id) !== -1) return '🏳️ ' + TCG.t('dx.pathStarter');
    if (d.exclusive === 'qb') return '🃏 ' + TCG.t('dx.pathQb3');
    if (d.exclusive === 'raid') {
      var rb = null; HW_RAID.bosses.forEach(function (b) { if (b.reward === d.id) rb = b; });
      return '👹 ' + TCG.t('dx.pathRaid', { name: (rb ? HW_COMMANDERS[rb.key].name : TCG.t('dx.enemyCommander')) });
    }
    if (d.exclusive === 'special') return '🐎 ' + TCG.t('dx.pathSpecial');
    if (d.exclusive === 'normalclear') return '💃 ' + TCG.t('dx.pathNormalClear');
    if (d.exclusive === 'mid') {
      var mi = midBossInfoByHid(d.id);
      if (mi) {
        var stage = HW_STAGES[mi.main] ? HW_STAGES[mi.main].name : '';
        return '⚜ ' + TCG.t('dx.pathMid', { stage: stage, sortie: (mi.idx === 0 ? TCG.t('dx.sortie5') : TCG.t('dx.sortie10')), diff: (mi.idx === 0 ? TCG.t('dx.diffNormal') : TCG.t('dx.diffHard')) });
      }
      return '⚜ ' + TCG.t('dx.pathMidGeneric');
    }
    return '⚔️ ' + TCG.t('dx.pathBattleTavern');
  }
  function weaponPath(w) { return w.exclusive === 'collection' ? '📕 ' + TCG.t('dx.wpathCollection') : (w.exclusive === 'qb20' ? '🃏 ' + TCG.t('dx.wpathQb20') : '💎 ' + TCG.t('dx.wpathTreasure')); }
  function relicPath(r) { return r.exclusive === 'qb' ? '🃏 ' + TCG.t('dx.rpathQb10') : '👑 ' + TCG.t('dx.rpathMain'); }
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
    var rt = document.getElementById('rosterTitleCount'); if (rt) rt.textContent = '· ' + TCG.t('dx.sortieDeckCount', { n: deck.length, max: MAX_DECK, min: deckMin() });
    var rcEl = document.getElementById('rosterCount'); if (rcEl) rcEl.textContent = party.length;
    document.getElementById('rosterGrid').innerHTML = sortPartyList(party, rosterSort).map(function (h) {
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
    }).join('') || '<p class="screen-sub">' + TCG.t('dx.noOfficers') + '</p>';
    paintSortBar('rosterSort', rosterSort);
  }
  function refreshRosterIfOpen() { var m = document.getElementById('rosterModal'); if (m && !m.hidden) renderRosterGrid(); }
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
      // 장착 가능한 무기 목록(빈 슬롯이 있을 때만) — 같은 이름은 한 번만, 이미 장착한 것 제외
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
        if (b.dataset.wact === 'unequip') {
          h.weapons.splice(parseInt(b.dataset.slot, 10), 1);
        } else if (h.weapons.length < weaponSlots(h) && h.weapons.indexOf(b.dataset.wid) === -1 && freeWeaponIds().indexOf(b.dataset.wid) !== -1) {
          h.weapons.push(b.dataset.wid); // 장수당 같은 이름 장비는 1개만 장착 가능
        }
        saveParty();
        renderSelect(); // 대기실 주공 능력치/장비 수 갱신
        showHeroModal(h); // 다시 렌더
      });
    });
  }
  (function () {
    var hm = document.getElementById('heroModal');
    if (hm) hm.addEventListener('click', function (e) { if (e.target.id === 'heroModal') { e.currentTarget.hidden = true; refreshRosterIfOpen(); } });
  })();
  function toggleDeck(uid) {
    var i = deck.indexOf(uid);
    if (i >= 0) {
      if (deck.length <= deckMin()) { TCG.toast(TCG.t('dx.deckMinToast', { n: deckMin() })); return; }
      deck.splice(i, 1);
    } else {
      if (deck.length >= MAX_DECK) { TCG.toast(TCG.t('dx.deckMaxToast', { n: MAX_DECK })); return; }
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
    var inv = SAVE.weapons || [];
    var html;
    if (!inv.length) {
      html = '<div class="gear-empty">' + TCG.t('dx.noGear') + '</div>';
    } else {
      html = HW_WEAPONS.map(function (w) {
        var owned = inv.filter(function (id) { return id === w.id; }).length;
        if (!owned) return '';
        var wearers = [];
        party.forEach(function (h) { heroWpnIds(h).forEach(function (id) { if (id === w.id) wearers.push(h.def.name); }); });
        var free = owned - wearers.length;
        var wearTxt = wearers.length
          ? '<span class="gear-on">' + TCG.t('dx.equipped') + ': ' + wearers.join(', ') + '</span>' + (free > 0 ? ' <span class="gear-free">· ' + TCG.t('dx.unequippedN', { n: free }) + '</span>' : '')
          : '<span class="gear-free">' + TCG.t('dx.unequipped') + '</span>';
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
    var gt = document.getElementById('gearTitleCount'); if (gt) gt.textContent = Object.keys(ownedKinds).length + '/' + HW_WEAPONS.length;
    document.getElementById('gearModal').hidden = false;
  }
  function renderHeroCodex() {
    var col = lsArr('hw_collected_heroes');
    document.getElementById('heroColTitle').textContent = '(' + col.length + ' / ' + HW_HEROES.length + ')';
    document.getElementById('heroColGrid').innerHTML = sortDefList(HW_HEROES, codexSort).map(function (d) {
      var got = col.indexOf(d.id) !== -1;
      return '<div class="col-card' + (got ? '' : ' locked') + '" data-id="' + d.id + '">' +
        '<div class="col-port">' + TCG.portrait(d.emoji, d.id, '', d.name) +
          '<span class="col-badge" style="background:' + rarBg(d.rarity) + '">' + d.rarity + '</span>' +
          (got ? '' : '<div class="col-lockov">🔒</div>') + '</div>' +
        '<div class="col-name">' + d.name + '</div>' +
        '<div class="col-cls">' + (got ? d.cls : TCG.t('dx.undiscovered')) + '</div></div>';
    }).join('');
    paintSortBar('heroColSort', codexSort);
  }
  function codexListRow(it, got, pickClass) {
    return '<div class="gear-row ' + pickClass + (got ? '' : ' locked') + '" data-id="' + it.id + '">' +
      '<div class="gear-emoji">' + it.emoji + '</div>' +
      '<div class="gear-info"><div class="gear-name">' + it.name + '</div>' +
        '<div class="gear-desc">' + it.desc + '</div></div>' +
      '<span class="col-mark" style="color:' + (got ? 'var(--gold)' : 'var(--ink-dim)') + '">' + (got ? '✦' : '🔒') + '</span></div>';
  }
  function renderWeaponCodex() {
    var col = lsArr('hw_collected_weapons');
    document.getElementById('weaponColTitle').textContent = '(' + col.length + ' / ' + HW_WEAPONS.length + ')';
    document.getElementById('weaponColList').innerHTML = HW_WEAPONS.map(function (w) {
      return codexListRow(w, col.indexOf(w.id) !== -1, 'col-pick');
    }).join('');
  }
  function renderRelicCodex() {
    var col = lsArr('hw_collected_relics');
    document.getElementById('relicColTitle').textContent = '(' + col.length + ' / ' + HW_RELICS.length + ')';
    document.getElementById('relicColList').innerHTML = HW_RELICS.map(function (r) {
      return codexListRow(r, col.indexOf(r.id) !== -1, 'col-relic-pick');
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
    var got = lsArr('hw_collected_heroes').length + lsArr('hw_collected_weapons').length + lsArr('hw_collected_relics').length;
    return tot ? Math.round(got / tot * 100) : 0;
  }
  function openCodex(tab) {
    TCG.sfx('tap'); renderHeroCodex(); renderWeaponCodex(); renderRelicCodex();
    var pe = document.getElementById('codexPct'); if (pe) pe.textContent = codexPct() + '%';
    showCodexTab(tab || 'hero'); document.getElementById('codexModal').hidden = false;
  }
  document.getElementById('rosterBtn').addEventListener('click', openRoster);
  document.getElementById('rosterSort').addEventListener('click', function (e) { var b = e.target.closest('.sort-btn'); if (!b) return; TCG.sfx('tap'); applySortClick(rosterSort, b.dataset.sort); renderRosterGrid(); });
  document.getElementById('heroColSort').addEventListener('click', function (e) { var b = e.target.closest('.sort-btn'); if (!b) return; TCG.sfx('tap'); applySortClick(codexSort, b.dataset.sort); renderHeroCodex(); });
  document.getElementById('rosterGrid').addEventListener('click', function (e) {
    var eq = e.target.closest('[data-equip]');
    if (eq) { var h = heroByUid(eq.dataset.equip); if (h) { TCG.sfx('tap'); showHeroModal(h); } return; } // 🗡 장비 버튼 → 상세/장착
    var card = e.target.closest('.deck-pick'); if (!card) return;
    toggleDeck(card.dataset.uid);
  });
  document.getElementById('gearBtn').addEventListener('click', openGear);
  document.getElementById('codexBtn').addEventListener('click', function () { openCodex('hero'); });
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
  function codexHeroDetail(d) {
    var got = lsArr('hw_collected_heroes').indexOf(d.id) !== -1, rc = rarBg(d.rarity);
    return '<div class="cdx-pop-port">' + TCG.portrait(d.emoji, d.id, '', d.name) +
        '<span class="cdx-pop-rb" style="background:' + rc + '">' + d.rarity + '</span>' + _cdxX +
        '<span class="cdx-pop-own" style="color:' + (got ? '#7ef0b5' : '#c4ab90') + '">' + (got ? TCG.t('dx.owning') : TCG.t('dx.notOwned')) + '</span></div>' +
      '<div style="padding:13px 15px 16px">' +
        '<div class="cdx-pop-h"><b>' + d.name + '</b><small>' + d.cls + ' · ' + (HW_ELEM_ICON[elemOf(d)] || '') + ' ' + TCG.t('el.' + elemOf(d)) + ' · ' + TCG.t('el.strongVs') + ' ' + (HW_ELEM_ICON[elemStrongVs(elemOf(d))] || '') + '</small></div>' +
        '<div class="cdx-pop-stats"><div class="atk"><div class="lbl">' + TCG.t('dx.atkLabel') + '</div><div class="val">⚔ ' + d.atk + '</div></div></div>' +
        '<div class="cdx-pop-box"><div class="sk">✦ ' + d.skill.name + ' <span style="color:#8a7560;font-weight:700;font-size:11px">MP ' + skillMp(d.skill) + '</span></div><div class="skd">' + d.skill.desc + '</div></div>' +
        '<div class="cdx-pop-src"><span style="font-size:14px">📍</span><div><div class="lbl">' + TCG.t('dx.acquirePath') + '</div><div class="v">' + heroPath(d) + '</div></div></div>' +
      '</div>';
  }
  function codexItemDetail(it, kind) {
    var isW = kind === 'weapon';
    var got = lsArr(isW ? 'hw_collected_weapons' : 'hw_collected_relics').indexOf(it.id) !== -1;
    var accent = isW ? '#c77bff' : '#f0c33c';
    var src = isW ? weaponPath(it) : relicPath(it);
    var effHtml = it.desc + (isW ? ' · 💰 ' + TCG.t('dx.valueGold', { n: weaponCost(it) }) : '');
    return _cdxX +
      '<div style="padding:18px 16px 16px">' +
        '<div class="cdx-pop-item-head"><div class="cdx-pop-ico" style="box-shadow:inset 0 0 0 1.5px ' + accent + ';' + (got ? '' : 'filter:grayscale(1) brightness(.6)') + '">' + it.emoji + '</div>' +
          '<div style="flex:1;min-width:0"><div class="cdx-pop-kind" style="color:' + accent + '">' + (isW ? TCG.t('dx.kindGear') : TCG.t('dx.kindRelic')) + '</div>' +
            '<div class="nm">' + it.name + '</div><div class="ow" style="color:' + (got ? '#7ef0b5' : '#c4ab90') + '">' + (got ? TCG.t('dx.owning') : TCG.t('dx.notOwned')) + '</div></div></div>' +
        '<div class="cdx-pop-box"><div class="lbl" style="font-size:9px;font-weight:700;color:#8a7560">' + TCG.t('dx.effect') + '</div><div style="font-size:12px;color:#e6d8c4;margin-top:3px;line-height:1.5">' + effHtml + '</div></div>' +
        '<div class="cdx-pop-src"><span style="font-size:14px">📍</span><div><div class="lbl">' + TCG.t('dx.acquirePath') + '</div><div class="v">' + src + '</div></div></div>' +
      '</div>';
  }
  document.getElementById('relicColList').addEventListener('click', function (e) {
    var c = e.target.closest('.col-relic-pick'); if (!c) return;
    var r = HW_RELICS.find(function (x) { return x.id === c.dataset.id; }); if (!r) return;
    showCodexDetail(codexItemDetail(r, 'relic'), '#f0c33c');
  });
  document.getElementById('heroColGrid').addEventListener('click', function (e) {
    var c = e.target.closest('.col-card'); if (!c || !c.dataset.id) return;
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
  // 대기실 팝업(장수·장비·추가능력) 닫기 — ✕ 버튼/바깥(scrim) 모두 data-close (영웅전과 동일)
  ['rosterModal', 'gearModal', 'relicModal'].forEach(function (id) {
    var modal = document.getElementById(id); if (!modal) return;
    modal.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) { TCG.sfx('tap'); modal.hidden = true; } });
  });
  // 도감은 전체 페이지 — 상단 '이전' 버튼으로 이전 화면 복귀
  document.getElementById('codexBack').addEventListener('click', function () { TCG.sfx('tap'); document.getElementById('codexModal').hidden = true; });
  document.getElementById('bossModal').addEventListener('click', function (e) {
    if (e.target.id === 'bossModal' || e.target.closest('[data-bclose]')) { e.currentTarget.hidden = true; return; }
    var go = e.target.closest('[data-bgo]');
    if (go) {
      var bi = parseInt(go.dataset.bgo, 10); e.currentTarget.hidden = true;
      if (!raidUnlocked(bi)) { TCG.toast(TCG.t('dx.beatPrevFirst')); return; }
      TCG.sfx('tap'); startRaid(bi);
    }
  });

  /* ---------- boot ---------- */
  TCG.initFloatMenu();
  var muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.textContent = TCG.isMuted() ? '🔇 ' + TCG.t('dx.sound') : '🔊 ' + TCG.t('dx.sound');
    muteBtn.addEventListener('click', function () { var m = TCG.toggleMute(); muteBtn.textContent = m ? '🔇 ' + TCG.t('dx.sound') : '🔊 ' + TCG.t('dx.sound'); TCG.audioResume(); if (!m) TCG.sfx('tap'); });
  }
  renderSelect();
})();
