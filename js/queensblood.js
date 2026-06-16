/* ===== Queen's Blood — engine & UI ===== */
(function () {
  var COLS = 5;
  function getRows() {
    var v = parseInt(lsGet('qb_rows') || '3', 10);
    return (v === 3 || v === 4) ? v : 3; // 5×5 제거
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
    // 점령한 칸의 폰 레벨 이상의 등급(핍)을 가진 카드만 배치 가능 (예: 레벨2 칸 → 등급 2,3,4,5)
    return cell.card === null && cell.owner === owner && cell.rank >= 1 && def.rank >= cell.rank;
  }

  function placeOnBoard(b, def, owner, r, c) {
    var cell = b[r][c];
    cell.card = { def: def, owner: owner };
    cell.owner = owner;
    // enhancement: grant pawns to empty, neutral-or-own tiles
    def.enh.forEach(function (off) {
      var t = offCell(r, c, off, owner);
      if (!t) return;
      var tc = b[t[0]][t[1]];
      if (tc.card) return;
      if (tc.owner === null || tc.owner === owner) {
        tc.owner = owner;
        tc.rank = Math.min(3, tc.rank + 1);
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
      var val = (s.foe - s.you) - (base.foe - base.you) + 0.35 * terrGain;
      if (diff === 'hard') {
        // one-ply: opponent's best reply using their actual hand
        var reps = legalMovesFor(sim, oppHand, 'you');
        var bestReply = 0;
        reps.forEach(function (rm) {
          var sim2 = cloneBoard(sim);
          placeOnBoard(sim2, rm.def, 'you', rm.r, rm.c);
          var s2 = scoreOf(sim2);
          var rv = (s2.you - s2.foe);
          if (rv > bestReply) bestReply = rv;
        });
        val -= 0.55 * bestReply;
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
      TCG.toast((state.turn === 'you' ? '당신은' : '상대는') + ' 놓을 곳이 없어 패스합니다');
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
    if (!forced) { TCG.sfx('tap'); TCG.toast((who === 'you' ? '당신' : '상대') + ' 패스'); }
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
  // 3연승 시 제갈량(영웅전 전용 해금) 획득. win=true 연승 누적, 아니면 0으로 초기화.
  // 반환: 이번에 제갈량을 획득했으면 true
  function updateWinStreak(win) {
    try {
      var n = parseInt(localStorage.getItem('qb_winstreak') || '0', 10) || 0;
      n = win ? n + 1 : 0;
      var collected = JSON.parse(localStorage.getItem('hw_collected_heroes') || '[]');
      var has = Array.isArray(collected) && collected.indexOf('oracle') !== -1;
      if (win && n >= 3 && !has) {
        var grants = JSON.parse(localStorage.getItem('hw_grant_heroes') || '[]');
        if (!Array.isArray(grants)) grants = [];
        if (grants.indexOf('oracle') === -1) grants.push('oracle');
        localStorage.setItem('hw_grant_heroes', JSON.stringify(grants));
        if (Array.isArray(collected) && collected.indexOf('oracle') === -1) {
          collected.push('oracle'); localStorage.setItem('hw_collected_heroes', JSON.stringify(collected));
        }
        localStorage.setItem('qb_winstreak', '0'); // 보상 후 초기화
        return true;
      }
      localStorage.setItem('qb_winstreak', String(n));
    } catch (e) {}
    return false;
  }
  function curStreak() { try { return parseInt(localStorage.getItem('qb_winstreak') || '0', 10) || 0; } catch (e) { return 0; } }
  function endGame() {
    state.over = true;
    var s = scoreOf(state.board);
    var title, text, goldHtml = '';
    if (s.you > s.foe) {
      title = '🏆 승리!';
      var gw = settleHeroesGold(s.you, true);
      var gotOracle = updateWinStreak(true);
      var streak = gotOracle ? 3 : curStreak();
      text = '배치한 카드 무력 총합에서 앞섰습니다. (연승 ' + streak + ')';
      goldHtml = '<div class="end-gold gain">' +
        '<span class="eg-label">🏅 승리 보상</span>' +
        '<span class="eg-val">삼국 영웅전 골드 <b>+' + gw + '</b></span></div>';
      if (gotOracle) {
        goldHtml += '<div class="end-gold gain"><span class="eg-label">🌟 3연승 달성</span>' +
          '<span class="eg-val"><b>제갈량</b> 획득! 삼국 영웅전에서 합류합니다</span></div>';
      } else if (streak < 3) {
        goldHtml += '<div class="streak-note">🔥 3연승 시 <b>제갈량</b> 획득 (' + streak + '/3)</div>';
      }
      TCG.sfx('win');
    } else if (s.foe > s.you) {
      title = '😢 패배';
      var gl = settleHeroesGold(s.you, false);
      updateWinStreak(false);
      text = '상대의 무력 총합이 더 높았습니다. (연승 초기화)';
      goldHtml = '<div class="end-gold loss">' +
        '<span class="eg-label">💸 패배 정산</span>' +
        '<span class="eg-val">삼국 영웅전 골드 <b>' + gl + '</b></span></div>';
      TCG.sfx('lose');
    } else {
      title = '🤝 무승부';
      updateWinStreak(false);
      text = '무력 총합이 같습니다.';
      goldHtml = '<div class="end-gold draw"><span class="eg-val">골드 정산 없음</span></div>';
    }
    document.getElementById('endTitle').textContent = title;
    document.getElementById('endText').textContent = text;
    document.getElementById('endScore').innerHTML =
      '<span class="e-you">' + s.you + '</span><span class="e-colon">:</span><span class="e-foe">' + s.foe + '</span>';
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
    ti.textContent = state.over ? '게임 종료' : (state.turn === 'you' ? '당신의 턴' : '상대의 턴…');
    ti.classList.toggle('foe-turn', state.turn === 'foe' && !state.over);
    document.getElementById('passBtn').disabled = state.over || state.turn !== 'you' || state.busy || state.awaitingEnd;
  }

  function renderScore() {
    var s = scoreOf(state.board);
    var html = '<div class="score-total">' +
      '<span class="you-pts">' + s.you + '</span>' +
      '<span class="vs">총 무력 (배치 카드 합산)</span>' +
      '<span class="foe-pts">' + s.foe + '</span></div>';
    document.getElementById('scoreboard').innerHTML = html;
  }

  function pips(rank, ownerCls) {
    var h = '<div class="pips">';
    for (var i = 0; i < 3; i++) h += '<span class="pip' + (i < rank ? ' on' : '') + '"></span>';
    return h + '</div>';
  }

  function renderBoard() {
    var s = scoreOf(state.board);
    var selDef = (state.turn === 'you' && state.selected >= 0 && !state.busy && !state.over)
      ? state.you.hand[state.selected] : null;

    var html = '';
    for (var r = 0; r < ROWS; r++) {
      var lane = s.lanes[r];
      var youLead = lane.you > lane.foe, foeLead = lane.foe > lane.you;
      html += '<div class="lane-score you" style="' + (youLead ? 'text-shadow:0 0 8px var(--you)' : 'opacity:.5') + '">' + lane.you + '</div>';
      for (var c = 0; c < COLS; c++) {
        var cell = state.board[r][c];
        var cls = 'tile';
        if (cell.owner === 'you') cls += ' own-you';
        else if (cell.owner === 'foe') cls += ' own-foe';
        var placeable = selDef && canPlace(state.board, selDef, 'you', r, c);
        if (placeable) cls += ' placeable';
        html += '<div class="' + cls + '" data-r="' + r + '" data-c="' + c + '">';
        html += pips(cell.rank);
        if (cell.card) {
          var g = effGrid(state.board);
          var eff = g[r][c];
          var base = cell.card.def.power;
          var pwCls = eff > base ? ' buffed' : (eff < base ? ' debuffed' : '');
          html += '<div class="tile-card ' + cell.card.owner + '">' +
            TCG.portrait(cell.card.def.emoji, cell.card.def.id, 'tp') +
            '<span class="pw' + pwCls + '">' + eff + '</span></div>';
        }
        html += '</div>';
      }
      html += '<div class="lane-score foe" style="' + (foeLead ? 'text-shadow:0 0 8px var(--foe)' : 'opacity:.5') + '">' + lane.foe + '</div>';
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
    boardEl.style.width = Math.round(base * userZoom) + 'px';
  }
  // 보드 너비를 가용 높이에 맞춰 줄여(줌 1.0 기준 fittedW), 이후 사용자 배율 적용
  function fitBoard() {
    var wrap = boardEl && boardEl.parentNode;
    if (!wrap || !wrap.clientWidth) return;
    var availW = wrap.clientWidth;
    var availH = wrap.clientHeight || 0;
    // 윈도우(뷰포트) 기준으로 가용 높이를 한 번 더 산출 — 손패 공간을 확보하고 더 작은 값을 사용
    if (typeof window !== 'undefined' && window.innerHeight && wrap.getBoundingClientRect) {
      var top = wrap.getBoundingClientRect().top;
      var hand = document.getElementById('hand');
      var handH = (hand && hand.offsetHeight) ? hand.offsetHeight : 150;
      var winAvail = window.innerHeight - top - handH - 14;
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

  function enhGlyph(def) {
    // 3x3 mini-grid, center = card; forward = right column
    var set = {};
    def.enh.forEach(function (o) {
      var dr = o[0], dc = o[1];
      if (dr >= -1 && dr <= 1 && dc >= 0 && dc <= 1) set[(dr + 1) + ',' + (dc + 1)] = 'e';
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
        TCG.portrait(def.emoji, def.id) +
        '<div class="hc-name">' + def.name + '</div>' +
        '<div class="hc-ab">' + (def.ab ? def.ab.txt : '') + '</div>' +
        enhGlyph(def) +
        '</div>';
    }
    handEl.innerHTML = html;
  }

  function renderStrips() {
    document.getElementById('foeDeck').textContent = state.foe.deck.length;
    document.getElementById('foeHand').textContent = state.foe.hand.length;
    document.getElementById('youDeck').textContent = state.you.deck.length;
    document.getElementById('foePass').hidden = !state.foe.lastPass;
    document.getElementById('youPass').hidden = !state.you.lastPass;
  }

  /* ---------- input ---------- */
  handEl.addEventListener('click', function (e) {
    if (state.over || state.busy || state.awaitingEnd || state.turn !== 'you') return;
    var card = e.target.closest('.hand-card');
    if (!card) return;
    var i = parseInt(card.dataset.i, 10);
    if (card.classList.contains('unplayable')) { TCG.toast('놓을 수 있는 칸이 없습니다'); return; }
    state.selected = (state.selected === i) ? -1 : i;
    render();
  });

  boardEl.addEventListener('click', function (e) {
    if (state.over || state.busy || state.awaitingEnd || state.turn !== 'you') return;
    var tile = e.target.closest('.tile');
    if (!tile || !tile.classList.contains('placeable')) return;
    if (state.selected < 0) return;
    var r = parseInt(tile.dataset.r, 10), c = parseInt(tile.dataset.c, 10);
    placeCard('you', state.selected, r, c);
  });

  document.getElementById('passBtn').addEventListener('click', function () {
    if (state.over || state.busy || state.awaitingEnd || state.turn !== 'you') return;
    doPass(false);
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
    document.getElementById('deckGrid').innerHTML = QB_CARDS.map(function (c) {
      var sel = builderDeck.indexOf(c.id) !== -1;
      var rp = ''; for (var k = 0; k < c.rank; k++) rp += '<span class="rp"></span>';
      return '<div class="deck-card' + (sel ? ' sel' : '') + '" data-id="' + c.id + '">' +
        '<div class="dc-top"><div class="rank-pips">' + rp + '</div><span class="hc-power">' + c.power + '</span></div>' +
        TCG.portrait(c.emoji, c.id) +
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
    else if (builderDeck.length >= DECK_SIZE) { TCG.toast('덱은 ' + DECK_SIZE + '장까지입니다'); return; }
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
    if (builderDeck.length !== DECK_SIZE) { TCG.toast(DECK_SIZE + '장을 모두 채워주세요 (' + builderDeck.length + '/' + DECK_SIZE + ')'); return; }
    lsSet('qb_deck', JSON.stringify(builderDeck)); TCG.toast('덱을 저장했습니다');
  });
  document.getElementById('deckStart').addEventListener('click', function () {
    if (builderDeck.length !== DECK_SIZE) { TCG.toast(DECK_SIZE + '장을 모두 채워주세요 (' + builderDeck.length + '/' + DECK_SIZE + ')'); return; }
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
    muteBtn.textContent = TCG.isMuted() ? '🔇 소리' : '🔊 소리';
    muteBtn.addEventListener('click', function () {
      var m = TCG.toggleMute(); muteBtn.textContent = m ? '🔇 소리' : '🔊 소리';
      TCG.audioResume(); if (!m) TCG.sfx('tap');
    });
  }
  var diffPillEl = document.getElementById('diffPill'); if (diffPillEl) diffPillEl.textContent = '난이도 ' + TCG.diffLabel(diff);
  newGame();            // 배경 보드 준비
  openDeckBuilder();    // 진입 시 덱 구성 화면부터 보여주고 시작
})();
