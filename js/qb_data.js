/* ===== Queen's Blood — card database (32 cards) =====
 * Coordinate system (from the owner's perspective):
 *   enh / ability cells are [dRow, dCol]; +dCol = "forward" (toward the enemy).
 *   The engine mirrors dCol for the foe automatically.
 * rank  = pawn pips required on a tile to place the card (1-3)
 * power = base power contributed to its row
 * enh   = tiles this card grants a pawn to when played
 * ab    = optional ongoing ability {t:'buff'|'debuff', who:'ally'|'enemy', cells|scope, val, txt}
 */
var QB_CARDS = [
  // ---------- Rank 1 ----------
  { id: 'goblin',     name: '고블린',       emoji: '👺', rank: 1, power: 1, enh: [[0,1],[1,0]] },
  { id: 'guard',      name: '경비병',       emoji: '🛡️', rank: 1, power: 1, enh: [[-1,0],[1,0]] },
  { id: 'scout',      name: '정찰병',       emoji: '🏃', rank: 1, power: 2, enh: [[0,1]] },
  { id: 'bee',        name: '여왕벌',       emoji: '🐝', rank: 1, power: 1, enh: [[-1,1],[0,1],[1,1]] },
  { id: 'rat',        name: '시궁쥐',       emoji: '🐀', rank: 1, power: 2, enh: [[0,1],[0,-1]] },
  { id: 'imp',        name: '임프',         emoji: '😈', rank: 1, power: 2, enh: [[-1,0]],
    ab: { t:'buff', who:'ally', cells:[[0,1]], val:1, txt:'앞 칸 아군 +1' } },
  { id: 'spark',      name: '스파크 정령',  emoji: '✨', rank: 1, power: 1, enh: [[-1,1],[1,1]] },
  { id: 'mandragora', name: '만드라고라',   emoji: '🌱', rank: 1, power: 3, enh: [[0,1]] },
  { id: 'cactuar',    name: '선인장',       emoji: '🌵', rank: 1, power: 1, enh: [[0,1],[0,2]],
    ab: { t:'buff', who:'ally', cells:[[0,1],[0,2]], val:1, txt:'직선 아군 +1' } },
  { id: 'hedgehog',   name: '가시고슴도치', emoji: '🦔', rank: 1, power: 2, enh: [[-1,0],[1,0]],
    ab: { t:'debuff', who:'enemy', cells:[[0,1]], val:1, txt:'앞 칸 적 -1' } },
  { id: 'crow',       name: '까마귀',       emoji: '🐦‍⬛', rank: 1, power: 1, enh: [[-1,1],[0,1],[1,1],[0,2]] },
  { id: 'slime',      name: '슬라임',       emoji: '🟢', rank: 1, power: 2, enh: [[1,0],[-1,0]] },

  // ---------- Rank 2 ----------
  { id: 'knight',     name: '기사',         emoji: '⚔️', rank: 2, power: 4, enh: [[0,1],[-1,0],[1,0]] },
  { id: 'archer',     name: '궁수',         emoji: '🏹', rank: 2, power: 3, enh: [[0,1],[0,2]],
    ab: { t:'debuff', who:'enemy', cells:[[0,1],[0,2]], val:1, txt:'정면 직선 적 -1' } },
  { id: 'mage',       name: '마법사',       emoji: '🔮', rank: 2, power: 3, enh: [[0,1]],
    ab: { t:'buff', who:'ally', cells:[[-1,0],[1,0]], val:1, txt:'상하 아군 +1' } },
  { id: 'cleric',     name: '성직자',       emoji: '⛪', rank: 2, power: 2, enh: [[-1,0],[1,0]],
    ab: { t:'buff', who:'ally', cells:[[-1,0],[1,0],[0,1]], val:2, txt:'인접 아군 +2' } },
  { id: 'wolf',       name: '늑대 무리',    emoji: '🐺', rank: 2, power: 3, enh: [[-1,1],[1,1]],
    ab: { t:'buff', who:'ally', cells:[[-1,1],[1,1]], val:1, txt:'대각 아군 +1' } },
  { id: 'golem',      name: '바위 골렘',    emoji: '🗿', rank: 2, power: 6, enh: [[0,1]] },
  { id: 'banshee',    name: '밴시',         emoji: '👻', rank: 2, power: 3, enh: [[1,0]],
    ab: { t:'debuff', who:'enemy', cells:[[-1,0],[1,0],[0,1]], val:1, txt:'인접 적 -1' } },
  { id: 'spider',     name: '독거미',       emoji: '🕷️', rank: 2, power: 4, enh: [[-1,1],[0,1],[1,1]] },
  { id: 'minotaur',   name: '미노타우르스', emoji: '🐂', rank: 2, power: 5, enh: [[0,1],[0,-1]] },
  { id: 'siren',      name: '세이렌',       emoji: '🧜', rank: 2, power: 3, enh: [[-1,0],[1,0]],
    ab: { t:'buff', who:'ally', scope:'row', val:1, txt:'같은 줄 아군 +1' } },
  { id: 'phoenix',    name: '불사조',       emoji: '🦅', rank: 2, power: 4, enh: [[-1,1],[1,1],[0,1]] },
  { id: 'turtle',     name: '강철 거북',    emoji: '🐢', rank: 2, power: 5, enh: [[0,-1]] },

  // ---------- Rank 3 ----------
  { id: 'dragon',     name: '드래곤',       emoji: '🐉', rank: 3, power: 8, enh: [[-1,1],[0,1],[1,1]] },
  { id: 'titan',      name: '타이탄',       emoji: '🦣', rank: 3, power: 9, enh: [[0,1]] },
  { id: 'lich',       name: '리치',         emoji: '💀', rank: 3, power: 5, enh: [[0,1]],
    ab: { t:'debuff', who:'enemy', scope:'row', val:2, txt:'같은 줄 적 -2' } },
  { id: 'seraph',     name: '세라핌',       emoji: '😇', rank: 3, power: 5, enh: [[-1,0],[1,0],[0,1]],
    ab: { t:'buff', who:'ally', scope:'row', val:2, txt:'같은 줄 아군 +2' } },
  { id: 'kraken',     name: '크라켄',       emoji: '🐙', rank: 3, power: 7, enh: [[-1,0],[1,0],[0,1],[0,-1]] },
  { id: 'warlord',    name: '워로드',       emoji: '👹', rank: 3, power: 6, enh: [[-1,1],[1,1]],
    ab: { t:'buff', who:'ally', cells:[[-1,1],[1,1],[0,1]], val:2, txt:'전방 아군 +2' } },
  { id: 'behemoth',   name: '베히모스',     emoji: '🦏', rank: 3, power: 10, enh: [[0,1]] },
  { id: 'valkyrie',   name: '발키리',       emoji: '🪽', rank: 3, power: 6, enh: [[-1,0],[1,0]],
    ab: { t:'buff', who:'ally', cells:[[-1,0],[1,0]], val:2, txt:'상하 아군 +2' } },

  // ---------- expanded pool ----------
  { id: 'fairy',      name: '요정',         emoji: '🧚', rank: 1, power: 1, enh: [[-1,1],[0,1],[1,1]],
    ab: { t:'buff', who:'ally', cells:[[0,1]], val:1, txt:'앞 칸 아군 +1' } },
  { id: 'ghoul',      name: '구울',         emoji: '🧟', rank: 2, power: 4, enh: [[0,1],[1,0]] },
  { id: 'wyvern',     name: '와이번',       emoji: '🐲', rank: 2, power: 5, enh: [[-1,1],[1,1]] },
  { id: 'sphinx',     name: '스핑크스',     emoji: '🦁', rank: 2, power: 3, enh: [[0,1]],
    ab: { t:'buff', who:'ally', cells:[[-1,0],[1,0],[0,1],[0,-1]], val:1, txt:'사방 아군 +1' } },
  { id: 'colossus',   name: '콜로서스',     emoji: '🗿', rank: 3, power: 9, enh: [[-1,0],[1,0]] },
  { id: 'archfiend',  name: '대마왕',       emoji: '👺', rank: 3, power: 7, enh: [[-1,1],[0,1],[1,1]],
    ab: { t:'debuff', who:'enemy', cells:[[-1,1],[0,1],[1,1]], val:2, txt:'전방 적 -2' } }
];

var QB_BY_ID = {};
QB_CARDS.forEach(function (c) { QB_BY_ID[c.id] = c; });

/* Curated 15-card decks (ids may repeat). */
var QB_DECK_PLAYER = [
  'scout','goblin','mandragora','bee','imp','cactuar',
  'knight','archer','mage','cleric','siren','minotaur',
  'dragon','seraph','warlord'
];
var QB_DECK_AI_NORMAL = [
  'goblin','guard','rat','scout','hedgehog','spark',
  'knight','golem','spider','wolf','banshee','phoenix',
  'titan','lich','kraken'
];
var QB_DECK_AI_HARD = [
  'scout','mandragora','imp','cactuar','crow','bee',
  'knight','mage','cleric','siren','minotaur','spider',
  'dragon','behemoth','seraph'
];
