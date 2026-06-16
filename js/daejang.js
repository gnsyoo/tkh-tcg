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
    document.getElementById('diffPill').textContent = '난이도 ' + TCG.diffLabel(diff);
    var html = HW_RAID.bosses.map(function (b, i) {
      var cmd = HW_COMMANDERS[b.key];
      var rew = HW_BY_ID[b.reward];
      var done = isCleared(b.key);
      var got = collected(b.reward);
      var hp = Math.round(cmd.hp * HW_RAID.hpMult);
      return '<div class="raid-card' + (done ? ' done' : '') + '" data-i="' + i + '">' +
        '<div class="raid-boss">' + TCG.portrait(cmd.emoji, b.key, 'raid-art') +
          '<div class="raid-bossinfo"><b>' + cmd.name + '</b><small>' + b.title + ' · ❤ ' + hp + (cmd.aoe ? ' · 광역' : '') + '</small></div>' +
          (done ? '<span class="raid-clear">✔ 격파</span>' : '') +
        '</div>' +
        '<div class="raid-reward' + (got ? '' : ' locked') + '">🎁 보상 장수: <b>' + rew.name + '</b> <span class="rar-' + rew.rarity + '">' + rew.rarity + '</span>' + (got ? ' <span class="raid-owned">보유</span>' : '') + '</div>' +
        '<button class="camp-btn primary raid-go" data-i="' + i + '">⚔️ ' + (done ? '재도전' : '도전') + '</button>' +
        '</div>';
    }).join('');
    document.getElementById('raidList').innerHTML = html;
    show('selectScreen');
  }
  document.getElementById('raidList').addEventListener('click', function (e) {
    var btn = e.target.closest('.raid-go'); if (!btn) return;
    TCG.sfx('tap');
    startRaid(parseInt(btn.dataset.i, 10));
  });

  /* ---------- combat ---------- */
  function startRaid(idx) {
    var b = HW_RAID.bosses[idx];
    var cmd = HW_COMMANDERS[b.key];
    var hp = Math.round(cmd.hp * HW_RAID.hpMult);
    var atk = Math.max(2, Math.round(cmd.atk * HW_RAID.atkMult * DCFG.eAtk));
    var mhp = lordMaxHp(), mmp = lordMaxMp();
    combat = {
      raidIdx: idx, boss: { def: cmd, name: cmd.name, emoji: cmd.emoji, maxHp: hp, hp: hp, atk: atk, aoe: !!cmd.aoe, block: 0, poison: 0, charmed: 0, intent: null },
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
    var dead = b.hp <= 0, charmed = b.charmed > 0;
    var tgt = c.targeting && !dead;
    var intentTxt = charmed ? '💤 매혹' : (b.intent ? (b.intent.type === 'aoe' ? '💥' + b.intent.dmg : '⚔️' + b.intent.dmg) : '');
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
    document.getElementById('endTurnBtn').disabled = (c.phase === 'enemy');
    var hint = document.getElementById('combatHint');
    hint.textContent = c.phase === 'enemy' ? '보스가 행동 중…' : (c.targeting ? '보스를 선택하세요' : (c.sel ? '행동을 선택하세요' : '가운데 카드로 공격하거나, 턴 종료 시 남은 카드로 방어합니다'));
  }
  function renderPiles() {
    var c = combat;
    var ds = ''; for (var i = 0; i < Math.min(c.draw.length, 5); i++) ds += '<div class="pile-card" style="--i:' + i + '"></div>';
    document.getElementById('drawPile').innerHTML = ds + '<div class="pile-label">뽑을 카드 <b>' + c.draw.length + '</b></div>';
    var canAct = c.phase !== 'enemy' && !c.targeting;
    var cardsHtml = c.center.map(function (uid) {
      var h = heroByUid(uid); if (!h) return ''; var sk = h.def.skill;
      var sel = c.sel && c.sel.uid === uid && !c.targeting;
      var cls = 'combat-card' + (sel ? ' selected' : '') + (canAct ? '' : ' unplayable');
      var ws = heroWpns(h), wE = ws.map(function (w) { return w.emoji; }).join(''), wN = ws.map(function (w) { return w.name; }).join(', ');
      return '<div class="' + cls + '" data-uid="' + uid + '">' + TCG.portrait(h.def.emoji, h.def.id, 'cc-art') +
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
    var canSkill = isHeal || c.lord.mp >= mp;
    var mpLabel = isHeal ? ('💧+' + Math.round(sk.val / 4) + ' 회복') : ('💧' + mp);
    var critPct = Math.round(critChance(h) * 100);
    bar.hidden = false;
    bar.innerHTML =
      '<button class="act-btn" data-act="attack">기본 공격<small>피해 ' + effAtk(h) + (hasWpnFlag(h, 'doubleStrike') ? ' ×2' : '') + (wpnVal(h, 'poison') ? ' ☠' + wpnVal(h, 'poison') : '') + (critPct > 1 ? ' 💥' + critPct + '%' : '') + '</small></button>' +
      '<button class="act-btn skill" data-act="skill"' + (canSkill ? '' : ' disabled') + '>' + sk.name + '<small>' + mpLabel + ' · ' + sk.desc + '</small></button>' +
      '<button class="act-btn cancel" data-act="cancel">취소</button>';
  }

  /* ---------- input ---------- */
  document.getElementById('enemyRow').addEventListener('click', function (e) {
    var c = combat; if (!c || c.phase === 'enemy' || !c.targeting) return;
    var u = e.target.closest('.unit'); if (!u || !u.classList.contains('targetable')) return;
    executeOn();
  });
  document.getElementById('centerCards').addEventListener('click', function (e) {
    var c = combat; if (!c || c.phase === 'enemy' || c.targeting) return;
    var card = e.target.closest('.combat-card'); if (!card) return;
    var uid = card.dataset.uid; c.sel = (c.sel && c.sel.uid === uid) ? null : { uid: uid }; renderCombat();
  });
  document.getElementById('actionBar').addEventListener('click', function (e) {
    var b = e.target.closest('.act-btn'); if (!b || b.disabled) return;
    var c = combat; if (!c.sel) return;
    var act = b.dataset.act;
    if (act === 'cancel') { c.sel = null; c.targeting = false; renderCombat(); return; }
    var h = heroByUid(c.sel.uid); if (!h) return;
    if (act === 'attack') { c.targeting = true; c.pendKind = 'attack'; renderCombat(); return; }
    var sk = h.def.skill;
    if (sk.type !== 'heal' && c.lord.mp < skillMp(sk)) { TCG.toast('MP가 부족합니다'); return; }
    if (sk.type === 'strike' || sk.type === 'charm') { c.targeting = true; c.pendKind = 'skill'; renderCombat(); }
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
    TCG.sfx('attack');
    var total = 0, anyCrit = false;
    for (var k = 0; k < hits; k++) { if (b.hp <= 0) break; var crit = rollCrit(critChance(h)); var hd = crit ? dmg * 2 : dmg; if (crit) anyCrit = true; dmgBoss(hd, crit); total += hd; }
    var pv = wpnVal(h, 'poison'); if (pv && b.hp > 0) { b.poison = (b.poison || 0) + pv; logMsg(b.name + '에 독 +' + pv); }
    shake(anyCrit ? 'big' : 'sm');
    logMsg(h.def.name + ' → ' + b.name + ' ' + total + ' 피해' + (anyCrit ? ' (치명타!)' : ''));
    finishPlay();
  }
  function doSkill(h) {
    var c = combat, b = c.boss, sk = h.def.skill;
    if (sk.type !== 'heal') c.lord.mp = Math.max(0, c.lord.mp - skillMp(sk));
    TCG.sfx(sk.type === 'heal' ? 'heal' : 'skill');
    var pw = effAtk(h);
    if (sk.type === 'strike') { dmgBoss(pw + sk.val); shake('big'); logMsg(h.def.name + ' 「' + sk.name + '」 ' + (pw + sk.val) + ' 피해'); }
    else if (sk.type === 'aoe') { if (b.hp > 0) dmgBoss(sk.val); shake('big'); logMsg(h.def.name + ' 「' + sk.name + '」 ' + sk.val + ' 피해'); }
    else if (sk.type === 'multi') { for (var i = 0; i < sk.val; i++) { if (b.hp <= 0) break; dmgBoss(pw); } shake('sm'); logMsg(h.def.name + ' 「' + sk.name + '」 ' + sk.val + '회 공격'); }
    else if (sk.type === 'heal') { c.lord.hp = Math.min(c.lord.maxHp, c.lord.hp + sk.val); var mh = Math.round(sk.val / 4); if (mh) c.lord.mp = Math.min(c.lord.maxMp, c.lord.mp + mh); if (h.def.id === 'oracle') c.lord.block += 5; fxSupport(lordEl(), '+' + sk.val + (mh ? ' 💧+' + mh : ''), '#7ef0b5'); logMsg(h.def.name + ' 「' + sk.name + '」 주공 ' + sk.val + ' 회복' + (mh ? ' · MP +' + mh : '')); }
    else if (sk.type === 'shield') { c.lord.block += sk.val; fxSupport(lordEl(), '🛡+' + sk.val, '#9fd2ff'); logMsg(h.def.name + ' 「' + sk.name + '」 주공 방어막 +' + sk.val); }
    else if (sk.type === 'buff') { c.atkBuff = (c.atkBuff || 0) + sk.val; fxSupport(lordEl(), '⚔+' + sk.val, '#ffd86b'); logMsg(h.def.name + ' 「' + sk.name + '」 전군 공격력 +' + sk.val); }
    else if (sk.type === 'charm') { if (b.hp > 0) { b.charmed = (b.charmed || 0) + sk.val; fxSupport(bossEl(), '💗 매혹', '#ff9ad0'); logMsg(h.def.name + ' 「' + sk.name + '」 ' + b.name + ' ' + sk.val + '턴 매혹'); } }
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
    var c = combat; if (!c || c.phase === 'enemy' || c.targeting || c.over) return;
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
  function bossPhase() {
    var c = combat, b = c.boss;
    c.phase = 'enemy'; c.sel = null; c.targeting = false;
    if (b.poison > 0) { b.hp = Math.max(0, b.hp - b.poison); fxHitBoss(b.poison, false); logMsg(b.name + ' 독 피해 ' + b.poison); }
    renderCombat();
    if (b.hp <= 0) { setTimeout(winRaid, 550); return; }
    if (b.charmed > 0) { b.charmed--; fxSupport(bossEl(), '💤 매혹', '#ff9ad0'); logMsg(b.name + ' 매혹되어 행동 불가'); renderCombat(); setTimeout(function () { c.phase = 'player'; beginRound(); }, 700); return; }
    fxBanner('보스의 턴', 'foe-turn', 800);
    setTimeout(function () {
      var intent = b.intent, crit = rollCrit(BASE_CRIT), dmg = crit ? intent.dmg * 2 : intent.dmg;
      TCG.sfx('hit'); shake(crit || intent.type === 'aoe' ? 'big' : 'sm');
      dmgLord(dmg, crit);
      logMsg(b.name + ' → 주공 ' + dmg + ' 피해' + (crit ? ' (치명타!)' : ''));
      renderCombat();
      if (c.lord.hp <= 0) { setTimeout(loseRaid, 400); return; }
      c.phase = 'player'; beginRound();
    }, 520);
  }

  function winRaid() {
    var c = combat; if (c.over) return; c.over = true;
    TCG.sfx('win');
    var b = HW_RAID.bosses[c.raidIdx], rew = HW_BY_ID[b.reward];
    markCleared(b.key);
    var already = collected(b.reward);
    if (!already) grantHero(b.reward);
    document.getElementById('overTitle').textContent = '🏆 ' + c.boss.name + ' 격파!';
    document.getElementById('overText').textContent = b.title + ' ' + c.boss.name + '을(를) 토벌했습니다.';
    document.getElementById('overReward').innerHTML = already
      ? '<div class="raid-result-rew owned">이미 보유한 장수입니다 — <b>' + rew.name + '</b></div>'
      : '<div class="raid-result-rew">🎁 전용 장수 <b>' + rew.name + '</b> <span class="rar-' + rew.rarity + '">' + rew.rarity + '</span> 획득!<br><small>삼국 영웅전에서 합류합니다</small></div>';
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

  /* ---------- boot ---------- */
  TCG.initFloatMenu();
  var muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.textContent = TCG.isMuted() ? '🔇 소리' : '🔊 소리';
    muteBtn.addEventListener('click', function () { var m = TCG.toggleMute(); muteBtn.textContent = m ? '🔇 소리' : '🔊 소리'; TCG.audioResume(); if (!m) TCG.sfx('tap'); });
  }
  renderSelect();
})();
