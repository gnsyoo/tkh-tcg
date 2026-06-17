/* ===== 삼국 영웅전 — data =====
 * (이름/이모지/테마만 삼국지로. 스탯·스킬·id·밸런스는 추후 장수별로 세팅 예정.)
 * skill.target: 'enemy' | 'allEnemies' | 'lowestAlly' | 'ally' | 'self'
 * skill.type:   'strike'(+val dmg single) | 'aoe'(val to all) | 'multi'(hits N, each = atk)
 *               'heal'(val) | 'shield'(val block) | 'buff'(+val atk) | 'charm'(적 val턴 행동불가)
 * rarity:       'C' | 'R' | 'SR' | 'SSR'(무기 2개 장착 가능) */
var HW_HEROES = [
  { id:'glad',   name:'전위',   emoji:'⚔️', cls:'전사', rarity:'SSR', hp:40, atk:11,
    skill:{ name:'쌍철극', cost:2, type:'strike', val:9, target:'enemy', desc:'적 1명에게 공격력+9 피해' } },
  { id:'knight', name:'조인',   emoji:'🛡️', cls:'수호', rarity:'C', hp:42, atk:5,
    skill:{ name:'견벽수성', cost:1, type:'shield', val:9, target:'ally', desc:'아군 1명에게 방어막 9' } },
  { id:'mage',   name:'순욱',   emoji:'🔥', cls:'책략', rarity:'R', hp:22, atk:5,
    skill:{ name:'화공', cost:3, type:'aoe', val:6, target:'allEnemies', desc:'모든 적에게 6 피해' } },
  { id:'archer', name:'황충',   emoji:'🏹', cls:'궁수', rarity:'C', hp:24, atk:6,
    skill:{ name:'연속사격', cost:2, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격' } },
  { id:'priest', name:'순유',   emoji:'📜', cls:'책사', rarity:'R', hp:26, atk:4,
    skill:{ name:'허허실실', cost:2, type:'confuse', val:1, target:'enemy', desc:'적 1명을 1턴 혼란(행동 불능)' } },
  { id:'rogue',  name:'마대',   emoji:'🐎', cls:'기습', rarity:'C', hp:22, atk:8,
    skill:{ name:'기습', cost:2, type:'strike', val:9, target:'enemy', desc:'적 1명에게 공격력+9 피해' } },
  { id:'berserk',name:'장비',   emoji:'🍶', cls:'전사', rarity:'R', hp:34, atk:9,
    skill:{ name:'장팔사모', cost:1, type:'strike', val:5, target:'enemy', desc:'적 1명에게 공격력+5 피해' } },
  { id:'paladin',name:'손권',   emoji:'👑', cls:'군주', rarity:'R', hp:38, atk:6,
    skill:{ name:'고무', cost:2, type:'buff', val:4, target:'ally', desc:'아군 1명 공격력 +4 (전투 동안)' } },
  { id:'valk',   name:'태사자', emoji:'🏹', cls:'궁수', rarity:'R', hp:28, atk:7,
    skill:{ name:'화살비', cost:2, type:'aoe', val:5, target:'allEnemies', desc:'모든 적에게 5 피해' } },
  { id:'monk',   name:'주창',   emoji:'🪓', cls:'전사', rarity:'C', hp:30, atk:7,
    skill:{ name:'난격', cost:1, type:'multi', val:2, target:'enemy', desc:'무작위 적을 2회 공격' } },
  { id:'warlock',name:'사마의', emoji:'🪶', cls:'책략', rarity:'SSR', hp:38, atk:11, exclusive:'raid', raidOf:'cmd_simayi',
    skill:{ name:'화계', cost:3, type:'aoe', val:14, target:'allEnemies', desc:'모든 적에게 14 피해 (총사령관)' } },
  { id:'samurai',name:'관우',   emoji:'🗡️', cls:'전사', rarity:'SSR', hp:40, atk:13,
    skill:{ name:'청룡언월도', cost:2, type:'strike', val:14, target:'enemy', desc:'적 1명에게 공격력+14 피해' } },
  { id:'oracle', name:'제갈량', emoji:'🪶', cls:'책사', rarity:'SSR', hp:34, atk:8, exclusive:'qb',
    skill:{ name:'팔진도', cost:3, type:'heal', val:16, target:'lowestAlly', desc:'주공 16 회복 + 방어막' } },
  // ---- 추가 장수 ----
  { id:'cavalier',name:'마초',   emoji:'🐎', cls:'기마', rarity:'R', hp:34, atk:8,
    skill:{ name:'서량철기', cost:2, type:'strike', val:8, target:'enemy', desc:'적 1명에게 공격력+8 피해' } },
  { id:'ninja',   name:'여몽',   emoji:'🗡️', cls:'기습', rarity:'R', hp:22, atk:9,
    skill:{ name:'백의도강', cost:1, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격' } },
  { id:'shaman',  name:'방통',   emoji:'🔥', cls:'책략', rarity:'R', hp:24, atk:6,
    skill:{ name:'연환계', cost:3, type:'aoe', val:6, target:'allEnemies', desc:'모든 적에게 6 피해' } },
  { id:'frost',   name:'주유',   emoji:'🔥', cls:'책략', rarity:'SR', hp:22, atk:6,
    skill:{ name:'반간계', cost:2, type:'confuse', val:1, target:'enemy', desc:'적 1명을 1턴 혼란(행동 불능)' } },
  { id:'bulwark', name:'허저',   emoji:'🛡️', cls:'수호', rarity:'R', hp:46, atk:4,
    skill:{ name:'호위', cost:2, type:'shield', val:15, target:'ally', desc:'아군 1명에게 방어막 15' } },
  { id:'bard',    name:'서서',   emoji:'📜', cls:'책사', rarity:'R', hp:26, atk:5,
    skill:{ name:'계책', cost:2, type:'buff', val:5, target:'ally', desc:'아군 1명 공격력 +5 (전투 동안)' } },
  { id:'sage',    name:'유비',   emoji:'👑', cls:'군주', rarity:'SR', hp:26, atk:5,
    skill:{ name:'인덕', cost:3, type:'heal', val:20, target:'lowestAlly', desc:'가장 약한 아군 20 회복' } },
  { id:'reaper',  name:'조운',   emoji:'🗡️', cls:'전사', rarity:'SSR', hp:34, atk:14,
    skill:{ name:'단기필마', cost:2, type:'strike', val:16, target:'enemy', desc:'적 1명에게 공격력+16 피해' } },
  // ---- 추가 장수 2차 ----
  { id:'caocao',   name:'조조',   emoji:'👑', cls:'군주', rarity:'SSR', hp:40, atk:9, exclusive:'raid', raidOf:'cmd_caocao',
    skill:{ name:'간웅', cost:3, type:'buff', val:8, target:'ally', desc:'전군 공격력 +8 (전투 동안)' } },
  { id:'xiahoudun',name:'하후돈', emoji:'⚔️', cls:'전사', rarity:'SSR', hp:44, atk:11, exclusive:'raid', raidOf:'cmd_xiahoudun',
    skill:{ name:'발시담정', cost:2, type:'strike', val:11, target:'enemy', desc:'적 1명에게 공격력+11 피해' } },
  { id:'xiahouyuan',name:'하후연',emoji:'🏹', cls:'궁수', rarity:'R', hp:26, atk:7,
    skill:{ name:'질풍사격', cost:1, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격' } },
  { id:'sunce',    name:'손책',   emoji:'🗡️', cls:'전사', rarity:'SR', hp:30, atk:9,
    skill:{ name:'소패왕', cost:2, type:'strike', val:12, target:'enemy', desc:'적 1명에게 공격력+12 피해' } },
  { id:'ganning',  name:'감녕',   emoji:'🏹', cls:'기습', rarity:'R', hp:26, atk:8,
    skill:{ name:'백기겁영', cost:2, type:'strike', val:9, target:'enemy', desc:'적 1명에게 공격력+9 피해' } },
  { id:'luxun',    name:'육손',   emoji:'🔥', cls:'책략', rarity:'SR', hp:22, atk:6, exclusive:'raid', raidOf:'cmd_luxun',
    skill:{ name:'이릉대화', cost:3, type:'aoe', val:9, target:'allEnemies', desc:'모든 적에게 9 피해' } },
  { id:'jiangwei', name:'강유',   emoji:'⚔️', cls:'전사', rarity:'R', hp:32, atk:8,
    skill:{ name:'기산북벌', cost:2, type:'strike', val:8, target:'enemy', desc:'적 1명에게 공격력+8 피해' } },
  { id:'huanggai', name:'황개',   emoji:'🔥', cls:'수호', rarity:'R', hp:40, atk:6,
    skill:{ name:'고육화공', cost:3, type:'aoe', val:6, target:'allEnemies', desc:'모든 적에게 6 피해' } },
  { id:'huatuo',   name:'화타',   emoji:'🩹', cls:'의원', rarity:'SR', hp:24, atk:4,
    skill:{ name:'청낭서', cost:2, type:'heal', val:18, target:'lowestAlly', desc:'가장 약한 아군 18 회복' } },
  { id:'templar',name:'도겸',   emoji:'🏯', cls:'수호', rarity:'R', hp:36, atk:6,
    skill:{ name:'성벽 방어', cost:2, type:'shield', val:12, target:'ally', desc:'아군 1명에게 방어막 12' } },
  { id:'hunter', name:'마등',   emoji:'🏹', cls:'궁수', rarity:'C', hp:26, atk:7,
    skill:{ name:'정조준', cost:2, type:'strike', val:7, target:'enemy', desc:'적 1명에게 공격력+7 피해' } },
  { id:'spear',   name:'안량',   emoji:'🔱', cls:'전사', rarity:'C', hp:30, atk:8,
    skill:{ name:'창격', cost:2, type:'strike', val:7, target:'enemy', desc:'적 1명에게 공격력+7 피해' } },
  { id:'dancer',  name:'문추',   emoji:'🏹', cls:'궁수', rarity:'R', hp:24, atk:6,
    skill:{ name:'연환사', cost:2, type:'multi', val:4, target:'enemy', desc:'무작위 적을 4회 공격' } },
  { id:'druid',  name:'정욱',   emoji:'📜', cls:'책사', rarity:'C', hp:30, atk:5,
    skill:{ name:'구휼', cost:1, type:'heal', val:9, target:'lowestAlly', desc:'가장 약한 아군 9 회복' } },
  { id:'zhanghe',  name:'장합',   emoji:'🐎', cls:'기마', rarity:'R', hp:32, atk:8,
    skill:{ name:'우회 기동', cost:2, type:'strike', val:7, target:'enemy', desc:'적 1명에게 공격력+7 피해' } },
  { id:'dengai',   name:'등애',   emoji:'📜', cls:'책사', rarity:'R', hp:26, atk:6,
    skill:{ name:'기습 보급', cost:2, type:'shield', val:13, target:'ally', desc:'아군 1명에게 방어막 13' } },
  { id:'pangde',   name:'방덕',   emoji:'🪓', cls:'전사', rarity:'R', hp:34, atk:8,
    skill:{ name:'항우의 용맹', cost:1, type:'strike', val:6, target:'enemy', desc:'적 1명에게 공격력+6 피해' } },
  // ---- 추가 장수 3차 ----
  { id:'jiaxu',    name:'가후',   emoji:'📜', cls:'책략', rarity:'SR', hp:24, atk:6,
    skill:{ name:'교란계', cost:2, type:'confuse', val:1, target:'enemy', desc:'적 1명을 1턴 혼란(행동 불능)' } },
  { id:'xuhuang',  name:'서황',   emoji:'🪓', cls:'전사', rarity:'R', hp:36, atk:8,
    skill:{ name:'장구지계', cost:2, type:'strike', val:9, target:'enemy', desc:'적 1명에게 공격력+9 피해' } },
  { id:'diaochan', name:'초선',   emoji:'💃', cls:'무희', rarity:'SR', hp:20, atk:4,
    skill:{ name:'경국지색', cost:2, type:'charm', val:1, target:'enemy', desc:'적 1명을 1턴 매혹시켜 행동 불가' } },
  { id:'xiaoqiao', name:'소교',   emoji:'🌸', cls:'무희', rarity:'R', hp:20, atk:4,
    skill:{ name:'미인계', cost:2, type:'charm', val:1, target:'enemy', desc:'적 1명을 1턴 매혹시켜 행동 불가' } },
  { id:'daqiao',   name:'대교',   emoji:'🌺', cls:'무희', rarity:'R', hp:20, atk:4,
    skill:{ name:'경성지미', cost:2, type:'charm', val:1, target:'enemy', desc:'적 1명을 1턴 매혹시켜 행동 불가' } },
  { id:'yuejin',   name:'악진',   emoji:'🗡️', cls:'전사', rarity:'R', hp:30, atk:8,
    skill:{ name:'선등陷陣', cost:1, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격' } },
  { id:'manchong', name:'만총',   emoji:'📜', cls:'책사', rarity:'C', hp:28, atk:5,
    skill:{ name:'수성 방략', cost:2, type:'shield', val:12, target:'ally', desc:'주공 방어막 +12' } },
  { id:'zhangliao', name:'장료',  emoji:'🐎', cls:'전사', rarity:'SR', hp:36, atk:10,
    skill:{ name:'소요진', cost:2, type:'strike', val:12, target:'enemy', desc:'적 1명에게 공격력+12 피해' } },
  { id:'caopi',    name:'조비',   emoji:'👑', cls:'군주', rarity:'SR', hp:30, atk:6,
    skill:{ name:'수선受禪', cost:3, type:'buff', val:6, target:'ally', desc:'전군 공격력 +6 (전투 동안)' } },
  { id:'gongsunzan',name:'공손찬',emoji:'🐎', cls:'기마', rarity:'R', hp:34, atk:8,
    skill:{ name:'백마의종', cost:2, type:'strike', val:8, target:'enemy', desc:'적 1명에게 공격력+8 피해' } },
  { id:'weiyan',   name:'위연',   emoji:'🪓', cls:'전사', rarity:'R', hp:34, atk:9,
    skill:{ name:'자오곡 기습', cost:2, type:'strike', val:9, target:'enemy', desc:'적 1명에게 공격력+9 피해' } },
  { id:'hejin',    name:'하진',   emoji:'🛡️', cls:'수호', rarity:'C', hp:40, atk:5,
    skill:{ name:'대장군 위엄', cost:1, type:'shield', val:10, target:'ally', desc:'주공 방어막 +10' } },
  // ---- 명장(대장전 전용) — 기존 로스터에 없던 적장을 장수로 추가. 해당 보스 격파로만 획득 ----
  { id:'huaxiong', name:'화웅', emoji:'🪓', cls:'전사', rarity:'SSR', hp:40, atk:13, exclusive:'raid', raidOf:'cmd_huaxiong',
    skill:{ name:'관문 수장', cost:2, type:'strike', val:14, target:'enemy', desc:'적 1명에게 공격력+14 피해' } },
  { id:'yuanshao', name:'원소', emoji:'🎌', cls:'군주', rarity:'SSR', hp:44, atk:10, exclusive:'raid', raidOf:'cmd_yuanshao',
    skill:{ name:'사세삼공', cost:3, type:'buff', val:8, target:'ally', desc:'전군 공격력 +8 (전투 동안)' } },
  { id:'simayan', name:'사마염', emoji:'👑', cls:'군주', rarity:'SSR', hp:48, atk:13, exclusive:'raid', raidOf:'cmd_simayan',
    skill:{ name:'삼국 통일', cost:3, type:'aoe', val:18, target:'allEnemies', desc:'모든 적에게 18 피해' } }
];
var HW_BY_ID = {};
HW_HEROES.forEach(function (h) { HW_BY_ID[h.id] = h; });

var HW_STARTERS = ['glad', 'xiahouyuan', 'mage', 'knight']; // 전위 · 하후연 · 순욱 · 조인

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
  { id:'banner', name:'대장군 깃발', emoji:'🚩', desc:'가운데 카드 칸 +1', effect:{ energy:1 } },
  { id:'fang',   name:'오추마',     emoji:'🐎', desc:'기본 공격 시 HP 2 회복',  effect:{ lifesteal:2 } },
  { id:'drum',   name:'전고(戰鼓)', emoji:'🥁', desc:'전투 시작 시 전원 공격력 +2', effect:{ startAtk:2 } },
  { id:'crest',  name:'방패 진형',  emoji:'🛡️', desc:'전투 시작 시 전원 방어막 5',  effect:{ startBlock:5 } },
  { id:'chalice',name:'군량미',     emoji:'🍚', desc:'전투 승리 후 전원 HP 6 회복', effect:{ winHeal:6 } }
];

/* 주공(나) 기본 스탯 */
var HW_LORD = { hp: 200, mp: 50 };

/* 무기 (장착 수: C=0 · R=1 · SR=2 · SSR=3) — 삼국지 아이템
 * effect: atk(+공격), doubleStrike(기본공격 2회), poison(공격 시 독 부여),
 *         crit(치명타 확률 +, 0~1), evade(적 공격 회피 확률 +, 0~1), lordHp/lordMp(주공 최대 HP/MP) */
var HW_WEAPONS = [
  { id:'spear18',  name:'장팔사모',   emoji:'🔱', desc:'장착 장수 공격력 +3',        effect:{ atk:3 } },
  { id:'qinglong', name:'청룡언월도', emoji:'🗡️', desc:'장착 장수 공격력 +4',        effect:{ atk:4 } },
  { id:'fangtian', name:'방천화극',   emoji:'⚔️', desc:'장착 장수 공격력 +5',        effect:{ atk:5 } },
  { id:'qixing',   name:'칠성검',     emoji:'🌟', desc:'기본 공격이 2회 연속',        effect:{ doubleStrike:true } },
  { id:'mengde',   name:'맹덕신서',   emoji:'📕', desc:'공격 시 적에게 독 +2',        effect:{ poison:2 } },
  { id:'taiping',  name:'태평요술서', emoji:'☯️', desc:'공격 시 적에게 독 +3',        effect:{ poison:3 } },
  { id:'qinggang', name:'청강검',     emoji:'🔪', desc:'치명타 확률 +10%',           effect:{ crit:0.10 } },
  { id:'yitian',   name:'의천검',     emoji:'🗡️', desc:'치명타 확률 +12%',           effect:{ crit:0.12 } },
  { id:'cixiong',  name:'자웅일대검', emoji:'⚔️', desc:'치명타 확률 +15% (장수 컬렉션 완료 보상)', effect:{ crit:0.15 }, exclusive:'collection' },
  { id:'yuxi',     name:'전국옥새',   emoji:'🟨', desc:'주공 최대 HP +60',           effect:{ lordHp:60 } },
  { id:'sunzi',    name:'손자병법',   emoji:'📜', desc:'주공 최대 MP +20',           effect:{ lordMp:20 } },
  { id:'guanyu',   name:'한수정후인', emoji:'🟥', desc:'주공 최대 HP +30, MP +10',   effect:{ lordHp:30, lordMp:10 } },
  // ---- 추가 장비 ----
  { id:'gufeng',   name:'고정도',     emoji:'🔪', desc:'장착 장수 공격력 +6',        effect:{ atk:6 } },
  { id:'hanblood', name:'한혈보도',   emoji:'⚔️', desc:'장착 장수 공격력 +7',        effect:{ atk:7 } },
  { id:'sanjian',  name:'삼첨양인도', emoji:'🔱', desc:'공격력 +4, 치명타 +9%',     effect:{ atk:4, crit:0.09 } },
  { id:'huaji',    name:'화극(畵戟)', emoji:'🗡️', desc:'공격력 +3, 기본 공격 2회',  effect:{ atk:3, doubleStrike:true } },
  { id:'qiangbow', name:'양유기 강궁',emoji:'🏹', desc:'기본 공격 2회 + 치명타 +8%', effect:{ doubleStrike:true, crit:0.08 } },
  { id:'liannu',   name:'제갈연노',   emoji:'🎯', desc:'공격 시 적에게 독 +4',        effect:{ poison:4 } },
  { id:'qibao',    name:'칠보도',     emoji:'🗡️', desc:'공격력 +2, 독 +2',           effect:{ atk:2, poison:2 } },
  { id:'tiebian',  name:'철편(鐵鞭)', emoji:'🏏', desc:'공격력 +5, 주공 최대 HP +20', effect:{ atk:5, lordHp:20 } },
  { id:'huanshou', name:'환수도',     emoji:'🗡️', desc:'공격력 +3, 치명타 +10%',    effect:{ atk:3, crit:0.10 } },
  { id:'baiyu',    name:'백우선',     emoji:'🪭', desc:'주공 최대 MP +30',           effect:{ lordMp:30 } },
  { id:'tongque',  name:'동작대 보패', emoji:'🏯', desc:'주공 최대 HP +50, MP +15',  effect:{ lordHp:50, lordMp:15 } },
  { id:'liutao',   name:'육도삼략',   emoji:'📚', desc:'주공 최대 MP +25, 치명타 +8%', effect:{ lordMp:25, crit:0.08 } },
  { id:'dunjia',   name:'둔갑천서',   emoji:'📗', desc:'주공 HP +40, MP +20, 치명타 +10%', effect:{ lordHp:40, lordMp:20, crit:0.10 } },
  // ---- 명마(회피) ----
  { id:'chituma',  name:'적토마',     emoji:'🐎', desc:'적 공격 회피 확률 +10%',     effect:{ evade:0.10 } },
  { id:'dilu',     name:'적로',       emoji:'🐎', desc:'적 공격 회피 확률 +7%',      effect:{ evade:0.07 } },
  { id:'jueying',  name:'절영',       emoji:'🐴', desc:'적 공격 회피 확률 +7%',      effect:{ evade:0.07 } },
  { id:'zhaohuang',name:'조황비전',   emoji:'🐎', desc:'적 공격 회피 확률 +7%',      effect:{ evade:0.07 } }
];
var HW_WEAPON_BY_ID = {};
HW_WEAPONS.forEach(function (w) { HW_WEAPON_BY_ID[w.id] = w; });

/* Difficulty tuning (기본 상/하드 고정 — 선택 화면 없음, 전반 상향) */
var HW_DIFF = {
  easy:   { eHp:1.00, eAtk:0.84, gold:1.4, smart:false, startGold:70 },
  normal: { eHp:1.07, eAtk:0.93, gold:1.0, smart:false, startGold:50 },
  hard:   { eHp:1.10, eAtk:1.01, gold:0.9, smart:true, startGold:40 }
};

/* 소모성 아이템 — 전투 중 턴당 1개 사용, 최대 5칸 소지. 저잣거리에서 랜덤 구매 */
var HW_CONSUMABLES = [
  { id:'potion_hp',  emoji:'🧪', name:'회복약',   kind:'hp',           val:45, desc:'주공 HP 45 회복' },
  { id:'potion_mp',  emoji:'💧', name:'마력약',   kind:'mp',           val:20, desc:'주공 MP 20 회복' },
  { id:'antidote',   emoji:'🌿', name:'해독초',   kind:'cure_poison',          desc:'아군 카드 중독 모두 해제' },
  { id:'incense',    emoji:'🔔', name:'안신향',   kind:'cure_confuse',         desc:'아군 카드 혼란·매혹 해제' },
  { id:'warwine',    emoji:'🍷', name:'전투주',   kind:'atk', val:5, turns:2,  desc:'2턴간 전군 공격력 +5' },
  { id:'ironcharm',  emoji:'🛡️', name:'철벽부',   kind:'shield', val:8,        desc:'주공 방어막 +8' }
];
var HW_CONS_BY_ID = {}; HW_CONSUMABLES.forEach(function (c) { HW_CONS_BY_ID[c.id] = c; });
var HW_ITEM_MAX = 5; // 소모성 아이템 소지 최대 칸

/* 중간보스(각 메인 5·10 출전) — 강화 적 + 아군 카드에 상태이상. mp는 스테이지에 따라 20~50 */
var HW_MID = { hpMult:2.3, atkMult:1.3, skillChance:0.32 };
var HW_MID_SKILLS = [ // 아군 카드(장수)를 노리는 상태이상
  { name:'미혹의 진', type:'p_charm',   desc:'아군 카드 1장 1턴 매혹(행동 불능)' },
  { name:'환혼술',     type:'p_confuse', desc:'아군 카드 1장 1턴 혼란(행동 불능)' },
  { name:'독무 살포',   type:'p_poison', val:4, desc:'아군 카드 1장 중독(턴마다 주공 피해)' },
  { name:'사신 강림',   type:'p_seal',    desc:'아군 카드 1장 이번 전투 봉인(전투당 1회)' }
];

/* 모드(노멀→하드→극악) — 천하통일로 차례로 해금. 위 상/중/하 배수에 곱해 적용.
 * hpMult: 모든 적 HP 배수, bossAtkMult: 적장 공격 배수, bossCrit: 적장 치명타 확률, gold: 골드 배수 */
var HW_MODES = {
  normal:  { key:'normal',  label:'노멀', emoji:'🟢', hpMult:1, bossAtkMult:1,   bossCrit:0.01, gold:1.0, desc:'기본 난이도' },
  hard:    { key:'hard',    label:'하드', emoji:'🟠', hpMult:2, bossAtkMult:1.5, bossCrit:0.01, gold:1.4, desc:'적 HP 2배 · 적장 공격 +50%' },
  extreme: { key:'extreme', label:'극악', emoji:'🔴', hpMult:3, bossAtkMult:2,   bossCrit:0.10, gold:2.0, desc:'적 HP 3배 · 적장 공격 +100% · 적장 치명타 10%' }
};
var HW_MODE_ORDER = ['normal', 'hard', 'extreme'];

/* 적장(스테이지 보스) — 스테이지 진행에 따라 난이도 가산 */
var HW_COMMANDERS = {
  cmd_huaxiong:  { name:'화웅',   emoji:'🪓', hp:30,  atk:7,  hero:'huaxiong' },
  cmd_yuanshao:  { name:'원소',   emoji:'🎌', hp:36,  atk:7,  hero:'yuanshao' },
  cmd_xiahoudun: { name:'하후돈', emoji:'⚔️', hp:42,  atk:8,  hero:'xiahoudun' },
  cmd_caocao:    { name:'조조',   emoji:'👑', hp:52,  atk:9, aoe:true, hero:'caocao' },
  cmd_xiahouyuan:{ name:'하후연', emoji:'🏹', hp:58,  atk:9,  hero:'xiahouyuan' },
  cmd_luxun:     { name:'육손',   emoji:'🔥', hp:66,  atk:10, aoe:true, hero:'luxun' },
  cmd_simayi:    { name:'사마의', emoji:'🪶', hp:70,  atk:10, aoe:true, hero:'warlock' },
  cmd_simayan:   { name:'사마염', emoji:'👑', hp:78,  atk:10, aoe:true, hero:'simayan' }
};

/* 보스(스테이지·레이드) — 난이도별 스킬 사용 확률·마나, 격파 시 영웅전 적립 골드.
 * 보스는 매 공격 시 skillChance 확률로 대응 장수(`hero`)의 원래 스킬을 사용(MP 소모). */
var HW_BOSS = {
  easy:   { mp:20, skillChance:0.14, raidGold:50 },
  normal: { mp:35, skillChance:0.25, raidGold:100 },
  hard:   { mp:50, skillChance:0.35, raidGold:150 }
};

/* 전역(campaign) — 8개 역사 스테이지. 뒤로 갈수록 난이도 상승.
 * reward: 'hero'(영웅 영입) | 'relic'(유물) | 'final'(클리어) */
var HW_STAGES = [
  { name:'반동탁 연합군', year:'191년', desc:'동탁의 전횡에 맞서 제후들이 결집한 전투', boss:'cmd_huaxiong',   adds:1, reward:'hero' },
  { name:'관도대전',     year:'200년', desc:'조조가 원소를 꺾고 하북의 패권을 잡은 전환점', boss:'cmd_yuanshao',  adds:1, reward:'hero' },
  { name:'장판파 전투',   year:'208년', desc:'퇴각하는 유비를 조운·장비가 지켜낸 전투', boss:'cmd_xiahoudun', adds:2, reward:'hero' },
  { name:'적벽대전',     year:'208년', desc:'손권·유비 연합군이 화공으로 조조 대군을 격파', boss:'cmd_caocao',    adds:2, reward:'relic' },
  { name:'정군산 전투',   year:'219년', desc:'유비군이 하후연을 베고 한중을 차지', boss:'cmd_xiahouyuan', adds:2, reward:'hero' },
  { name:'이릉대전',     year:'222년', desc:'관우의 복수에 나선 유비가 육손에게 대패', boss:'cmd_luxun',     adds:2, reward:'hero' },
  { name:'제갈량의 북벌', year:'228~234년', desc:'촉의 제갈량이 위를 향해 거듭 북벌에 나섬', boss:'cmd_simayi',   adds:3, reward:'relic' },
  { name:'위·촉·오 멸망', year:'263~280년', desc:'사마염이 진(晉)을 세워 천하를 통일', boss:'cmd_simayan',  adds:2, reward:'final' }
];

/* 삼국 대장전(레이드) — 영웅전 스테이지 보스가 거대 HP로 등장. 격파 시 전용 장수 획득.
 * hpMult: 적장 기본 HP 대비 배수, atkMult: 공격 배수, deck: 영웅전 파티 공유 */
var HW_RAID = {
  hpMult: 12,
  atkMult: 1.25,
  bosses: [
    { key:'cmd_huaxiong',   reward:'huaxiong',    title:'관문의 맹장' },
    { key:'cmd_yuanshao',   reward:'yuanshao',    title:'하북의 패자' },
    { key:'cmd_xiahoudun',  reward:'xiahoudun',   title:'위의 독안룡' },
    { key:'cmd_caocao',     reward:'caocao',      title:'난세의 간웅' },
    { key:'cmd_xiahouyuan', reward:'xiahouyuan',  title:'질풍의 명궁' },
    { key:'cmd_luxun',      reward:'luxun',       title:'이릉의 대도독' },
    { key:'cmd_simayi',     reward:'warlock',     title:'위의 총사령관' },
    { key:'cmd_simayan',    reward:'simayan',     title:'진(晉)의 무제' }
  ]
};
