/* 간단한 다국어(i18n) 엔진 — 첫 화면(랜딩) 적용.
 * 언어팩: ko(한국어) · en(English) · ja(日本語) · zh(简体) · zhTW(繁體)
 * 사용법: HTML 요소에 data-i18n="키"를 달면 해당 언어 문자열(innerHTML)로 치환됩니다.
 * 선택 언어는 localStorage('tcg_lang')에 저장되어 인게임 화면 도입 시에도 공유됩니다.
 */
(function () {
  var LANGS = ['ko', 'en', 'ja', 'zh', 'zhTW'];
  var HTML_LANG = { ko: 'ko', en: 'en', ja: 'ja', zh: 'zh-Hans', zhTW: 'zh-Hant' };

  var guideBody = {
    ko:
      '<h4>⚔️ 삼국 영웅전 — 로그라이크 카드 전투</h4><ul>' +
      '<li>당신은 <b>주공</b>입니다. <b>8개 역사 전역</b>을 차례로 평정해 <b>천하통일</b>이 목표.</li>' +
      '<li>전투는 가운데 <b>장수 카드</b>로 적을 공격하고, <b>스킬</b>은 주공 <b>MP</b>를 씁니다. 턴에 쓰지 않은 가운데 카드는 버려집니다.</li>' +
      '<li>적은 <b>주공 HP</b>를 노립니다 — 0이 되면 패배. HP·MP는 모험 내내 이어집니다.</li>' +
      '<li>지도에서 <b>🀄 진형</b>(출진 덱 10~30장) · <b>👥 장수</b> · <b>🏪 상점</b> · <b>🏮 주막</b>(장수 영입)으로 부대를 키우세요.</li>' +
      '<li>5·10 출진은 <b>중간보스</b>, 11출진은 <b>적장</b>. 지도의 ⚜·👑 칸을 탭하면 적 정보를 봅니다.</li></ul>' +
      '<h4>🀄 히어로즈 블러드 — 보드 카드 대전</h4><ul>' +
      '<li><b>덱 구성</b>에서 카드 15장과 판 크기(3×5·4×5)를 정합니다.</li>' +
      '<li>카드는 칸의 <b>폰 레벨 이하 등급</b>만 놓을 수 있고, 놓으면 빈 칸에 폰을 부여해 영역을 넓힙니다(최대 3).</li>' +
      '<li><b>배치한 카드의 무력 총합</b>이 높은 쪽이 승리. <b>내가 패스 2번</b>이면 정산합니다.</li>' +
      '<li>결과는 영웅전 <b>골드</b>로 정산되고, <b>3연승</b> 시 제갈량을 얻습니다.</li></ul>' +
      '<h4>👹 삼국 대장전 — 레이드 보스전</h4><ul>' +
      '<li>영웅전 <b>덱을 공유</b>해 거대 HP의 적장(레이드 보스)에 도전합니다.</li>' +
      '<li>보스는 <b>스킬과 MP</b>를 가지며 혼란·매혹엔 <b>면역</b>입니다.</li>' +
      '<li><b>격파하면 그 적장을 전용 장수로 영입</b> — 오직 대장전에서만 얻습니다. 재도전 시 골드 보상.</li>' +
      '<li>전투 중 영웅전과 <b>공유하는 소모품</b>을 쓸 수 있습니다.</li></ul>',
    en:
      '<h4>⚔️ Heroes — Roguelike Card Battle</h4><ul>' +
      '<li>You are the <b>Lord</b>. Pacify <b>8 historical campaigns</b> in order to <b>unify the land</b>.</li>' +
      '<li>Attack with the center <b>officer cards</b>; <b>skills</b> spend your <b>MP</b>. Center cards not used this turn are discarded.</li>' +
      '<li>Enemies target the <b>Lord\'s HP</b> — reach 0 and you lose. HP·MP carry over through the whole run.</li>' +
      '<li>On the map, grow your army via <b>🀄 Formation</b> (sortie deck 10–30), <b>👥 Officers</b>, <b>🏪 Shop</b>, <b>🏮 Tavern</b> (recruit).</li>' +
      '<li>Sorties 5·10 are <b>mid-bosses</b>, sortie 11 the <b>enemy commander</b>. Tap the ⚜·👑 tiles for enemy info.</li></ul>' +
      '<h4>🀄 Heroes Blood — Board Card Duel</h4><ul>' +
      '<li>In <b>Deck Build</b>, choose 15 cards and the board size (3×5·4×5).</li>' +
      '<li>A card can only go on a tile of <b>its rank or lower</b>; placing it grants pawns to empty tiles to expand (up to 3).</li>' +
      '<li>The side with the higher <b>total might of placed cards</b> wins. Two passes by you settles the match.</li>' +
      '<li>Results settle into Heroes <b>gold</b>; a <b>3-win streak</b> grants Zhuge Liang.</li></ul>' +
      '<h4>👹 Raid — Boss Battles</h4><ul>' +
      '<li><b>Share your Heroes deck</b> to challenge massive-HP enemy commanders (raid bosses).</li>' +
      '<li>Bosses have <b>skills and MP</b>, and are <b>immune</b> to confuse·charm.</li>' +
      '<li><b>Defeat one to recruit that commander</b> as an exclusive officer — only here. Re-clear for gold.</li>' +
      '<li>You may use <b>consumables shared</b> with Heroes during battle.</li></ul>',
    ja:
      '<h4>⚔️ 三国英雄伝 — ローグライクカードバトル</h4><ul>' +
      '<li>あなたは<b>主公</b>です。<b>8つの歴史戦役</b>を順に平定し<b>天下統一</b>を目指します。</li>' +
      '<li>中央の<b>武将カード</b>で攻撃し、<b>スキル</b>は主公の<b>MP</b>を消費。使わなかった中央カードは捨てられます。</li>' +
      '<li>敵は<b>主公のHP</b>を狙います — 0で敗北。HP・MPは冒険を通して持ち越します。</li>' +
      '<li>マップでは<b>🀄 陣形</b>(出陣デッキ10〜30) · <b>👥 武将</b> · <b>🏪 商店</b> · <b>🏮 酒場</b>(登用)で部隊を育成。</li>' +
      '<li>5・10出陣は<b>中ボス</b>、11出陣は<b>敵将</b>。マップの⚜・👑をタップで敵情報。</li></ul>' +
      '<h4>🀄 ヒーローズブラッド — ボードカード対戦</h4><ul>' +
      '<li><b>デッキ構成</b>でカード15枚と盤面サイズ(3×5・4×5)を決めます。</li>' +
      '<li>カードはマスの<b>ポーンレベル以下</b>のみ配置可。配置すると空きマスにポーンを付与し領域を広げます(最大3)。</li>' +
      '<li><b>配置カードの武力合計</b>が高い方が勝利。自分が2回パスで精算。</li>' +
      '<li>結果は英雄伝の<b>ゴールド</b>で精算、<b>3連勝</b>で諸葛亮を獲得。</li></ul>' +
      '<h4>👹 三国大将戦 — レイドボス戦</h4><ul>' +
      '<li>英雄伝の<b>デッキを共有</b>し、巨大HPの敵将(レイドボス)に挑戦。</li>' +
      '<li>ボスは<b>スキルとMP</b>を持ち、混乱・魅了に<b>免疫</b>です。</li>' +
      '<li><b>撃破でその敵将を専用武将として登用</b> — 大将戦限定。再挑戦でゴールド報酬。</li>' +
      '<li>戦闘中は英雄伝と<b>共有の消耗品</b>を使えます。</li></ul>',
    zh:
      '<h4>⚔️ 三国英雄传 — 类Rogue卡牌战斗</h4><ul>' +
      '<li>你是<b>主公</b>。依次平定<b>8场历史战役</b>，目标是<b>一统天下</b>。</li>' +
      '<li>用中央的<b>武将卡</b>攻击，<b>技能</b>消耗主公<b>MP</b>。本回合未使用的中央卡会被弃置。</li>' +
      '<li>敌人瞄准<b>主公HP</b> — 归零即败。HP·MP在整个冒险中延续。</li>' +
      '<li>在地图上通过<b>🀄 阵型</b>(出阵卡组10~30) · <b>👥 武将</b> · <b>🏪 商店</b> · <b>🏮 酒馆</b>(招募)壮大部队。</li>' +
      '<li>第5·10出阵为<b>中间首领</b>，第11出阵为<b>敌将</b>。点击地图的⚜·👑可查看敌方信息。</li></ul>' +
      '<h4>🀄 英雄之血 — 棋盘卡牌对战</h4><ul>' +
      '<li>在<b>卡组构建</b>中选定15张卡与棋盘大小(3×5·4×5)。</li>' +
      '<li>卡牌只能放在<b>等级不高于格子兵卒等级</b>处，放置后向空格赋予兵卒以扩大领域(最多3)。</li>' +
      '<li><b>已放置卡牌武力总和</b>更高者获胜。你方两次过牌即结算。</li>' +
      '<li>结果结算为英雄传<b>金币</b>，<b>三连胜</b>可获得诸葛亮。</li></ul>' +
      '<h4>👹 三国大将战 — 团队首领战</h4><ul>' +
      '<li><b>共享英雄传卡组</b>，挑战巨额HP的敌将(团队首领)。</li>' +
      '<li>首领拥有<b>技能与MP</b>，并对混乱·魅惑<b>免疫</b>。</li>' +
      '<li><b>击破即可将该敌将招募为专属武将</b> — 仅限大将战。再次通关给予金币。</li>' +
      '<li>战斗中可使用与英雄传<b>共享的消耗品</b>。</li></ul>',
    zhTW:
      '<h4>⚔️ 三國英雄傳 — 類Rogue卡牌戰鬥</h4><ul>' +
      '<li>你是<b>主公</b>。依次平定<b>8場歷史戰役</b>，目標是<b>一統天下</b>。</li>' +
      '<li>用中央的<b>武將卡</b>攻擊，<b>技能</b>消耗主公<b>MP</b>。本回合未使用的中央卡會被棄置。</li>' +
      '<li>敵人瞄準<b>主公HP</b> — 歸零即敗。HP·MP在整個冒險中延續。</li>' +
      '<li>在地圖上透過<b>🀄 陣型</b>(出陣牌組10~30) · <b>👥 武將</b> · <b>🏪 商店</b> · <b>🏮 酒館</b>(招募)壯大部隊。</li>' +
      '<li>第5·10出陣為<b>中間首領</b>，第11出陣為<b>敵將</b>。點擊地圖的⚜·👑可查看敵方資訊。</li></ul>' +
      '<h4>🀄 英雄之血 — 棋盤卡牌對戰</h4><ul>' +
      '<li>在<b>牌組構建</b>中選定15張卡與棋盤大小(3×5·4×5)。</li>' +
      '<li>卡牌只能放在<b>等級不高於格子兵卒等級</b>處，放置後向空格賦予兵卒以擴大領域(最多3)。</li>' +
      '<li><b>已放置卡牌武力總和</b>更高者獲勝。你方兩次過牌即結算。</li>' +
      '<li>結果結算為英雄傳<b>金幣</b>，<b>三連勝</b>可獲得諸葛亮。</li></ul>' +
      '<h4>👹 三國大將戰 — 團隊首領戰</h4><ul>' +
      '<li><b>共享英雄傳牌組</b>，挑戰巨額HP的敵將(團隊首領)。</li>' +
      '<li>首領擁有<b>技能與MP</b>，並對混亂·魅惑<b>免疫</b>。</li>' +
      '<li><b>擊破即可將該敵將招募為專屬武將</b> — 僅限大將戰。再次通關給予金幣。</li>' +
      '<li>戰鬥中可使用與英雄傳<b>共享的消耗品</b>。</li></ul>'
  };

  var DICT = {
    docTitle: { ko: '삼국지 카드 게임', en: 'Three Kingdoms Card Game', ja: '三国志カードゲーム', zh: '三国志卡牌游戏', zhTW: '三國志卡牌遊戲' },

    heroesTitle: { ko: '삼국 영웅전', en: 'Three Kingdoms: Heroes', ja: '三国英雄伝', zh: '三国英雄传', zhTW: '三國英雄傳' },
    heroesTag: { ko: '난세 평정 · 천하통일', en: 'Pacify the chaos · Unify the land', ja: '乱世平定・天下統一', zh: '平定乱世 · 一统天下', zhTW: '平定亂世 · 一統天下' },
    heroesDesc: {
      ko: '장수를 모집해 부대를 꾸리고 진군 경로를 헤쳐가는 턴제 전투. 황건적과 군벌을 격파하고 동탁·여포 등 보스를 토벌하세요.',
      en: 'Recruit officers, build your army, and fight through the march in turn-based battles. Crush the Yellow Turbans and warlords, and topple bosses like Dong Zhuo and Lü Bu.',
      ja: '武将を集めて部隊を編成し、進軍ルートを切り開くターン制バトル。黄巾賊や群雄を撃破し、董卓・呂布などのボスを討伐しよう。',
      zh: '招募武将、组建部队，在回合制战斗中突破进军路线。击破黄巾贼与群雄，讨伐董卓、吕布等头目。',
      zhTW: '招募武將、組建部隊，在回合制戰鬥中突破進軍路線。擊破黃巾賊與群雄，討伐董卓、呂布等頭目。'
    },
    heroesPill: { ko: '출진 ▶', en: 'March ▶', ja: '出陣 ▶', zh: '出阵 ▶', zhTW: '出陣 ▶' },

    raidTitle: { ko: '삼국 대장전', en: 'Three Kingdoms: Raid', ja: '三国大将戦', zh: '三国大将战', zhTW: '三國大將戰' },
    raidTag: { ko: '레이드 보스전', en: 'Raid boss battles', ja: 'レイドボス戦', zh: '团队首领战', zhTW: '團隊首領戰' },
    raidDesc: {
      ko: '삼국 영웅전의 <b>덱을 공유</b>해 거대 HP의 적장(레이드 보스)에 도전. <b>보스를 격파하면 그 적장을 전용 장수로 획득</b>하며, 이 장수들은 오직 대장전에서만 얻을 수 있습니다.',
      en: 'Share your Heroes <b>deck</b> to challenge massive-HP enemy commanders (raid bosses). <b>Defeat a boss to recruit that commander</b> as an exclusive officer — obtainable only in Raid.',
      ja: '「三国英雄伝」の<b>デッキを共有</b>し、巨大HPの敵将(レイドボス)に挑戦。<b>撃破するとその敵将を専用武将として獲得</b>でき、これらは大将戦でしか入手できません。',
      zh: '<b>共享</b>《三国英雄传》的卡组，挑战巨额HP的敌将（团队首领）。<b>击破首领即可将其招募为专属武将</b>，这些武将只能在大将战中获得。',
      zhTW: '<b>共享</b>《三國英雄傳》的牌組，挑戰巨額HP的敵將（團隊首領）。<b>擊破首領即可將其招募為專屬武將</b>，這些武將只能在大將戰中獲得。'
    },
    raidPill: { ko: '토벌 ▶', en: 'Subjugate ▶', ja: '討伐 ▶', zh: '讨伐 ▶', zhTW: '討伐 ▶' },

    queensTitle: { ko: '히어로즈 블러드', en: 'Heroes Blood', ja: 'ヒーローズブラッド', zh: '英雄之血', zhTW: '英雄之血' },
    queensTag: { ko: '보드 카드 대전', en: 'Board card duel', ja: 'ボードカード対戦', zh: '棋盘卡牌对战', zhTW: '棋盤卡牌對戰' },
    queensDesc: {
      ko: '진영(3×5·4×5 선택)에 장수 카드를 배치해 영역을 넓히고, <b>배치한 카드의 무력 총합</b>이 높은 쪽이 승리하는 전략 카드 대전. 덱 빌더(장수 카드 69종)로 15장 덱을 짜고, 대전 결과는 영웅전 <b>골드로 정산</b>됩니다.',
      en: 'Place officer cards on the board (3×5·4×5) to expand territory; the side with the higher <b>total might of placed cards</b> wins this strategic duel. Build a 15-card deck (69 officer cards); results <b>settle into Heroes gold</b>.',
      ja: '陣形(3×5・4×5)に武将カードを配置して領域を広げ、<b>配置カードの武力合計</b>が高い方が勝つ戦略対戦。デッキビルダー(武将69種)で15枚デッキを組み、結果は英雄伝の<b>ゴールドで精算</b>。',
      zh: '在阵型(3×5·4×5)放置武将卡扩大领域，<b>已放置卡牌武力总和</b>更高者获胜的策略对战。用卡组构建器(69种武将)搭配15张卡组，结果<b>结算为英雄传金币</b>。',
      zhTW: '在陣型(3×5·4×5)放置武將卡擴大領域，<b>已放置卡牌武力總和</b>更高者獲勝的策略對戰。用牌組構建器(69種武將)搭配15張牌組，結果<b>結算為英雄傳金幣</b>。'
    },
    queensPill: { ko: '대전 ▶', en: 'Duel ▶', ja: '対戦 ▶', zh: '对战 ▶', zhTW: '對戰 ▶' },

    footGuide: { ko: '📖 게임 가이드', en: '📖 Guide', ja: '📖 ゲームガイド', zh: '📖 游戏指南', zhTW: '📖 遊戲指南' },
    footChangelog: { ko: '📜 변경 내역', en: '📜 Changelog', ja: '📜 変更履歴', zh: '📜 更新记录', zhTW: '📜 更新記錄' },
    footCredits: { ko: '🎬 만든이', en: '🎬 Credits', ja: '🎬 制作', zh: '🎬 制作人员', zhTW: '🎬 製作人員' },

    guideTitle: { ko: '📖 게임 가이드', en: '📖 Game Guide', ja: '📖 ゲームガイド', zh: '📖 游戏指南', zhTW: '📖 遊戲指南' },
    guideSub: {
      ko: '처음이어도 괜찮아요 — 핵심만 짧게 정리했습니다.',
      en: 'New here? No worries — just the essentials, kept short.',
      ja: '初めてでも大丈夫 — 要点だけ短くまとめました。',
      zh: '新手也没关系 — 只把要点简短整理。',
      zhTW: '新手也沒關係 — 只把要點簡短整理。'
    },
    guideBody: guideBody,

    creditsTitle: { ko: '🎬 만든이', en: '🎬 Credits', ja: '🎬 制作', zh: '🎬 制作人员', zhTW: '🎬 製作人員' },
    creditsSub: { ko: '⚔️ 삼국지 카드 게임', en: '⚔️ Three Kingdoms Card Game', ja: '⚔️ 三国志カードゲーム', zh: '⚔️ 三国志卡牌游戏', zhTW: '⚔️ 三國志卡牌遊戲' },

    close: { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭', zhTW: '關閉' },

    /* 인게임 공통 UI(정적 HTML) */
    langLabel: { ko: '🌐 언어', en: '🌐 Language', ja: '🌐 言語', zh: '🌐 语言', zhTW: '🌐 語言' },
    uiSound: { ko: '🔊 소리', en: '🔊 Sound', ja: '🔊 サウンド', zh: '🔊 声音', zhTW: '🔊 聲音' },
    uiDialogue: { ko: '💬 대사 켜짐', en: '💬 Dialogue On', ja: '💬 セリフ ON', zh: '💬 台词开', zhTW: '💬 台詞開' },
    uiReset: { ko: '🗑️ 데이터 초기화', en: '🗑️ Reset Data', ja: '🗑️ データ初期化', zh: '🗑️ 重置数据', zhTW: '🗑️ 重置資料' },
    uiToMenu: { ko: '← 메뉴로', en: '← Menu', ja: '← メニューへ', zh: '← 返回菜单', zhTW: '← 返回選單' },
    uiToHeroes: { ko: '🗺️ 영웅전', en: '🗺️ Heroes', ja: '🗺️ 英雄伝', zh: '🗺️ 英雄传', zhTW: '🗺️ 英雄傳' },
    qbDeck: { ko: '🃏 덱 구성', en: '🃏 Deck', ja: '🃏 デッキ編成', zh: '🃏 卡组', zhTW: '🃏 牌組' },
    qbRules: { ko: '📜 규칙', en: '📜 Rules', ja: '📜 ルール', zh: '📜 规则', zhTW: '📜 規則' }
  };

  function get(lang, key) {
    var e = DICT[key]; if (!e) return null;
    return (e[lang] != null) ? e[lang] : e.ko;
  }
  function savedLang() {
    try { var l = localStorage.getItem('tcg_lang'); return LANGS.indexOf(l) !== -1 ? l : 'ko'; } catch (e) { return 'ko'; }
  }
  function applyLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = 'ko';
    try { localStorage.setItem('tcg_lang', lang); } catch (e) {}
    document.documentElement.setAttribute('lang', HTML_LANG[lang] || 'ko');
    var dt = get(lang, 'docTitle'); if (dt) document.title = dt;
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute('data-i18n'); var v = get(lang, k);
      if (v != null && v !== '') nodes[i].innerHTML = v;
    }
    var btns = document.querySelectorAll('.lang-btn');
    for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('active', btns[j].getAttribute('data-lang') === lang);
  }

  window.TCG_LANG = { apply: applyLang, current: savedLang, langs: LANGS };

  function init() {
    var bar = document.getElementById('langBar');
    if (bar) bar.addEventListener('click', function (e) {
      var b = e.target.closest('.lang-btn'); if (!b) return;
      var lang = b.getAttribute('data-lang');
      // 인게임 페이지는 데이터 현지화가 로드시 1회 적용되므로, 언어 변경 시 새로고침해 재적용
      if (window.__GAME_PAGE__ && lang !== savedLang()) {
        try { localStorage.setItem('tcg_lang', lang); } catch (e2) {}
        location.reload(); return;
      }
      applyLang(lang);
    });
    applyLang(savedLang());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
