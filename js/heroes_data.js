/* ===== 삼국지 영웅모집 — data =====
 * (이름/이모지/테마만 삼국지로. 스탯·스킬·id·밸런스는 추후 장수별로 세팅 예정.)
 * skill.target: 'enemy' | 'allEnemies' | 'lowestAlly' | 'ally' | 'self'
 * skill.type:   'strike'(+val dmg single) | 'aoe'(val to all) | 'multi'(hits N, each = atk)
 *               'heal'(val) | 'shield'(val block) | 'buff'(+val atk) */
var HW_HEROES = [
  { id:'glad',   name:'전위',   emoji:'⚔️', cls:'전사', rarity:'C', hp:32, atk:7,
    skill:{ name:'쌍철극', cost:2, type:'strike', val:6, target:'enemy', desc:'적 1명에게 공격력+6 피해' } },
  { id:'knight', name:'조인',   emoji:'🛡️', cls:'수호', rarity:'C', hp:42, atk:5,
    skill:{ name:'견벽수성', cost:1, type:'shield', val:9, target:'ally', desc:'아군 1명에게 방어막 9' } },
  { id:'mage',   name:'순욱',   emoji:'🔥', cls:'책략', rarity:'R', hp:22, atk:5,
    skill:{ name:'화공', cost:3, type:'aoe', val:6, target:'allEnemies', desc:'모든 적에게 6 피해' } },
  { id:'archer', name:'황충',   emoji:'🏹', cls:'궁수', rarity:'C', hp:24, atk:6,
    skill:{ name:'연속사격', cost:2, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격' } },
  { id:'priest', name:'순유',   emoji:'📜', cls:'책사', rarity:'R', hp:26, atk:4,
    skill:{ name:'치료술', cost:2, type:'heal', val:15, target:'lowestAlly', desc:'가장 약한 아군 15 회복' } },
  { id:'rogue',  name:'마대',   emoji:'🐎', cls:'기습', rarity:'C', hp:22, atk:8,
    skill:{ name:'기습', cost:2, type:'strike', val:9, target:'enemy', desc:'적 1명에게 공격력+9 피해' } },
  { id:'berserk',name:'장비',   emoji:'🍶', cls:'전사', rarity:'R', hp:34, atk:9,
    skill:{ name:'장팔사모', cost:1, type:'strike', val:5, target:'enemy', desc:'적 1명에게 공격력+5 피해' } },
  { id:'paladin',name:'손권',   emoji:'👑', cls:'군주', rarity:'R', hp:38, atk:6,
    skill:{ name:'고무', cost:2, type:'buff', val:4, target:'ally', desc:'아군 1명 공격력 +4 (전투 동안)' } },
  { id:'valk',   name:'태사자', emoji:'🏹', cls:'궁수', rarity:'R', hp:28, atk:7,
    skill:{ name:'화살비', cost:2, type:'aoe', val:5, target:'allEnemies', desc:'모든 적에게 5 피해' } },
  { id:'druid',  name:'정욱',   emoji:'📜', cls:'책사', rarity:'C', hp:30, atk:5,
    skill:{ name:'구휼', cost:1, type:'heal', val:9, target:'lowestAlly', desc:'가장 약한 아군 9 회복' } },
  { id:'monk',   name:'주창',   emoji:'🪓', cls:'전사', rarity:'C', hp:30, atk:7,
    skill:{ name:'난격', cost:1, type:'multi', val:2, target:'enemy', desc:'무작위 적을 2회 공격' } },
  { id:'warlock',name:'사마의', emoji:'🪶', cls:'책략', rarity:'SR', hp:20, atk:6,
    skill:{ name:'화계', cost:3, type:'aoe', val:8, target:'allEnemies', desc:'모든 적에게 8 피해' } },
  { id:'templar',name:'도겸',   emoji:'🏯', cls:'수호', rarity:'R', hp:36, atk:6,
    skill:{ name:'성벽 방어', cost:2, type:'shield', val:12, target:'ally', desc:'아군 1명에게 방어막 12' } },
  { id:'hunter', name:'마등',   emoji:'🏹', cls:'궁수', rarity:'C', hp:26, atk:7,
    skill:{ name:'정조준', cost:2, type:'strike', val:7, target:'enemy', desc:'적 1명에게 공격력+7 피해' } },
  { id:'samurai',name:'관우',   emoji:'🗡️', cls:'전사', rarity:'SR', hp:30, atk:9,
    skill:{ name:'청룡언월도', cost:2, type:'strike', val:11, target:'enemy', desc:'적 1명에게 공격력+11 피해' } },
  { id:'oracle', name:'제갈량', emoji:'🪶', cls:'책사', rarity:'SR', hp:24, atk:5,
    skill:{ name:'팔진도', cost:3, type:'heal', val:12, target:'lowestAlly', desc:'가장 약한 아군 12 회복 + 방어막' } },
  // ---- 추가 장수 ----
  { id:'spear',   name:'안량',   emoji:'🔱', cls:'전사', rarity:'C', hp:30, atk:8,
    skill:{ name:'창격', cost:2, type:'strike', val:7, target:'enemy', desc:'적 1명에게 공격력+7 피해' } },
  { id:'cavalier',name:'마초',   emoji:'🐎', cls:'기마', rarity:'R', hp:34, atk:8,
    skill:{ name:'서량철기', cost:2, type:'strike', val:8, target:'enemy', desc:'적 1명에게 공격력+8 피해' } },
  { id:'ninja',   name:'여몽',   emoji:'🗡️', cls:'기습', rarity:'R', hp:22, atk:9,
    skill:{ name:'백의도강', cost:1, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격' } },
  { id:'dancer',  name:'문추',   emoji:'🏹', cls:'궁수', rarity:'R', hp:24, atk:6,
    skill:{ name:'연환사', cost:2, type:'multi', val:4, target:'enemy', desc:'무작위 적을 4회 공격' } },
  { id:'shaman',  name:'방통',   emoji:'🔥', cls:'책략', rarity:'R', hp:24, atk:6,
    skill:{ name:'연환계', cost:3, type:'aoe', val:6, target:'allEnemies', desc:'모든 적에게 6 피해' } },
  { id:'frost',   name:'주유',   emoji:'🔥', cls:'책략', rarity:'SR', hp:22, atk:6,
    skill:{ name:'적벽대화', cost:3, type:'aoe', val:7, target:'allEnemies', desc:'모든 적에게 7 피해' } },
  { id:'bulwark', name:'허저',   emoji:'🛡️', cls:'수호', rarity:'R', hp:46, atk:4,
    skill:{ name:'호위', cost:2, type:'shield', val:15, target:'ally', desc:'아군 1명에게 방어막 15' } },
  { id:'bard',    name:'서서',   emoji:'📜', cls:'책사', rarity:'R', hp:26, atk:5,
    skill:{ name:'계책', cost:2, type:'buff', val:5, target:'ally', desc:'아군 1명 공격력 +5 (전투 동안)' } },
  { id:'sage',    name:'유비',   emoji:'👑', cls:'군주', rarity:'SR', hp:26, atk:5,
    skill:{ name:'인덕', cost:3, type:'heal', val:20, target:'lowestAlly', desc:'가장 약한 아군 20 회복' } },
  { id:'reaper',  name:'조운',   emoji:'🗡️', cls:'전사', rarity:'SR', hp:24, atk:10,
    skill:{ name:'단기필마', cost:2, type:'strike', val:13, target:'enemy', desc:'적 1명에게 공격력+13 피해' } },
  // ---- 추가 장수 2차 ----
  { id:'caocao',   name:'조조',   emoji:'👑', cls:'군주', rarity:'SR', hp:30, atk:6,
    skill:{ name:'간웅', cost:3, type:'buff', val:6, target:'ally', desc:'아군 1명 공격력 +6 (전투 동안)' } },
  { id:'xiahoudun',name:'하후돈', emoji:'⚔️', cls:'전사', rarity:'R', hp:36, atk:8,
    skill:{ name:'발시담정', cost:2, type:'strike', val:8, target:'enemy', desc:'적 1명에게 공격력+8 피해' } },
  { id:'xiahouyuan',name:'하후연',emoji:'🏹', cls:'궁수', rarity:'R', hp:26, atk:7,
    skill:{ name:'질풍사격', cost:1, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격' } },
  { id:'sunce',    name:'손책',   emoji:'🗡️', cls:'전사', rarity:'SR', hp:30, atk:9,
    skill:{ name:'소패왕', cost:2, type:'strike', val:12, target:'enemy', desc:'적 1명에게 공격력+12 피해' } },
  { id:'ganning',  name:'감녕',   emoji:'🏹', cls:'기습', rarity:'R', hp:26, atk:8,
    skill:{ name:'백기겁영', cost:2, type:'strike', val:9, target:'enemy', desc:'적 1명에게 공격력+9 피해' } },
  { id:'luxun',    name:'육손',   emoji:'🔥', cls:'책략', rarity:'SR', hp:22, atk:6,
    skill:{ name:'이릉대화', cost:3, type:'aoe', val:9, target:'allEnemies', desc:'모든 적에게 9 피해' } },
  { id:'jiangwei', name:'강유',   emoji:'⚔️', cls:'전사', rarity:'R', hp:32, atk:8,
    skill:{ name:'기산북벌', cost:2, type:'strike', val:8, target:'enemy', desc:'적 1명에게 공격력+8 피해' } },
  { id:'pangde',   name:'방덕',   emoji:'🪓', cls:'전사', rarity:'R', hp:34, atk:8,
    skill:{ name:'항우의 용맹', cost:1, type:'strike', val:6, target:'enemy', desc:'적 1명에게 공격력+6 피해' } },
  { id:'huanggai', name:'황개',   emoji:'🔥', cls:'수호', rarity:'R', hp:40, atk:6,
    skill:{ name:'고육화공', cost:3, type:'aoe', val:6, target:'allEnemies', desc:'모든 적에게 6 피해' } },
  { id:'zhanghe',  name:'장합',   emoji:'🐎', cls:'기마', rarity:'R', hp:32, atk:8,
    skill:{ name:'우회 기동', cost:2, type:'strike', val:7, target:'enemy', desc:'적 1명에게 공격력+7 피해' } },
  { id:'dengai',   name:'등애',   emoji:'📜', cls:'책사', rarity:'R', hp:26, atk:6,
    skill:{ name:'기습 보급', cost:2, type:'shield', val:13, target:'ally', desc:'아군 1명에게 방어막 13' } },
  { id:'huatuo',   name:'화타',   emoji:'🩹', cls:'의원', rarity:'SR', hp:24, atk:4,
    skill:{ name:'청낭서', cost:2, type:'heal', val:18, target:'lowestAlly', desc:'가장 약한 아군 18 회복' } }
];
var HW_BY_ID = {};
HW_HEROES.forEach(function (h) { HW_BY_ID[h.id] = h; });

var HW_STARTERS = ['glad', 'knight', 'priest']; // 전위 · 조인 · 순유

/* 적 (삼국지 세력) */
var HW_ENEMIES = {
  basic: [
    { id:'slime',  name:'황건적 졸개', emoji:'☯️', hp:14, atk:4 },
    { id:'gob',    name:'산적',       emoji:'🪓', hp:16, atk:5 },
    { id:'bat',    name:'도적',       emoji:'🗡️', hp:10, atk:6 },
    { id:'wolf',   name:'굶주린 이리', emoji:'🐺', hp:18, atk:5 },
    { id:'skel',   name:'반란병',     emoji:'🔻', hp:15, atk:5 },
    { id:'spiderE',name:'자객',       emoji:'🥷', hp:16, atk:5 },
    { id:'zombie', name:'황건역사',   emoji:'💪', hp:22, atk:4 },
    { id:'impE',   name:'노략꾼',     emoji:'🎒', hp:12, atk:6 },
    { id:'mush',   name:'맹호',       emoji:'🐯', hp:20, atk:5 }
  ],
  elite: [
    { id:'orc',    name:'황건적 두목', emoji:'☯️', hp:34, atk:8 },
    { id:'golem',  name:'철갑병',     emoji:'🛡️', hp:50, atk:6 },
    { id:'witch',  name:'요술사',     emoji:'🔮', hp:28, atk:7, aoe:true },
    { id:'bandit', name:'산적 두목',   emoji:'🪓', hp:30, atk:9 },
    { id:'ogre',   name:'적장',       emoji:'🐲', hp:42, atk:9 },
    { id:'darkmage',name:'사술사',    emoji:'🔥', hp:30, atk:8, aoe:true },
    { id:'troll',  name:'이민족 거한', emoji:'🪨', hp:48, atk:7 }
  ],
  boss: [
    { id:'dragon', name:'여포',       emoji:'🐎', hp:130, atk:14, aoe:true },
    { id:'lich',   name:'동탁',       emoji:'👹', hp:110, atk:12, aoe:true },
    { id:'mino',   name:'화웅',       emoji:'🪓', hp:150, atk:13 },
    { id:'demon',  name:'원술',       emoji:'👑', hp:138, atk:13, aoe:true },
    { id:'hydra',  name:'장각',       emoji:'☯️', hp:150, atk:12, aoe:true },
    { id:'kraken2',name:'남만왕 맹획', emoji:'🐘', hp:160, atk:13 }
  ]
};

/* 보물 (병법/군용품) */
var HW_RELICS = [
  { id:'banner', name:'대장군 깃발', emoji:'🚩', desc:'매 라운드 에너지 +1', effect:{ energy:1 } },
  { id:'fang',   name:'적토마',     emoji:'🐎', desc:'기본 공격 시 HP 2 회복',  effect:{ lifesteal:2 } },
  { id:'drum',   name:'전고(戰鼓)', emoji:'🥁', desc:'전투 시작 시 전원 공격력 +2', effect:{ startAtk:2 } },
  { id:'crest',  name:'방패 진형',  emoji:'🛡️', desc:'전투 시작 시 전원 방어막 5',  effect:{ startBlock:5 } },
  { id:'chalice',name:'군량미',     emoji:'🍚', desc:'전투 승리 후 전원 HP 6 회복', effect:{ winHeal:6 } }
];

/* Difficulty tuning */
var HW_DIFF = {
  easy:   { eHp:0.78, eAtk:0.78, gold:1.3, smart:false, startGold:60 },
  normal: { eHp:0.95, eAtk:0.95, gold:1.0, smart:false, startGold:40 },
  hard:   { eHp:1.22, eAtk:1.18, gold:0.8, smart:true,  startGold:25 }
};

/* Run map template: each stage offers a choice of node types. */
var HW_MAP = [
  ['battle'],
  ['battle', 'rest'],
  ['battle', 'treasure'],
  ['elite', 'shop'],
  ['battle', 'rest'],
  ['elite', 'treasure'],
  ['shop', 'rest'],
  ['boss']
];
var HW_NODE_INFO = {
  battle:   { icon:'⚔️', label:'전투',   color:'#e8536b' },
  elite:    { icon:'🎖️', label:'정예',   color:'#c77dff' },
  rest:     { icon:'🏕️', label:'주둔',   color:'#46c98b' },
  shop:     { icon:'🏪', label:'저잣거리', color:'#f5c542' },
  treasure: { icon:'📦', label:'보물',   color:'#5aa6ff' },
  boss:     { icon:'🏯', label:'보스',   color:'#ff8a4c' }
};
