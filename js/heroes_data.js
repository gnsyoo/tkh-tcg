/* ===== Heroes Wanted — data ===== */

/* Hero cards. skill.target: 'enemy' | 'allEnemies' | 'lowestAlly' | 'ally' | 'self'
 * skill.type:   'strike'(+val dmg single) | 'aoe'(val to all) | 'multi'(hits N, each = atk)
 *               'heal'(val) | 'shield'(val block) | 'buff'(+val atk) */
var HW_HEROES = [
  { id:'glad',   name:'검투사',   emoji:'🗡️', cls:'전사', rarity:'C', hp:32, atk:7,
    skill:{ name:'강타', cost:2, type:'strike', val:6, target:'enemy', desc:'적 1명에게 공격력+6 피해' } },
  { id:'knight', name:'기사',     emoji:'🛡️', cls:'수호', rarity:'C', hp:42, atk:5,
    skill:{ name:'방패올리기', cost:1, type:'shield', val:9, target:'ally', desc:'아군 1명에게 방어막 9' } },
  { id:'mage',   name:'마법사',   emoji:'🔮', cls:'마법', rarity:'R', hp:22, atk:5,
    skill:{ name:'화염구', cost:3, type:'aoe', val:6, target:'allEnemies', desc:'모든 적에게 6 피해' } },
  { id:'archer', name:'궁수',     emoji:'🏹', cls:'사격', rarity:'C', hp:24, atk:6,
    skill:{ name:'연속사격', cost:2, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격' } },
  { id:'priest', name:'성직자',   emoji:'✨', cls:'치유', rarity:'R', hp:26, atk:4,
    skill:{ name:'치유의 빛', cost:2, type:'heal', val:15, target:'lowestAlly', desc:'가장 약한 아군 15 회복' } },
  { id:'rogue',  name:'도적',     emoji:'🥷', cls:'암살', rarity:'C', hp:22, atk:8,
    skill:{ name:'암습', cost:2, type:'strike', val:9, target:'enemy', desc:'적 1명에게 공격력+9 피해' } },
  { id:'berserk',name:'광전사',   emoji:'🪓', cls:'전사', rarity:'R', hp:34, atk:9,
    skill:{ name:'분노베기', cost:1, type:'strike', val:5, target:'enemy', desc:'적 1명에게 공격력+5 피해' } },
  { id:'paladin',name:'팔라딘',   emoji:'⚜️', cls:'수호', rarity:'R', hp:38, atk:6,
    skill:{ name:'축복', cost:2, type:'buff', val:4, target:'ally', desc:'아군 1명 공격력 +4 (전투 동안)' } },
  { id:'valk',   name:'발키리',   emoji:'🪽', cls:'사격', rarity:'R', hp:28, atk:7,
    skill:{ name:'천벌', cost:2, type:'aoe', val:5, target:'allEnemies', desc:'모든 적에게 5 피해' } },
  { id:'druid',  name:'드루이드', emoji:'🌿', cls:'치유', rarity:'C', hp:30, atk:5,
    skill:{ name:'재생', cost:1, type:'heal', val:9, target:'lowestAlly', desc:'가장 약한 아군 9 회복' } },
  { id:'monk',   name:'몽크',     emoji:'👊', cls:'전사', rarity:'C', hp:30, atk:7,
    skill:{ name:'연환권', cost:1, type:'multi', val:2, target:'enemy', desc:'무작위 적을 2회 공격' } },
  { id:'warlock',name:'흑마법사', emoji:'💀', cls:'마법', rarity:'SR', hp:20, atk:6,
    skill:{ name:'저주폭발', cost:3, type:'aoe', val:8, target:'allEnemies', desc:'모든 적에게 8 피해' } },
  { id:'templar',name:'템플러',   emoji:'⚔️', cls:'수호', rarity:'R', hp:36, atk:6,
    skill:{ name:'성스러운 방패', cost:2, type:'shield', val:12, target:'ally', desc:'아군 1명에게 방어막 12' } },
  { id:'hunter', name:'사냥꾼',   emoji:'🐺', cls:'사격', rarity:'C', hp:26, atk:7,
    skill:{ name:'정조준', cost:2, type:'strike', val:7, target:'enemy', desc:'적 1명에게 공격력+7 피해' } },
  { id:'samurai',name:'사무라이', emoji:'🗾', cls:'전사', rarity:'SR', hp:30, atk:9,
    skill:{ name:'발도', cost:2, type:'strike', val:11, target:'enemy', desc:'적 1명에게 공격력+11 피해' } },
  { id:'oracle', name:'점술가',   emoji:'🔯', cls:'치유', rarity:'SR', hp:24, atk:5,
    skill:{ name:'대천사 가호', cost:3, type:'heal', val:12, target:'lowestAlly', desc:'가장 약한 아군 12 회복 + 방어막' } }
];
var HW_BY_ID = {};
HW_HEROES.forEach(function (h) { HW_BY_ID[h.id] = h; });

var HW_STARTERS = ['glad', 'knight', 'priest'];

/* Enemies by tier */
var HW_ENEMIES = {
  basic: [
    { id:'slime',  name:'슬라임',   emoji:'🟢', hp:14, atk:4 },
    { id:'gob',    name:'고블린',   emoji:'👺', hp:16, atk:5 },
    { id:'bat',    name:'박쥐',     emoji:'🦇', hp:10, atk:6 },
    { id:'wolf',   name:'늑대',     emoji:'🐺', hp:18, atk:5 },
    { id:'skel',   name:'해골병',   emoji:'💀', hp:15, atk:5 }
  ],
  elite: [
    { id:'orc',    name:'오크 전사', emoji:'🧌', hp:34, atk:8 },
    { id:'golem',  name:'바위 골렘', emoji:'🗿', hp:50, atk:6 },
    { id:'witch',  name:'마녀',     emoji:'🧙', hp:28, atk:7, aoe:true },
    { id:'bandit', name:'산적 두목', emoji:'🪓', hp:30, atk:9 }
  ],
  boss: [
    { id:'dragon', name:'고대 드래곤', emoji:'🐉', hp:130, atk:14, aoe:true },
    { id:'lich',   name:'리치 군주',   emoji:'☠️', hp:110, atk:12, aoe:true },
    { id:'mino',   name:'미노타우르스 왕', emoji:'🐂', hp:150, atk:13 }
  ]
};

/* Relics (passive battle bonuses) */
var HW_RELICS = [
  { id:'banner', name:'강철 깃발',   emoji:'🚩', desc:'매 라운드 에너지 +1', effect:{ energy:1 } },
  { id:'fang',   name:'흡혈 송곳니', emoji:'🦷', desc:'기본 공격 시 HP 2 회복',  effect:{ lifesteal:2 } },
  { id:'drum',   name:'전쟁 북',     emoji:'🥁', desc:'전투 시작 시 전원 공격력 +2', effect:{ startAtk:2 } },
  { id:'crest',  name:'수호자 문장', emoji:'🛡️', desc:'전투 시작 시 전원 방어막 5',  effect:{ startBlock:5 } },
  { id:'chalice',name:'생명의 성배', emoji:'🏆', desc:'전투 승리 후 전원 HP 6 회복', effect:{ winHeal:6 } }
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
  elite:    { icon:'💀', label:'정예',   color:'#c77dff' },
  rest:     { icon:'🔥', label:'휴식',   color:'#46c98b' },
  shop:     { icon:'🛒', label:'상점',   color:'#f5c542' },
  treasure: { icon:'💎', label:'보물',   color:'#5aa6ff' },
  boss:     { icon:'👑', label:'보스',   color:'#ff8a4c' }
};
