/* ===== 히어로즈 블러드 — card database (69 cards) =====
 * (이름/이모지만 삼국지로. 좌표·스탯·능력·id·덱은 그대로.)
 * Coordinate system (from the owner's perspective):
 *   enh / ability cells are [dRow, dCol]; +dCol = "forward" (toward the enemy).
 *   The engine mirrors dCol for the foe automatically.
 * rank  = pawn pips required on a tile to place the card (1-3)
 * power = base power contributed to its row
 * enh   = tiles this card grants a pawn to when played
 * ab    = optional ongoing ability {t:'buff'|'debuff', who:'ally'|'enemy', cells|scope, val, txt}
 */
var QB_CARDS = [
  // ---------- Rank 1 (병종) ----------
  { id: 'goblin',     name: '보병',     emoji: '🪖', rank: 1, power: 1, enh: [[0,1],[1,0]] },
  { id: 'guard',      name: '방패병',   emoji: '🛡️', rank: 1, power: 1, enh: [[-1,0],[1,0]] },
  { id: 'scout',      name: '척후병',   emoji: '🏃', rank: 1, power: 2, enh: [[0,1]] },
  { id: 'bee',        name: '궁병',     emoji: '🏹', rank: 1, power: 1, enh: [[-1,1],[0,1],[1,1]] },
  { id: 'rat',        name: '경기병',   emoji: '🐎', rank: 1, power: 2, enh: [[0,1],[0,-1]] },
  { id: 'imp',        name: '의병',     emoji: '🚩', rank: 1, power: 2, enh: [[-1,0]],
    ab: { t:'buff', who:'ally', cells:[[0,1]], val:1, txt:'앞 칸 아군 +1' } },
  { id: 'spark',      name: '봉화병',   emoji: '🔥', rank: 1, power: 1, enh: [[-1,1],[1,1]] },
  { id: 'mandragora', name: '창병',     emoji: '🔱', rank: 1, power: 3, enh: [[0,1]] },
  { id: 'cactuar',    name: '쇠뇌병',   emoji: '🎯', rank: 1, power: 1, enh: [[0,1],[0,2]],
    ab: { t:'buff', who:'ally', cells:[[0,1],[0,2]], val:1, txt:'직선 아군 +1' } },
  { id: 'hedgehog',   name: '함정병',   emoji: '🪤', rank: 1, power: 2, enh: [[-1,0],[1,0]],
    ab: { t:'debuff', who:'enemy', cells:[[0,1]], val:1, txt:'앞 칸 적 -1' } },
  { id: 'crow',       name: '전령',     emoji: '🕊️', rank: 1, power: 1, enh: [[-1,1],[0,1],[1,1],[0,2]] },
  { id: 'slime',      name: '둔전병',   emoji: '🌾', rank: 1, power: 2, enh: [[1,0],[-1,0]] },

  // ---------- Rank 2 (장수) ----------
  { id: 'knight',     name: '하후돈',   emoji: '⚔️', rank: 2, power: 4, enh: [[0,1],[-1,0],[1,0]] },
  { id: 'archer',     name: '하후연',   emoji: '🏹', rank: 2, power: 3, enh: [[0,1],[0,2]],
    ab: { t:'debuff', who:'enemy', cells:[[0,1],[0,2]], val:1, txt:'정면 직선 적 -1' } },
  { id: 'mage',       name: '순욱',     emoji: '🪶', rank: 2, power: 3, enh: [[0,1]],
    ab: { t:'buff', who:'ally', cells:[[-1,0],[1,0]], val:1, txt:'상하 아군 +1' } },
  { id: 'cleric',     name: '순유',     emoji: '📜', rank: 2, power: 2, enh: [[-1,0],[1,0]],
    ab: { t:'buff', who:'ally', cells:[[-1,0],[1,0],[0,1]], val:2, txt:'인접 아군 +2' } },
  { id: 'wolf',       name: '장료',     emoji: '⚔️', rank: 2, power: 3, enh: [[-1,1],[1,1]],
    ab: { t:'buff', who:'ally', cells:[[-1,1],[1,1]], val:1, txt:'대각 아군 +1' } },
  { id: 'golem',      name: '허저',     emoji: '🛡️', rank: 2, power: 6, enh: [[0,1]] },
  { id: 'banshee',    name: '가후',     emoji: '🪶', rank: 2, power: 3, enh: [[1,0]],
    ab: { t:'debuff', who:'enemy', cells:[[-1,0],[1,0],[0,1]], val:1, txt:'인접 적 -1' } },
  { id: 'spider',     name: '위연',     emoji: '🗡️', rank: 2, power: 4, enh: [[-1,1],[0,1],[1,1]] },
  { id: 'minotaur',   name: '안량',     emoji: '🔱', rank: 2, power: 5, enh: [[0,1],[0,-1]] },
  { id: 'siren',      name: '손권',     emoji: '👑', rank: 2, power: 3, enh: [[-1,0],[1,0]],
    ab: { t:'buff', who:'ally', scope:'row', val:1, txt:'같은 줄 아군 +1' } },
  { id: 'phoenix',    name: '손책',     emoji: '🗡️', rank: 2, power: 4, enh: [[-1,1],[1,1],[0,1]] },
  { id: 'turtle',     name: '조인',     emoji: '🏯', rank: 2, power: 5, enh: [[0,-1]] },

  // ---------- Rank 3 (명장) ----------
  { id: 'dragon',     name: '여포',     emoji: '🐎', rank: 3, power: 8, enh: [[-1,1],[0,1],[1,1]] },
  { id: 'titan',      name: '관우',     emoji: '🗡️', rank: 3, power: 9, enh: [[0,1]] },
  { id: 'lich',       name: '사마의',   emoji: '🪶', rank: 3, power: 5, enh: [[0,1]],
    ab: { t:'debuff', who:'enemy', scope:'row', val:2, txt:'같은 줄 적 -2' } },
  { id: 'seraph',     name: '제갈량',   emoji: '🪶', rank: 3, power: 5, enh: [[-1,0],[1,0],[0,1]],
    ab: { t:'buff', who:'ally', scope:'row', val:2, txt:'같은 줄 아군 +2' } },
  { id: 'kraken',     name: '장비',     emoji: '🍶', rank: 3, power: 7, enh: [[-1,0],[1,0],[0,1],[0,-1]] },
  { id: 'warlord',    name: '조조',     emoji: '👑', rank: 3, power: 6, enh: [[-1,1],[1,1]],
    ab: { t:'buff', who:'ally', cells:[[-1,1],[1,1],[0,1]], val:2, txt:'전방 아군 +2' } },
  { id: 'behemoth',   name: '동탁',     emoji: '👹', rank: 3, power: 10, enh: [[0,1]] },
  { id: 'valkyrie',   name: '조운',     emoji: '🗡️', rank: 3, power: 6, enh: [[-1,0],[1,0]],
    ab: { t:'buff', who:'ally', cells:[[-1,0],[1,0]], val:2, txt:'상하 아군 +2' } },

  // ---------- 추가 ----------
  { id: 'fairy',      name: '의용병',   emoji: '🙌', rank: 1, power: 1, enh: [[-1,1],[0,1],[1,1]],
    ab: { t:'buff', who:'ally', cells:[[0,1]], val:1, txt:'앞 칸 아군 +1' } },
  { id: 'ghoul',      name: '문추',     emoji: '🗡️', rank: 2, power: 4, enh: [[0,1],[1,0]] },
  { id: 'wyvern',     name: '태사자',   emoji: '🏹', rank: 2, power: 5, enh: [[-1,1],[1,1]] },
  { id: 'sphinx',     name: '방통',     emoji: '🪶', rank: 2, power: 3, enh: [[0,1]],
    ab: { t:'buff', who:'ally', cells:[[-1,0],[1,0],[0,1],[0,-1]], val:1, txt:'사방 아군 +1' } },
  { id: 'colossus',   name: '마초',     emoji: '🐎', rank: 3, power: 9, enh: [[-1,0],[1,0]] },
  { id: 'archfiend',  name: '화웅',     emoji: '🪓', rank: 3, power: 7, enh: [[-1,1],[0,1],[1,1]],
    ab: { t:'debuff', who:'enemy', cells:[[-1,1],[0,1],[1,1]], val:2, txt:'전방 적 -2' } },

  // ---------- 2차 추가 ----------
  { id: 'crossbow',   name: '노궁병',   emoji: '🎯', rank: 1, power: 2, enh: [[0,1]] },
  { id: 'ganning',    name: '감녕',     emoji: '🏹', rank: 2, power: 5, enh: [[-1,1],[1,1]] },
  { id: 'jiangwei',   name: '강유',     emoji: '⚔️', rank: 2, power: 4, enh: [[0,1],[-1,0],[1,0]] },
  { id: 'huanggai',   name: '황개',     emoji: '🔥', rank: 2, power: 3, enh: [[0,1]],
    ab: { t:'debuff', who:'enemy', cells:[[0,1],[0,2]], val:1, txt:'정면 직선 적 -1' } },
  { id: 'pangde',     name: '방덕',     emoji: '🪓', rank: 2, power: 5, enh: [[0,1],[1,0]] },
  { id: 'luxun',      name: '육손',     emoji: '🔥', rank: 3, power: 6, enh: [[-1,0],[1,0],[0,1]],
    ab: { t:'buff', who:'ally', scope:'row', val:2, txt:'같은 줄 아군 +2' } },

  // ---------- 3차 추가 (영웅전 미수록 장수) ----------
  // Rank 1 (병종/경장수)
  { id: 'rogue',      name: '마대',     emoji: '🐎', rank: 1, power: 2, enh: [[0,1],[0,-1]] },
  { id: 'monk',       name: '주창',     emoji: '🪓', rank: 1, power: 3, enh: [[0,1]] },
  { id: 'ninja',      name: '여몽',     emoji: '🗡️', rank: 1, power: 2, enh: [[0,1],[1,0]] },
  { id: 'templar',    name: '도겸',     emoji: '🏯', rank: 1, power: 3, enh: [[-1,0],[1,0]] },
  { id: 'yuejin',     name: '악진',     emoji: '🗡️', rank: 1, power: 2, enh: [[-1,1],[1,1]] },
  { id: 'gongsunzan', name: '공손찬',   emoji: '🐎', rank: 1, power: 2, enh: [[0,1],[-1,0]] },
  { id: 'hejin',      name: '하진',     emoji: '🛡️', rank: 1, power: 2, enh: [[0,-1]] },
  // Rank 2 (장수)
  { id: 'huangzhong', name: '황충',     emoji: '🏹', rank: 2, power: 4, enh: [[0,1],[0,2]],
    ab: { t:'debuff', who:'enemy', cells:[[0,2]], val:2, txt:'먼 정면 적 -2' } },
  { id: 'frost',      name: '주유',     emoji: '🔥', rank: 2, power: 3, enh: [[-1,1],[1,1]],
    ab: { t:'debuff', who:'enemy', cells:[[-1,1],[0,1],[1,1]], val:1, txt:'전방 적 -1' } },
  { id: 'bard',       name: '서서',     emoji: '📜', rank: 2, power: 3, enh: [[0,1]],
    ab: { t:'buff', who:'ally', cells:[[0,1],[0,-1]], val:1, txt:'좌우 아군 +1' } },
  { id: 'sage',       name: '유비',     emoji: '👑', rank: 2, power: 4, enh: [[-1,0],[1,0],[0,1]],
    ab: { t:'buff', who:'ally', cells:[[-1,0],[1,0]], val:2, txt:'상하 아군 +2' } },
  { id: 'huatuo',     name: '화타',     emoji: '🩹', rank: 2, power: 2, enh: [[-1,0],[1,0]],
    ab: { t:'buff', who:'ally', cells:[[-1,0],[1,0],[0,1]], val:1, txt:'인접 아군 +1' } },
  { id: 'hunter',     name: '마등',     emoji: '🏹', rank: 2, power: 4, enh: [[0,1]],
    ab: { t:'debuff', who:'enemy', cells:[[0,1],[0,2]], val:1, txt:'정면 직선 적 -1' } },
  { id: 'druid',      name: '정욱',     emoji: '📜', rank: 2, power: 3, enh: [[0,1]],
    ab: { t:'buff', who:'ally', cells:[[0,1]], val:2, txt:'앞 칸 아군 +2' } },
  { id: 'zhanghe',    name: '장합',     emoji: '🐎', rank: 2, power: 5, enh: [[-1,1],[1,1]] },
  { id: 'dengai',     name: '등애',     emoji: '📜', rank: 2, power: 3, enh: [[-1,0],[1,0]],
    ab: { t:'buff', who:'ally', cells:[[-1,0],[1,0]], val:1, txt:'상하 아군 +1' } },
  { id: 'xuhuang',    name: '서황',     emoji: '🪓', rank: 2, power: 5, enh: [[0,1],[1,0]] },
  { id: 'diaochan',   name: '초선',     emoji: '💃', rank: 2, power: 2, enh: [[0,1]],
    ab: { t:'debuff', who:'enemy', scope:'row', val:1, txt:'같은 줄 적 -1' } },
  { id: 'xiaoqiao',   name: '소교',     emoji: '🌸', rank: 2, power: 2, enh: [[-1,1],[1,1]],
    ab: { t:'debuff', who:'enemy', cells:[[0,1]], val:1, txt:'앞 칸 적 -1' } },
  { id: 'daqiao',     name: '대교',     emoji: '🌺', rank: 2, power: 2, enh: [[-1,1],[1,1]],
    ab: { t:'debuff', who:'enemy', cells:[[0,1]], val:1, txt:'앞 칸 적 -1' } },
  { id: 'manchong',   name: '만총',     emoji: '📜', rank: 2, power: 3, enh: [[-1,0],[1,0]],
    ab: { t:'buff', who:'ally', cells:[[0,-1]], val:2, txt:'뒤 칸 아군 +2' } },
  { id: 'caopi',      name: '조비',     emoji: '👑', rank: 2, power: 4, enh: [[-1,1],[1,1]],
    ab: { t:'buff', who:'ally', scope:'row', val:1, txt:'같은 줄 아군 +1' } },
  // Rank 3 (명장)
  { id: 'glad',       name: '전위',     emoji: '⚔️', rank: 3, power: 8, enh: [[-1,1],[0,1],[1,1]] },
  { id: 'yuanshao',   name: '원소',     emoji: '🎌', rank: 3, power: 6, enh: [[-1,0],[1,0],[0,1]],
    ab: { t:'buff', who:'ally', scope:'row', val:2, txt:'같은 줄 아군 +2' } },
  { id: 'simayan',    name: '사마염',   emoji: '👑', rank: 3, power: 7, enh: [[0,1]],
    ab: { t:'debuff', who:'enemy', scope:'row', val:2, txt:'같은 줄 적 -2' } }
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
