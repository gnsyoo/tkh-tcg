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

  /* ---------- stat/weapon helpers (영웅전과 동일 규칙) ---------- */
  function heroWpnIds(h) { return (h && h.weapons) ? h.weapons : []; }
  function heroWpns(h) { return heroWpnIds(h).map(function (id) { return HW_WEAPON_BY_ID[id]; }).filter(Boolean); }
  function wpnVal(h, key) { return heroWpns(h).reduce(function (s, w) { return s + (w.effect[key] || 0); }, 0); }
  function hasWpnFlag(h, key) { return heroWpns(h).some(function (w) { return !!w.effect[key]; }); }
  function effAtk(h) { return h.atk + wpnVal(h, 'atk') + (combat ? (combat.atkBuff || 0) : 0); }
  function lordMaxHp() { return HW_LORD.hp + party.reduce(function (s, h) { return s + wpnVal(h, 'lordHp'); }, 0); }
  function lordMaxMp() { return HW_LORD.mp + party.reduce(function (s, h) { return s + wpnVal(h, 'lordMp'); }, 0); }
  function skillMp(sk) { return 2 + (sk.cost || 1); }
  var BASE_CRIT = 0.01;
  function critChance(h) { return BASE_CRIT + wpnVal(h, 'crit'); }
  function rollCrit(c) { return Math.random() < c; }
  function defenseOf(h) { return 3 + Math.floor(effAtk(h) / 3); }
  function heroByUid(uid) { return party.find(function (h) { return h.uid === uid; }); }

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
    document.getElementById('deckPill').textContent = '덱 ' + party.length;
    var dp = document.getElementById('diffPill'); if (dp) dp.textContent = '난이도 ' + TCG.diffLabel(diff);
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
        '<div class="raid-boss">' + TCG.portrait(cmd.emoji, b.key, 'raid-art') +
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
    var btn = e.target.closest('.raid-go'); if (!btn || btn.disabled) return;
    var i = parseInt(btn.dataset.i, 10);
    if (!raidUnlocked(i)) { TCG.toast('이전 보스를 먼저 격파하세요'); return; }
    TCG.sfx('tap');
    startRaid(i);
  });

  /* ---------- combat ---------- */
  function startRaid(idx) {
    var b = HW_RAID.bosses[idx];
    var cmd = HW_COMMANDERS[b.key];
    var hp = Math.round(cmd.hp * HW_RAID.hpMult);
    var atk = Math.max(2, Math.round(cmd.atk * HW_RAID.atkMult * DCFG.eAtk));
    var mhp = lordMaxHp(), mmp = lordMaxMp();
    var bc = HW_BOSS[diff] || HW_BOSS.normal;
    var bossSkill = (cmd.hero && HW_BY_ID[cmd.hero]) ? HW_BY_ID[cmd.hero].skill : null;
    combat = {
      raidIdx: idx, boss: { def: cmd, name: cmd.name, emoji: cmd.emoji, maxHp: hp, hp: hp, atk: atk, atk0: atk, aoe: !!cmd.aoe, block: 0, poison: 0, charmed: 0, intent: null,
        skill: bossSkill, mp: bc.mp, maxMp: bc.mp, skillChance: bc.skillChance },
      round: 0, lord: { hp: mhp, maxHp: mhp, mp: mmp, maxMp: mmp, block: 0 }, atkBuff: 0,
      draw: TCG.shuffle(party.map(function (h) { return h.uid; })), center: [], used: [],
      sel: null, targeting: false, phase: 'player', log: [], over: false
    };
    show('combatScreen');
    fxBanner('👹 ' + cmd.name + ' 레이드', 'boss', 1400); shake('big');
    logMsg(b.title + ' ' + cmd.name + ' 토벌전 개전!');
    beginRound();
  }

  function centerSize() { return 3; }
  function drawOne() {
    var c = combat;
    if (!c.draw.length) { if (!c.used.length) return false; c.draw = TCG.shuffle(c.used); c.used = []; logMsg('덱을 다시 섞었습니다'); }
    if (!c.draw.length) return false;
    c.center.push(c.draw.pop()); return true;
  }
  function refillCenter() { var c = combat, cap = Math.min(centerSize(), party.length), g = 0; while (c.center.length < cap && g++ < 40) { if (!drawOne()) break; } }
  function beginRound() {
    var c = combat; c.round++;
    if (c.round > 1) c.lord.block = 0;
    refillCenter();
    var b = c.boss;
    if (b.aoe && c.round % 3 === 0) b.intent = { type: 'aoe', dmg: Math.max(2, Math.round(b.atk * 0.85)) };
    else b.intent = { type: 'attack', dmg: b.atk };
    c.sel = null; c.targeting = false;
    renderCombat();
    if (c.round >= 2) fxBanner('라운드 ' + c.round, 'round', 800);
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
  function bossEl() { return document.querySelector('#enemyRow .unit'); }
  function lordEl() { return document.querySelector('#lordBar .lord-art'); }
  function fxHitBoss(dmg, crit) { var p = rectOf(bossEl()); if (!p) return; fxSlash(p.x, p.y); fxBurst(p.x, p.y, crit ? '#ffd34d' : '#fff'); fxParticles(p.x, p.y, crit ? 10 : 7, crit ? '#ffe89a' : '#ffc6c6'); if (crit) fxFloat(p.x, p.y - 16, '치명타!', '#ffd34d', true); fxFloat(p.x, p.y, '-' + dmg, crit ? '#ffd34d' : '#ff9a9a', true); }
  function fxHitLord(dmg, blocked, crit) { var p = rectOf(lordEl()); if (!p) return; if (blocked) fxFloat(p.x, p.y - 14, '🛡' + blocked, '#9fd2ff'); if (dmg > 0) { fxSlash(p.x, p.y); fxBurst(p.x, p.y, crit ? '#ffd34d' : '#ff6b6b'); fxParticles(p.x, p.y, 6, '#ffb0b0'); if (crit) fxFloat(p.x, p.y - 16, '치명타!', '#ffd34d', true); fxFloat(p.x, p.y, '-' + dmg, crit ? '#ffd34d' : '#ff9a9a', true); } }
  function fxSupport(el, t, color) { var p = rectOf(el); if (!p) return; fxFloat(p.x, p.y, t, color); }

  /* ---------- render ---------- */
  function renderCombat() {
    var c = combat, b = c.boss;
    document.getElementById('energyBox').innerHTML = '🎴 가운데 카드: 사용하면 <b>공격</b> · 턴 종료 시 남기면 <b>방어</b>';
    var dead = b.hp <= 0, charmed = b.charmed > 0 || b.confused > 0;
    var tgt = c.targeting && !dead;
    var intentTxt = (b.confused > 0) ? '💤 혼란' : (b.charmed > 0) ? '💤 매혹' : (b.intent ? (b.intent.type === 'aoe' ? '💥' + b.intent.dmg : '⚔️' + b.intent.dmg) : '');
    var pct = Math.max(0, Math.round(b.hp / b.maxHp * 100));
    document.getElementById('enemyRow').innerHTML =
      '<div class="unit enemy raid-boss-unit' + (dead ? ' dead' : '') + (tgt ? ' targetable' : '') + (charmed ? ' charmed' : '') + '" data-side="enemy" data-idx="0">' +
        (dead ? '' : '<div class="u-intent">' + intentTxt + '</div>') +
        (b.block > 0 ? '<div class="u-block">🛡' + b.block + '</div>' : '') +
        (charmed ? '<div class="u-charm">💗' + b.charmed + '</div>' : '') +
        (b.poison > 0 ? '<div class="u-poison">☠' + b.poison + '</div>' : '') +
        TCG.portrait(b.emoji, b.name) +
        '<div class="u-name">' + b.name + '</div>' +
        '<div class="u-hp-text">❤ ' + Math.max(0, b.hp) + ' / ' + b.maxHp + '</div>' +
        (b.maxMp ? '<div class="u-mp-text">💧 ' + Math.max(0, b.mp) + ' / ' + b.maxMp + '</div>' : '') +
        '<div class="hpbar foe"><i style="width:' + pct + '%"></i></div></div>';

    var L = c.lord;
    var hp = Math.max(0, Math.round(L.hp / L.maxHp * 100)), mp = Math.max(0, Math.round(L.mp / Math.max(1, L.maxMp) * 100));
    document.getElementById('lordBar').innerHTML =
      '<div class="lord">' + TCG.portrait('👑', 'lord', 'lord-art') +
        '<div class="lord-info"><div class="lord-name">주공 (나)' + (L.block > 0 ? ' <span class="lord-block">🛡' + L.block + '</span>' : '') + '</div>' +
          '<div class="lbar hp"><i style="width:' + hp + '%"></i><span>❤ ' + Math.max(0, L.hp) + ' / ' + L.maxHp + '</span></div>' +
          '<div class="lbar mp"><i style="width:' + mp + '%"></i><span>💧 MP ' + Math.max(0, L.mp) + ' / ' + L.maxMp + '</span></div>' +
        '</div></div>';
    renderPiles();
    renderActionBar();
    document.getElementById('endTurnBtn').disabled = (c.phase === 'enemy' || c.busy);
    var hint = document.getElementById('combatHint');
    hint.textContent = c.phase === 'enemy' ? '보스가 행동 중…' : (c.targeting ? '보스를 선택하세요' : (c.sel ? '행동을 선택하세요' : '가운데 카드로 공격하거나, 턴 종료 시 남은 카드로 방어합니다'));
  }
  function renderPiles() {
    var c = combat;
    var ds = ''; for (var i = 0; i < Math.min(c.draw.length, 5); i++) ds += '<div class="pile-card" style="--i:' + i + '"></div>';
    document.getElementById('drawPile').innerHTML = ds + '<div class="pile-label">뽑을 카드 <b>' + c.draw.length + '</b></div>';
    var canAct = c.phase !== 'enemy' && !c.targeting && !c.busy;
    var cardsHtml = c.center.map(function (uid) {
      var h = heroByUid(uid); if (!h) return ''; var sk = h.def.skill;
      var sel = c.sel && c.sel.uid === uid && !c.targeting;
      var cls = 'combat-card' + (sel ? ' selected' : '') + (canAct ? '' : ' unplayable');
      var ws = heroWpns(h), wE = ws.map(function (w) { return w.emoji; }).join(''), wN = ws.map(function (w) { return w.name; }).join(', ');
      return '<div class="' + cls + '" data-uid="' + uid + '">' + TCG.portrait(h.def.emoji, h.def.id, 'cc-art', h.def.name) +
        '<div class="cc-name">' + h.def.name + '</div><div class="cc-atk">⚔' + effAtk(h) + '</div><div class="cc-def">🛡' + defenseOf(h) + '</div>' +
        (wE ? '<div class="cc-wpn" title="' + wN + '">' + wE + '</div>' : '') + '<div class="cc-skill">' + sk.name + '</div></div>';
    }).join('');
    document.getElementById('centerCards').innerHTML = cardsHtml ? '<div class="center-inner">' + cardsHtml + '</div>' : '<div class="center-empty">카드 없음</div>';
    var us = ''; for (var j = 0; j < Math.min(c.used.length, 5); j++) us += '<div class="pile-card used" style="--i:' + j + '"></div>';
    document.getElementById('usedPile').innerHTML = us + '<div class="pile-label">사용한 카드 <b>' + c.used.length + '</b></div>';
  }
  function renderActionBar() {
    var c = combat, bar = document.getElementById('actionBar');
    if (!c.sel || c.targeting) { bar.hidden = true; return; }
    var h = heroByUid(c.sel.uid); if (!h) { bar.hidden = true; return; }
    var sk = h.def.skill, isHeal = sk.type === 'heal', mp = skillMp(sk);
    var immune = (sk.type === 'charm' || sk.type === 'confuse'); // 레이드 보스는 행동 불가(혼란·매혹) 면역
    var canSkill = !immune && (isHeal || c.lord.mp >= mp);
    var mpLabel = immune ? '🛡 면역' : (isHeal ? ('💧+' + Math.round(sk.val / 4) + ' 회복') : ('💧' + mp));
    var skDesc = immune ? '레이드 보스는 혼란·매혹에 면역' : sk.desc;
    var critPct = Math.round(critChance(h) * 100);
    bar.hidden = false;
    bar.innerHTML =
      '<button class="act-btn" data-act="attack">기본 공격<small>피해 ' + effAtk(h) + (hasWpnFlag(h, 'doubleStrike') ? ' ×2' : '') + (wpnVal(h, 'poison') ? ' ☠' + wpnVal(h, 'poison') : '') + (critPct > 1 ? ' 💥' + critPct + '%' : '') + '</small></button>' +
      '<button class="act-btn skill" data-act="skill"' + (canSkill ? '' : ' disabled') + '>' + sk.name + '<small>' + mpLabel + ' · ' + skDesc + '</small></button>' +
      '<button class="act-btn cancel" data-act="cancel">취소</button>';
  }

  /* ---------- input ---------- */
  document.getElementById('enemyRow').addEventListener('click', function (e) {
    var c = combat; if (!c || c.phase === 'enemy' || !c.targeting || c.busy) return;
    var u = e.target.closest('.unit'); if (!u || !u.classList.contains('targetable')) return;
    executeOn();
  });
  document.getElementById('centerCards').addEventListener('click', function (e) {
    var c = combat; if (!c || c.phase === 'enemy' || c.targeting || c.busy) return;
    var card = e.target.closest('.combat-card'); if (!card) return;
    var uid = card.dataset.uid; c.sel = (c.sel && c.sel.uid === uid) ? null : { uid: uid }; renderCombat();
  });
  document.getElementById('actionBar').addEventListener('click', function (e) {
    var b = e.target.closest('.act-btn'); if (!b || b.disabled) return;
    var c = combat; if (!c.sel || c.busy) return;
    var act = b.dataset.act;
    if (act === 'cancel') { c.sel = null; c.targeting = false; renderCombat(); return; }
    var h = heroByUid(c.sel.uid); if (!h) return;
    if (act === 'attack') { c.targeting = true; c.pendKind = 'attack'; renderCombat(); return; }
    var sk = h.def.skill;
    if (sk.type === 'charm' || sk.type === 'confuse') { TCG.toast('레이드 보스는 혼란·매혹(행동 불가)에 면역입니다'); return; }
    if (sk.type !== 'heal' && c.lord.mp < skillMp(sk)) { TCG.toast('MP가 부족합니다'); return; }
    if (sk.type === 'strike') { c.targeting = true; c.pendKind = 'skill'; renderCombat(); }
    else doSkill(h, true);
  });
  function executeOn() {
    var c = combat, h = heroByUid(c.sel.uid); if (!h) return;
    if (c.pendKind === 'attack') doAttack(h); else doSkill(h, true);
  }

  function dmgBoss(dmg, crit) {
    var b = combat.boss, d = dmg;
    if (b.block > 0) { var ab = Math.min(b.block, d); b.block -= ab; d -= ab; }
    b.hp = Math.max(0, b.hp - d);
    fxHitBoss(dmg, crit);
  }
  function doAttack(h) {
    var c = combat, b = c.boss, dmg = effAtk(h), hits = hasWpnFlag(h, 'doubleStrike') ? 2 : 1;
    c.busy = true; // 다회 공격은 타격마다 끊어서 연출
    var total = 0, anyCrit = false, k = 0;
    function step() {
      if (k >= hits || b.hp <= 0) { return done(); }
      k++;
      TCG.sfx('attack');
      var crit = rollCrit(critChance(h)); var hd = crit ? dmg * 2 : dmg;
      if (crit) anyCrit = true;
      dmgBoss(hd, crit); shake(crit ? 'big' : 'sm'); total += hd;
      renderCombat();
      setTimeout(step, hits > 1 ? 240 : 120);
    }
    function done() {
      var pv = wpnVal(h, 'poison'); if (pv && b.hp > 0) { b.poison = (b.poison || 0) + pv; logMsg(b.name + '에 독 +' + pv); }
      logMsg(h.def.name + ' → ' + b.name + ' ' + total + ' 피해' + (anyCrit ? ' (치명타!)' : ''));
      c.busy = false;
      finishPlay();
    }
    step();
  }
  function doSkill(h) {
    var c = combat, b = c.boss, sk = h.def.skill;
    if (sk.type !== 'heal') c.lord.mp = Math.max(0, c.lord.mp - skillMp(sk));
    TCG.sfx(sk.type === 'heal' ? 'heal' : 'skill');
    var pw = effAtk(h);
    if (sk.type === 'strike') { var sc = rollCrit(critChance(h)); var sd = (pw + sk.val) * (sc ? 2 : 1); dmgBoss(sd, sc); shake('big'); logMsg(h.def.name + ' 「' + sk.name + '」 ' + sd + ' 피해' + (sc ? ' (치명타!)' : '')); }
    else if (sk.type === 'aoe') { var ac = rollCrit(critChance(h)); var av = sk.val * (ac ? 2 : 1); if (b.hp > 0) dmgBoss(av, ac); shake('big'); logMsg(h.def.name + ' 「' + sk.name + '」 ' + av + ' 피해' + (ac ? ' (치명타!)' : '')); }
    else if (sk.type === 'multi') {
      // 다회 공격 스킬은 타격당 기본 공격력의 1/N(반올림)
      var perHit = Math.max(1, Math.round(pw / sk.val));
      c.busy = true; var mi = 0; // 타격마다 끊어서 연출
      (function mhit() {
        if (mi >= sk.val || b.hp <= 0) { logMsg(h.def.name + ' 「' + sk.name + '」 ' + sk.val + '회 공격(타격당 ' + perHit + ')'); c.busy = false; finishPlay(); return; }
        mi++; TCG.sfx('attack'); var mc = rollCrit(critChance(h)); dmgBoss(mc ? perHit * 2 : perHit, mc); shake('sm'); renderCombat(); setTimeout(mhit, 210); })();
      return; // 비동기 처리 — 아래 공통 finishPlay 건너뜀
    }
    else if (sk.type === 'confuse' || sk.type === 'charm') { fxSupport(bossEl(), '🛡 면역', '#cfd8e3'); logMsg(b.name + ' — ' + (sk.type === 'charm' ? '매혹' : '혼란') + ' 면역!'); } // 레이드 보스는 행동 불가 면역
    else if (sk.type === 'heal') { c.lord.hp = Math.min(c.lord.maxHp, c.lord.hp + sk.val); var mh = Math.round(sk.val / 4); if (mh) c.lord.mp = Math.min(c.lord.maxMp, c.lord.mp + mh); if (h.def.id === 'oracle') c.lord.block += 5; fxSupport(lordEl(), '+' + sk.val + (mh ? ' 💧+' + mh : ''), '#7ef0b5'); logMsg(h.def.name + ' 「' + sk.name + '」 주공 ' + sk.val + ' 회복' + (mh ? ' · MP +' + mh : '')); }
    else if (sk.type === 'shield') { c.lord.block += sk.val; fxSupport(lordEl(), '🛡+' + sk.val, '#9fd2ff'); logMsg(h.def.name + ' 「' + sk.name + '」 주공 방어막 +' + sk.val); }
    else if (sk.type === 'buff') { c.atkBuff = (c.atkBuff || 0) + sk.val; fxSupport(lordEl(), '⚔+' + sk.val, '#ffd86b'); logMsg(h.def.name + ' 「' + sk.name + '」 전군 공격력 +' + sk.val); }
    finishPlay();
  }
  function finishPlay() {
    var c = combat;
    if (c.sel) { var i = c.center.indexOf(c.sel.uid); if (i !== -1) { c.center.splice(i, 1); c.used.push(c.sel.uid); } }
    c.sel = null; c.targeting = false;
    renderCombat();
    if (c.boss.hp <= 0) { setTimeout(winRaid, 550); }
  }

  document.getElementById('endTurnBtn').addEventListener('click', function () {
    var c = combat; if (!c || c.phase === 'enemy' || c.targeting || c.over || c.busy) return;
    var total = 0, n = 0;
    c.center.slice().forEach(function (uid) { var h = heroByUid(uid); if (h) { total += defenseOf(h); n++; } c.used.push(uid); });
    c.center = []; c.sel = null;
    if (total) { c.lord.block += total; fxSupport(lordEl(), '🛡+' + total, '#9fd2ff'); TCG.sfx('skill'); logMsg(n + '명이 방어해 주공 블록 +' + total); }
    bossPhase();
  });

  function dmgLord(dmg, crit) {
    var L = combat.lord, d = dmg, blocked = 0;
    if (L.block > 0) { var ab = Math.min(L.block, d); L.block -= ab; d -= ab; blocked = ab; }
    L.hp = Math.max(0, L.hp - d);
    fxHitLord(d, blocked, crit);
  }
  // 보스가 대응 장수의 원래 스킬을 사용(주공 대상). 사용 시 true.
  function bossSkill(b) {
    var c = combat, sk = b.skill;
    b.mp = Math.max(0, b.mp - skillMp(sk));
    fxBanner('👹 ' + b.name + ' 「' + sk.name + '」', 'boss', 1000);
    TCG.sfx(sk.type === 'heal' || sk.type === 'shield' ? 'heal' : 'skill');
    if (sk.type === 'strike') { var crit = rollCrit(BASE_CRIT); var d = b.atk + Math.round(sk.val * 0.5); if (crit) d *= 2; shake('big'); dmgLord(d, crit); logMsg(b.name + ' 「' + sk.name + '」 주공 ' + d + ' 피해' + (crit ? ' (치명타!)' : '')); }
    else if (sk.type === 'aoe') { var d2 = Math.round(sk.val * 0.6) + Math.round(b.atk * 0.3); shake('big'); dmgLord(d2, false); logMsg(b.name + ' 「' + sk.name + '」 주공 ' + d2 + ' 피해'); }
    else if (sk.type === 'multi') { var tot = 0; for (var i = 0; i < sk.val; i++) { if (c.lord.hp <= 0) break; var dd = Math.max(1, Math.round(b.atk * 0.5)); dmgLord(dd, false); tot += dd; } shake('sm'); logMsg(b.name + ' 「' + sk.name + '」 ' + sk.val + '연타 ' + tot + ' 피해'); }
    else if (sk.type === 'heal') { b.hp = Math.min(b.maxHp, b.hp + sk.val); fxSupport(bossEl(), '+' + sk.val, '#7ef0b5'); logMsg(b.name + ' 「' + sk.name + '」 ' + sk.val + ' 회복'); }
    else if (sk.type === 'shield') { b.block += sk.val; fxSupport(bossEl(), '🛡+' + sk.val, '#9fd2ff'); logMsg(b.name + ' 「' + sk.name + '」 방어막 +' + sk.val); }
    else if (sk.type === 'buff') { var cap = (b.atk0 || b.atk) + Math.round((b.atk0 || b.atk) * 0.6); var gain = Math.min(sk.val, Math.max(0, cap - b.atk)); if (gain > 0) { b.atk += gain; fxSupport(bossEl(), '⚔+' + gain, '#ffd86b'); logMsg(b.name + ' 「' + sk.name + '」 공격력 +' + gain); } else { var bd = Math.max(1, Math.round(b.atk * 0.7)); dmgLord(bd, false); logMsg(b.name + ' 「' + sk.name + '」 주공 ' + bd + ' 피해'); } }
    else { var d3 = Math.max(1, Math.round(b.atk * 0.5)); dmgLord(d3, false); logMsg(b.name + ' 「' + sk.name + '」 주공 교란 ' + d3 + ' 피해'); }
    return true;
  }
  function bossPhase() {
    var c = combat, b = c.boss;
    c.phase = 'enemy'; c.sel = null; c.targeting = false;
    if (b.poison > 0) { b.hp = Math.max(0, b.hp - b.poison); fxHitBoss(b.poison, false); logMsg(b.name + ' 독 피해 ' + b.poison); }
    renderCombat();
    if (b.hp <= 0) { setTimeout(winRaid, 550); return; }
    if (b.charmed > 0 || b.confused > 0) { var was = b.charmed > 0 ? '매혹' : '혼란'; if (b.charmed > 0) b.charmed--; else b.confused--; fxSupport(bossEl(), '💤 ' + was, '#ff9ad0'); logMsg(b.name + ' ' + was + '되어 행동 불가'); renderCombat(); setTimeout(function () { c.phase = 'player'; beginRound(); }, 700); return; }
    fxBanner('보스의 턴', 'foe-turn', 800);
    setTimeout(function () {
      var usedSkill = (b.skill && b.mp >= skillMp(b.skill) && Math.random() < (b.skillChance || 0)) ? bossSkill(b) : false;
      if (!usedSkill) {
        var intent = b.intent, crit = rollCrit(BASE_CRIT), dmg = crit ? intent.dmg * 2 : intent.dmg;
        TCG.sfx('hit'); shake(crit || intent.type === 'aoe' ? 'big' : 'sm');
        dmgLord(dmg, crit);
        logMsg(b.name + ' → 주공 ' + dmg + ' 피해' + (crit ? ' (치명타!)' : ''));
      }
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
      var gold = (HW_BOSS[diff] || HW_BOSS.normal).raidGold;
      addBonusGold(gold);
      goldHtml = '<div class="raid-result-gold">💰 삼국 영웅전 골드 +' + gold + ' 적립 (다음 영웅전 진입 시 반영)</div>';
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
  function heroPath(d) {
    if (HW_STARTERS.indexOf(d.id) !== -1) return '🏳️ 시작 장수 (처음부터 보유)';
    if (d.exclusive === 'qb') return '🃏 히어로즈 블러드 3연승 보상';
    if (d.exclusive === 'raid') {
      var rb = null; HW_RAID.bosses.forEach(function (b) { if (b.reward === d.id) rb = b; });
      return '👹 삼국 대장전 — ' + (rb ? HW_COMMANDERS[rb.key].name : '적장') + ' 격파 보상 (대장전에서만 획득)';
    }
    return '⚔️ 전투 보상 영입 · 🏪 저잣거리 구매';
  }
  function weaponPath(w) { return w.exclusive === 'collection' ? '📕 장수 도감 100% 완료 보상' : '💎 보물상자(출진 5·10회) · 🏪 저잣거리'; }
  function openRoster() {
    TCG.sfx('tap');
    document.getElementById('rosterCount').textContent = party.length;
    document.getElementById('rosterGrid').innerHTML = party.map(function (h) {
      var ws = heroWpns(h).map(function (w) { return w.emoji; }).join('');
      return '<div class="col-card">' + TCG.portrait(h.def.emoji, h.def.id, '', h.def.name) +
        '<div class="col-name">' + h.def.name + '</div>' +
        '<div class="col-rar rar-' + h.def.rarity + '">' + h.def.rarity + ' · ⚔' + effAtk(h) + (ws ? ' ' + ws : '') + '</div></div>';
    }).join('') || '<p class="screen-sub">장수가 없습니다</p>';
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
    document.getElementById('heroColGrid').innerHTML = HW_HEROES.map(function (d) {
      var got = col.indexOf(d.id) !== -1;
      return '<div class="col-card' + (got ? '' : ' locked') + '" data-id="' + d.id + '">' + TCG.portrait(d.emoji, d.id, '', d.name) +
        '<div class="col-name">' + d.name + '</div><div class="col-rar rar-' + d.rarity + '">' + d.rarity + ' · ' + d.cls + '</div>' +
        (got ? '' : '<div class="col-lock">🔒</div>') + '</div>';
    }).join('');
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
  function showCodexTab(tab) {
    var hero = tab !== 'weapon';
    document.getElementById('codexHeroPanel').hidden = !hero;
    document.getElementById('codexWeaponPanel').hidden = hero;
    document.getElementById('codexTabHero').classList.toggle('active', hero);
    document.getElementById('codexTabWeapon').classList.toggle('active', !hero);
  }
  function openCodex(tab) { TCG.sfx('tap'); renderHeroCodex(); renderWeaponCodex(); showCodexTab(tab || 'hero'); document.getElementById('codexModal').hidden = false; }
  document.getElementById('rosterBtn').addEventListener('click', openRoster);
  document.getElementById('gearBtn').addEventListener('click', openGear);
  document.getElementById('codexBtn').addEventListener('click', function () { openCodex('hero'); });
  document.getElementById('codexTabHero').addEventListener('click', function () { TCG.sfx('tap'); showCodexTab('hero'); });
  document.getElementById('codexTabWeapon').addEventListener('click', function () { TCG.sfx('tap'); showCodexTab('weapon'); });
  document.getElementById('heroColGrid').addEventListener('click', function (e) {
    var c = e.target.closest('.col-card'); if (!c || !c.dataset.id) return;
    var d = HW_BY_ID[c.dataset.id]; if (!d) return;
    var got = lsArr('hw_collected_heroes').indexOf(d.id) !== -1, slots = slotsForRarity(d.rarity);
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
    var got = lsArr('hw_collected_weapons').indexOf(w.id) !== -1;
    document.getElementById('weaponColDetail').innerHTML =
      '<b>' + w.emoji + ' ' + w.name + '</b> · ' + (got ? '<span class="cd-got">보유 중</span>' : '<span class="cd-no">미보유</span>') +
      '<br><span class="cd-sub">' + w.desc + '</span>' +
      '<br><span class="cd-sub">💰 가치 ' + weaponCost(w) + ' 골드</span>' +
      '<br><span class="cd-path">획득 경로: ' + weaponPath(w) + '</span>';
    TCG.sfx('tap');
  });
  [['rosterClose', 'rosterModal'], ['gearClose', 'gearModal'], ['codexClose', 'codexModal']].forEach(function (p) {
    document.getElementById(p[0]).addEventListener('click', function () { document.getElementById(p[1]).hidden = true; });
    document.getElementById(p[1]).addEventListener('click', function (e) { if (e.target.id === p[1]) e.currentTarget.hidden = true; });
  });

  /* ---------- boot ---------- */
  TCG.initFloatMenu();
  var muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.textContent = TCG.isMuted() ? '🔇 소리' : '🔊 소리';
    muteBtn.addEventListener('click', function () { var m = TCG.toggleMute(); muteBtn.textContent = m ? '🔇 소리' : '🔊 소리'; TCG.audioResume(); if (!m) TCG.sfx('tap'); });
  }
  renderSelect();
})();
