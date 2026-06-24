/* ===== 삼국 영웅전 — data =====
 * (이름/이모지/테마만 삼국지로. 스탯·스킬·id·밸런스는 추후 장수별로 세팅 예정.)
 * skill.target: 'enemy' | 'allEnemies' | 'lowestAlly' | 'ally' | 'self'
 * skill.type:   'strike'(+val dmg single) | 'aoe'(val to all) | 'multi'(hits N, each = atk)
 *               'heal'(val) | 'shield'(val block) | 'buff'(+val atk) | 'charm'(적 val턴 행동불가)
 * rarity:       'C' | 'R' | 'SR' | 'SSR'(무기 2개 장착 가능) */
var HW_HEROES = [
  { id:'glad',   name:'전위',   emoji:'⚔️', cls:'전사', rarity:'SSR', hp:40, atk:13,
    skill:{ name:'쌍철극', cost:2, type:'strike', mult:0.5, splash:0.3, val:15, target:'enemy', desc:'(공격력+15)의 50% 피해 + 인접 적에게 30% 피해' } },
  { id:'knight', name:'조인',   emoji:'🛡️', cls:'수호', rarity:'C', hp:42, atk:5,
    skill:{ name:'견벽수성', cost:1, type:'shield', val:9, target:'self', desc:'주공 방어막 +9' } },
  { id:'mage',   name:'순욱',   emoji:'📜', cls:'책사', rarity:'SR', hp:24, atk:6,
    skill:{ name:'왕좌지재', cost:2, type:'buff', val:8, target:'ally', desc:'공격 카드 1장 공격력 +8 (1턴)' } },
  { id:'archer', name:'황충',   emoji:'🏹', cls:'궁수', rarity:'SR', hp:28, atk:8,
    skill:{ name:'연속사격', cost:2, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격 (100/70/50%)' } },
  { id:'priest', name:'순유',   emoji:'📜', cls:'책사', rarity:'R', hp:26, atk:4,
    skill:{ name:'허허실실', cost:2, type:'confuse', val:1, target:'enemy', desc:'적 1명을 1턴 혼란(행동 불능)' } },
  { id:'rogue',  name:'마대',   emoji:'🐎', cls:'기습', rarity:'C', hp:22, atk:8,
    skill:{ name:'기습', cost:2, type:'strike', mult:0.5, stun:0.5, val:9, target:'enemy', desc:'(공격력+9)의 50% 피해 + 50% 확률로 기절' } },
  { id:'berserk',name:'장비',   emoji:'🍶', cls:'전사', rarity:'SR', hp:36, atk:10,
    skill:{ name:'장팔사모', cost:2, type:'strike', val:12, target:'enemy', desc:'적 1명에게 공격력+12 피해' } },
  { id:'paladin',name:'손권',   emoji:'👑', cls:'군주', rarity:'SR', hp:40, atk:8,
    skill:{ name:'제업의 호령', cost:3, type:'buff', scope:'army', val:3, target:'ally', desc:'전군 공격력 +3 (전투 동안)' } },
  { id:'valk',   name:'태사자', emoji:'🏹', cls:'궁수', rarity:'SR', hp:30, atk:8,
    skill:{ name:'화살비', cost:2, type:'aoe', val:5, target:'allEnemies', desc:'모든 적에게 5 피해' } },
  { id:'monk',   name:'주창',   emoji:'🪓', cls:'전사', rarity:'C', hp:30, atk:7,
    skill:{ name:'난격', cost:1, type:'multi', val:2, target:'enemy', desc:'무작위 적을 2회 공격 (100/70%)' } },
  { id:'warlock',name:'사마의', emoji:'🪶', cls:'책략', rarity:'SSR', hp:38, atk:11, exclusive:'raid', raidOf:'cmd_simayi', elem:'fire',
    skill:{ name:'화계', cost:3, type:'aoe', val:14, target:'allEnemies', desc:'모든 적에게 14 피해 (총사령관)' } },
  { id:'samurai',name:'관우',   emoji:'🗡️', cls:'전사', rarity:'SSR', hp:40, atk:13,
    skill:{ name:'청룡언월도', cost:2, type:'strike', val:14, target:'enemy', desc:'적 1명에게 공격력+14 피해' } },
  { id:'oracle', name:'제갈량', emoji:'🪶', cls:'책사', rarity:'SSR', hp:38, atk:10, exclusive:'qb',
    skill:{ name:'팔진도', cost:3, type:'heal', val:20, target:'lowestAlly', desc:'주공 20 회복 + 방어막' } },
  // ---- 추가 장수 ----
  { id:'cavalier',name:'마초',   emoji:'🐎', cls:'기마', rarity:'SR', hp:36, atk:9,
    skill:{ name:'서량철기', cost:2, type:'strike', mult:0.5, splash:0.3, val:8, target:'enemy', desc:'(공격력+8)의 50% 피해 + 인접 적에게 30% 피해' } },
  { id:'ninja',   name:'여몽',   emoji:'🗡️', cls:'기습', rarity:'C', hp:22, atk:8,
    skill:{ name:'백의도강', cost:1, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격 (100/70/50%)' } },
  { id:'shaman',  name:'방통',   emoji:'📜', cls:'책사', rarity:'SSR', hp:36, atk:10,
    skill:{ name:'회생계', cost:3, type:'heal', val:20, target:'self', desc:'주공 20 회복' } },
  { id:'frost',   name:'주유',   emoji:'🔥', cls:'책략', rarity:'SR', hp:22, atk:6,
    skill:{ name:'반간계', cost:2, type:'confuse', val:1, target:'enemy', desc:'적 1명을 1턴 혼란(행동 불능)' } },
  { id:'bulwark', name:'허저',   emoji:'🛡️', cls:'수호', rarity:'SR', hp:48, atk:6,
    skill:{ name:'호위', cost:2, type:'shield', val:15, target:'self', desc:'주공 방어막 +15' } },
  { id:'bard',    name:'서서',   emoji:'📜', cls:'책사', rarity:'SR', hp:28, atk:6,
    skill:{ name:'계책', cost:2, type:'buff', val:5, target:'ally', desc:'공격 카드 1장 공격력 +5 (1턴)' } },
  { id:'sage',    name:'유비',   emoji:'👑', cls:'군주', rarity:'SR', hp:26, atk:5,
    skill:{ name:'인덕', cost:3, type:'heal', val:20, target:'self', desc:'주공 20 회복' } },
  { id:'reaper',  name:'조운',   emoji:'🗡️', cls:'전사', rarity:'SSR', hp:34, atk:14,
    skill:{ name:'단기필마', cost:2, type:'strike', val:16, target:'enemy', desc:'적 1명에게 공격력+16 피해' } },
  // ---- 추가 장수 2차 ----
  { id:'caocao',   name:'조조',   emoji:'👑', cls:'군주', rarity:'SSR', hp:42, atk:10, exclusive:'raid', raidOf:'cmd_caocao', elem:'fire',
    skill:{ name:'간웅', cost:3, type:'buff', scope:'army', val:4, target:'ally', desc:'전군 공격력 +4 (전투 동안)' } },
  { id:'xiahoudun',name:'하후돈', emoji:'⚔️', cls:'전사', rarity:'SSR', hp:44, atk:11, exclusive:'raid', raidOf:'cmd_xiahoudun', elem:'earth',
    skill:{ name:'발시담정', cost:2, type:'strike', mult:0.5, stun:0.5, val:11, target:'enemy', desc:'(공격력+11)의 50% 피해 + 50% 확률로 기절' } },
  { id:'xiahouyuan',name:'하후연',emoji:'🏹', cls:'궁수', rarity:'SSR', hp:34, atk:12,
    skill:{ name:'질풍사격', cost:2, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격 (100/70/50%)' } },
  { id:'sunce',    name:'손책',   emoji:'🗡️', cls:'전사', rarity:'SR', hp:30, atk:9,
    skill:{ name:'소패왕', cost:2, type:'strike', mult:0.5, stun:0.5, val:12, target:'enemy', desc:'(공격력+12)의 50% 피해 + 50% 확률로 기절' } },
  { id:'ganning',  name:'감녕',   emoji:'🏹', cls:'기습', rarity:'SR', hp:30, atk:10,
    skill:{ name:'백기겁영', cost:2, type:'strike', mult:0.5, stun:0.5, val:12, target:'enemy', desc:'(공격력+12)의 50% 피해 + 50% 확률로 기절' } },
  { id:'luxun',    name:'육손',   emoji:'🔥', cls:'책략', rarity:'SR', hp:22, atk:6, exclusive:'raid', raidOf:'cmd_luxun', elem:'earth',
    skill:{ name:'이릉대화', cost:3, type:'aoe', val:9, target:'allEnemies', desc:'모든 적에게 9 피해' } },
  { id:'jiangwei', name:'강유',   emoji:'⚔️', cls:'전사', rarity:'SR', hp:34, atk:9,
    skill:{ name:'기산북벌', cost:2, type:'strike', mult:0.5, splash:0.3, val:8, target:'enemy', desc:'(공격력+8)의 50% 피해 + 인접 적에게 30% 피해' } },
  { id:'huanggai', name:'황개',   emoji:'🔥', cls:'수호', rarity:'C', hp:40, atk:5,
    skill:{ name:'고육화공', cost:3, type:'aoe', val:6, target:'allEnemies', desc:'모든 적에게 6 피해' } },
  { id:'huatuo',   name:'화타',   emoji:'🩹', cls:'의원', rarity:'SR', hp:24, atk:4,
    skill:{ name:'청낭서', cost:2, type:'heal', val:18, target:'self', desc:'주공 18 회복' } },
  { id:'templar',name:'도겸',   emoji:'🏯', cls:'수호', rarity:'C', hp:36, atk:5,
    skill:{ name:'성벽 방어', cost:2, type:'shield', val:9, target:'self', desc:'주공 방어막 +9' } },
  { id:'hunter', name:'마등',   emoji:'🏹', cls:'궁수', rarity:'R', hp:26, atk:7,
    skill:{ name:'정조준', cost:2, type:'strike', val:7, target:'enemy', desc:'적 1명에게 공격력+7 피해' } },
  { id:'spear',   name:'안량',   emoji:'🔱', cls:'전사', rarity:'SR', hp:36, atk:10,
    skill:{ name:'창격', cost:2, type:'strike', mult:0.5, splash:0.3, val:12, target:'enemy', desc:'(공격력+12)의 50% 피해 + 인접 적에게 30% 피해' } },
  { id:'dancer',  name:'문추',   emoji:'🏹', cls:'궁수', rarity:'SR', hp:28, atk:8,
    skill:{ name:'연환사', cost:2, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격 (100/70/50%)' } },
  { id:'druid',  name:'정욱',   emoji:'📜', cls:'책사', rarity:'SR', hp:30, atk:6,
    skill:{ name:'구휼', cost:2, type:'heal', val:14, target:'self', desc:'주공 14 회복' } },
  { id:'zhanghe',  name:'장합',   emoji:'🐎', cls:'기마', rarity:'SR', hp:34, atk:10,
    skill:{ name:'우회 기동', cost:2, type:'strike', mult:0.5, splash:0.3, val:11, target:'enemy', desc:'(공격력+11)의 50% 피해 + 인접 적에게 30% 피해' } },
  { id:'dengai',   name:'등애',   emoji:'📜', cls:'책사', rarity:'R', hp:26, atk:6,
    skill:{ name:'기습 보급', cost:2, type:'shield', val:13, target:'self', desc:'주공 방어막 +13' } },
  { id:'pangde',   name:'방덕',   emoji:'🪓', cls:'전사', rarity:'SR', hp:36, atk:10,
    skill:{ name:'항우의 용맹', cost:2, type:'strike', val:12, target:'enemy', desc:'적 1명에게 공격력+12 피해' } },
  // ---- 추가 장수 3차 ----
  { id:'jiaxu',    name:'가후',   emoji:'📜', cls:'책략', rarity:'SR', hp:24, atk:6,
    skill:{ name:'교란계', cost:2, type:'confuse', val:1, target:'enemy', desc:'적 1명을 1턴 혼란(행동 불능)' } },
  { id:'xuhuang',  name:'서황',   emoji:'🪓', cls:'전사', rarity:'R', hp:36, atk:8,
    skill:{ name:'장구지계', cost:2, type:'strike', mult:0.5, poisonHit:true, val:9, target:'enemy', desc:'(공격력+9)의 50% 피해 + 피해량만큼 중독' } },
  { id:'diaochan', name:'초선',   emoji:'💃', cls:'무희', rarity:'SSR', hp:36, atk:10, exclusive:'normalclear',
    skill:{ name:'폐월수화', cost:3, type:'charm', val:1, poison:5, target:'enemy', desc:'적 1명을 1턴 매혹(행동 불가) + 매턴 5 중독 피해' } },
  { id:'xiaoqiao', name:'소교',   emoji:'🌸', cls:'무희', rarity:'R', hp:24, atk:4,
    skill:{ name:'미인계', cost:2, type:'charm', val:1, target:'enemy', desc:'적 1명을 1턴 매혹시켜 행동 불가' } },
  { id:'daqiao',   name:'대교',   emoji:'🌺', cls:'무희', rarity:'SR', hp:26, atk:6,
    skill:{ name:'경성지미', cost:2, type:'charm', val:1, target:'enemy', desc:'적 1명을 1턴 매혹시켜 행동 불가' } },
  { id:'yuejin',   name:'악진',   emoji:'🗡️', cls:'전사', rarity:'C', hp:30, atk:7,
    skill:{ name:'선등陷陣', cost:1, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격 (100/70/50%)' } },
  { id:'manchong', name:'만총',   emoji:'📜', cls:'책사', rarity:'R', hp:28, atk:5,
    skill:{ name:'수성 방략', cost:2, type:'shield', val:12, target:'ally', desc:'주공 방어막 +12' } },
  { id:'zhangliao', name:'장료',  emoji:'🐎', cls:'전사', rarity:'SR', hp:36, atk:10,
    skill:{ name:'소요진', cost:2, type:'strike', mult:0.5, splash:0.3, val:12, target:'enemy', desc:'(공격력+12)의 50% 피해 + 인접 적에게 30% 피해' } },
  { id:'caopi',    name:'조비',   emoji:'👑', cls:'군주', rarity:'SR', hp:30, atk:6,
    skill:{ name:'수선受禪', cost:3, type:'buff', scope:'army', val:3, target:'ally', desc:'전군 공격력 +3 (전투 동안)' } },
  { id:'gongsunzan',name:'공손찬',emoji:'🐎', cls:'기마', rarity:'C', hp:32, atk:7,
    skill:{ name:'백마의종', cost:2, type:'strike', mult:0.5, poisonHit:true, val:8, target:'enemy', desc:'(공격력+8)의 50% 피해 + 피해량만큼 중독' } },
  { id:'weiyan',   name:'위연',   emoji:'🪓', cls:'전사', rarity:'SR', hp:36, atk:10,
    skill:{ name:'자오곡 기습', cost:2, type:'strike', mult:0.5, stun:0.5, val:12, target:'enemy', desc:'(공격력+12)의 50% 피해 + 50% 확률로 기절' } },
  { id:'hejin',    name:'하진',   emoji:'🛡️', cls:'수호', rarity:'C', hp:40, atk:5,
    skill:{ name:'대장군 위엄', cost:1, type:'shield', val:10, target:'ally', desc:'주공 방어막 +10' } },
  // ---- 명장(대장전 전용) — 기존 로스터에 없던 적장을 장수로 추가. 해당 보스 격파로만 획득 ----
  { id:'huaxiong', name:'화웅', emoji:'🪓', cls:'전사', rarity:'SSR', hp:40, atk:13, exclusive:'raid', raidOf:'cmd_huaxiong',
    skill:{ name:'관문 수장', cost:2, type:'strike', mult:0.5, poisonHit:true, val:14, target:'enemy', desc:'(공격력+14)의 50% 피해 + 피해량만큼 중독' } },
  { id:'yuanshao', name:'원소', emoji:'🎌', cls:'군주', rarity:'SSR', hp:44, atk:10, exclusive:'raid', raidOf:'cmd_yuanshao', elem:'water',
    skill:{ name:'사세삼공', cost:3, type:'buff', scope:'army', val:4, target:'ally', desc:'전군 공격력 +4 (전투 동안)' } },
  { id:'simayan', name:'사마염', emoji:'👑', cls:'군주', rarity:'SSR', hp:48, atk:13, exclusive:'raid', raidOf:'cmd_simayan', elem:'water',
    skill:{ name:'삼국 통일', cost:3, type:'aoe', val:18, target:'allEnemies', desc:'모든 적에게 18 피해' } },
  // ---- 특수 획득 장수 ----
  { id:'lubu', name:'여포', emoji:'🐎', cls:'전사', rarity:'SSR', hp:46, atk:15, exclusive:'special',
    skill:{ name:'천하무쌍', cost:3, type:'strike', val:18, target:'enemy', desc:'적 1명에게 공격력+18 피해' } },
  // ---- 중간보스 영입 장수(주막 미출현 · 중간보스 격파로만 획득. 5출진=노멀·10출진=하드) ----
  { id:'mb_lijue',      name:'이각',   emoji:'🪓', cls:'전사', rarity:'R',  hp:32, atk:8, exclusive:'mid',
    skill:{ name:'장안의 칼', cost:2, type:'strike', mult:0.5, poisonHit:true, val:8, target:'enemy', desc:'(공격력+8)의 50% 피해 + 피해량만큼 중독' } },
  { id:'mb_guosi',      name:'곽사',   emoji:'🗡️', cls:'기습', rarity:'R', hp:32, atk:7, exclusive:'mid',
    skill:{ name:'교란 기습', cost:2, type:'confuse', val:1, target:'enemy', desc:'적 1명을 1턴 혼란(행동 불능)' } },
  { id:'mb_chunyujing', name:'순우경', emoji:'🍶', cls:'수호', rarity:'R',  hp:38, atk:6, exclusive:'mid',
    skill:{ name:'오소 수비', cost:1, type:'shield', val:10, target:'self', desc:'주공 방어막 +10' } },
  { id:'mb_gaolan',     name:'고람',   emoji:'🛡️', cls:'수호', rarity:'R', hp:42, atk:6, exclusive:'mid',
    skill:{ name:'하북의 방패', cost:2, type:'shield', val:13, target:'self', desc:'주공 방어막 +13' } },
  { id:'mb_zhaochun',   name:'조순',   emoji:'🐎', cls:'기마', rarity:'C',  hp:30, atk:7, exclusive:'mid',
    skill:{ name:'추격', cost:2, type:'strike', mult:0.5, poisonHit:true, val:7, target:'enemy', desc:'(공격력+7)의 50% 피해 + 피해량만큼 중독' } },
  { id:'mb_wenpin',     name:'문빙',   emoji:'🏹', cls:'수호', rarity:'SR', hp:40, atk:8, exclusive:'mid',
    skill:{ name:'강하 수비', cost:2, type:'shield', val:14, target:'self', desc:'주공 방어막 +14' } },
  { id:'mb_caimao',     name:'채모',   emoji:'⚓', cls:'책사', rarity:'C',  hp:28, atk:5, exclusive:'mid',
    skill:{ name:'수군 일제사격', cost:2, type:'aoe', val:5, target:'allEnemies', desc:'모든 적에게 5 피해' } },
  { id:'mb_zhangyun',   name:'장윤',   emoji:'🚢', cls:'궁수', rarity:'R', hp:30, atk:8, exclusive:'mid',
    skill:{ name:'연환 사격', cost:2, type:'multi', val:3, target:'enemy', desc:'무작위 적을 3회 공격 (100/70/50%)' } },
  { id:'mb_xiahoushang',name:'하후상', emoji:'⚔️', cls:'전사', rarity:'C',  hp:32, atk:7, exclusive:'mid',
    skill:{ name:'위군 돌격', cost:2, type:'strike', mult:0.5, poisonHit:true, val:7, target:'enemy', desc:'(공격력+7)의 50% 피해 + 피해량만큼 중독' } },
  { id:'mb_guohuai',    name:'곽회',   emoji:'📜', cls:'책사', rarity:'R', hp:32, atk:7, exclusive:'mid',
    skill:{ name:'허점 간파', cost:2, type:'confuse', val:1, target:'enemy', desc:'적 1명을 1턴 혼란(행동 불능)' } },
  { id:'mb_handang',    name:'한당',   emoji:'🏹', cls:'궁수', rarity:'R',  hp:32, atk:8, exclusive:'mid',
    skill:{ name:'노장의 연사', cost:1, type:'multi', val:2, target:'enemy', desc:'무작위 적을 2회 공격 (100/70%)' } },
  { id:'mb_zhoutai',    name:'주태',   emoji:'🗡️', cls:'수호', rarity:'SR', hp:48, atk:8, exclusive:'mid',
    skill:{ name:'분전', cost:2, type:'shield', val:15, target:'self', desc:'주공 방어막 +15' } },
  { id:'mb_haozhao',    name:'학소',   emoji:'🏯', cls:'수호', rarity:'R',  hp:44, atk:6, exclusive:'mid',
    skill:{ name:'진창성 수성', cost:2, type:'shield', val:13, target:'self', desc:'주공 방어막 +13' } },
  { id:'mb_wangshuang', name:'왕쌍',   emoji:'🪓', cls:'전사', rarity:'R', hp:36, atk:9, exclusive:'mid',
    skill:{ name:'유성추', cost:2, type:'strike', mult:0.5, stun:0.5, val:9, target:'enemy', desc:'(공격력+9)의 50% 피해 + 50% 확률로 기절' } },
  { id:'mb_zhonghui',   name:'종회',   emoji:'📜', cls:'책략', rarity:'C',  hp:28, atk:6, exclusive:'mid',
    skill:{ name:'촉 평정', cost:2, type:'aoe', val:5, target:'allEnemies', desc:'모든 적에게 5 피해' } },
  { id:'mb_zhugedan',   name:'제갈탄', emoji:'⚔️', cls:'전사', rarity:'R', hp:34, atk:8, exclusive:'mid',
    skill:{ name:'회남의 의기', cost:3, type:'charm', val:1, target:'enemy', desc:'적 1명을 1턴 매혹(행동 불능)' } },
  // ---- 황건적의 난(첫 스테이지) ----
  { id:'zhangjiao', name:'장각',   emoji:'☯️', cls:'책략', rarity:'SSR', hp:36, atk:9, elem:'earth',
    skill:{ name:'태평요술', cost:3, type:'aoe', val:10, target:'allEnemies', desc:'모든 적에게 10 피해' } },
  { id:'mb_zhangbao',   name:'장보', emoji:'🌀', cls:'책략', rarity:'R', hp:32, atk:7, exclusive:'mid', elem:'earth',
    skill:{ name:'환술', cost:2, type:'confuse', val:1, target:'enemy', desc:'적 1명을 1턴 혼란(행동 불능)' } },
  { id:'mb_zhangliang', name:'장량', emoji:'🏯', cls:'수호', rarity:'R', hp:40, atk:6, exclusive:'mid', elem:'earth',
    skill:{ name:'인공의 진', cost:2, type:'shield', val:12, target:'self', desc:'주공 방어막 +12' } }
];
var HW_BY_ID = {};
HW_HEROES.forEach(function (h) { HW_BY_ID[h.id] = h; });

var HW_STARTERS = ['glad', 'yuejin', 'mage', 'knight']; // 전위 · 악진 · 순욱 · 조인

/* ===== 속성 상성(땅 ▶ 물 ▶ 불 ▶ 땅) ===== */
var HW_CLASS_ELEM = { '전사':'fire', '기습':'fire', '책사':'water', '궁수':'water', '책략':'water', '무희':'water', '의원':'water', '수호':'earth', '군주':'earth', '기마':'earth' };
var HW_ELEM_ICON = { fire:'🔥', water:'💧', earth:'🪨' };
// 유닛(영웅 정의/적 템플릿)의 속성: 명시 elem > 직업 기반 > id/name 해시(적 결정적 배정)
function elemOf(d) {
  if (!d) return null;
  if (d.elem) return d.elem;
  if (d.cls && HW_CLASS_ELEM[d.cls]) return HW_CLASS_ELEM[d.cls]; // 영웅: 직업 기반
  // 적장/중간보스: 연결 영웅(hero/hid) 속성으로 — 이름 번역과 무관하게 고정
  if (typeof HW_BY_ID !== 'undefined' && HW_BY_ID) {
    if (d.hero && HW_BY_ID[d.hero]) return elemOf(HW_BY_ID[d.hero]);
    if (d.hid && HW_BY_ID[d.hid]) return elemOf(HW_BY_ID[d.hid]);
  }
  var s = String(d.id || d.name || ''), n = 0, i; // 그 외(일반 적): id 우선 해시
  for (i = 0; i < s.length; i++) n += s.charCodeAt(i);
  return ['fire', 'water', 'earth'][n % 3];
}
// 상성 배수: 정방향 1.5 / 역방향 0.67 (대장전 raid면 1.25 / 0.8). 동일·무속성 1
function affMult(atkEl, defEl, raid) {
  if (!atkEl || !defEl || atkEl === defEl) return 1;
  var beats = { earth:'water', water:'fire', fire:'earth' }; // X가 beats[X]를 상대로 유리
  if (beats[atkEl] === defEl) return raid ? 1.25 : 1.5;       // 유리
  if (beats[defEl] === atkEl) return raid ? 0.8 : 0.67;       // 불리
  return 1;
}
function elemStrongVs(el) { return { earth:'water', water:'fire', fire:'earth' }[el] || null; } // el이 유리하게 치는 속성
function elemWeakTo(el) { var b = { earth:'water', water:'fire', fire:'earth' }; for (var k in b) if (b[k] === el) return k; return null; } // el의 약점(el을 이기는 속성)

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
  { id:'fang',   name:'오추마',     emoji:'🐎', desc:'스킬 사용 시 HP 5 회복',  effect:{ skillHeal:5 } },
  { id:'drum',   name:'전고(戰鼓)', emoji:'🥁', desc:'전투 시작 시 전원 공격력 +2', effect:{ startAtk:2 } },
  { id:'crest',  name:'방패 진형',  emoji:'🛡️', desc:'전투 시작 시 주공 방어막 +5',  effect:{ startBlock:5 } },
  { id:'chalice',name:'군량미',     emoji:'🍚', desc:'전투 승리 후 주공 HP +20 회복', effect:{ winHeal:20 } },
  { id:'venom',  name:'독항아리',   emoji:'☠️', desc:'전투 시작 시 임의의 적 1명 중독(3)', effect:{ startPoison:3 } },
  { id:'spring', name:'옥천수',     emoji:'💧', desc:'전투 승리 시 주공 MP +10 회복', effect:{ winMp:10 } },
  { id:'edict',  name:'천자의 밀서', emoji:'📜', desc:'골드 보상 획득량 +20%', effect:{ goldBonus:0.20 }, exclusive:'qb' },
  { id:'aegis',  name:'현철 갑주',  emoji:'🦾', desc:'주공 최대 HP +20',  effect:{ maxHp:20 } },
  { id:'gourd',  name:'호리병',     emoji:'🍶', desc:'주공 최대 MP +10',  effect:{ maxMp:10 } },
  { id:'edge',   name:'예기(銳器)', emoji:'🗡️', desc:'치명타 확률 +8%',   effect:{ crit:0.08 } },
  { id:'horn',   name:'호각(號角)', emoji:'📣', desc:'전투 시작 시 전원 공격력 +3', effect:{ startAtk:3 } },
  { id:'rampart',name:'철벽 보루',  emoji:'🧱', desc:'전투 시작 시 주공 방어막 +10', effect:{ startBlock:10 } },
  { id:'amulet', name:'벽사 부적',  emoji:'🧿', desc:'스킬 사용 시 HP 5 회복', effect:{ skillHeal:5 } },
  { id:'ration', name:'건량(乾糧)', emoji:'🍙', desc:'전투 승리 후 주공 HP +10 회복', effect:{ winHeal:10 } }
];

/* 주공(나) 기본 스탯 */
var HW_LORD = { hp: 200, mp: 50 };

/* 무기 (장착 수: C=0 · R=1 · SR=2 · SSR=3) — 삼국지 아이템
 * effect: atk(+공격), doubleStrike(기본공격 2회), poison(공격 시 독 부여),
 *         crit(치명타 확률 +, 0~1), evade(적 공격 회피 확률 +, 0~1), lordHp/lordMp(주공 최대 HP/MP) */
var HW_WEAPONS = [
  { id:'spear18',  name:'장팔사모',   emoji:'🔱', desc:'공격력 +5 · 방어 관통',       effect:{ atk:5, pierce:true } },
  { id:'qinglong', name:'청룡언월도', emoji:'🗡️', desc:'공격력 +5 · 방어 관통',       effect:{ atk:5, pierce:true } },
  { id:'fangtian', name:'방천화극',   emoji:'⚔️', desc:'공격력 +6 · 연쇄(처치 시 재공격)', effect:{ atk:6, chain:true } },
  { id:'qixing',   name:'칠성검',     emoji:'🌟', desc:'기본 공격이 2회 연속',        effect:{ doubleStrike:true } },
  { id:'mengde',   name:'맹덕신서',   emoji:'📕', desc:'공격 시 적에게 독 +2',        effect:{ poison:2 } },
  { id:'taiping',  name:'태평요술서', emoji:'☯️', desc:'공격 시 적에게 독 +3',        effect:{ poison:3 } },
  { id:'qinggang', name:'청강검',     emoji:'🔪', desc:'치명타 +10% · 방어 관통',     effect:{ crit:0.10, pierce:true } },
  { id:'yitian',   name:'의천검',     emoji:'🗡️', desc:'치명타 +12% · 방어 관통',     effect:{ crit:0.12, pierce:true } },
  { id:'cixiong',  name:'자웅일대검', emoji:'⚔️', desc:'치명타 확률 +15%, 기본 공격 3회', effect:{ crit:0.15, tripleStrike:true }, exclusive:'qb20', price:1000 },
  { id:'yuxi',     name:'전국옥새',   emoji:'🟨', desc:'주공 최대 HP +100 · 최대 MP +30 · 주공 치명타 +5%', effect:{ lordHp:100, lordMp:30, lordCrit:0.05 }, exclusive:'collection' },
  { id:'sunzi',    name:'손자병법',   emoji:'📜', desc:'주공 최대 MP +20',           effect:{ lordMp:20 } },
  { id:'guanyu',   name:'한수정후인', emoji:'🟥', desc:'주공 최대 HP +30, MP +10',   effect:{ lordHp:30, lordMp:10 } },
  // ---- 추가 장비 ----
  { id:'gufeng',   name:'고정도',     emoji:'🔪', desc:'장착 장수 공격력 +6',        effect:{ atk:6 } },
  { id:'hanblood', name:'한혈보도',   emoji:'⚔️', desc:'장착 장수 공격력 +7',        effect:{ atk:7 } },
  { id:'sanjian',  name:'삼첨양인도', emoji:'🔱', desc:'공격력 +4, 치명타 +9%',     effect:{ atk:4, crit:0.09 } },
  { id:'huaji',    name:'화극(畵戟)', emoji:'🗡️', desc:'공격력 +3 · 연쇄(처치 시 재공격)', effect:{ atk:3, chain:true } },
  { id:'qiangbow', name:'양유기 강궁',emoji:'🏹', desc:'기본 공격 2회 + 치명타 +8%', effect:{ doubleStrike:true, crit:0.08 } },
  { id:'liannu',   name:'제갈연노',   emoji:'🎯', desc:'공격 시 적에게 독 +4',        effect:{ poison:4 } },
  { id:'qibao',    name:'칠보도',     emoji:'🗡️', desc:'공격력 +2, 독 +2',           effect:{ atk:2, poison:2 } },
  { id:'tiebian',  name:'철편(鐵鞭)', emoji:'🏏', desc:'공격력 +5 · 스플래시(인접 적 30%)', effect:{ atk:5, splash:0.3 } },
  { id:'huanshou', name:'환수도',     emoji:'🗡️', desc:'공격력 +3, 치명타 +10%',    effect:{ atk:3, crit:0.10 } },
  { id:'baiyu',    name:'백우선',     emoji:'🪭', desc:'주공 최대 MP +15',           effect:{ lordMp:15 } },
  { id:'tongque',  name:'동작대 보패', emoji:'🏯', desc:'주공 최대 HP +25, MP +8',   effect:{ lordHp:25, lordMp:8 } },
  { id:'liutao',   name:'육도삼략',   emoji:'📚', desc:'주공 최대 MP +13',           effect:{ lordMp:13 } },
  { id:'dunjia',   name:'둔갑천서',   emoji:'📗', desc:'주공 HP +20, MP +10',        effect:{ lordHp:20, lordMp:10 } },
  // ---- 명마(회피) ----
  { id:'chituma',  name:'적토마',     emoji:'🐎', desc:'적 공격 회피 확률 +5%',      effect:{ evade:0.05 } },
  { id:'dilu',     name:'적로',       emoji:'🐎', desc:'적 공격 회피 확률 +3.5%',    effect:{ evade:0.035 } },
  { id:'jueying',  name:'절영',       emoji:'🐴', desc:'적 공격 회피 확률 +3.5%',    effect:{ evade:0.035 } },
  { id:'zhaohuang',name:'조황비전',   emoji:'🐎', desc:'적 공격 회피 확률 +3.5%',    effect:{ evade:0.035 } },
  // ---- 추가 장비 2차 (총 50종) ----
  { id:'wugou',    name:'오구도',     emoji:'⚔️', desc:'장착 장수 공격력 +8',        effect:{ atk:8 } },
  { id:'yanyuefu', name:'언월부',     emoji:'🪓', desc:'장착 장수 공격력 +9',        effect:{ atk:9 } },
  { id:'shemaoqiang',name:'사모창',   emoji:'🔱', desc:'공격력 +6, 치명타 +8%',     effect:{ atk:6, crit:0.08 } },
  { id:'huyadao',  name:'호아도',     emoji:'🗡️', desc:'공격력 +7, 독 +2',           effect:{ atk:7, poison:2 } },
  { id:'jifengdao',name:'질풍도',     emoji:'🗡️', desc:'공격력 +2 · 기절 30%',       effect:{ atk:2, stun:0.3 } },
  { id:'hanshuangjian',name:'한상검', emoji:'🔪', desc:'치명타 확률 +13%',           effect:{ crit:0.13 } },
  { id:'duwubiao', name:'독무표창',   emoji:'🎯', desc:'공격 시 적에게 독 +5',        effect:{ poison:5 } },
  { id:'yingyanggong',name:'응양궁',  emoji:'🏹', desc:'치명타 +6% · 연쇄(처치 시 재공격)', effect:{ crit:0.06, chain:true } },
  { id:'polangchui',name:'파랑추',    emoji:'🔨', desc:'공격력 +6, 치명타 +5%',     effect:{ atk:6, crit:0.05 } },
  { id:'wangujian',name:'완고검',     emoji:'🗡️', desc:'공격력 +4 · 방어 관통',       effect:{ atk:4, pierce:true } },
  { id:'xuanwujia',name:'현무갑',     emoji:'🛡️', desc:'주공 최대 HP +35',           effect:{ lordHp:35 } },
  { id:'zhuquefu', name:'주작부',     emoji:'🔥', desc:'공격력 +5, 독 +3',           effect:{ atk:5, poison:3 } },
  { id:'baihuyao', name:'백호요대',   emoji:'🥋', desc:'주공 HP +20 · 주공 치명타 +6%', effect:{ lordHp:20, lordCrit:0.06 } },
  { id:'qinglongpei',name:'청룡패',   emoji:'🟦', desc:'주공 최대 HP +18, MP +5',   effect:{ lordHp:18, lordMp:5 } },
  { id:'wenshujia',name:'문서갑',     emoji:'📘', desc:'주공 최대 MP +18',           effect:{ lordMp:18 } },
  { id:'leigongbian',name:'뇌공편',   emoji:'⚡', desc:'공격력 +5, 치명타 +9%',     effect:{ atk:5, crit:0.09 } },
  { id:'yinyangjing',name:'음양경',   emoji:'☯️', desc:'주공 HP +13, MP +13',        effect:{ lordHp:13, lordMp:13 } },
  { id:'huxindao', name:'호심도',     emoji:'🗡️', desc:'공격력 +3 · 기절 30%',       effect:{ atk:3, stun:0.3 } },
  { id:'jinpaojia',name:'금포갑',     emoji:'🧥', desc:'주공 최대 HP +25, MP +5',   effect:{ lordHp:25, lordMp:5 } },
  { id:'chiyandao',name:'적염도',     emoji:'🔥', desc:'공격력 +7, 치명타 +7%',     effect:{ atk:7, crit:0.07 } },
  { id:'baiyinqiang',name:'백은창',   emoji:'🔱', desc:'공격력 +8 · 기절 30%',       effect:{ atk:8, stun:0.3 } }
];
// 적장(보스)은 중간보스보다 강하게 — 전용 배수(중간보스 hpMult 2.05 / atkMult 1.22보다 높음)
var HW_BOSS_MULT = { hpMult:2.7, atkMult:1.55 };
var HW_WEAPON_BY_ID = {};
HW_WEAPONS.forEach(function (w) { HW_WEAPON_BY_ID[w.id] = w; });

/* 장비 가격 책정 — effect 옵션(키)별 합산 가격
 *  · 공격 2회(doubleStrike): 옵션당 +150
 *  · 주공 관련(lordHp/lordMp): 옵션당 +100
 *  · 그 외 능력치: 한개당 30~50 (능력치별 상이) */
var HW_WPN_OPT_COST = { atk:50, crit:45, poison:40, evade:35, chain:150, stun:100, splash:150, pierce:100 };
function weaponCost(w) {
  if (!w || !w.effect) return 40;
  if (w.price != null) return w.price; // 개별 고정가(예: 자웅일대검)
  var total = 0;
  Object.keys(w.effect).forEach(function (k) {
    if (k === 'doubleStrike') total += 150;            // 공격 2회 옵션
    else if (k === 'lordHp' || k === 'lordMp') total += 100; // 주공 옵션
    else total += (HW_WPN_OPT_COST[k] || 30);          // 그 외 능력치 30~50 (연쇄·스플래시 150 / 기절 100)
  });
  return total + 50; // 전체 장비 기본 가산(+50)
}

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
var HW_MID = { hpMult:2.05, atkMult:1.22, skillChance:0.32 };
var HW_MID_SKILLS = [ // 아군 카드(장수)를 노리는 상태이상
  { name:'미혹의 진', type:'p_charm',   desc:'아군 카드 1장 1턴 매혹(행동 불능)' },
  { name:'환혼술',     type:'p_confuse', desc:'아군 카드 1장 1턴 혼란(행동 불능)' },
  { name:'독무 살포',   type:'p_poison', val:4, desc:'아군 카드 1장 중독(턴마다 주공 피해)' },
  { name:'사신 강림',   type:'p_seal',    desc:'아군 카드 1장 이번 전투 봉인(전투당 1회)' }
];
/* 고정 네임드 중간보스 — 각 전역의 5·10 출전(전역별 2명, 스토리 진영에 맞는 장수).
 * 기본 hp/atk에 HW_MID 배수와 난이도가 곱해집니다. 일반 적 1명과 함께 등장(고정). */
var HW_MID_BOSSES = [
  [ { name:'장보',   emoji:'🌀', hp:28, atk:6, hid:'mb_zhangbao', quote:'지공장군 장보가 여기 있다! 요술의 맛을 보아라!' }, { name:'장량',   emoji:'🏯', hp:34, atk:6, hid:'mb_zhangliang', quote:'인공장군의 진을 뚫을 수 있겠느냐?' } ],
  [ { name:'이각',   emoji:'🪓', hp:30, atk:7, hid:'mb_lijue',   quote:'동탁 승상의 명을 받든다. 네놈들은 여기서 끝이다!' }, { name:'곽사',   emoji:'🗡️', hp:32, atk:7, hid:'mb_guosi',   quote:'장안은 우리 손안에 있다. 썩 물러가라!' } ],
  [ { name:'순우경', emoji:'🍶', hp:32, atk:7, hid:'mb_chunyujing', quote:'오소의 군량은 내가 지킨다… 한 톨도 내줄 수 없지!' }, { name:'고람',   emoji:'🛡️', hp:36, atk:7, hid:'mb_gaolan',   quote:'원소 공의 방패가 여기 있다. 어디 뚫어보아라.' } ],
  [ { name:'조순',   emoji:'🐎', hp:34, atk:8, hid:'mb_zhaochun', quote:'유비를 쫓는다! 도망치는 자의 목을 가져가겠다.' }, { name:'문빙',   emoji:'🏹', hp:36, atk:8, hid:'mb_wenpin',   quote:'강하의 수비엔 빈틈이 없다. 발길을 돌려라.' } ],
  [ { name:'채모',   emoji:'⚓', hp:36, atk:7, aoe:true, hid:'mb_caimao', quote:'수전이라면 우리 형주 수군을 당할 자가 없지!' }, { name:'장윤', emoji:'🚢', hp:38, atk:8, hid:'mb_zhangyun', quote:'물 위에선 네놈들이 우리 밥이다.' } ],
  [ { name:'하후상', emoji:'⚔️', hp:38, atk:8, hid:'mb_xiahoushang', quote:'정군산은 우리 위군의 땅. 한 발도 들이지 못한다!' }, { name:'곽회',   emoji:'📜', hp:40, atk:8, hid:'mb_guohuai', quote:'냉정하게, 너희 진형의 허점을 찌르겠다.' } ],
  [ { name:'한당',   emoji:'🏹', hp:40, atk:8, hid:'mb_handang', quote:'강동의 노장이 아직 녹슬지 않았음을 보여주마!' }, { name:'주태',   emoji:'🗡️', hp:42, atk:9, hid:'mb_zhoutai', quote:'이 몸의 상처가 곧 충심의 증표다. 덤벼라!' } ],
  [ { name:'학소',   emoji:'🏯', hp:46, atk:8, hid:'mb_haozhao', quote:'진창성은 천 명으로도 못 뚫는다. 헛수고 말거라.' }, { name:'왕쌍',   emoji:'🪓', hp:42, atk:9, hid:'mb_wangshuang', quote:'촉의 북벌, 바로 여기서 끝이다!' } ],
  [ { name:'종회',   emoji:'📜', hp:46, atk:9, aoe:true, hid:'mb_zhonghui', quote:'촉을 멸한 공이 누구의 것이더냐. 비켜서라.' }, { name:'제갈탄', emoji:'⚔️', hp:48, atk:9, hid:'mb_zhugedan', quote:'회남의 의기, 끝까지 꺾이지 않는다!' } ]
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
/* 적장(커맨더) — 영웅전 보스 + 대장전 레이드 보스로 공용.
 * skills: 대장전 전용 2종(① 공격 또는 방어 · ② 회복 또는 행동 불가). 영웅전 보스는 hero의 단일 스킬을 사용. */
var HW_COMMANDERS = {
  cmd_zhangjiao: { name:'장각',   emoji:'☯️', hp:26,  atk:6, aoe:true, hero:'zhangjiao',
    quote:'창천이 죽었으니 황천이 마땅히 서리라! 태평의 세상은 우리 손으로 연다!',
    skills:[ { name:'태평요술', type:'aoe', val:10, cost:3 }, { name:'요술 부적', type:'confuse', val:1, cost:2 } ] },
  cmd_huaxiong:  { name:'화웅',   emoji:'🪓', hp:30,  atk:7,  hero:'huaxiong',
    quote:'내 앞을 가로막는 자, 모조리 목을 베리라! 이 관문은 한 발짝도 넘지 못한다.',
    skills:[ { name:'관문 수장', type:'strike', val:14, cost:2 }, { name:'맹장의 호통', type:'confuse', val:1, cost:2 } ] },
  cmd_yuanshao:  { name:'원소',   emoji:'🎌', hp:36,  atk:7,  hero:'yuanshao',
    quote:'사세삼공의 명문, 하북의 주인이 바로 나다. 감히 누가 내게 칼을 겨누는가!',
    skills:[ { name:'사세삼공', type:'shield', val:20, cost:3 }, { name:'명문대가', type:'heal', val:30, cost:3 } ] },
  cmd_xiahoudun: { name:'하후돈', emoji:'⚔️', hp:42,  atk:8,  hero:'xiahoudun',
    quote:'이 눈 하나쯤이야. 부모께 받은 몸, 나는 한 치도 물러서지 않는다!',
    skills:[ { name:'발시담정', type:'strike', val:13, cost:2 }, { name:'독안의 위압', type:'confuse', val:1, cost:2 } ] },
  cmd_caocao:    { name:'조조',   emoji:'👑', hp:52,  atk:9, aoe:true, hero:'caocao',
    quote:'내가 천하를 저버릴지언정, 천하가 나를 저버리게 두지는 않는다. 자, 덤벼라!',
    skills:[ { name:'간웅', type:'aoe', val:16, cost:3 }, { name:'난세의 책략', type:'heal', val:34, cost:3 } ] },
  cmd_xiahouyuan:{ name:'하후연', emoji:'🏹', hp:58,  atk:9,  hero:'xiahouyuan',
    quote:'질풍처럼 달려 단숨에 끝내주마. 내 화살을 피할 수 있겠느냐?',
    skills:[ { name:'질풍사격', type:'multi', val:3, cost:2 }, { name:'기습 봉쇄', type:'charm', val:1, cost:2 } ] },
  cmd_luxun:     { name:'육손',   emoji:'🔥', hp:66,  atk:10, aoe:true, hero:'luxun',
    quote:'성급함은 패망의 지름길이지. 불길이 모든 것을 삼킬 때까지… 나는 기다렸다.',
    skills:[ { name:'이릉대화', type:'aoe', val:18, cost:3 }, { name:'연환 화계', type:'confuse', val:1, cost:2 } ] },
  cmd_simayi:    { name:'사마의', emoji:'🪶', hp:70,  atk:10, aoe:true, hero:'warlock',
    quote:'참고 또 참아 마침내 때가 왔다. 이제 인내의 결실을 거두겠다.',
    skills:[ { name:'화계', type:'aoe', val:18, cost:3 }, { name:'대기만성', type:'heal', val:40, cost:3 } ] },
  cmd_simayan:   { name:'사마염', emoji:'👑', hp:78,  atk:10, aoe:true, hero:'simayan',
    quote:'위·촉·오… 모든 난세가 여기서 끝난다. 천하는 하나, 진(晉)으로 통일되리라.',
    skills:[ { name:'삼국 통일', type:'aoe', val:20, cost:3 }, { name:'천하 제압', type:'confuse', val:2, cost:3 } ] }
};

/* 보스 격파(영웅전 적장·대장전 레이드) 시 출력되는 마지막 대사 */
var HW_BOSS_DEATH = {
  cmd_huaxiong:  '으윽… 사수관이… 이렇게 뚫리다니… 분하다…',
  cmd_yuanshao:  '사세삼공의 명문이… 여기서 저무는가… 하늘이 무심하구나…',
  cmd_xiahoudun: '이 한 몸… 끝내 막지 못했구나… 승상, 부디…',
  cmd_caocao:    '천하가… 결국 나를 저버리는가… 크큭… 재미있군…',
  cmd_xiahouyuan:'질풍도… 끝내 멎는구나… 정군산이여…',
  cmd_luxun:     '타오르던 불길도… 끝내 사그라드는가…',
  cmd_simayi:    '참고 또 참았건만… 인내의 끝이 여기였나…',
  cmd_simayan:   '통일의 대업마저… 한낱 봄날의 꿈이었단 말인가…'
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
  { name:'황건적의 난', year:'184년', desc:'장각 형제의 봉기로 천하가 어지러워진 난세의 시작', boss:'cmd_zhangjiao', adds:1, reward:'hero',
    regions:['탁군 외곽','유주 가도','광종 들머리','거록 길목','곡양 비탈','하곡양 진채','광종성 외성','청하 나루','평원 들판','광종성 성벽','거록 본채'] },
  { name:'반동탁 연합군', year:'191년', desc:'동탁의 전횡에 맞서 제후들이 결집한 전투', boss:'cmd_huaxiong',   adds:1, reward:'hero',
    regions:['낙양 동문','형양 가도','변수 나루','광무 언덕','사수관 초입','호뢰관 외성','대곡 협로','성고 들판','환원관 고개','사수관 성벽','호뢰관 관문'] },
  { name:'관도대전',     year:'200년', desc:'조조가 원소를 꺾고 하북의 패권을 잡은 전환점', boss:'cmd_yuanshao',  adds:1, reward:'hero',
    regions:['백마 나루','연진 도하','관도 들머리','양무 평원','오소 길목','토산 진지','관도 보루','복양 가도','여양 외곽','오소 곡창','관도 본영'] },
  { name:'장판파 전투',   year:'208년', desc:'퇴각하는 유비를 조운·장비가 지켜낸 전투', boss:'cmd_xiahoudun', adds:2, reward:'hero',
    regions:['신야 외곽','번성 가도','양양 길목','당양 비탈','장판교 초입','경산 숲길','한진 나루','적벽 가도','강릉 들판','장판 언덕','장판교 다리'] },
  { name:'적벽대전',     year:'208년', desc:'손권·유비 연합군이 화공으로 조조 대군을 격파', boss:'cmd_caocao',    adds:2, reward:'relic',
    regions:['오림 나루','삼강구','적벽 강안','장강 수로','화용 길목','남병산 기슭','이릉 가도','강하 포구','한수 합류','오림 본채','적벽 수채'] },
  { name:'정군산 전투',   year:'219년', desc:'유비군이 하후연을 베고 한중을 차지', boss:'cmd_xiahouyuan', adds:2, reward:'hero',
    regions:['양평관 초입','면수 강변','한중 가도','정군산 기슭','주마곡','천탕산 비탈','홍구 들판','면양 평원','무도 길목','정군산 능선','정군산 정상'] },
  { name:'이릉대전',     year:'222년', desc:'관우의 복수에 나선 유비가 육손에게 대패', boss:'cmd_luxun',     adds:2, reward:'hero',
    regions:['무현 길목','자귀 들머리','이도 가도','효정 평원','효정 진채','마안산 비탈','효정 숲','강북 진지','강남 진지','효정 화전','이릉 대채'] },
  { name:'제갈량의 북벌', year:'228~234년', desc:'촉의 제갈량이 위를 향해 거듭 북벌에 나섬', boss:'cmd_simayi',   adds:3, reward:'relic',
    regions:['기산 들머리','가정 길목','진창 가도','위수 강안','오장원 들판','상규 비탈','농서 평원','목문도 협곡','검각 길목','오장원 본영','위수 진루'] },
  { name:'위·촉·오 멸망', year:'263~280년', desc:'사마염이 진(晉)을 세워 천하를 통일', boss:'cmd_simayan',  adds:2, reward:'final',
    regions:['검각 관문','면죽 평원','성도 가도','낙양 외곽','건업 길목','수춘 진지','파릉 강안','석두성 밖','건업 외성','낙양 궁문','천하 통일'] }
];

/* 삼국 대장전(레이드) — 영웅전 스테이지 보스가 거대 HP로 등장. 격파 시 전용 장수 획득.
 * hpMult: 적장 기본 HP 대비 배수, atkMult: 공격 배수, deck: 영웅전 파티 공유 */
var HW_RAID = {
  hpMult: 12,
  atkMult: 1.65,
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
