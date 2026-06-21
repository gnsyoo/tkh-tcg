/* ===== Queen's Blood — engine & UI ===== */
(function () {
  var COLS = 5;
  function getRows() {
    var v = parseInt(lsGet('qb_rows') || '3', 10);
    return (v === 3 || v === 4 || v === 5) ? v : 3; // 3×5 / 4×5 / 5×5
  }
  var ROWS = getRows();
  var diff = TCG.getDifficulty();

  var state = null;

  /* ---------- helpers on a board ---------- */
  function makeBoard() {
    var b = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) row.push({ rank: 0, owner: null, card: null });
      b.push(row);
    }
    // starting columns
    for (var rr = 0; rr < ROWS; rr++) {
      b[rr][0].owner = 'you'; b[rr][0].rank = 1;
      b[rr][COLS - 1].owner = 'foe'; b[rr][COLS - 1].rank = 1;
    }
    return b;
  }

  function dir(owner) { return owner === 'you' ? 1 : -1; }

  function offCell(r, c, off, owner) {
    var nr = r + off[0];
    var nc = c + off[1] * dir(owner);
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return null;
    return [nr, nc];
  }

  function cloneBoard(b) {
    return b.map(function (row) {
      return row.map(function (cell) {
        return {
          rank: cell.rank,
          owner: cell.owner,
          card: cell.card ? { def: cell.card.def, owner: cell.card.owner } : null
        };
      });
    });
  }

  function canPlace(b, def, owner, r, c) {
    var cell = b[r][c];
    // 점령한 칸의 폰 레벨 이하의 등급(핍)을 가진 카드만 배치 가능 (예: 레벨4 칸 → 등급 1·2·3·4)
    return cell.card === null && cell.owner === owner && cell.rank >= 1 && def.rank <= cell.rank;
  }

  function placeOnBoard(b, def, owner, r, c) {
    var cell = b[r][c];
    cell.card = { def: def, owner: owner };
    cell.owner = owner;
    // enhancement: 빈 칸 점령/강화. 상대가 점령한 '빈' 칸은 빼앗을 수 있음(카드 놓인 칸은 불가)
    def.enh.forEach(function (off) {
      var t = offCell(r, c, off, owner);
      if (!t) return;
      var tc = b[t[0]][t[1]];
      if (tc.card) return; // 카드가 놓인 칸은 점령 불가
      if (tc.owner === null || tc.owner === owner) {
        // 빈 중립 칸 / 내 칸 → 폰 +1 (최대 3)
        tc.owner = owner;
        tc.rank = Math.min(3, tc.rank + 1);
      } else {
        // 상대가 점령한 빈 칸 → 빼앗아 내 폰 1로 초기화(상대 폰 덮어쓰기)
        tc.owner = owner;
        tc.rank = 1;
      }
    });
  }

  // ability target cells (absolute), for a source card at (sr,sc)
  function abilityTargets(b, sr, sc, owner, ab) {
    var out = [];
    if (ab.scope === 'row') {
      for (var c = 0; c < COLS; c++) if (c !== sc) out.push([sr, c]);
    } else if (ab.cells) {
      ab.cells.forEach(function (off) {
        var t = offCell(sr, sc, off, owner);
        if (t) out.push(t);
      });
    }
    return out;
  }

  // effective power grid
  function effGrid(b) {
    var g = [];
    for (var r = 0; r < ROWS; r++) { g.push([]); for (var c = 0; c < COLS; c++) g[r].push(null); }
    for (var rr = 0; rr < ROWS; rr++) {
      for (var cc = 0; cc < COLS; cc++) {
        var cell = b[rr][cc];
        if (!cell.card) continue;
        g[rr][cc] = cell.card.def.power;
      }
    }
    // apply abilities
    for (var sr = 0; sr < ROWS; sr++) {
      for (var sc = 0; sc < COLS; sc++) {
        var src = b[sr][sc];
        if (!src.card) continue;
        var ab = src.card.def.ab;
        if (!ab) continue;
        var targets = abilityTargets(b, sr, sc, src.card.owner, ab);
        targets.forEach(function (t) {
          var tc = b[t[0]][t[1]];
          if (!tc.card || g[t[0]][t[1]] === null) return;
          var sameOwner = tc.card.owner === src.card.owner;
          if (ab.who === 'ally' && !sameOwner) return;
          if (ab.who === 'enemy' && sameOwner) return;
          g[t[0]][t[1]] += (ab.t === 'buff' ? ab.val : -ab.val);
        });
      }
    }
    for (var a = 0; a < ROWS; a++) for (var d = 0; d < COLS; d++) if (g[a][d] !== null) g[a][d] = Math.max(0, g[a][d]);
    return g;
  }

  function laneSums(b) {
    var g = effGrid(b);
    var lanes = [];
    for (var r = 0; r < ROWS; r++) {
      var you = 0, foe = 0;
      for (var c = 0; c < COLS; c++) {
        var cell = b[r][c];
        if (!cell.card) continue;
        if (cell.card.owner === 'you') you += g[r][c]; else foe += g[r][c];
      }
      lanes.push({ you: you, foe: foe });
    }
    return lanes;
  }

  function scoreOf(b) {
    // 승패 정산: 배치한 모든 카드의 (효과 적용) 무력 총합이 높은 쪽이 승리
    var lanes = laneSums(b);
    var you = 0, foe = 0;
    lanes.forEach(function (l) { you += l.you; foe += l.foe; });
    return { you: you, foe: foe, lanes: lanes };
  }

  function territory(b, owner) {
    var t = 0;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (b[r][c].owner === owner) t += b[r][c].rank;
    return t;
  }

  function legalMovesFor(b, hand, owner) {
    var moves = [];
    for (var i = 0; i < hand.length; i++) {
      var def = hand[i];
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (canPlace(b, def, owner, r, c)) moves.push({ idx: i, def: def, r: r, c: c });
        }
      }
    }
    return moves;
  }

  function boardFull(b) {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (!b[r][c].card) return false;
    return true;
  }

  /* ---------- AI ---------- */
  function aiChoose(b, hand, oppHand) {
    var moves = legalMovesFor(b, hand, 'foe');
    if (!moves.length) return null;
    if (diff === 'easy') {
      // mostly random, slight lean to higher power
      if (Math.random() < 0.5) return TCG.pick(moves);
      moves.sort(function (a, z) { return z.def.power - a.def.power; });
      return moves[TCG.rand(Math.min(3, moves.length))];
    }
    var base = scoreOf(b);
    var baseTerr = territory(b, 'foe');
    var best = null, bestVal = -1e9;
    moves.forEach(function (m) {
      var sim = cloneBoard(b);
      placeOnBoard(sim, m.def, 'foe', m.r, m.c);
      var s = scoreOf(sim);
      var terrGain = territory(sim, 'foe') - baseTerr;
      var val = (s.foe - s.you) - (base.foe - base.you) + 0.45 * terrGain;
      if (diff === 'hard') {
        // one-ply: opponent's best reply using their actual hand
        var youTerr = territory(sim, 'you');
        var reps = legalMovesFor(sim, oppHand, 'you');
        var bestReply = 0;
        reps.forEach(function (rm) {
          var sim2 = cloneBoard(sim);
          placeOnBoard(sim2, rm.def, 'you', rm.r, rm.c);
          var s2 = scoreOf(sim2);
          // 점령 규칙 도입 후: 상대가 내(foe) 영역을 빼앗는 강수를 더 경계
          var rv = (s2.you - s2.foe) + 0.3 * (territory(sim2, 'you') - youTerr);
          if (rv > bestReply) bestReply = rv;
        });
        val -= 0.8 * bestReply;
      }
      // tiny randomness to avoid ties being deterministic
      val += Math.random() * 0.05;
      if (val > bestVal) { bestVal = val; best = m; }
    });
    return best;
  }

  /* ---------- game lifecycle ---------- */
  function buildDeck(ids) {
    return TCG.shuffle(ids.map(function (id) { return QB_BY_ID[id]; }));
  }

  function draw(player, n) {
    for (var i = 0; i < n; i++) {
      if (player.hand.length >= 8) break;
      if (!player.deck.length) break;
      player.hand.push(player.deck.pop());
    }
  }

  var DECK_SIZE = 15;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function getPlayerDeck() {
    var saved = lsGet('qb_deck');
    if (saved) {
      try {
        var ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length === DECK_SIZE && ids.every(function (id) { return QB_BY_ID[id]; })) return ids;
      } catch (e) {}
    }
    return QB_DECK_PLAYER.slice();
  }

  function newGame() {
    var aiIds = diff === 'hard' ? QB_DECK_AI_HARD : QB_DECK_AI_NORMAL;
    state = {
      board: makeBoard(),
      you: { deck: buildDeck(getPlayerDeck()), hand: [], lastPass: false },
      foe: { deck: buildDeck(aiIds), hand: [], lastPass: false },
      turn: 'you',
      selected: -1,
      over: false,
      busy: false,
      awaitingEnd: false,
      youPasses: 0
    };
    document.getElementById('confirmEndModal').hidden = true;
    draw(state.you, 5);
    draw(state.foe, 5);
    render();
    scheduleFit(); // 보드 크기를 화면에 맞춤
    startTurn();
  }

  function startTurn() {
    if (state.over) return;
    var p = state[state.turn];
    draw(p, 1);
    var moves = legalMovesFor(state.board, p.hand, state.turn);
    render();
    if (!moves.length) {
      // forced pass
      TCG.toast(state.turn === 'you' ? TCG.t('qx.forcedPassYou') : TCG.t('qx.forcedPassFoe'));
      doPass(true);
      return;
    }
    if (state.turn === 'foe') {
      state.busy = true;
      render();
      TCG.delay(650).then(function () {
        var m = aiChoose(state.board, state.foe.hand, state.you.hand);
        state.busy = false;
        if (!m) { doPass(true); return; }
        placeCard('foe', m.idx, m.r, m.c);
      });
    }
  }

  function placeCard(who, handIdx, r, c) {
    var p = state[who];
    var def = p.hand[handIdx];
    placeOnBoard(state.board, def, who, r, c);
    TCG.sfx('place');
    p.hand.splice(handIdx, 1);
    // 내가 카드를 놓으면 내 패스 누적이 초기화됨 (종료는 '내 패스 2회'로만)
    if (who === 'you') state.youPasses = 0;
    state.you.lastPass = false;
    state.foe.lastPass = false;
    state.selected = -1;
    state.turn = (who === 'you') ? 'foe' : 'you';
    render();
    startTurn();
  }

  function doPass(forced) {
    var who = state.turn;
    state[who].lastPass = true;
    if (!forced) { TCG.sfx('tap'); TCG.toast(who === 'you' ? TCG.t('qx.passYou') : TCG.t('qx.passFoe')); }
    // 내가(플레이어) 2번 패스하면 종료 여부를 물어봄. 상대 패스로는 끝나지 않음.
    if (who === 'you') {
      state.youPasses = (state.youPasses || 0) + 1;
      if (state.youPasses >= 2) { promptEnd(); return; }
    }
    state.selected = -1;
    state.turn = (who === 'you') ? 'foe' : 'you';
    render();
    startTurn();
  }

  function promptEnd() {
    state.awaitingEnd = true;
    state.busy = false;
    render();
    document.getElementById('confirmEndModal').hidden = false;
  }

  // 결과를 삼국 영웅전 골드로 정산: 승리 시 +포인트, 패배 시 -포인트
  function settleHeroesGold(points, win) {
    var delta = win ? points : -points;
    try {
      var cur = parseInt(localStorage.getItem('hw_bonus_gold') || '0', 10) || 0;
      localStorage.setItem('hw_bonus_gold', String(cur + delta));
    } catch (e) {}
    return delta;
  }
  // 연승 보상: 3연승=제갈량(영웅전 전용 장수), 10연승=천자의 밀서(유물, 1회).
  // win=true 연승 누적, 아니면 0으로 초기화. 반환: { oracle, edict } — 이번에 획득한 보상 플래그.
  function updateWinStreak(win) {
    var res = { oracle: false, diaochan: false, edict: false, cixiong: false };
    try {
      var n = parseInt(localStorage.getItem('qb_winstreak') || '0', 10) || 0;
      n = win ? n + 1 : 0;
      var collected = JSON.parse(localStorage.getItem('hw_collected_heroes') || '[]');
      var hasO = Array.isArray(collected) && collected.indexOf('oracle') !== -1;
      var hasD = Array.isArray(collected) && collected.indexOf('diaochan') !== -1;
      var relicsCol = JSON.parse(localStorage.getItem('hw_collected_relics') || '[]');
      var hasE = Array.isArray(relicsCol) && relicsCol.indexOf('edict') !== -1;
      var weaponsCol = JSON.parse(localStorage.getItem('hw_collected_weapons') || '[]');
      var hasCx = Array.isArray(weaponsCol) && weaponsCol.indexOf('cixiong') !== -1;
      if (win && n >= 3 && !hasO) { // 3연승 → 제갈량
        var grants = JSON.parse(localStorage.getItem('hw_grant_heroes') || '[]');
        if (!Array.isArray(grants)) grants = [];
        if (grants.indexOf('oracle') === -1) grants.push('oracle');
        localStorage.setItem('hw_grant_heroes', JSON.stringify(grants));
        if (Array.isArray(collected) && collected.indexOf('oracle') === -1) {
          collected.push('oracle'); localStorage.setItem('hw_collected_heroes', JSON.stringify(collected));
        }
        localStorage.setItem('qb_winstreak', '0'); // 보상 후 초기화
        res.oracle = true; return res;
      }
      if (win && n >= 5 && hasO && !hasD) { // 5연승 → 초선
        var gd = JSON.parse(localStorage.getItem('hw_grant_heroes') || '[]');
        if (!Array.isArray(gd)) gd = [];
        if (gd.indexOf('diaochan') === -1) gd.push('diaochan');
        localStorage.setItem('hw_grant_heroes', JSON.stringify(gd));
        if (Array.isArray(collected) && collected.indexOf('diaochan') === -1) {
          collected.push('diaochan'); localStorage.setItem('hw_collected_heroes', JSON.stringify(collected));
        }
        localStorage.setItem('qb_winstreak', '0'); // 보상 후 초기화
        res.diaochan = true; return res;
      }
      if (win && n >= 10 && hasO && !hasE) { // 10연승 → 천자의 밀서(유물, 1회)
        var rg = JSON.parse(localStorage.getItem('hw_grant_relics') || '[]');
        if (!Array.isArray(rg)) rg = [];
        if (rg.indexOf('edict') === -1) rg.push('edict');
        localStorage.setItem('hw_grant_relics', JSON.stringify(rg));
        if (Array.isArray(relicsCol) && relicsCol.indexOf('edict') === -1) {
          relicsCol.push('edict'); localStorage.setItem('hw_collected_relics', JSON.stringify(relicsCol));
        }
        localStorage.setItem('qb_winstreak', '0'); // 보상 후 초기화
        res.edict = true; return res;
      }
      if (win && n >= 20 && hasE && !hasCx) { // 20연승 → 자웅일대검(장비, 1회)
        var gw = JSON.parse(localStorage.getItem('hw_grant_weapons') || '[]');
        if (!Array.isArray(gw)) gw = [];
        if (gw.indexOf('cixiong') === -1) gw.push('cixiong');
        localStorage.setItem('hw_grant_weapons', JSON.stringify(gw));
        if (Array.isArray(weaponsCol) && weaponsCol.indexOf('cixiong') === -1) {
          weaponsCol.push('cixiong'); localStorage.setItem('hw_collected_weapons', JSON.stringify(weaponsCol));
        }
        localStorage.setItem('qb_winstreak', '0'); // 보상 후 초기화
        res.cixiong = true; return res;
      }
      localStorage.setItem('qb_winstreak', String(n));
    } catch (e) {}
    return res;
  }
  function curStreak() { try { return parseInt(localStorage.getItem('qb_winstreak') || '0', 10) || 0; } catch (e) { return 0; } }
  function hasOracle() { try { var c = JSON.parse(localStorage.getItem('hw_collected_heroes') || '[]'); return Array.isArray(c) && c.indexOf('oracle') !== -1; } catch (e) { return false; } }
  function hasDiaochan() { try { var c = JSON.parse(localStorage.getItem('hw_collected_heroes') || '[]'); return Array.isArray(c) && c.indexOf('diaochan') !== -1; } catch (e) { return false; } }
  function hasEdict() { try { var c = JSON.parse(localStorage.getItem('hw_collected_relics') || '[]'); return Array.isArray(c) && c.indexOf('edict') !== -1; } catch (e) { return false; } }
  function hasCixiong() { try { var c = JSON.parse(localStorage.getItem('hw_collected_weapons') || '[]'); return Array.isArray(c) && c.indexOf('cixiong') !== -1; } catch (e) { return false; } }
  // 영웅전 보물 이벤트 도전 모드(?treasure=1): 승리 시 지정 유물을 영웅전으로 지급
  function treasureChallenge() {
    if (!/[?&]treasure=1/.test(location.search)) return null;
    try { var raw = localStorage.getItem('hw_treasure_relic'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function grantTreasureRelic(t) {
    try {
      var rg = JSON.parse(localStorage.getItem('hw_grant_relics') || '[]'); if (!Array.isArray(rg)) rg = [];
      if (rg.indexOf(t.id) === -1) rg.push(t.id);
      localStorage.setItem('hw_grant_relics', JSON.stringify(rg));
      var rc = JSON.parse(localStorage.getItem('hw_collected_relics') || '[]'); if (!Array.isArray(rc)) rc = [];
      if (rc.indexOf(t.id) === -1) { rc.push(t.id); localStorage.setItem('hw_collected_relics', JSON.stringify(rc)); }
    } catch (e) {}
  }
  function endGame() {
    state.over = true;
    var s = scoreOf(state.board);
    var title, text, goldHtml = '';
    if (s.you > s.foe) {
      title = TCG.t('qb.win');
      var streakNow = curStreak() + 1; // 이번 승리 포함 연승 수
      var bonus = Math.round(s.you * streakNow * 0.05); // 연승 보너스 = 무력 총합 × 연승 수 × 5%
      var gw = settleHeroesGold(s.you + bonus, true);
      var owned = hasOracle();
      var hadDiaochan = hasDiaochan();
      var hadEdict = hasEdict();
      var hadCixiong = hasCixiong();
      var streakRes = updateWinStreak(true);
      var gotOracle = streakRes.oracle, gotDiaochan = streakRes.diaochan, gotEdict = streakRes.edict, gotCixiong = streakRes.cixiong;
      var streak = gotOracle ? 3 : curStreak();
      text = TCG.t('qx.resultWin', { n: streakNow });
      goldHtml = '<div class="end-gold gain">' +
        '<span class="eg-label">🏅 ' + TCG.t('qx.winReward') + '</span>' +
        '<span class="eg-val">' + TCG.t('qx.heroesGold') + ' <b>+' + gw + '</b>' + (bonus > 0 ? ' <small>' + TCG.t('qx.bonusBreakdown', { base: s.you, n: streakNow, bonus: bonus }) + '</small>' : '') + '</span></div>';
      if (!owned) { // 제갈량을 이미 보유 중이면 3연승 관련 안내 미노출
        if (gotOracle) {
          goldHtml += '<div class="end-gold gain"><span class="eg-label">🌟 ' + TCG.t('qx.streakReached', { n: 3 }) + '</span>' +
            '<span class="eg-val">' + TCG.t('qx.gotOracle') + '</span></div>';
        } else if (streak < 3) {
          goldHtml += '<div class="streak-note">🔥 ' + TCG.t('qx.streakHintOracle', { cur: streak }) + '</div>';
        }
      } else if (!hadDiaochan) { // 제갈량 보유 후 — 5연승 시 초선
        if (gotDiaochan) {
          goldHtml += '<div class="end-gold gain"><span class="eg-label">🌟 ' + TCG.t('qx.streakReached', { n: 5 }) + '</span>' +
            '<span class="eg-val">' + TCG.t('qx.gotDiaochan') + '</span></div>';
        } else {
          goldHtml += '<div class="streak-note">🔥 ' + TCG.t('qx.streakHintDiaochan', { cur: curStreak() }) + '</div>';
        }
      } else if (!hadEdict) { // 초선 보유 후 — 10연승 시 천자의 밀서(유물)
        if (gotEdict) {
          goldHtml += '<div class="end-gold gain"><span class="eg-label">🌟 ' + TCG.t('qx.streakReached', { n: 10 }) + '</span>' +
            '<span class="eg-val">' + TCG.t('qx.gotEdict') + '</span></div>';
        } else {
          goldHtml += '<div class="streak-note">🔥 ' + TCG.t('qx.streakHintEdict', { cur: streakNow }) + '</div>';
        }
      } else if (!hadCixiong) { // 천자의 밀서 보유 후 — 20연승 시 자웅일대검(장비)
        if (gotCixiong) {
          goldHtml += '<div class="end-gold gain"><span class="eg-label">🌟 ' + TCG.t('qx.streakReached', { n: 20 }) + '</span>' +
            '<span class="eg-val">' + TCG.t('qx.gotCixiong') + '</span></div>';
        } else {
          goldHtml += '<div class="streak-note">🔥 ' + TCG.t('qx.streakHintCixiong', { cur: streakNow }) + '</div>';
        }
      }
      TCG.sfx('win');
    } else if (s.foe > s.you) {
      title = TCG.t('qb.lose');
      var gl = settleHeroesGold(s.you, false);
      updateWinStreak(false);
      text = TCG.t('qx.resultLose');
      goldHtml = '<div class="end-gold loss">' +
        '<span class="eg-label">💸 ' + TCG.t('qx.loseSettle') + '</span>' +
        '<span class="eg-val">' + TCG.t('qx.heroesGold') + ' <b>' + gl + '</b></span></div>';
      TCG.sfx('lose');
    } else {
      title = TCG.t('qb.draw');
      updateWinStreak(false);
      text = TCG.t('qx.resultDraw');
      goldHtml = '<div class="end-gold draw"><span class="eg-val">' + TCG.t('qx.noGoldSettle') + '</span></div>';
    }
    var tc = treasureChallenge();
    var endActions = document.getElementById('endActions');
    if (tc) {
      try { localStorage.removeItem('hw_treasure_relic'); } catch (e) {}
      if (s.you > s.foe) {
        grantTreasureRelic(tc);
        goldHtml += '<div class="end-gold gain"><span class="eg-label">🏺 ' + TCG.t('qx.treasureWin') + '</span>' +
          '<span class="eg-val">' + TCG.t('qx.treasureWinDesc', { item: tc.emoji + ' ' + tc.name }) + '</span></div>';
      } else {
        goldHtml += '<div class="end-gold loss"><span class="eg-label">🏺 ' + TCG.t('qx.treasureLose') + '</span>' +
          '<span class="eg-val">' + TCG.t('qx.treasureLoseDesc', { item: tc.emoji + ' ' + tc.name }) + '</span></div>';
      }
      // 보물 도전 결과창은 '영웅전으로 돌아가기'(자동 이어하기)만 노출
      goldHtml += '<div style="margin-top:18px;text-align:center"><a class="btn primary" href="heroes.html?resume=1">🗺️ ' + TCG.t('qx.backToHeroes') + '</a></div>';
      if (endActions) endActions.style.display = 'none'; // 인라인 display:flex 때문에 hidden 속성만으론 안 숨겨짐
    } else if (endActions) { endActions.style.display = 'flex'; }
    document.getElementById('endTitle').textContent = title;
    document.getElementById('endText').textContent = text;
    // 레인별 막대(핸드오프 정산) + 총 무력
    var laneBars = s.lanes.map(function (L, i) {
      var max = Math.max(1, L.you, L.foe);
      var yw = Math.round(L.you / max * 100), fw = Math.round(L.foe / max * 100);
      var tag = (L.you > L.foe) ? '<span class="lb-tag you">' + TCG.t('qx.laneWin') + '</span>'
              : (L.foe > L.you) ? '<span class="lb-tag foe">' + TCG.t('qx.laneLose') + '</span>' : '<span class="lb-tag">−</span>';
      return '<div class="lb-row"><span class="lb-no">' + TCG.t('qx.laneNo', { n: i + 1 }) + '</span>' +
        '<span class="lb-y">' + L.you + '</span>' +
        '<span class="lb-bar"><i class="y" style="width:' + yw + '%"></i><i class="f" style="width:' + fw + '%"></i></span>' +
        '<span class="lb-f">' + L.foe + '</span>' + tag + '</div>';
    }).join('');
    document.getElementById('endScore').innerHTML =
      '<div class="lb-wrap">' + laneBars + '</div>' +
      '<div class="e-total"><span class="e-you">' + s.you + '</span><span class="e-colon">:</span><span class="e-foe">' + s.foe + '</span><span class="e-tl">' + TCG.t('qx.totalMight') + '</span></div>';
    document.getElementById('endGold').innerHTML = goldHtml;
    document.getElementById('endModal').hidden = false;
    render();
  }

  /* ---------- rendering ---------- */
  var boardEl = document.getElementById('board');
  var handEl = document.getElementById('hand');

  function render() {
    renderScore();
    renderBoard();
    renderHand();
    renderStrips();
    var ti = document.getElementById('turnInd');
    ti.textContent = state.over ? TCG.t('qb.gameover') : (state.turn === 'you' ? TCG.t('qb.yourTurn') : TCG.t('qb.foeTurn'));
    ti.classList.toggle('foe-turn', state.turn === 'foe' && !state.over);
    document.getElementById('passBtn').disabled = state.over || state.turn !== 'you' || state.busy || state.awaitingEnd;
  }

  function renderScore() {
    var s = scoreOf(state.board);
    var y = document.getElementById('hbTotalYou'); if (y) y.textContent = s.you;
    var f = document.getElementById('hbTotalFoe'); if (f) f.textContent = s.foe;
    var cc = document.getElementById('hbCols'); if (cc) cc.textContent = ROWS; // 레인 수 = 보드 크기(N×5)
    var g = document.getElementById('hbGold');
    if (g) {
      try {
        var sv = JSON.parse(localStorage.getItem('hw_save') || 'null');
        var base = (sv && typeof sv.gold === 'number') ? sv.gold : 0;
        var bonus = parseInt(localStorage.getItem('hw_bonus_gold') || '0', 10) || 0; // 히어로즈 블러드 정산(영웅전 복귀 시 반영) 미리 합산
        g.textContent = Math.max(0, base + bonus);
      } catch (e) { g.textContent = 0; }
    }
    renderStreak();
    renderSizeSel();
  }
  // 상단 헤더 연승 칩 — 실제 연승값(qb_winstreak)을 반영
  function renderStreak() {
    var el = document.getElementById('hbStreak'); if (!el) return;
    var n = curStreak();
    var nEl = document.getElementById('hbStreakN'); if (nEl) nEl.textContent = n;
    el.classList.toggle('on', n >= 1);
  }
  function boardHasCards() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (state.board[r][c].card) return true;
    return false;
  }
  function renderSizeSel() {
    var sel = document.getElementById('hbSizeSel'); if (!sel) return;
    var locked = boardHasCards();
    sel.querySelectorAll('.hb-seg').forEach(function (b) {
      var rws = parseInt(b.dataset.rows, 10);
      b.classList.toggle('active', rws === ROWS);
      b.classList.toggle('locked', locked && rws !== ROWS);
    });
  }

  function pips(rank, ownerCls) {
    var h = '<div class="pips">';
    for (var i = 0; i < 3; i++) h += '<span class="pip' + (i < rank ? ' on' : '') + '"></span>';
    return h + '</div>';
  }

  // 핸드오프 전치 렌더: 디스플레이 = ROWS개 레인(열) × COLS(5)행, 당신=아래/상대=위
  function renderBoard() {
    var g = effGrid(state.board);
    var selDef = (state.turn === 'you' && state.selected >= 0 && !state.busy && !state.over)
      ? state.you.hand[state.selected] : null;
    boardEl.style.gridTemplateColumns = 'repeat(' + ROWS + ', 1fr)';
    // 칸 세로비율을 열 수에 비례시켜 보드 전체 높이를 3·4·5×5 모두 비슷하게 유지(열이 적을수록 칸을 더 납작하게)
    boardEl.style.setProperty('--tile-asp', (ROWS * 0.17).toFixed(3));
    var html = '';
    for (var d = 0; d < COLS; d++) {           // 디스플레이 행: 0=위(상대 진영) … COLS-1=아래(내 진영)
      var ic = (COLS - 1) - d;                  // 내부 열(당신=0 → 아래)
      for (var lane = 0; lane < ROWS; lane++) { // 디스플레이 열 = 레인 = 내부 행
        var r = lane, c = ic;
        var cell = state.board[r][c];
        var cls = 'tile';
        if (cell.owner === 'you') cls += ' own-you';
        else if (cell.owner === 'foe') cls += ' own-foe';
        var placeable = selDef && canPlace(state.board, selDef, 'you', r, c);
        if (placeable) cls += ' placeable';
        html += '<div class="' + cls + '" data-r="' + r + '" data-c="' + c + '">';
        html += pips(cell.rank);
        if (cell.card) {
          var eff = g[r][c], base = cell.card.def.power, delta = eff - base;
          var pwCls = delta > 0 ? ' buffed' : (delta < 0 ? ' debuffed' : '');
          var deltaBadge = delta !== 0
            ? '<span class="tc-delta ' + (delta > 0 ? 'up' : 'down') + '">' + (delta > 0 ? '+' + delta : delta) + '</span>' : '';
          html += '<div class="tile-card ' + cell.card.owner + '">' +
            TCG.portrait(cell.card.def.emoji, cell.card.def.id, 'tp', cell.card.def.name) +
            deltaBadge + '<span class="pw' + pwCls + '">' + eff + '</span></div>';
        }
        html += '</div>';
      }
    }
    boardEl.innerHTML = html;
  }

  // 자동 맞춤 너비(줌 1.0 기준) + 사용자 확대/축소 배율
  var fittedW = 0;
  var userZoom = parseFloat(lsGet('qb_zoom'));
  if (!(userZoom > 0)) userZoom = 1;
  userZoom = Math.max(0.3, Math.min(1.6, userZoom));

  function applyZoom() {
    if (!boardEl) return;
    var base = fittedW;
    if (!base) { var wrap = boardEl.parentNode; base = (wrap && wrap.clientWidth) ? wrap.clientWidth : 360; }
    var bw = Math.round(base * userZoom);
    boardEl.style.width = bw + 'px';
    // 레인 점수 줄을 보드와 같은 너비로 — 칸과 가로 정렬
    ['foeLanes', 'youLanes'].forEach(function (id) { var el = document.getElementById(id); if (el) el.style.width = bw + 'px'; });
  }
  // 보드 너비를 가용 높이에 맞춰 줄여(줌 1.0 기준 fittedW), 이후 사용자 배율 적용
  function fitBoard() {
    var wrap = boardEl && boardEl.parentNode;
    if (!wrap || !wrap.clientWidth) return;
    var availW = wrap.clientWidth;
    var availH = wrap.clientHeight || 0;
    // 뷰포트 기준 가용 높이 — 보드 아래의 모든 요소(내 레인·메시지·손패·CTA) 높이를 빼서 잘림 방지
    if (typeof window !== 'undefined' && window.innerHeight && wrap.getBoundingClientRect) {
      var top = wrap.getBoundingClientRect().top;
      var belowH = 0, sib = wrap.nextElementSibling;
      while (sib) { belowH += sib.offsetHeight || 0; sib = sib.nextElementSibling; }
      var winAvail = window.innerHeight - top - belowH - 12;
      if (winAvail > 60 && (!availH || winAvail < availH)) availH = winAvail;
    }
    if (!availH || availH < 60) { fittedW = availW; applyZoom(); return; }
    var w = availW;
    boardEl.style.width = w + 'px';
    for (var i = 0; i < 5; i++) {
      var h = boardEl.offsetHeight;
      if (!h || h <= availH) break;
      w = Math.floor(w * (availH / h) * 0.99); // 높이에 맞춰 너비 축소(가로세로 비 유지)
      if (w < 120) { w = 120; break; }
      boardEl.style.width = w + 'px';
    }
    fittedW = w;
    applyZoom();
  }
  function setZoom(z) {
    userZoom = Math.max(0.3, Math.min(1.6, Math.round(z * 100) / 100));
    lsSet('qb_zoom', String(userZoom));
    applyZoom();
  }
  function scheduleFit() {
    if (typeof setTimeout !== 'function') return;
    setTimeout(fitBoard, 0); setTimeout(fitBoard, 80); setTimeout(fitBoard, 240);
  }
  (function wireZoom() {
    var zi = document.getElementById('zoomIn'), zo = document.getElementById('zoomOut'), zf = document.getElementById('zoomFit');
    if (zi) zi.addEventListener('click', function () { TCG.sfx('tap'); setZoom(userZoom + 0.1); });
    if (zo) zo.addEventListener('click', function () { TCG.sfx('tap'); setZoom(userZoom - 0.1); });
    if (zf) zf.addEventListener('click', function () { TCG.sfx('tap'); userZoom = 1; lsSet('qb_zoom', '1'); fitBoard(); });
  })();
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('resize', fitBoard);
    window.addEventListener('orientationchange', function () { setTimeout(fitBoard, 120); });
  }

  function enhGlyph(def, owner) {
    // 3x3 mini-grid, center = card. 전치 보드에 맞춤: 측면=좌우(gc), 전방=세로(gr)
    // 내 카드: 전방(적 방향)=위쪽. 상대 카드: 전방=아래쪽(실제 확장 방향과 일치)
    var foe = owner === 'foe';
    var set = {};
    def.enh.forEach(function (o) {
      var dr = o[0], dc = o[1];
      var gr = foe ? (1 + dc) : (1 - dc), gc = 1 + dr; // dc(전방)→세로(소유자 방향), dr(측면)→좌우
      if (gr >= 0 && gr <= 2 && gc >= 0 && gc <= 2) set[gr + ',' + gc] = 'e';
    });
    var h = '<div class="hc-enh">';
    for (var rr = 0; rr < 3; rr++) for (var cc = 0; cc < 3; cc++) {
      var key = rr + ',' + cc;
      var k = (rr === 1 && cc === 1) ? 'c' : (set[key] || '');
      h += '<i class="' + k + '"></i>';
    }
    return h + '</div>';
  }

  function renderHand() {
    var canAct = state.turn === 'you' && !state.busy && !state.over;
    var hand = state.you.hand;
    var html = '';
    for (var i = 0; i < hand.length; i++) {
      var def = hand[i];
      var playable = canAct && legalMovesFor(state.board, [def], 'you').length > 0;
      var cls = 'hand-card' + (i === state.selected ? ' selected' : '') + (canAct && !playable ? ' unplayable' : '');
      var rp = '';
      for (var k = 0; k < def.rank; k++) rp += '<span class="rp"></span>';
      html += '<div class="' + cls + '" data-i="' + i + '">' +
        '<div class="hc-top"><div class="rank-pips">' + rp + '</div><span class="hc-power">' + def.power + '</span></div>' +
        TCG.portrait(def.emoji, def.id, '', def.name) +
        '<div class="hc-name">' + def.name + '</div>' +
        '<div class="hc-ab">' + (def.ab ? def.ab.txt : '') + '</div>' +
        enhGlyph(def) +
        '</div>';
    }
    handEl.innerHTML = html;
  }

  function renderStrips() {
    var s = scoreOf(state.board);
    var fh = document.getElementById('foeHand'); if (fh) fh.textContent = state.foe.hand.length;
    var foeL = document.getElementById('foeLanes'), youL = document.getElementById('youLanes');
    if (foeL && youL) {
      foeL.style.gridTemplateColumns = 'repeat(' + ROWS + ', 1fr)';
      youL.style.gridTemplateColumns = 'repeat(' + ROWS + ', 1fr)';
      var fhtml = '', yhtml = '';
      for (var lane = 0; lane < ROWS; lane++) {
        var L = s.lanes[lane];
        var youWin = L.you > L.foe && L.you > 0, foeWin = L.foe > L.you && L.foe > 0;
        fhtml += '<span class="hb-lane foe' + (foeWin ? ' win' : '') + '">' + L.foe + '</span>';
        yhtml += '<span class="hb-lane you' + (youWin ? ' win' : '') + '">' + L.you + '</span>';
      }
      foeL.innerHTML = fhtml; youL.innerHTML = yhtml;
    }
  }

  /* ---------- input ---------- */
  handEl.addEventListener('click', function (e) {
    if (state.over || state.busy || state.awaitingEnd || state.turn !== 'you') return;
    var card = e.target.closest('.hand-card');
    if (!card) return;
    var i = parseInt(card.dataset.i, 10);
    if (card.classList.contains('unplayable')) { TCG.toast(TCG.t('qx.noPlaceable')); return; }
    state.selected = (state.selected === i) ? -1 : i;
    render();
  });

  boardEl.addEventListener('click', function (e) {
    var tile = e.target.closest('.tile'); if (!tile) return;
    var r = parseInt(tile.dataset.r, 10), c = parseInt(tile.dataset.c, 10);
    var cell = state.board[r] && state.board[r][c];
    // 배치된 카드를 클릭 → 카드 정보 팝업(아군·적군 모두, 언제든)
    if (cell && cell.card) { showCardInfo(cell.card.def, cell.card.owner, effGrid(state.board)[r][c]); return; }
    // 빈 칸 배치(내 차례 + 선택된 핸드 카드)
    if (state.over || state.busy || state.awaitingEnd || state.turn !== 'you') return;
    if (!tile.classList.contains('placeable')) return;
    if (state.selected < 0) return;
    placeCard('you', state.selected, r, c);
  });
  function showCardInfo(def, owner, effPower) {
    TCG.sfx('tap');
    var rp = ''; for (var k = 0; k < def.rank; k++) rp += '<span class="rp"></span>';
    var ownerLabel = owner === 'you'
      ? '<span class="ci-owner you">🧑 ' + TCG.t('qx.myCard') + '</span>'
      : '<span class="ci-owner foe">🤖 ' + TCG.t('qx.foeCard') + '</span>';
    var pwTxt = TCG.t('qx.mightLabel') + ' ' + def.power + ((effPower != null && effPower !== def.power) ? ' → <b class="' + (effPower > def.power ? 'ci-up' : 'ci-down') + '">' + effPower + '</b> ' + TCG.t('qx.effectApplied') : '');
    document.getElementById('cardModalBody').innerHTML =
      '<div class="ci-head">' + TCG.portrait(def.emoji, def.id, 'ci-art', def.name) +
        '<div class="ci-meta">' +
          '<div class="ci-name">' + def.name + ' ' + ownerLabel + '</div>' +
          '<div class="ci-rank">' + TCG.t('qx.rankLabel') + ' <span class="rank-pips">' + rp + '</span> · ' + TCG.t('qx.placeOnLevel', { n: def.rank }) + '</div>' +
          '<div class="ci-pw">⚔ ' + pwTxt + '</div>' +
        '</div></div>' +
      '<div class="ci-ab">' + (def.ab ? '✨ ' + def.ab.txt : TCG.t('qx.noPassive')) + '</div>' +
      '<div class="ci-enh-wrap">' + TCG.t('qx.enhRegion') + ' ' + enhGlyph(def, owner) +
        '<small>' + (owner === 'foe' ? TCG.t('qx.enhNoteFoe') : TCG.t('qx.enhNoteYou')) + '</small></div>';
    document.getElementById('cardModal').hidden = false;
  }
  document.getElementById('cardModalClose').addEventListener('click', function () { document.getElementById('cardModal').hidden = true; });
  document.getElementById('cardModal').addEventListener('click', function (e) { if (e.target.id === 'cardModal') e.currentTarget.hidden = true; });

  document.getElementById('passBtn').addEventListener('click', function () {
    if (state.over || state.busy || state.awaitingEnd || state.turn !== 'you') return;
    doPass(false);
  });

  // 대전 화면 보드 크기 선택 — 첫 배치 전에만 변경 가능, 변경 시 새 판
  var hbSizeSelEl = document.getElementById('hbSizeSel');
  if (hbSizeSelEl) hbSizeSelEl.addEventListener('click', function (e) {
    var b = e.target.closest('.hb-seg'); if (!b) return;
    var rws = parseInt(b.dataset.rows, 10);
    if (rws === ROWS) return;
    if (boardHasCards()) { TCG.toast(TCG.t('qx.sizeLocked')); return; }
    ROWS = rws; lsSet('qb_rows', String(rws)); TCG.sfx('tap');
    newGame();
  });

  document.getElementById('confirmEndYes').addEventListener('click', function () {
    document.getElementById('confirmEndModal').hidden = true;
    state.awaitingEnd = false;
    endGame();
  });
  document.getElementById('confirmEndNo').addEventListener('click', function () {
    document.getElementById('confirmEndModal').hidden = true;
    state.awaitingEnd = false;
    state.youPasses = 0;
    state.you.lastPass = false;
    state.foe.lastPass = false;
    state.turn = 'you';
    state.selected = -1;
    render();
    startTurn();
  });

  /* ---------- deck builder ---------- */
  var builderDeck = null;
  var builderRows = 3;
  function sortedBuilderCards() { // 레벨(등급) 오름차순, 같은 레벨은 점수(무력) 오름차순 (AI 전용 카드는 제외)
    return QB_CARDS.filter(function (c) { return !c.aiOnly; }).sort(function (a, b) { return (a.rank - b.rank) || (a.power - b.power); });
  }
  function openDeckBuilder() {
    builderDeck = getPlayerDeck().slice();
    builderRows = getRows();
    renderDeckBuilder();
    document.getElementById('deckModal').hidden = false;
  }
  function renderDeckBuilder() {
    document.getElementById('deckCount').textContent = builderDeck.length + '/' + DECK_SIZE;
    var sizeSel = document.getElementById('boardSizeSel');
    if (sizeSel) sizeSel.querySelectorAll('.bss-btn').forEach(function (b) {
      b.classList.toggle('active', parseInt(b.dataset.rows, 10) === builderRows);
    });
    document.getElementById('deckGrid').innerHTML = sortedBuilderCards().map(function (c) {
      var sel = builderDeck.indexOf(c.id) !== -1;
      var rp = ''; for (var k = 0; k < c.rank; k++) rp += '<span class="rp"></span>';
      return '<div class="deck-card' + (sel ? ' sel' : '') + '" data-id="' + c.id + '">' +
        '<div class="dc-top"><div class="rank-pips">' + rp + '</div><span class="hc-power">' + c.power + '</span></div>' +
        TCG.portrait(c.emoji, c.id, '', c.name) +
        '<div class="dc-name">' + c.name + '</div>' +
        '<div class="dc-ab">' + (c.ab ? c.ab.txt : '') + '</div>' +
        enhGlyph(c) +
        (sel ? '<div class="dc-check">✓</div>' : '') + '</div>';
    }).join('');
  }
  document.getElementById('deckGrid').addEventListener('click', function (e) {
    var card = e.target.closest('.deck-card'); if (!card) return;
    var id = card.dataset.id;
    var i = builderDeck.indexOf(id);
    if (i !== -1) builderDeck.splice(i, 1);
    else if (builderDeck.length >= DECK_SIZE) { TCG.toast(TCG.t('qx.deckMax', { n: DECK_SIZE })); return; }
    else builderDeck.push(id);
    TCG.sfx('tap');
    renderDeckBuilder();
  });
  var sizeSelEl = document.getElementById('boardSizeSel');
  if (sizeSelEl) sizeSelEl.addEventListener('click', function (e) {
    var b = e.target.closest('.bss-btn'); if (!b) return;
    builderRows = parseInt(b.dataset.rows, 10);
    TCG.sfx('tap');
    renderDeckBuilder();
  });
  document.getElementById('deckDefault').addEventListener('click', function () {
    builderDeck = QB_DECK_PLAYER.slice(); renderDeckBuilder();
  });
  document.getElementById('deckSave').addEventListener('click', function () {
    if (builderDeck.length !== DECK_SIZE) { TCG.toast(TCG.t('qx.deckFill', { n: DECK_SIZE, cur: builderDeck.length })); return; }
    lsSet('qb_deck', JSON.stringify(builderDeck)); TCG.toast(TCG.t('qx.deckSaved'));
  });
  document.getElementById('deckStart').addEventListener('click', function () {
    if (builderDeck.length !== DECK_SIZE) { TCG.toast(TCG.t('qx.deckFill', { n: DECK_SIZE, cur: builderDeck.length })); return; }
    lsSet('qb_deck', JSON.stringify(builderDeck));
    lsSet('qb_rows', String(builderRows));
    ROWS = builderRows; // 선택한 판 크기 적용
    document.getElementById('deckModal').hidden = true;
    document.getElementById('endModal').hidden = true;
    newGame();
  });
  document.getElementById('deckClose').addEventListener('click', function () {
    document.getElementById('deckModal').hidden = true;
  });
  document.getElementById('deckBtn').addEventListener('click', openDeckBuilder);

  document.getElementById('rulesBtn').addEventListener('click', function () {
    document.getElementById('rulesModal').hidden = false;
  });
  document.getElementById('rulesClose').addEventListener('click', function () {
    document.getElementById('rulesModal').hidden = true;
  });
  document.getElementById('againBtn').addEventListener('click', function () {
    document.getElementById('endModal').hidden = true;
    newGame();
  });

  /* ---------- test/debug handle (no effect on gameplay) ---------- */
  if (typeof window !== 'undefined') {
    window.__QB__ = {
      ROWS: ROWS, COLS: COLS, diff: diff,
      makeBoard: makeBoard, placeOnBoard: placeOnBoard, canPlace: canPlace,
      legalMovesFor: legalMovesFor, scoreOf: scoreOf, laneSums: laneSums,
      effGrid: effGrid, cloneBoard: cloneBoard, territory: territory, boardFull: boardFull
    };
  }

  /* ---------- boot ---------- */
  TCG.initFloatMenu();
  var muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.textContent = (TCG.isMuted() ? '🔇 ' : '🔊 ') + TCG.t('qx.sound');
    muteBtn.addEventListener('click', function () {
      var m = TCG.toggleMute(); muteBtn.textContent = (m ? '🔇 ' : '🔊 ') + TCG.t('qx.sound');
      TCG.audioResume(); if (!m) TCG.sfx('tap');
    });
  }
  var diffPillEl = document.getElementById('diffPill'); if (diffPillEl) diffPillEl.textContent = TCG.t('qx.difficulty', { label: TCG.diffLabel(diff) });
  newGame();            // 진입 시 바로 대전 시작
  if (/[?&]deck=1/.test(location.search)) openDeckBuilder(); // 홈 '덱 구성'으로 진입 시 덱 구성 페이지 표시
  (function () { var t = treasureChallenge(); if (t) TCG.toast('🏺 ' + TCG.t('qx.treasureIntro', { item: t.emoji + ' ' + t.name })); })();
})();
