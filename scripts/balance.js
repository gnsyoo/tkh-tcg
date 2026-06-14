/* Phase-2 balance simulator. Runs the REAL game engines headlessly.
 *   - Queen's Blood: AI-vs-AI self-play using the engine's exposed rule
 *     functions (window.__QB__). Reports win/draw rates, first-move
 *     advantage, and per-card win-rate-when-played.
 *   - Heroes Wanted: full runs driven through a tiny DOM stub with a
 *     skill-using auto-player. Reports clear-rate and average floor reached.
 * Usage:  node scripts/balance.js [gamesPerExperiment]
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const N = parseInt(process.argv[2], 10) || 2000;

/* ---------- minimal DOM stub ---------- */
function makeEl() {
  return { _html: '', textContent: '', hidden: false, disabled: false, style: {}, dataset: {}, _l: {},
    classList: { contains: () => false, add() {}, remove() {}, toggle() {} },
    set innerHTML(v) { this._html = String(v); }, get innerHTML() { return this._html; },
    addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); }, removeEventListener() {},
    appendChild() {}, remove() {}, setAttribute() {}, closest() { return null; },
    querySelector() { return makeEl(); }, querySelectorAll() { return []; },
    scrollTop: 0, scrollHeight: 0, fire(t, e) { (this._l[t] || []).forEach(f => f(e)); } };
}
function sandbox(diff) {
  const els = {};
  const document = { getElementById(id) { return els[id] || (els[id] = makeEl()); },
    createElement() { return makeEl(); }, querySelector() { return makeEl(); },
    querySelectorAll() { return []; }, body: makeEl(), addEventListener() {} };
  const store = {};
  const s = { document, console, Math, JSON, Date, Promise, URLSearchParams, parseInt, parseFloat, isNaN,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    location: { search: '?diff=' + diff }, setTimeout: f => setImmediate(f), clearTimeout() {} };
  s.window = s; s.globalThis = s; s._els = els;
  return s;
}
function load(s, files) { const ctx = vm.createContext(s); for (const f of files) vm.runInContext(read(f), ctx, { filename: f }); }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pct = (n, d) => (d ? (100 * n / d).toFixed(1) : '0.0') + '%';

/* ================= Queen's Blood ================= */
function qbGreedy(E, b, hand, side) {
  const moves = E.legalMovesFor(b, hand, side);
  if (!moves.length) return null;
  const base = E.scoreOf(b), baseT = E.territory(b, side);
  let best = null, bv = -1e9;
  for (const m of moves) {
    const sim = E.cloneBoard(b);
    E.placeOnBoard(sim, m.def, side, m.r, m.c);
    const sc = E.scoreOf(sim);
    const mine = side === 'you' ? sc.you - sc.foe : sc.foe - sc.you;
    const bmine = side === 'you' ? base.you - base.foe : base.foe - base.you;
    const val = (mine - bmine) + 0.3 * (E.territory(sim, side) - baseT) + Math.random() * 0.05;
    if (val > bv) { bv = val; best = m; }
  }
  return best;
}
function qbGame(E, byId, youIds, foeIds) {
  const b = E.makeBoard();
  const deck = { you: shuffle(youIds.map(id => byId[id])), foe: shuffle(foeIds.map(id => byId[id])) };
  const hand = { you: [], foe: [] };
  for (const sd of ['you', 'foe']) for (let i = 0; i < 5; i++) hand[sd].push(deck[sd].pop());
  const played = { you: [], foe: [] };
  let turn = 'you', passes = 0, guard = 0;
  while (guard++ < 60) {
    if (hand[turn].length < 8 && deck[turn].length) hand[turn].push(deck[turn].pop());
    const m = qbGreedy(E, b, hand[turn], turn);
    if (!m) { if (++passes >= 2) break; turn = turn === 'you' ? 'foe' : 'you'; continue; }
    E.placeOnBoard(b, m.def, turn, m.r, m.c);
    played[turn].push(m.def.id);
    hand[turn].splice(m.idx, 1);
    passes = 0;
    if (E.boardFull(b)) break;
    turn = turn === 'you' ? 'foe' : 'you';
  }
  return { score: E.scoreOf(b), played };
}
function runQB() {
  const s = sandbox('normal');
  load(s, ['js/util.js', 'js/qb_data.js', 'js/queensblood.js']);
  const E = s.window.__QB__, byId = s.QB_BY_ID;
  const decks = { player: s.QB_DECK_PLAYER, aiN: s.QB_DECK_AI_NORMAL, aiH: s.QB_DECK_AI_HARD };

  function experiment(label, youIds, foeIds) {
    let yw = 0, fw = 0, dr = 0, margin = 0;
    const card = {}; // id -> {plays, wins}
    for (let i = 0; i < N; i++) {
      const g = qbGame(E, byId, youIds, foeIds);
      const yWin = g.score.you > g.score.foe, fWin = g.score.foe > g.score.you;
      if (yWin) yw++; else if (fWin) fw++; else dr++;
      margin += Math.abs(g.score.you - g.score.foe);
      const rec = (ids, won) => ids.forEach(id => { const c = card[id] || (card[id] = { plays: 0, wins: 0 }); c.plays++; if (won) c.wins++; });
      rec(g.played.you, yWin); rec(g.played.foe, fWin);
    }
    console.log(`\n[${label}]  (${N} games)`);
    console.log(`  선공(you) 승: ${pct(yw, N)} | 무: ${pct(dr, N)} | 후공(foe) 승: ${pct(fw, N)} | 평균 점수차: ${(margin / N).toFixed(2)}`);
    return card;
  }

  experiment('선공 이점 (동일덱: player vs player)', decks.player, decks.player);
  const card = experiment('플레이어덱 vs AI(노멀)덱', decks.player, decks.aiN);

  const rows = Object.keys(card).map(id => ({ id, name: byId[id].name, rank: byId[id].rank, power: byId[id].power, ...card[id], wr: card[id].wins / card[id].plays }))
    .filter(r => r.plays >= 30).sort((a, b) => b.wr - a.wr);
  console.log('\n  카드별 승률(플레이 시) — 상위/하위 6장 (min 30 plays):');
  const fmt = r => `    ${r.name.padEnd(8)} R${r.rank} P${String(r.power).padStart(2)}  승률 ${pct(r.wins, r.plays).padStart(6)}  (${r.plays}판)`;
  rows.slice(0, 6).forEach(r => console.log(fmt(r)));
  console.log('    ...');
  rows.slice(-6).forEach(r => console.log(fmt(r)));
}

/* ================= Heroes Wanted ================= */
function mkEvt(sel, ds, cl) { const n = { dataset: ds, id: ds.id || '', classList: { contains: c => cl.indexOf(c) !== -1 }, closest: x => (x === sel ? n : null) }; return { target: n, preventDefault() {} }; }
const tick = () => new Promise(r => setImmediate(r));

async function heroesRun(diff) {
  const s = sandbox(diff);
  load(s, ['js/util.js', 'js/heroes_data.js', 'js/heroes.js']);
  const g = id => s.document.getElementById(id);
  ['overModal', 'heroModal'].forEach(id => g(id).hidden = true);
  const screens = ['mapScreen', 'combatScreen', 'rewardScreen', 'restScreen', 'shopScreen', 'eventScreen'];
  const cur = () => screens.find(x => g(x).hidden === false);
  let floor = 0;
  for (let i = 0; i < 6000; i++) {
    await tick();
    if (g('overModal').hidden === false) break;
    const sc = cur();
    if (sc === 'mapScreen') {
      floor++;
      if (!/data-act="battle"/.test(g('mapTrack')._html)) break;
      // occasionally use 정비(rest) before battle if available, to mimic real play
      if (/data-act="rest"(?![^>]*disabled)/.test(g('mapTrack')._html) && Math.random() < 0.7) {
        g('mapTrack').fire('click', mkEvt('.camp-btn', { act: 'rest' }, []));
      }
      g('mapTrack').fire('click', mkEvt('.camp-btn', { act: 'battle' }, []));
    } else if (sc === 'combatScreen') {
      const hre = /<div class="unit([^"]*)" data-side="party" data-idx="(\d+)"/g; let hm, hero = -1;
      while ((hm = hre.exec(g('partyRow')._html))) { if (hm[1].indexOf('selectable') !== -1) { hero = parseInt(hm[2], 10); break; } }
      if (hero === -1) { if (!g('endTurnBtn').disabled) g('endTurnBtn').fire('click', {}); else await tick(); continue; }
      g('partyRow').fire('click', mkEvt('.unit', { side: 'party', idx: String(hero) }, ['selectable']));
      const skillEnabled = /data-act="skill"(?![^>]*disabled)/.test(g('actionBar')._html);
      g('actionBar').fire('click', mkEvt('.act-btn', { act: skillEnabled ? 'skill' : 'attack' }, []));
      // if the action needs a target, the board now shows targetable units.
      // Focus-fire: among targetable units pick the one with the LOWEST current HP.
      const findTgt = (html, side) => {
        const re = new RegExp('<div class="unit([^"]*)" data-side="' + side + '" data-idx="(\\d+)">([\\s\\S]*?)(?=<div class="unit|$)', 'g');
        let m, best = -1, bestHp = Infinity;
        while ((m = re.exec(html))) {
          if (m[1].indexOf('targetable') === -1) continue;
          const hp = (/❤ (\d+)\//.exec(m[3]) || [])[1];
          const h = hp ? parseInt(hp, 10) : 9999;
          if (h < bestHp) { bestHp = h; best = parseInt(m[2], 10); }
        }
        return best;
      };
      let e = findTgt(g('enemyRow')._html, 'enemy');
      if (e !== -1) { g('enemyRow').fire('click', mkEvt('.unit', { side: 'enemy', idx: String(e) }, ['targetable'])); }
      else { let a = findTgt(g('partyRow')._html, 'party'); if (a !== -1) g('partyRow').fire('click', mkEvt('.unit', { side: 'party', idx: String(a) }, ['targetable'])); }
      // (no target highlighted = AoE/heal already executed)
    } else if (sc === 'rewardScreen') {
      const rc = g('rewardCards')._html, hm = /data-hero="([^"]+)"/.exec(rc), rm = /data-relic="([^"]+)"/.exec(rc);
      if (hm) g('rewardCards').fire('click', mkEvt('.reward-card', { hero: hm[1] }, []));
      else if (rm) g('rewardCards').fire('click', mkEvt('.reward-card', { relic: rm[1] }, []));
      else g('rewardSkip').fire('click', {});
    } else if (sc === 'restScreen') g('restHeal').fire('click', {});
    else if (sc === 'shopScreen') g('shopLeave').fire('click', {});
    else if (sc === 'eventScreen') {
      const rm = /data-relic="([^"]+)"/.exec(g('eventChoices')._html);
      if (rm) g('eventChoices').fire('click', mkEvt('.reward-card', { relic: rm[1] }, []));
      else g('eventChoices').fire('click', { target: { id: 'evGo', closest: () => null } });
    } else break;
  }
  return { win: g('overTitle').textContent.indexOf('통일') !== -1, floor };
}
async function runHeroes() {
  const runs = Math.min(N, 300);
  console.log(`\n================= Heroes Wanted (${runs} runs/난이도, 스킬 사용 자동플레이) =================`);
  for (const d of ['easy', 'normal', 'hard']) {
    let wins = 0, floors = 0;
    for (let i = 0; i < runs; i++) { const r = await heroesRun(d); if (r.win) wins++; floors += r.floor; }
    console.log(`  난이도 ${d.padEnd(6)}  클리어율 ${pct(wins, runs).padStart(6)}  평균 도달층 ${(floors / runs).toFixed(1)}/8`);
  }
}

(async () => {
  console.log('================= Queen\'s Blood (AI vs AI 자가대국) =================');
  runQB();
  await runHeroes();
})();
