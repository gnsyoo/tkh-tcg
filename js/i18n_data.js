/* 인게임 데이터 현지화 레이어 — 데이터 파일은 수정하지 않고, 시작 시 선택 언어로
 * 표시 필드(이름·병종·스킬·스테이지·유물·장비·소모품·모드)를 덮어씁니다.
 * 효과 기반 설명(스킬/장비/유물/소모품)은 구조에서 자동 생성하여 번역 분량을 줄였습니다.
 * 반드시 heroes_data.js 이후, 게임 스크립트(heroes.js/daejang.js/queensblood.js) 이전에 로드.
 */
(function () {
  window.__GAME_PAGE__ = true; // 인게임 페이지 표시(언어 전환 시 새로고침 트리거)
  var LANGS = ['ko', 'en', 'ja', 'zh', 'zhTW'];
  function curLang() { try { var l = localStorage.getItem('tcg_lang'); return LANGS.indexOf(l) !== -1 ? l : 'ko'; } catch (e) { return 'ko'; } }
  var lang = curLang();

  /* ===== 동적 UI 문구 사전(TCG.t) — 모든 언어 공통 등록(ko 포함) ===== */
  window.__UI_I18N__ = Object.assign(window.__UI_I18N__ || {}, {
    // 지도 / 대기실 (영웅전)
    'map.title': { ko: '📜 연대기', en: '📜 Chronicle', ja: '📜 年代記', zh: '📜 编年史', zhTW: '📜 編年史' },
    'map.sub': { ko: '다음 목적지를 선택하세요', en: 'Choose your next destination', ja: '次の目的地を選びましょう', zh: '请选择下一个目的地', zhTW: '請選擇下一個目的地' },
    'map.battle': { ko: '⚔️ 출진 ({n}/{max})', en: '⚔️ Sortie ({n}/{max})', ja: '⚔️ 出陣 ({n}/{max})', zh: '⚔️ 出阵 ({n}/{max})', zhTW: '⚔️ 出陣 ({n}/{max})' },
    'map.battleBoss': { ko: '👑 적장 {name} 토벌', en: '👑 Subjugate {name}', ja: '👑 敵将 {name} 討伐', zh: '👑 讨伐敌将 {name}', zhTW: '👑 討伐敵將 {name}' },
    'camp.formation': { ko: '🀄 진형', en: '🀄 Formation', ja: '🀄 陣形', zh: '🀄 阵型', zhTW: '🀄 陣型' },
    'camp.shop': { ko: '🏪 상점', en: '🏪 Shop', ja: '🏪 商店', zh: '🏪 商店', zhTW: '🏪 商店' },
    'camp.tavern': { ko: '🏮 주막', en: '🏮 Tavern', ja: '🏮 酒場', zh: '🏮 酒馆', zhTW: '🏮 酒館' },
    'map.relics': { ko: '✨ 추가 능력', en: '✨ Bonuses', ja: '✨ 追加能力', zh: '✨ 附加能力', zhTW: '✨ 附加能力' },
    'map.subInfo': { ko: '{year} · 서브 {n}/{max}', en: '{year} · Sortie {n}/{max}', ja: '{year} · サブ {n}/{max}', zh: '{year} · 出阵 {n}/{max}', zhTW: '{year} · 出陣 {n}/{max}' },
    'map.bossTag': { ko: ' · 적장전', en: ' · Commander', ja: ' · 敵将戦', zh: ' · 敌将战', zhTW: ' · 敵將戰' },
    'ui.goldGet': { ko: '+{n} 골드 획득!', en: '+{n} gold!', ja: '+{n} ゴールド獲得！', zh: '+{n} 金币！', zhTW: '+{n} 金幣！' }
  });

  if (lang === 'ko') return; // 한국어는 데이터 원본 그대로(UI 사전은 위에서 등록 완료)

  function pick(map, key) { var e = map[key]; return (e && e[lang] != null) ? e[lang] : key; }
  var pct = function (f) { return Math.round(f * 100); };

  /* ---------- 고유명사: 인물 이름 ---------- */
  var NAME = {
    '전위': { en: 'Dian Wei', ja: '典韋', zh: '典韦', zhTW: '典韋' }, '조인': { en: 'Cao Ren', ja: '曹仁', zh: '曹仁', zhTW: '曹仁' },
    '순욱': { en: 'Xun Yu', ja: '荀彧', zh: '荀彧', zhTW: '荀彧' }, '황충': { en: 'Huang Zhong', ja: '黄忠', zh: '黄忠', zhTW: '黃忠' },
    '순유': { en: 'Xun You', ja: '荀攸', zh: '荀攸', zhTW: '荀攸' }, '마대': { en: 'Ma Dai', ja: '馬岱', zh: '马岱', zhTW: '馬岱' },
    '장비': { en: 'Zhang Fei', ja: '張飛', zh: '张飞', zhTW: '張飛' }, '손권': { en: 'Sun Quan', ja: '孫権', zh: '孙权', zhTW: '孫權' },
    '태사자': { en: 'Taishi Ci', ja: '太史慈', zh: '太史慈', zhTW: '太史慈' }, '주창': { en: 'Zhou Cang', ja: '周倉', zh: '周仓', zhTW: '周倉' },
    '사마의': { en: 'Sima Yi', ja: '司馬懿', zh: '司马懿', zhTW: '司馬懿' }, '관우': { en: 'Guan Yu', ja: '関羽', zh: '关羽', zhTW: '關羽' },
    '제갈량': { en: 'Zhuge Liang', ja: '諸葛亮', zh: '诸葛亮', zhTW: '諸葛亮' }, '마초': { en: 'Ma Chao', ja: '馬超', zh: '马超', zhTW: '馬超' },
    '여몽': { en: 'Lü Meng', ja: '呂蒙', zh: '吕蒙', zhTW: '呂蒙' }, '방통': { en: 'Pang Tong', ja: '龐統', zh: '庞统', zhTW: '龐統' },
    '주유': { en: 'Zhou Yu', ja: '周瑜', zh: '周瑜', zhTW: '周瑜' }, '허저': { en: 'Xu Chu', ja: '許褚', zh: '许褚', zhTW: '許褚' },
    '서서': { en: 'Xu Shu', ja: '徐庶', zh: '徐庶', zhTW: '徐庶' }, '유비': { en: 'Liu Bei', ja: '劉備', zh: '刘备', zhTW: '劉備' },
    '조운': { en: 'Zhao Yun', ja: '趙雲', zh: '赵云', zhTW: '趙雲' }, '조조': { en: 'Cao Cao', ja: '曹操', zh: '曹操', zhTW: '曹操' },
    '하후돈': { en: 'Xiahou Dun', ja: '夏侯惇', zh: '夏侯惇', zhTW: '夏侯惇' }, '하후연': { en: 'Xiahou Yuan', ja: '夏侯淵', zh: '夏侯渊', zhTW: '夏侯淵' },
    '손책': { en: 'Sun Ce', ja: '孫策', zh: '孙策', zhTW: '孫策' }, '감녕': { en: 'Gan Ning', ja: '甘寧', zh: '甘宁', zhTW: '甘寧' },
    '육손': { en: 'Lu Xun', ja: '陸遜', zh: '陆逊', zhTW: '陸遜' }, '강유': { en: 'Jiang Wei', ja: '姜維', zh: '姜维', zhTW: '姜維' },
    '황개': { en: 'Huang Gai', ja: '黄蓋', zh: '黄盖', zhTW: '黃蓋' }, '화타': { en: 'Hua Tuo', ja: '華佗', zh: '华佗', zhTW: '華佗' },
    '도겸': { en: 'Tao Qian', ja: '陶謙', zh: '陶谦', zhTW: '陶謙' }, '마등': { en: 'Ma Teng', ja: '馬騰', zh: '马腾', zhTW: '馬騰' },
    '안량': { en: 'Yan Liang', ja: '顔良', zh: '颜良', zhTW: '顏良' }, '문추': { en: 'Wen Chou', ja: '文醜', zh: '文丑', zhTW: '文醜' },
    '정욱': { en: 'Cheng Yu', ja: '程昱', zh: '程昱', zhTW: '程昱' }, '장합': { en: 'Zhang He', ja: '張郃', zh: '张郃', zhTW: '張郃' },
    '등애': { en: 'Deng Ai', ja: '鄧艾', zh: '邓艾', zhTW: '鄧艾' }, '방덕': { en: 'Pang De', ja: '龐徳', zh: '庞德', zhTW: '龐德' },
    '가후': { en: 'Jia Xu', ja: '賈詡', zh: '贾诩', zhTW: '賈詡' }, '서황': { en: 'Xu Huang', ja: '徐晃', zh: '徐晃', zhTW: '徐晃' },
    '초선': { en: 'Diaochan', ja: '貂蝉', zh: '貂蝉', zhTW: '貂蟬' }, '소교': { en: 'Xiao Qiao', ja: '小喬', zh: '小乔', zhTW: '小喬' },
    '대교': { en: 'Da Qiao', ja: '大喬', zh: '大乔', zhTW: '大喬' }, '악진': { en: 'Yue Jin', ja: '楽進', zh: '乐进', zhTW: '樂進' },
    '만총': { en: 'Man Chong', ja: '満寵', zh: '满宠', zhTW: '滿寵' }, '장료': { en: 'Zhang Liao', ja: '張遼', zh: '张辽', zhTW: '張遼' },
    '조비': { en: 'Cao Pi', ja: '曹丕', zh: '曹丕', zhTW: '曹丕' }, '공손찬': { en: 'Gongsun Zan', ja: '公孫瓚', zh: '公孙瓒', zhTW: '公孫瓚' },
    '위연': { en: 'Wei Yan', ja: '魏延', zh: '魏延', zhTW: '魏延' }, '하진': { en: 'He Jin', ja: '何進', zh: '何进', zhTW: '何進' },
    '화웅': { en: 'Hua Xiong', ja: '華雄', zh: '华雄', zhTW: '華雄' }, '원소': { en: 'Yuan Shao', ja: '袁紹', zh: '袁绍', zhTW: '袁紹' },
    '사마염': { en: 'Sima Yan', ja: '司馬炎', zh: '司马炎', zhTW: '司馬炎' }, '여포': { en: 'Lü Bu', ja: '呂布', zh: '吕布', zhTW: '呂布' },
    '이각': { en: 'Li Jue', ja: '李傕', zh: '李傕', zhTW: '李傕' }, '곽사': { en: 'Guo Si', ja: '郭汜', zh: '郭汜', zhTW: '郭汜' },
    '순우경': { en: 'Chunyu Qiong', ja: '淳于瓊', zh: '淳于琼', zhTW: '淳于瓊' }, '고람': { en: 'Gao Lan', ja: '高覧', zh: '高览', zhTW: '高覽' },
    '조순': { en: 'Cao Chun', ja: '曹純', zh: '曹纯', zhTW: '曹純' }, '문빙': { en: 'Wen Pin', ja: '文聘', zh: '文聘', zhTW: '文聘' },
    '채모': { en: 'Cai Mao', ja: '蔡瑁', zh: '蔡瑁', zhTW: '蔡瑁' }, '장윤': { en: 'Zhang Yun', ja: '張允', zh: '张允', zhTW: '張允' },
    '하후상': { en: 'Xiahou Shang', ja: '夏侯尚', zh: '夏侯尚', zhTW: '夏侯尚' }, '곽회': { en: 'Guo Huai', ja: '郭淮', zh: '郭淮', zhTW: '郭淮' },
    '한당': { en: 'Han Dang', ja: '韓当', zh: '韩当', zhTW: '韓當' }, '주태': { en: 'Zhou Tai', ja: '周泰', zh: '周泰', zhTW: '周泰' },
    '학소': { en: 'Hao Zhao', ja: '郝昭', zh: '郝昭', zhTW: '郝昭' }, '왕쌍': { en: 'Wang Shuang', ja: '王双', zh: '王双', zhTW: '王雙' },
    '종회': { en: 'Zhong Hui', ja: '鍾会', zh: '钟会', zhTW: '鍾會' }, '제갈탄': { en: 'Zhuge Dan', ja: '諸葛誕', zh: '诸葛诞', zhTW: '諸葛誕' },
    '동탁': { en: 'Dong Zhuo', ja: '董卓', zh: '董卓', zhTW: '董卓' }
  };

  /* ---------- 히어로즈 블러드 일반 병종 카드 이름 ---------- */
  var TROOP = {
    '보병': { en: 'Infantry', ja: '歩兵', zh: '步兵', zhTW: '步兵' }, '방패병': { en: 'Shield Soldier', ja: '盾兵', zh: '盾兵', zhTW: '盾兵' },
    '척후병': { en: 'Scout', ja: '斥候', zh: '斥候', zhTW: '斥候' }, '궁병': { en: 'Archer', ja: '弓兵', zh: '弓兵', zhTW: '弓兵' },
    '경기병': { en: 'Light Cavalry', ja: '軽騎兵', zh: '轻骑兵', zhTW: '輕騎兵' }, '의병': { en: 'Militia', ja: '義兵', zh: '义兵', zhTW: '義兵' },
    '봉화병': { en: 'Signal Soldier', ja: '烽火兵', zh: '烽火兵', zhTW: '烽火兵' }, '창병': { en: 'Spearman', ja: '槍兵', zh: '枪兵', zhTW: '槍兵' },
    '쇠뇌병': { en: 'Crossbowman', ja: '弩兵', zh: '弩兵', zhTW: '弩兵' }, '함정병': { en: 'Trapper', ja: '罠兵', zh: '陷阱兵', zhTW: '陷阱兵' },
    '전령': { en: 'Messenger', ja: '伝令', zh: '传令', zhTW: '傳令' }, '둔전병': { en: 'Farmer Soldier', ja: '屯田兵', zh: '屯田兵', zhTW: '屯田兵' },
    '의용병': { en: 'Volunteer', ja: '義勇兵', zh: '义勇兵', zhTW: '義勇兵' }, '노궁병': { en: 'Crossbow Archer', ja: '弩弓兵', zh: '弩弓兵', zhTW: '弩弓兵' }
  };

  /* ---------- 병종(클래스) ---------- */
  var CLS = {
    '군주': { en: 'Lord', ja: '君主', zh: '君主', zhTW: '君主' }, '궁수': { en: 'Archer', ja: '弓兵', zh: '弓手', zhTW: '弓手' },
    '기마': { en: 'Cavalry', ja: '騎馬', zh: '骑马', zhTW: '騎馬' }, '기습': { en: 'Ambush', ja: '奇襲', zh: '奇袭', zhTW: '奇襲' },
    '무희': { en: 'Dancer', ja: '舞姫', zh: '舞姬', zhTW: '舞姬' }, '수호': { en: 'Guardian', ja: '守護', zh: '守护', zhTW: '守護' },
    '의원': { en: 'Healer', ja: '医員', zh: '医师', zhTW: '醫師' }, '전사': { en: 'Warrior', ja: '戦士', zh: '战士', zhTW: '戰士' },
    '책략': { en: 'Strategist', ja: '策士', zh: '策略', zhTW: '策略' }, '책사': { en: 'Tactician', ja: '軍師', zh: '军师', zhTW: '軍師' }
  };

  /* ---------- 스킬 이름(타입별 일반화) ---------- */
  var SKILL_NAME = {
    strike: { en: 'Strike', ja: '強打', zh: '强击', zhTW: '強擊' }, aoe: { en: 'Sweep', ja: '全体攻撃', zh: '群攻', zhTW: '群攻' },
    multi: { en: 'Barrage', ja: '連撃', zh: '连击', zhTW: '連擊' }, shield: { en: 'Guard', ja: '守護', zh: '守护', zhTW: '守護' },
    buff: { en: 'Rally', ja: '鼓舞', zh: '鼓舞', zhTW: '鼓舞' }, heal: { en: 'Heal', ja: '治療', zh: '治疗', zhTW: '治療' },
    charm: { en: 'Charm', ja: '魅了', zh: '魅惑', zhTW: '魅惑' }, confuse: { en: 'Confuse', ja: '混乱', zh: '混乱', zhTW: '混亂' },
    p_charm: { en: 'Charm', ja: '魅了', zh: '魅惑', zhTW: '魅惑' }, p_confuse: { en: 'Confuse', ja: '混乱', zh: '混乱', zhTW: '混亂' },
    p_poison: { en: 'Poison', ja: '毒', zh: '下毒', zhTW: '下毒' }, p_seal: { en: 'Seal', ja: '封印', zh: '封印', zhTW: '封印' }
  };
  function skillName(sk) { var e = SKILL_NAME[sk.type]; return (e && e[lang]) ? e[lang] : (sk.name || ''); }
  function skillDesc(sk) {
    var v = sk.val;
    var T = {
      strike: { en: 'Deal ATK+' + v + ' to one enemy', ja: '敵1体に攻撃力+' + v + 'ダメージ', zh: '对1名敌人造成 攻击力+' + v + ' 伤害', zhTW: '對1名敵人造成 攻擊力+' + v + ' 傷害' },
      aoe: { en: 'Deal ' + v + ' to all enemies', ja: '敵全体に' + v + 'ダメージ', zh: '对全体敌人造成' + v + '伤害', zhTW: '對全體敵人造成' + v + '傷害' },
      multi: { en: 'Hit random enemies ' + v + ' times', ja: 'ランダムな敵を' + v + '回攻撃', zh: '随机攻击敌人' + v + '次', zhTW: '隨機攻擊敵人' + v + '次' },
      shield: { en: 'Lord gains +' + v + ' shield', ja: '主公にシールド+' + v, zh: '主公护盾+' + v, zhTW: '主公護盾+' + v },
      buff: { en: 'One attack card +' + v + ' ATK (1 turn)', ja: '攻撃カード1枚の攻撃力+' + v + '(1ターン)', zh: '1张攻击卡 攻击力+' + v + '（1回合）', zhTW: '1張攻擊卡 攻擊力+' + v + '（1回合）' },
      heal: { en: 'Restore ' + v + ' HP to the Lord', ja: '主公のHPを' + v + '回復', zh: '恢复主公' + v + '点HP', zhTW: '恢復主公' + v + '點HP' },
      charm: { en: 'Charm one enemy for 1 turn (disabled)', ja: '敵1体を1ターン魅了(行動不能)', zh: '魅惑1名敌人1回合（无法行动）', zhTW: '魅惑1名敵人1回合（無法行動）' },
      confuse: { en: 'Confuse one enemy for 1 turn (disabled)', ja: '敵1体を1ターン混乱(行動不能)', zh: '混乱1名敌人1回合（无法行动）', zhTW: '混亂1名敵人1回合（無法行動）' },
      p_charm: { en: 'Charm one of your cards (1 turn)', ja: '味方カード1枚を魅了(1ターン)', zh: '使1张我方卡魅惑（1回合）', zhTW: '使1張我方卡魅惑（1回合）' },
      p_confuse: { en: 'Confuse one of your cards (1 turn)', ja: '味方カード1枚を混乱(1ターン)', zh: '使1张我方卡混乱（1回合）', zhTW: '使1張我方卡混亂（1回合）' },
      p_poison: { en: 'Poison one of your cards +' + v, ja: '味方カード1枚を中毒+' + v, zh: '使1张我方卡中毒+' + v, zhTW: '使1張我方卡中毒+' + v },
      p_seal: { en: 'Seal one of your cards this battle', ja: '味方カード1枚を今戦闘の間封印', zh: '本场战斗封印1张我方卡', zhTW: '本場戰鬥封印1張我方卡' }
    };
    var e = T[sk.type]; return (e && e[lang]) ? e[lang] : (sk.desc || '');
  }

  /* ---------- 효과 조각(장비·유물 공용) ---------- */
  function effFrag(k, val) {
    var F = {
      atk: { en: 'ATK +' + val, ja: '攻撃力+' + val, zh: '攻击力+' + val, zhTW: '攻擊力+' + val },
      crit: { en: 'Crit +' + pct(val) + '%', ja: 'クリ率+' + pct(val) + '%', zh: '暴击+' + pct(val) + '%', zhTW: '暴擊+' + pct(val) + '%' },
      poison: { en: 'On hit, poison enemy +' + val, ja: '攻撃時 敵に毒+' + val, zh: '攻击时使敌中毒+' + val, zhTW: '攻擊時使敵中毒+' + val },
      doubleStrike: { en: 'Basic attack hits twice', ja: '通常攻撃2回', zh: '普通攻击2次', zhTW: '普通攻擊2次' },
      lordHp: { en: 'Lord max HP +' + val, ja: '主公の最大HP+' + val, zh: '主公最大HP+' + val, zhTW: '主公最大HP+' + val },
      lordMp: { en: 'Lord max MP +' + val, ja: '主公の最大MP+' + val, zh: '主公最大MP+' + val, zhTW: '主公最大MP+' + val },
      evade: { en: 'Evade +' + pct(val) + '%', ja: '回避+' + pct(val) + '%', zh: '闪避+' + pct(val) + '%', zhTW: '閃避+' + pct(val) + '%' },
      energy: { en: 'Center card slots +' + val, ja: '中央カード枠+' + val, zh: '中央卡位+' + val, zhTW: '中央卡位+' + val },
      lifesteal: { en: 'Heal +' + val + ' HP on basic attack', ja: '通常攻撃時HP+' + val + '回復', zh: '普通攻击回复HP+' + val, zhTW: '普通攻擊回復HP+' + val },
      startAtk: { en: 'All officers ATK +' + val + ' at battle start', ja: '戦闘開始時 全員の攻撃力+' + val, zh: '战斗开始时全员攻击力+' + val, zhTW: '戰鬥開始時全員攻擊力+' + val },
      startBlock: { en: 'Lord +' + val + ' shield at battle start', ja: '戦闘開始時 主公にシールド+' + val, zh: '战斗开始时主公护盾+' + val, zhTW: '戰鬥開始時主公護盾+' + val },
      startPoison: { en: 'Poison a random enemy at battle start (' + val + ')', ja: '戦闘開始時 ランダムな敵を中毒(' + val + ')', zh: '战斗开始时随机1敌中毒(' + val + ')', zhTW: '戰鬥開始時隨機1敵中毒(' + val + ')' },
      winHeal: { en: 'Restore Lord HP +' + val + ' after victory', ja: '勝利後 主公のHP+' + val + '回復', zh: '胜利后主公HP+' + val + '恢复', zhTW: '勝利後主公HP+' + val + '恢復' },
      winMp: { en: 'Restore Lord MP +' + val + ' after victory', ja: '勝利後 主公のMP+' + val + '回復', zh: '胜利后主公MP+' + val + '恢复', zhTW: '勝利後主公MP+' + val + '恢復' },
      maxHp: { en: 'Lord max HP +' + val, ja: '主公の最大HP+' + val, zh: '主公最大HP+' + val, zhTW: '主公最大HP+' + val },
      maxMp: { en: 'Lord max MP +' + val, ja: '主公の最大MP+' + val, zh: '主公最大MP+' + val, zhTW: '主公最大MP+' + val },
      goldBonus: { en: 'Gold reward +' + pct(val) + '%', ja: 'ゴールド報酬+' + pct(val) + '%', zh: '金币奖励+' + pct(val) + '%', zhTW: '金幣獎勵+' + pct(val) + '%' }
    };
    var e = F[k]; return e ? e[lang] : null;
  }
  function effDesc(effect, order) {
    var parts = [];
    for (var i = 0; i < order.length; i++) {
      var k = order[i]; if (effect[k] == null) continue;
      var f = effFrag(k, effect[k]); if (f) parts.push(f);
    }
    return parts.join(lang === 'ja' ? '・' : (lang === 'en' ? ', ' : '·'));
  }
  var WEAP_ORDER = ['atk', 'doubleStrike', 'poison', 'crit', 'lordHp', 'lordMp', 'evade'];
  var RELIC_ORDER = ['energy', 'lifesteal', 'startAtk', 'startBlock', 'startPoison', 'winHeal', 'winMp', 'maxHp', 'maxMp', 'crit', 'goldBonus'];

  /* ---------- 고유명사: 장비 / 유물 / 소모품 이름 ---------- */
  var WNAME = {
    '장팔사모': { en: 'Serpent Spear', ja: '丈八蛇矛', zh: '丈八蛇矛', zhTW: '丈八蛇矛' }, '청룡언월도': { en: 'Green Dragon Blade', ja: '青龍偃月刀', zh: '青龙偃月刀', zhTW: '青龍偃月刀' },
    '방천화극': { en: 'Sky Piercer Halberd', ja: '方天画戟', zh: '方天画戟', zhTW: '方天畫戟' }, '칠성검': { en: 'Seven Stars Sword', ja: '七星剣', zh: '七星剑', zhTW: '七星劍' },
    '맹덕신서': { en: "Mengde's Manual", ja: '孟徳新書', zh: '孟德新书', zhTW: '孟德新書' }, '태평요술서': { en: 'Taiping Tome', ja: '太平要術書', zh: '太平要术书', zhTW: '太平要術書' },
    '청강검': { en: 'Qinggang Sword', ja: '青釭剣', zh: '青釭剑', zhTW: '青釭劍' }, '의천검': { en: 'Yitian Sword', ja: '倚天剣', zh: '倚天剑', zhTW: '倚天劍' },
    '자웅일대검': { en: 'Twin Swords', ja: '雌雄一対剣', zh: '雌雄一对剑', zhTW: '雌雄一對劍' }, '전국옥새': { en: 'Imperial Seal', ja: '伝国玉璽', zh: '传国玉玺', zhTW: '傳國玉璽' },
    '손자병법': { en: 'Art of War', ja: '孫子兵法', zh: '孙子兵法', zhTW: '孫子兵法' }, '한수정후인': { en: 'Marquis Seal', ja: '漢寿亭侯印', zh: '汉寿亭侯印', zhTW: '漢壽亭侯印' },
    '고정도': { en: 'Guding Blade', ja: '古錠刀', zh: '古锭刀', zhTW: '古錠刀' }, '한혈보도': { en: 'Bloodsteed Saber', ja: '汗血宝刀', zh: '汗血宝刀', zhTW: '汗血寶刀' },
    '삼첨양인도': { en: 'Trident Blade', ja: '三尖両刃刀', zh: '三尖两刃刀', zhTW: '三尖兩刃刀' }, '화극(畵戟)': { en: 'Painted Halberd', ja: '画戟', zh: '画戟', zhTW: '畫戟' },
    '양유기 강궁': { en: "Yang Youji's Bow", ja: '養由基の強弓', zh: '养由基强弓', zhTW: '養由基強弓' }, '제갈연노': { en: 'Zhuge Crossbow', ja: '諸葛連弩', zh: '诸葛连弩', zhTW: '諸葛連弩' },
    '칠보도': { en: 'Seven Treasures Saber', ja: '七宝刀', zh: '七宝刀', zhTW: '七寶刀' }, '철편(鐵鞭)': { en: 'Iron Whip', ja: '鉄鞭', zh: '铁鞭', zhTW: '鐵鞭' },
    '환수도': { en: 'Ring-pommel Saber', ja: '環首刀', zh: '环首刀', zhTW: '環首刀' }, '백우선': { en: 'White Feather Fan', ja: '白羽扇', zh: '白羽扇', zhTW: '白羽扇' },
    '동작대 보패': { en: 'Bronze Sparrow Charm', ja: '銅雀台の宝貝', zh: '铜雀台宝贝', zhTW: '銅雀台寶貝' }, '육도삼략': { en: 'Six Teachings', ja: '六韜三略', zh: '六韬三略', zhTW: '六韜三略' },
    '둔갑천서': { en: 'Mystic Tome', ja: '遁甲天書', zh: '遁甲天书', zhTW: '遁甲天書' }, '적토마': { en: 'Red Hare', ja: '赤兎馬', zh: '赤兔马', zhTW: '赤兔馬' },
    '적로': { en: 'Dilu', ja: '的盧', zh: '的卢', zhTW: '的盧' }, '절영': { en: 'Jueying', ja: '絶影', zh: '绝影', zhTW: '絕影' },
    '조황비전': { en: 'Zhaohuang', ja: '爪黄飛電', zh: '爪黄飞电', zhTW: '爪黃飛電' }
  };
  var RNAME = {
    '대장군 깃발': { en: "Marshal's Banner", ja: '大将軍の旗', zh: '大将军旗', zhTW: '大將軍旗' }, '오추마': { en: 'Wuzhui Steed', ja: '烏騅馬', zh: '乌骓马', zhTW: '烏騅馬' },
    '전고(戰鼓)': { en: 'War Drum', ja: '戦鼓', zh: '战鼓', zhTW: '戰鼓' }, '방패 진형': { en: 'Shield Formation', ja: '盾の陣', zh: '盾阵', zhTW: '盾陣' },
    '군량미': { en: 'Provisions', ja: '兵糧', zh: '军粮', zhTW: '軍糧' }, '독항아리': { en: 'Poison Jar', ja: '毒の壺', zh: '毒罐', zhTW: '毒罐' },
    '옥천수': { en: 'Jade Spring Water', ja: '玉泉水', zh: '玉泉水', zhTW: '玉泉水' }, '천자의 밀서': { en: "Emperor's Edict", ja: '天子の密書', zh: '天子密诏', zhTW: '天子密詔' },
    '현철 갑주': { en: 'Dark Iron Armor', ja: '玄鉄の鎧', zh: '玄铁铠甲', zhTW: '玄鐵鎧甲' }, '호리병': { en: 'Gourd Flask', ja: '瓢箪', zh: '葫芦', zhTW: '葫蘆' },
    '예기(銳器)': { en: 'Keen Blade', ja: '鋭器', zh: '锐器', zhTW: '銳器' }, '호각(號角)': { en: 'War Horn', ja: '号角', zh: '号角', zhTW: '號角' },
    '철벽 보루': { en: 'Iron Rampart', ja: '鉄壁の塁', zh: '铁壁堡垒', zhTW: '鐵壁堡壘' }, '벽사 부적': { en: 'Warding Charm', ja: '辟邪の護符', zh: '辟邪符', zhTW: '辟邪符' },
    '건량(乾糧)': { en: 'Dry Rations', ja: '乾糧', zh: '干粮', zhTW: '乾糧' }
  };
  var CONS = {
    '회복약': { en: 'Healing Potion', ja: '回復薬', zh: '治疗药', zhTW: '治療藥' }, '마력약': { en: 'Mana Potion', ja: '魔力薬', zh: '法力药', zhTW: '法力藥' },
    '해독초': { en: 'Antidote Herb', ja: '解毒草', zh: '解毒草', zhTW: '解毒草' }, '안신향': { en: 'Calming Incense', ja: '安神香', zh: '安神香', zhTW: '安神香' },
    '전투주': { en: 'Battle Wine', ja: '闘酒', zh: '战酒', zhTW: '戰酒' }, '철벽부': { en: 'Iron Wall Charm', ja: '鉄壁符', zh: '铁壁符', zhTW: '鐵壁符' }
  };
  function consDesc(it) {
    var v = it.val, t = it.turns;
    var M = {
      hp: { en: 'Restore ' + v + ' HP to the Lord', ja: '主公のHPを' + v + '回復', zh: '恢复主公' + v + '点HP', zhTW: '恢復主公' + v + '點HP' },
      mp: { en: 'Restore ' + v + ' MP to the Lord', ja: '主公のMPを' + v + '回復', zh: '恢复主公' + v + '点MP', zhTW: '恢復主公' + v + '點MP' },
      cure_poison: { en: 'Cure poison on all your cards', ja: '味方カードの中毒を全て解除', zh: '解除我方卡所有中毒', zhTW: '解除我方卡所有中毒' },
      cure_confuse: { en: 'Cure confuse·charm on your cards', ja: '味方カードの混乱・魅了を解除', zh: '解除我方卡混乱·魅惑', zhTW: '解除我方卡混亂·魅惑' },
      atk: { en: 'All officers ATK +' + v + ' for ' + t + ' turns', ja: t + 'ターン 全員の攻撃力+' + v, zh: t + '回合内全员攻击力+' + v, zhTW: t + '回合內全員攻擊力+' + v },
      shield: { en: 'Lord +' + v + ' shield', ja: '主公にシールド+' + v, zh: '主公护盾+' + v, zhTW: '主公護盾+' + v }
    };
    var e = M[it.kind]; return (e && e[lang]) ? e[lang] : (it.desc || '');
  }

  /* ---------- 스테이지 / 모드 ---------- */
  var STAGE = {
    '반동탁 연합군': { en: 'Anti-Dong Zhuo Coalition', ja: '反董卓連合軍', zh: '反董卓联军', zhTW: '反董卓聯軍' },
    '관도대전': { en: 'Battle of Guandu', ja: '官渡の戦い', zh: '官渡之战', zhTW: '官渡之戰' },
    '장판파 전투': { en: 'Battle of Changban', ja: '長坂坡の戦い', zh: '长坂坡之战', zhTW: '長坂坡之戰' },
    '적벽대전': { en: 'Battle of Red Cliffs', ja: '赤壁の戦い', zh: '赤壁之战', zhTW: '赤壁之戰' },
    '정군산 전투': { en: 'Battle of Mt. Dingjun', ja: '定軍山の戦い', zh: '定军山之战', zhTW: '定軍山之戰' },
    '이릉대전': { en: 'Battle of Yiling', ja: '夷陵の戦い', zh: '夷陵之战', zhTW: '夷陵之戰' },
    '제갈량의 북벌': { en: "Zhuge Liang's Northern Campaigns", ja: '諸葛亮の北伐', zh: '诸葛亮北伐', zhTW: '諸葛亮北伐' },
    '위·촉·오 멸망': { en: 'Fall of Wei·Shu·Wu', ja: '魏・蜀・呉の滅亡', zh: '魏·蜀·吴的灭亡', zhTW: '魏·蜀·吳的滅亡' }
  };
  var STAGE_DESC = {
    '반동탁 연합군': { en: "Lords unite against Dong Zhuo's tyranny.", ja: '董卓の専横に対し諸侯が結集した戦い。', zh: '诸侯结集对抗董卓暴政之战。', zhTW: '諸侯結集對抗董卓暴政之戰。' },
    '관도대전': { en: 'Cao Cao defeats Yuan Shao to seize Hebei.', ja: '曹操が袁紹を破り河北の覇権を握った転換点。', zh: '曹操击败袁绍、夺取河北霸权的转折点。', zhTW: '曹操擊敗袁紹、奪取河北霸權的轉捩點。' },
    '장판파 전투': { en: "Zhao Yun and Zhang Fei cover Liu Bei's retreat.", ja: '退却する劉備を趙雲・張飛が守り抜いた戦い。', zh: '赵云、张飞掩护刘备撤退之战。', zhTW: '趙雲、張飛掩護劉備撤退之戰。' },
    '적벽대전': { en: "The allied fire attack shatters Cao Cao's host.", ja: '孫権・劉備連合軍が火攻めで曹操の大軍を撃破。', zh: '孙刘联军以火攻大破曹操大军。', zhTW: '孫劉聯軍以火攻大破曹操大軍。' },
    '정군산 전투': { en: 'Liu Bei slays Xiahou Yuan and takes Hanzhong.', ja: '劉備軍が夏侯淵を討ち漢中を獲得。', zh: '刘备军斩夏侯渊、夺取汉中。', zhTW: '劉備軍斬夏侯淵、奪取漢中。' },
    '이릉대전': { en: 'Liu Bei, avenging Guan Yu, is crushed by Lu Xun.', ja: '関羽の仇を討たんとした劉備が陸遜に大敗。', zh: '为关羽复仇的刘备败于陆逊。', zhTW: '為關羽復仇的劉備敗於陸遜。' },
    '제갈량의 북벌': { en: "Shu's Zhuge Liang campaigns north against Wei.", ja: '蜀の諸葛亮が魏へ繰り返し北伐を行う。', zh: '蜀汉诸葛亮屡次北伐曹魏。', zhTW: '蜀漢諸葛亮屢次北伐曹魏。' },
    '위·촉·오 멸망': { en: 'Sima Yan founds Jin and unifies the realm.', ja: '司馬炎が晋を建て天下を統一。', zh: '司马炎建立晋朝、统一天下。', zhTW: '司馬炎建立晉朝、統一天下。' }
  };
  function yearStr(y) { return lang === 'en' ? String(y).replace('년', ' AD') : String(y).replace('년', '年'); }
  var MODE = { '노멀': { en: 'Normal', ja: 'ノーマル', zh: '普通', zhTW: '普通' }, '하드': { en: 'Hard', ja: 'ハード', zh: '困难', zhTW: '困難' }, '극악': { en: 'Brutal', ja: '極悪', zh: '极恶', zhTW: '極惡' } };
  var MODE_DESC = {
    normal: { en: 'Base difficulty', ja: '基本難易度', zh: '基础难度', zhTW: '基礎難度' },
    hard: { en: 'Enemy HP ×2 · Commander ATK +50%', ja: '敵HP2倍・敵将攻撃+50%', zh: '敌HP2倍·敌将攻击+50%', zhTW: '敵HP2倍·敵將攻擊+50%' },
    extreme: { en: 'Enemy HP ×3 · Commander ATK +100% · Crit 10%', ja: '敵HP3倍・敵将攻撃+100%・敵将クリ10%', zh: '敌HP3倍·敌将攻击+100%·敌将暴击10%', zhTW: '敵HP3倍·敵將攻擊+100%·敵將暴擊10%' }
  };

  /* ---------- 적용 ---------- */
  function safe(arr, fn) { if (typeof arr !== 'undefined' && arr) fn(); }
  safe(typeof HW_HEROES !== 'undefined' && HW_HEROES, function () {
    HW_HEROES.forEach(function (h) {
      h.name = pick(NAME, h.name); h.cls = pick(CLS, h.cls);
      if (h.skill) { h.skill.name = skillName(h.skill); h.skill.desc = skillDesc(h.skill); }
    });
  });
  if (typeof HW_COMMANDERS !== 'undefined' && HW_COMMANDERS) {
    Object.keys(HW_COMMANDERS).forEach(function (k) {
      var c = HW_COMMANDERS[k]; c.name = pick(NAME, c.name);
      if (c.skills) c.skills.forEach(function (sk) { sk.name = skillName(sk); });
    });
  }
  if (typeof HW_MID_BOSSES !== 'undefined' && HW_MID_BOSSES) {
    HW_MID_BOSSES.forEach(function (pair) { pair.forEach(function (mb) { mb.name = pick(NAME, mb.name); }); });
  }
  if (typeof HW_WEAPONS !== 'undefined' && HW_WEAPONS) {
    HW_WEAPONS.forEach(function (w) { var d = effDesc(w.effect || {}, WEAP_ORDER); w.name = pick(WNAME, w.name); if (d) w.desc = d; });
  }
  if (typeof HW_RELICS !== 'undefined' && HW_RELICS) {
    HW_RELICS.forEach(function (r) { var d = effDesc(r.effect || {}, RELIC_ORDER); r.name = pick(RNAME, r.name); if (d) r.desc = d; });
  }
  if (typeof HW_CONSUMABLES !== 'undefined' && HW_CONSUMABLES) {
    HW_CONSUMABLES.forEach(function (it) { it.name = pick(CONS, it.name); it.desc = consDesc(it); });
  }
  if (typeof HW_STAGES !== 'undefined' && HW_STAGES) {
    HW_STAGES.forEach(function (st) {
      var orig = st.name;
      if (STAGE_DESC[orig] && STAGE_DESC[orig][lang]) st.desc = STAGE_DESC[orig][lang];
      st.name = pick(STAGE, orig); st.year = yearStr(st.year);
    });
  }
  if (typeof HW_MODES !== 'undefined' && HW_MODES) {
    Object.keys(HW_MODES).forEach(function (k) { var m = HW_MODES[k]; m.label = pick(MODE, m.label); if (MODE_DESC[k] && MODE_DESC[k][lang]) m.desc = MODE_DESC[k][lang]; });
  }
  if (typeof QB_CARDS !== 'undefined' && QB_CARDS) {
    QB_CARDS.forEach(function (c) { c.name = NAME[c.name] ? pick(NAME, c.name) : pick(TROOP, c.name); });
  }
})();
