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

    /* 홈 — 하단 탭바 + 설정 바텀시트 */
    tabCodex: { ko: '도감', en: 'Codex', ja: '図鑑', zh: '图鉴', zhTW: '圖鑑' },
    tabShop: { ko: '상점', en: 'Shop', ja: '商店', zh: '商店', zhTW: '商店' },
    tabTavern: { ko: '주막', en: 'Tavern', ja: '酒場', zh: '酒馆', zhTW: '酒館' },
    tabSettings: { ko: '설정', en: 'Settings', ja: '設定', zh: '设置', zhTW: '設定' },
    setTitle: { ko: '설정', en: 'Settings', ja: '設定', zh: '设置', zhTW: '設定' },
    setSound: { ko: '소리 설정', en: 'Sound', ja: 'サウンド設定', zh: '声音设置', zhTW: '聲音設定' },
    setLang: { ko: '언어 설정', en: 'Language', ja: '言語設定', zh: '语言设置', zhTW: '語言設定' },
    setDialogue: { ko: '대사 설정', en: 'Dialogue', ja: 'セリフ設定', zh: '台词设置', zhTW: '台詞設定' },
    setGuideTxt: { ko: '게임 가이드', en: 'Game Guide', ja: 'ゲームガイド', zh: '游戏指南', zhTW: '遊戲指南' },
    setChangelogTxt: { ko: '변경 내역', en: 'Changelog', ja: '変更履歴', zh: '更新记录', zhTW: '更新記錄' },
    setCreditsTxt: { ko: '만든이', en: 'Credits', ja: '制作', zh: '制作人员', zhTW: '製作人員' },
    setResetTxt: { ko: '데이터 초기화', en: 'Reset Data', ja: 'データ初期化', zh: '重置数据', zhTW: '重置資料' },
    resetQ: { ko: '🗑️ 데이터를 초기화할까요?', en: '🗑️ Reset all data?', ja: '🗑️ データを初期化しますか？', zh: '🗑️ 要重置所有数据吗？', zhTW: '🗑️ 要重置所有資料嗎？' },
    resetBody: {
      ko: '삼국 영웅전·삼국 대장전의 모든 진행과 장수/장비 컬렉션, 모드 해금 기록이 <b>모두 삭제</b>됩니다. 되돌릴 수 없습니다.',
      en: 'All progress in Heroes & Raid, your officer/gear collection, and unlock records will be <b>permanently deleted</b>. This cannot be undone.',
      ja: '英雄伝・大将戦のすべての進行、武将/装備コレクション、モード解放記録が<b>すべて削除</b>されます。元に戻せません。',
      zh: '英雄传·大将战的所有进度、武将/装备收藏与模式解锁记录将<b>全部删除</b>，无法恢复。',
      zhTW: '英雄傳·大將戰的所有進度、武將/裝備收藏與模式解鎖記錄將<b>全部刪除</b>，無法復原。'
    },
    resetYes: { ko: '초기화', en: 'Reset', ja: '初期化', zh: '重置', zhTW: '重置' },
    resetNo: { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消', zhTW: '取消' },

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
    qbRules: { ko: '📜 규칙', en: '📜 Rules', ja: '📜 ルール', zh: '📜 规则', zhTW: '📜 規則' },

    /* 인게임 정적 화면(영웅전 — 지도/전투/보상/휴식/상점/주막/시작/결과) */
    uiOfficers: { ko: '장수', en: 'Officers', ja: '武将', zh: '武将', zhTW: '武將' },
    uiGear: { ko: '장비', en: 'Gear', ja: '装備', zh: '装备', zhTW: '裝備' },
    uiCodexBtn: { ko: '📖 도감', en: '📖 Codex', ja: '📖 図鑑', zh: '📖 图鉴', zhTW: '📖 圖鑑' },
    uiCombatHint: { ko: '영웅을 선택해 행동하세요', en: 'Select an officer to act', ja: '武将を選んで行動', zh: '选择武将进行行动', zhTW: '選擇武將進行行動' },
    uiEndTurn: { ko: '턴 종료', en: 'End Turn', ja: 'ターン終了', zh: '结束回合', zhTW: '結束回合' },
    uiRewardSkip: { ko: '건너뛰기 (골드만 받기)', en: 'Skip (gold only)', ja: 'スキップ（ゴールドのみ）', zh: '跳过（仅金币）', zhTW: '跳過（僅金幣）' },
    uiRestTitle: { ko: '🔥 모닥불', en: '🔥 Campfire', ja: '🔥 焚き火', zh: '🔥 篝火', zhTW: '🔥 篝火' },
    uiRestSub: { ko: '잠시 휴식을 취합니다', en: 'Take a short rest', ja: 'しばし休息します', zh: '稍作休息', zhTW: '稍作休息' },
    uiRestHeal: { ko: '휴식', en: 'Rest', ja: '休息', zh: '休息', zhTW: '休息' },
    uiRestHealD: { ko: '파티 전원 HP 40% 회복', en: 'Whole party restores 40% HP', ja: '味方全員HP40%回復', zh: '全队恢复40%HP', zhTW: '全隊恢復40%HP' },
    uiRestTrain: { ko: '단련', en: 'Train', ja: '鍛錬', zh: '锻炼', zhTW: '鍛鍊' },
    uiRestTrainD: { ko: '영웅 1명 최대 HP +6, 공격력 +2', en: 'One officer +6 max HP, +2 ATK', ja: '武将1人 最大HP+6・攻撃+2', zh: '1名武将 最大HP+6、攻击+2', zhTW: '1名武將 最大HP+6、攻擊+2' },
    uiLeave: { ko: '← 떠나기', en: '← Leave', ja: '← 立ち去る', zh: '← 离开', zhTW: '← 離開' },
    uiShopTitle: { ko: '🛒 상점', en: '🛒 Shop', ja: '🛒 商店', zh: '🛒 商店', zhTW: '🛒 商店' },
    uiShopSub: { ko: '골드로 무기·보물·소모품을 구매하세요 (장수는 주막에서)', en: 'Buy weapons·treasures·items with gold (officers at the Tavern)', ja: 'ゴールドで武器・宝物・消耗品を購入（武将は酒場）', zh: '用金币购买武器·宝物·消耗品（武将在酒馆）', zhTW: '用金幣購買武器·寶物·消耗品（武將在酒館）' },
    uiTavernTitle: { ko: '🏮 주막', en: '🏮 Tavern', ja: '🏮 酒場', zh: '🏮 酒馆', zhTW: '🏮 酒館' },
    uiTavernSub: { ko: '골드로 장수를 영입하세요 (스테이지를 진행하면 명단이 바뀝니다)', en: 'Recruit officers with gold (roster changes as you progress)', ja: 'ゴールドで武将を登用（進行で名簿が変化）', zh: '用金币招募武将（推进后名单会变化）', zhTW: '用金幣招募武將（推進後名單會變化）' },
    uiShopName: { ko: '상점', en: 'Shop', ja: '商店', zh: '商店', zhTW: '商店' },
    uiTavernName: { ko: '주막', en: 'Tavern', ja: '酒場', zh: '酒馆', zhTW: '酒館' },
    uiCodexName: { ko: '도감', en: 'Codex', ja: '図鑑', zh: '图鉴', zhTW: '圖鑑' },
    uiCollRate: { ko: '수집률', en: 'Collected', ja: '収集率', zh: '收集率', zhTW: '收集率' },
    uiStartTitle: { ko: '🗺️ 삼국 영웅전', en: '🗺️ Three Kingdoms: Heroes', ja: '🗺️ 三国英雄伝', zh: '🗺️ 三国英雄传', zhTW: '🗺️ 三國英雄傳' },
    uiContinue: { ko: '이어하기', en: 'Continue', ja: 'つづきから', zh: '继续游戏', zhTW: '繼續遊戲' },
    uiNewRunLabel: { ko: '새 모험 — 모드 선택', en: 'New Adventure — Select Mode', ja: '新たな冒険 — モード選択', zh: '新冒险 — 选择模式', zhTW: '新冒險 — 選擇模式' },
    uiNewRun: { ko: '새 모험', en: 'New Adventure', ja: '新たな冒険', zh: '新冒险', zhTW: '新冒險' },
    uiMenu: { ko: '메뉴로', en: 'Menu', ja: 'メニューへ', zh: '返回菜单', zhTW: '返回選單' },
    uiToList: { ko: '목록으로', en: 'Back to List', ja: '一覧へ', zh: '返回列表', zhTW: '返回列表' },
    uiCmbCardHint: { ko: '가운데 카드를 선택해 공격하세요', en: 'Pick a center card to attack', ja: '中央のカードを選んで攻撃', zh: '选择中央卡牌进攻', zhTW: '選擇中央卡牌進攻' },
    uiRaidTitle: { ko: '👹 대장전 (레이드)', en: '👹 Raid', ja: '👹 大将戦（レイド）', zh: '👹 大将战（团队）', zhTW: '👹 大將戰（團隊）' },
    uiRaidSub: { ko: '영웅전 덱으로 거대 보스에 도전 — 격파 시 전용 장수를 획득합니다. <b>보스 카드를 탭하면 정보</b>를 봅니다.', en: 'Challenge giant bosses with your Heroes deck — defeat one to recruit an exclusive officer. <b>Tap a boss card for info</b>.', ja: '英雄伝のデッキで巨大ボスに挑戦 — 撃破で専用武将を獲得。<b>ボスカードをタップで情報</b>。', zh: '用英雄传卡组挑战巨型首领 — 击破获得专属武将。<b>点击首领卡查看信息</b>。', zhTW: '用英雄傳牌組挑戰巨型首領 — 擊破獲得專屬武將。<b>點擊首領卡查看資訊</b>。' },

    /* 히어로즈 블러드 정적 화면 */
    qbFoe: { ko: '🤖 상대', en: '🤖 Opponent', ja: '🤖 相手', zh: '🤖 对手', zhTW: '🤖 對手' },
    qbYou: { ko: '🧑 당신', en: '🧑 You', ja: '🧑 あなた', zh: '🧑 你', zhTW: '🧑 你' },
    qbPass: { ko: '패스', en: 'Pass', ja: 'パス', zh: '过牌', zhTW: '過牌' },
    qbDeckTitle: { ko: '🃏 덱 구성', en: '🃏 Deck Build', ja: '🃏 デッキ編成', zh: '🃏 卡组构建', zhTW: '🃏 牌組構建' },
    qbDeckBuild: { ko: '덱 구성', en: 'Deck', ja: 'デッキ編成', zh: '卡组', zhTW: '牌組' },
    qbBoardSize: { ko: '판 크기', en: 'Board Size', ja: '盤面サイズ', zh: '棋盘大小', zhTW: '棋盤大小' },
    qbDefaultDeck: { ko: '기본덱', en: 'Default', ja: '基本デッキ', zh: '默认卡组', zhTW: '預設牌組' },
    qbSave: { ko: '저장', en: 'Save', ja: '保存', zh: '保存', zhTW: '儲存' },
    qbStartDeck: { ko: '이 덱으로 시작', en: 'Start with this deck', ja: 'このデッキで開始', zh: '用此卡组开始', zhTW: '用此牌組開始' },
    qbClose: { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭', zhTW: '關閉' },
    qbEndQ: { ko: '⚑ 게임 종료?', en: '⚑ End game?', ja: '⚑ ゲーム終了？', zh: '⚑ 结束游戏？', zhTW: '⚑ 結束遊戲？' },
    qbEndText: { ko: '패스를 2번 하셨습니다. 게임을 종료하고 정산할까요?', en: 'You passed twice. End the game and settle?', ja: '2回パスしました。ゲームを終了して精算しますか？', zh: '你已过牌两次。结束游戏并结算吗？', zhTW: '你已過牌兩次。結束遊戲並結算嗎？' },
    qbEndYes: { ko: '종료하고 정산', en: 'End & settle', ja: '終了して精算', zh: '结束并结算', zhTW: '結束並結算' },
    qbEndNo: { ko: '계속하기', en: 'Keep playing', ja: '続ける', zh: '继续', zhTW: '繼續' },
    qbAgain: { ko: '다시 하기', en: 'Play Again', ja: 'もう一度', zh: '再来一局', zhTW: '再來一局' },
    qbRulesTitle: { ko: '📖 게임 가이드', en: '📖 Game Guide', ja: '📖 ゲームガイド', zh: '📖 游戏指南', zhTW: '📖 遊戲指南' },
    qbConfirm: { ko: '확인', en: 'OK', ja: 'OK', zh: '确定', zhTW: '確定' },

    /* 도감 / 덱·장비 모달(영웅전·대장전 공용) */
    uiRelics: { ko: '유물', en: 'Relics', ja: '遺物', zh: '遗物', zhTW: '遺物' },
    uiItems: { ko: '소모품', en: 'Items', ja: '消耗品', zh: '消耗品', zhTW: '消耗品' },
    uiColItemSub: { ko: '획득한 소모품은 밝게, 아직 못 모은 소모품은 어둡게 표시됩니다 — 상점에서 구매', en: 'Obtained items are bright; the rest are dimmed — bought at the shop', ja: '入手した消耗品は明るく、未入手は暗く表示 — 商店で購入', zh: '已获得消耗品高亮，未获得的变暗 — 在商店购买', zhTW: '已獲得消耗品高亮，未獲得的變暗 — 在商店購買' },
    diffConfirmTitle: { ko: '⚔️ 새 게임 시작', en: '⚔️ Start New Game', ja: '⚔️ 新しいゲーム', zh: '⚔️ 开始新游戏', zhTW: '⚔️ 開始新遊戲' },
    diffStart: { ko: '시작', en: 'Start', ja: '開始', zh: '开始', zhTW: '開始' },
    adminRow: { ko: '관리자 모드', en: 'Admin Mode', ja: '管理者モード', zh: '管理员模式', zhTW: '管理員模式' },
    adminTitle: { ko: '🔐 관리자 모드', en: '🔐 Admin Mode', ja: '🔐 管理者モード', zh: '🔐 管理员模式', zhTW: '🔐 管理員模式' },
    adminSub: { ko: '암호를 입력하세요', en: 'Enter the passcode', ja: 'パスコードを入力', zh: '请输入密码', zhTW: '請輸入密碼' },
    uiClose: { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭', zhTW: '關閉' },
    cmbLogTitle: { ko: '⚔ 전투 내역', en: '⚔ Battle Log', ja: '⚔ 戦闘ログ', zh: '⚔ 战斗记录', zhTW: '⚔ 戰鬥記錄' },
    cmbDrawCard: { ko: '뽑을 카드', en: 'Draw', ja: '引札', zh: '抽牌', zhTW: '抽牌' },
    cmbUsedCard: { ko: '사용 카드', en: 'Used', ja: '使用', zh: '已用', zhTW: '已用' },
    uiItemUse: { ko: '사용', en: 'Use', ja: '使用', zh: '使用', zhTW: '使用' },
    uiItemCancel: { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消', zhTW: '取消' },
    uiItemConfirm: { ko: '이 소모품을 사용할까요? (턴당 1개)', en: 'Use this item? (one per turn)', ja: 'このアイテムを使いますか？（毎ターン1個）', zh: '使用该消耗品吗？（每回合1个）', zhTW: '使用此消耗品嗎？（每回合1個）' },
    uiBack: { ko: '← 이전', en: '← Back', ja: '← 戻る', zh: '← 返回', zhTW: '← 返回' },
    uiSort: { ko: '정렬', en: 'Sort', ja: '並び替え', zh: '排序', zhTW: '排序' },
    uiSortRarity: { ko: '등급', en: 'Rarity', ja: 'レア度', zh: '稀有度', zhTW: '稀有度' },
    uiSortAtk: { ko: '공격력', en: 'ATK', ja: '攻撃力', zh: '攻击力', zhTW: '攻擊力' },
    uiSortAcquire: { ko: '습득순', en: 'Acquired', ja: '入手順', zh: '获得顺序', zhTW: '獲得順序' },
    uiColHeroSub: { ko: '수집한 장수는 밝게, 아직 못 모은 장수는 어둡게 표시됩니다', en: 'Collected officers are bright; the rest are dimmed', ja: '集めた武将は明るく、未入手は暗く表示', zh: '已收集武将高亮，未获得的变暗', zhTW: '已收集武將高亮，未獲得的變暗' },
    uiColWeaponSub: { ko: '수집한 장비는 밝게, 아직 못 모은 장비는 어둡게 표시됩니다', en: 'Collected gear is bright; the rest are dimmed', ja: '集めた装備は明るく、未入手は暗く表示', zh: '已收集装备高亮，未获得的变暗', zhTW: '已收集裝備高亮，未獲得的變暗' },
    uiColRelicSub: { ko: '획득한 유물은 밝게, 아직 못 모은 유물은 어둡게 표시됩니다 — 메인 적장 격파·보물 발견 이벤트로 획득', en: 'Obtained relics are bright; the rest are dimmed — from defeating main commanders or treasure events', ja: '入手した遺物は明るく、未入手は暗く表示 — 敵将撃破・宝物イベントで入手', zh: '已获得遗物高亮，未获得的变暗 — 通过击破主敌将或宝物事件获得', zhTW: '已獲得遺物高亮，未獲得的變暗 — 透過擊破主敵將或寶物事件獲得' },
    uiDeckEditTitle: { ko: '⚔️ 출진 덱 편성', en: '⚔️ Deck Formation', ja: '⚔️ 出陣デッキ編成', zh: '⚔️ 出阵卡组编成', zhTW: '⚔️ 出陣牌組編成' },
    uiDeckEditSub: { ko: '삼국 영웅전과 <b>공유</b>하는 출진 덱입니다. 카드를 탭해 넣고 빼세요 (최소 10장·최대 30장). 무기 장착은 영웅전에서 합니다.', en: 'This sortie deck is <b>shared</b> with Heroes. Tap cards to add/remove (10–30). Equip weapons in Heroes.', ja: '英雄伝と<b>共有</b>する出陣デッキです。カードをタップで出し入れ（10〜30枚）。武器装備は英雄伝で。', zh: '与英雄传<b>共享</b>的出阵卡组。点击卡牌增减（10~30张）。武器装备在英雄传中进行。', zhTW: '與英雄傳<b>共享</b>的出陣牌組。點擊卡牌增減（10~30張）。武器裝備在英雄傳中進行。' },
    uiGearTitle2: { ko: '🗡️ 장착 장비', en: '🗡️ Equipped Gear', ja: '🗡️ 装備中の武器', zh: '🗡️ 已装备', zhTW: '🗡️ 已裝備' },
    uiGearSub: { ko: '덱 장수들이 장착한 무기입니다', en: 'Weapons equipped by your deck officers', ja: 'デッキの武将が装備中の武器', zh: '卡组武将所装备的武器', zhTW: '牌組武將所裝備的武器' },

    /* 인트로 / 스플래시 */
    introCopy: { ko: '난 세 평 정 · 천 하 통 일', en: 'Q U E L L · U N I F Y', ja: '乱 世 平 定 · 天 下 統 一', zh: '乱 世 平 定 · 天 下 一 统', zhTW: '亂 世 平 定 · 天 下 一 統' },
    introTitle: { ko: '삼국영웅전', en: 'Three Kingdoms<br>Heroes', ja: '三国英雄伝', zh: '三国英雄传', zhTW: '三國英雄傳' },
    introTouch: { ko: '터치하여 시작', en: 'Tap to Start', ja: 'タッチして開始', zh: '轻触开始', zhTW: '輕觸開始' },
    introTouchSub: { ko: '화면을 누르면 홈으로 이동합니다', en: 'Tap the screen to go to Home', ja: '画面をタップでホームへ移動します', zh: '点击屏幕进入主页', zhTW: '點擊螢幕進入主頁' },
    introFooter: { ko: '세 가지 모드 · 하나의 천하', en: 'Three Modes · One Realm', ja: '三つのモード · 一つの天下', zh: '三种模式 · 一统天下', zhTW: '三種模式 · 一統天下' },
    introCopyr: { ko: '© 2026 삼국영웅전 · All Rights Reserved', en: '© 2026 Three Kingdoms Heroes · All Rights Reserved', ja: '© 2026 三国英雄伝 · All Rights Reserved', zh: '© 2026 三国英雄传 · All Rights Reserved', zhTW: '© 2026 三國英雄傳 · All Rights Reserved' },

    /* 게임 데이터 관리 / 변경 내역 */
    setBackupTxt: { ko: '게임 데이터 관리', en: 'Game Data', ja: 'ゲームデータ管理', zh: '游戏数据管理', zhTW: '遊戲資料管理' },
    backupTitle: { ko: '🗂️ 게임 데이터 관리', en: '🗂️ Game Data', ja: '🗂️ ゲームデータ管理', zh: '🗂️ 游戏数据管理', zhTW: '🗂️ 遊戲資料管理' },
    backupSub: { ko: '진행·컬렉션·설정을 <b>파일로 내보내기/불러오기</b> 합니다. 앱 재설치나 기기 변경 전에 내보내 두세요.', en: 'Export/import your progress, collection, and settings <b>as a file</b>. Export before reinstalling the app or switching devices.', ja: '進行・コレクション・設定を<b>ファイルで書き出し/読み込み</b>します。アプリ再インストールや機種変更の前に書き出しておきましょう。', zh: '将进度·收藏·设置<b>导出/导入为文件</b>。重装应用或更换设备前请先导出。', zhTW: '將進度·收藏·設定<b>匯出/匯入為檔案</b>。重裝應用或更換裝置前請先匯出。' },
    backupExportTxt: { ko: '📤 내보내기 (파일 저장)', en: '📤 Export (save file)', ja: '📤 書き出し（ファイル保存）', zh: '📤 导出（保存文件）', zhTW: '📤 匯出（儲存檔案）' },
    backupImportTxt: { ko: '📥 불러오기 (파일 선택)', en: '📥 Import (choose file)', ja: '📥 読み込み（ファイル選択）', zh: '📥 导入（选择文件）', zhTW: '📥 匯入（選擇檔案）' },
    changelogNote: { ko: '※ 변경은 매 배포 시 <b>일 단위</b>로 묶어 요약합니다. 세부 항목은 저장소 <code>docs/07-changelog.md</code> 참고.', en: '※ Changes are summarized <b>by day</b> per release. See <code>docs/07-changelog.md</code> in the repo for details.', ja: '※ 変更は配信ごとに<b>日単位</b>でまとめて要約します。詳細はリポジトリの <code>docs/07-changelog.md</code> を参照。', zh: '※ 变更在每次发布时<b>按天</b>归纳汇总。详细条目参见仓库 <code>docs/07-changelog.md</code>。', zhTW: '※ 變更在每次發布時<b>按天</b>歸納彙總。詳細條目參見儲存庫 <code>docs/07-changelog.md</code>。' },

    /* 히어로즈 블러드 — 정적 화면 */
    hbTitle: { ko: '히어로즈 블러드', en: 'Heroes Blood', ja: 'ヒーローズブラッド', zh: '英雄之血', zhTW: '英雄之血' },
    hbBoardWord: { ko: '보드', en: 'Board', ja: 'ボード', zh: '棋盘', zhTW: '棋盤' },
    hbBannerSub: { ko: '속성 효과로 무력을 가감해 레인을 장악', en: 'Sway might with traits to dominate the lanes', ja: '属性効果で武力を増減しレーンを制圧', zh: '以属性效果增减武力，掌控车道', zhTW: '以屬性效果增減武力，掌控車道' },
    hbTotalLabel: { ko: '총 무력', en: 'Total Might', ja: '総武力', zh: '总武力', zhTW: '總武力' },
    hbDeckCountLabel: { ko: '매수', en: 'Cards', ja: '枚数', zh: '张数', zhTW: '張數' },
    hbDeckGuide: { ko: '카드 풀에서 15장을 골라 덱을 만들고 판 크기를 정한 뒤 시작하세요. 카드를 탭하여 추가/제거합니다.<br><small style="color:var(--ink-dim);">카드 우하단 격자(<span style="color:#f0c33c;">■</span>=카드 위치, <span style="color:#7bd88f;">■</span>=강화되는 영역)는 강화 패턴입니다.</small>', en: 'Pick 15 cards from the pool, set the board size, then start. Tap a card to add/remove.<br><small style="color:var(--ink-dim);">The grid at a card\'s lower-right (<span style="color:#f0c33c;">■</span>=card position, <span style="color:#7bd88f;">■</span>=enhanced cells) is its enhancement pattern.</small>', ja: 'カードプールから15枚を選んでデッキを作り、盤面サイズを決めて開始。カードをタップで追加/削除します。<br><small style="color:var(--ink-dim);">カード右下の格子（<span style="color:#f0c33c;">■</span>=カード位置、<span style="color:#7bd88f;">■</span>=強化されるマス）は強化パターンです。</small>', zh: '从卡池中选择15张组成卡组，设定棋盘大小后开始。点击卡牌进行添加/移除。<br><small style="color:var(--ink-dim);">卡牌右下角的格子（<span style="color:#f0c33c;">■</span>=卡牌位置，<span style="color:#7bd88f;">■</span>=被强化的格子）即强化模式。</small>', zhTW: '從卡池中選擇15張組成牌組，設定棋盤大小後開始。點擊卡牌進行新增/移除。<br><small style="color:var(--ink-dim);">卡牌右下角的格子（<span style="color:#f0c33c;">■</span>=卡牌位置，<span style="color:#7bd88f;">■</span>=被強化的格子）即強化模式。</small>' },
    hbRule1: { ko: '<b>목표</b> · 보드에 <b>배치한 모든 카드의 무력(파워) 총합</b>이 높은 쪽이 승리합니다. (위·아래 스트립의 숫자는 각 레인(세로줄)의 무력 합계입니다)', en: '<b>Goal</b> · The side with the higher <b>total might of all placed cards</b> wins. (Numbers on the top/bottom strips are each lane\'s might total.)', ja: '<b>目標</b> · ボードに<b>配置した全カードの武力（パワー）合計</b>が高い方が勝利。（上下ストリップの数字は各レーン（縦列）の武力合計）', zh: '<b>目标</b> · 棋盘上<b>所有已放置卡牌的武力（力量）总和</b>更高的一方获胜。（上下条带的数字是各车道（纵列）的武力合计）', zhTW: '<b>目標</b> · 棋盤上<b>所有已放置卡牌的武力（力量）總和</b>更高的一方獲勝。（上下條帶的數字是各車道（縱列）的武力合計）' },
    hbRule2: { ko: '<b>폰(♟️)</b> · 카드는 자신이 점령한 칸에, 그 칸의 <b>폰 레벨 이하의 등급(핍)</b>을 가진 카드만 놓을 수 있습니다. 예) 레벨 4 칸에는 등급 4 이하(1·2·3·4)의 카드 배치 가능. 당신은 <b>맨 아래 줄</b>을, 상대는 <b>맨 위 줄</b>을 1레벨로 시작합니다.', en: '<b>Pawn (♟️)</b> · A card can be placed only on a tile you control, and only if its <b>rank (pips) is ≤ the tile\'s pawn level</b>. E.g. a level-4 tile accepts rank 4 or lower (1·2·3·4). You start with the <b>bottom row</b>, the opponent the <b>top row</b>, at level 1.', ja: '<b>ポーン(♟️)</b> · カードは自分が占領したマスに、その<b>ポーンレベル以下の等級（ピップ）</b>のカードのみ配置可。例）レベル4マスには等級4以下（1・2・3・4）を配置可能。あなたは<b>最下段</b>、相手は<b>最上段</b>をレベル1で開始します。', zh: '<b>兵(♟️)</b> · 卡牌只能放在你占领的格子上，且其<b>等级（点数）须不超过该格的兵等级</b>。例）等级4的格子可放置等级4及以下（1·2·3·4）。你从<b>最底行</b>、对手从<b>最顶行</b>以1级开始。', zhTW: '<b>兵(♟️)</b> · 卡牌只能放在你佔領的格子上，且其<b>等級（點數）須不超過該格的兵等級</b>。例）等級4的格子可放置等級4及以下（1·2·3·4）。你從<b>最底行</b>、對手從<b>最頂行</b>以1級開始。' },
    hbRule3: { ko: '<b>카드 정보</b> · 보드에 놓인 카드를 <b>탭하면</b> 등급·무력·능력·강화 패턴을 팝업으로 봅니다(상대 카드도 가능).', en: '<b>Card info</b> · <b>Tap</b> a placed card to see its rank, might, ability, and enhancement pattern in a popup (opponent cards too).', ja: '<b>カード情報</b> · 配置済みカードを<b>タップ</b>すると等級・武力・能力・強化パターンをポップアップで確認（相手カードも可）。', zh: '<b>卡牌信息</b> · <b>点击</b>已放置的卡牌可在弹窗中查看等级·武力·能力·强化模式（对手卡牌亦可）。', zhTW: '<b>卡牌資訊</b> · <b>點擊</b>已放置的卡牌可在彈窗中查看等級·武力·能力·強化模式（對手卡牌亦可）。' },
    hbRule4: { ko: '<b>확장</b> · 카드를 놓으면 카드의 강화 패턴(테두리 표시)에 따라 빈 칸에 폰을 +1 부여하여 영역을 넓힙니다(최대 3). <b>상대가 점령한 빈 칸(카드 없음)은 빼앗아 내 폰 1로 만듭니다.</b> 단 <b>카드가 놓인 칸은 빼앗을 수 없습니다.</b>', en: '<b>Expand</b> · Placing a card grants +1 pawn to empty tiles per its enhancement pattern (border marks), expanding your area (up to 3). <b>Empty tiles the opponent controls (no card) are taken over to your pawn 1.</b> However, <b>tiles with a card on them cannot be taken.</b>', ja: '<b>拡張</b> · カードを置くと強化パターン（枠表示）に従い空きマスにポーン+1を付与し領域を拡大（最大3）。<b>相手が占領した空きマス（カードなし）は奪って自分のポーン1にします。</b>ただし<b>カードが置かれたマスは奪えません。</b>', zh: '<b>扩张</b> · 放置卡牌时按其强化模式（边框标记）为空格子+1兵，扩大领域（最多3）。<b>对手占领的空格子（无卡牌）会被夺取变为你的1兵。</b>但<b>已放置卡牌的格子无法夺取。</b>', zhTW: '<b>擴張</b> · 放置卡牌時按其強化模式（邊框標記）為空格子+1兵，擴大領域（最多3）。<b>對手佔領的空格子（無卡牌）會被奪取變為你的1兵。</b>但<b>已放置卡牌的格子無法奪取。</b>' },
    hbRule5: { ko: '<b>능력</b> · 일부 카드는 아군 파워 증가/적 파워 감소 등의 지속 효과를 가집니다.', en: '<b>Ability</b> · Some cards have passive effects such as raising allied power or lowering enemy power.', ja: '<b>能力</b> · 一部のカードは味方パワー増加/敵パワー減少などの持続効果を持ちます。', zh: '<b>能力</b> · 部分卡牌拥有提升我方力量/降低敌方力量等持续效果。', zhTW: '<b>能力</b> · 部分卡牌擁有提升我方力量/降低敵方力量等持續效果。' },
    hbRule6: { ko: '<b>종료</b> · <b>당신이 패스를 2번</b> 하면 종료 여부를 물어본 뒤, 확인하면 무력 총합으로 정산합니다. (놓을 카드가 없으면 자동으로 패스됩니다)', en: '<b>End</b> · After <b>you pass twice</b>, you\'re asked to end; confirming settles by total might. (You auto-pass if you have no placeable card.)', ja: '<b>終了</b> · <b>あなたが2回パス</b>すると終了確認の後、確定で武力合計を精算します。（置けるカードがなければ自動パス）', zh: '<b>结束</b> · 当<b>你过牌两次</b>后会询问是否结束，确认后按武力总和结算。（无可放置卡牌时自动过牌）', zhTW: '<b>結束</b> · 當<b>你過牌兩次</b>後會詢問是否結束，確認後按武力總和結算。（無可放置卡牌時自動過牌）' },

    /* 대장전 — 정적 화면 */
    djGearStatus: { ko: '장비 보유 현황', en: 'Gear Owned', ja: '装備の所持状況', zh: '装备持有情况', zhTW: '裝備持有情況' },
    djRelicStatus: { ko: '추가 능력 · 유물', en: 'Bonuses · Relics', ja: '追加能力 · 遺物', zh: '附加能力 · 遗物', zhTW: '附加能力 · 遺物' },
    'hh.campTitle': { ko: '캠프', en: 'Camp', ja: 'キャンプ', zh: '营地', zhTW: '營地' },
    'hh.campSub': { ko: '모닥불 곁에서 잠시 정비합니다 — 하나를 선택하세요', en: 'Rest a while by the campfire — choose one.', ja: '焚き火のそばで少し休みます — 一つ選んでください', zh: '在篝火旁稍作休整 — 请选择其一', zhTW: '在營火旁稍作休整 — 請選擇其一' },
    'hh.campHealT': { ko: 'HP · MP 회복', en: 'Restore HP · MP', ja: 'HP · MP 回復', zh: '恢复 HP · MP', zhTW: '恢復 HP · MP' },
    'hh.campHealS': { ko: '주공 HP·MP를 30% 회복', en: "Restore 30% of the Lord\'s HP·MP", ja: '主公のHP·MPを30%回復', zh: '恢复主公 HP·MP 的 30%', zhTW: '恢復主公 HP·MP 的 30%' },
    'hh.campTrainT': { ko: '장수 강화', en: 'Train Officer', ja: '武将強化', zh: '强化武将', zhTW: '強化武將' },
    'hh.campTrainS': { ko: '원하는 장수 공격력 +3', en: "Chosen officer\'s ATK +3", ja: '選んだ武将の攻撃力 +3', zh: '所选武将攻击力 +3', zhTW: '所選武將攻擊力 +3' },
    'hh.shopGreet': { ko: '"먼 길 오셨소. 다음 전투 전에 <b>보급</b>을 갖추시오."', en: '"You\'ve traveled far. Stock up on <b>supplies</b> before the next battle."', ja: '「遠路はるばるお越しか。次の戦の前に<b>補給</b>を整えなされ。」', zh: '"远道而来辛苦了。下场战斗前先备好<b>补给</b>吧。"', zhTW: '「遠道而來辛苦了。下場戰鬥前先備好<b>補給</b>吧。」' },
    'hh.tavernHearthT': { ko: '주막에 모여든 인재들', en: 'Talents Gathered at the Tavern', ja: '酒場に集った人材たち', zh: '聚集酒馆的人才', zhTW: '聚集酒館的人才' },
    'hh.tavernHearthS': { ko: '천하의 장수들이 잔을 기울이며 주공을 기다립니다. 마음에 드는 인재를 <b style="color:#ffd9a0">등용</b>하세요.', en: 'Officers from across the land raise their cups and await the Lord. <b style="color:#ffd9a0">Recruit</b> the talent you favor.', ja: '天下の武将たちが杯を傾けながら主公を待っています。気に入った人材を<b style="color:#ffd9a0">登用</b>しましょう。', zh: '天下武将们举杯畅饮，等候主公。<b style="color:#ffd9a0">招揽</b>你中意的人才吧。', zhTW: '天下武將們舉杯暢飲，等候主公。<b style="color:#ffd9a0">招攬</b>你中意的人才吧。' },
    'hh.newRunConfirmTitle': { ko: '⚠️ 새 모험을 시작할까요?', en: '⚠️ Start a new adventure?', ja: '⚠️ 新たな冒険を始めますか？', zh: '⚠️ 要开始新冒险吗？', zhTW: '⚠️ 要開始新冒險嗎？' },
    'hh.newRunConfirmYes': { ko: '새로 시작', en: 'Start New', ja: '新しく始める', zh: '重新开始', zhTW: '重新開始' },
    'hh.relicPickTitle': { ko: '적장 격파 — 유물 보상', en: 'Enemy Commander Defeated — Relic Reward', ja: '敵将撃破 — 遺物報酬', zh: '击破敌将 — 遗物奖励', zhTW: '擊破敵將 — 遺物獎勵' },
    'hh.heroPickTitle': { ko: '정예(중간보스) 격파 — 영웅 영입', en: 'Elite (Mid-boss) Defeated — Recruit a Hero', ja: '精鋭(中ボス)撃破 — 英雄勧誘', zh: '击破精锐(中间Boss) — 招募英雄', zhTW: '擊破精銳(中間Boss) — 招募英雄' },
    'hh.weaponPickTitle': { ko: '보물상자 개봉 — 무기/보패', en: 'Open Treasure Chest — Weapon/Treasure', ja: '宝箱開封 — 武器/宝貝', zh: '开启宝箱 — 武器/宝贝', zhTW: '開啟寶箱 — 武器/寶貝' },
    'hh.guideGoalH': { ko: '🎯 목표', en: '🎯 Goal', ja: '🎯 目標', zh: '🎯 目标', zhTW: '🎯 目標' },
    'hh.guideGoalP': { ko: '당신은 <b>주공(나)</b>입니다. <b>8개 역사 전역</b>(각 11회 출진, 5·10번째는 중간보스)을 차례로 평정해 <b>천하통일</b>을 이루세요. 마지막 적장 사마염을 격파하면 엔딩입니다.', en: 'You are the <b>Lord (you)</b>. Conquer <b>8 historical campaigns</b> in turn (11 sorties each; the 5th and 10th are mid-bosses) to <b>unify the realm</b>. Defeat the final enemy commander Sima Yan to reach the ending.', ja: 'あなたは<b>主公(あなた)</b>です。<b>8つの歴史戦役</b>(各11回の出陣、5・10回目は中ボス)を順に平定し、<b>天下統一</b>を成し遂げましょう。最後の敵将・司馬炎を撃破するとエンディングです。', zh: '你是<b>主公(我)</b>。依次平定<b>8场历史战役</b>(每场出阵11次，第5、10次为中间Boss)，达成<b>天下统一</b>。击破最后的敌将司马炎即迎来结局。', zhTW: '你是<b>主公(我)</b>。依次平定<b>8場歷史戰役</b>(每場出陣11次，第5、10次為中間Boss)，達成<b>天下統一</b>。擊破最後的敵將司馬炎即迎來結局。' },
    'hh.guideHpmpH': { ko: '👑 주공 HP · MP', en: '👑 Lord HP · MP', ja: '👑 主公 HP · MP', zh: '👑 主公 HP · MP', zhTW: '👑 主公 HP · MP' },
    'hh.guideHpmpL': { ko: '<li><b>HP</b> · 적은 주공의 HP를 공격합니다. HP가 0이 되면 패배. <b>모험 내내 유지</b>되며 승리 시 일부, 전역 평정 시 완전 회복됩니다.</li><li><b>MP</b> · 스킬 사용 자원. <b>전투 시작 시 10% 회복</b>되고 모험 내내 유지됩니다. 무기로 최대치를 늘릴 수 있습니다.</li>', en: '<li><b>HP</b> · Enemies attack the Lord\'s HP. You lose if HP reaches 0. It <b>persists throughout the adventure</b>, recovering partially on victory and fully when a campaign is cleared.</li><li><b>MP</b> · Resource for using skills. It <b>recovers 10% at the start of each battle</b> and persists throughout the adventure. Weapons can raise its maximum.</li>', ja: '<li><b>HP</b> · 敵は主公のHPを攻撃します。HPが0になると敗北。<b>冒険中ずっと維持</b>され、勝利時に一部、戦役平定時に完全回復します。</li><li><b>MP</b> · スキル使用の資源。<b>戦闘開始時に10%回復</b>し、冒険中ずっと維持されます。武器で最大値を増やせます。</li>', zh: '<li><b>HP</b> · 敌人攻击主公的 HP。HP 归零即失败。<b>整段冒险持续保留</b>，胜利时回复一部分，平定战役时完全回复。</li><li><b>MP</b> · 使用技能的资源。<b>每场战斗开始时回复 10%</b>，整段冒险持续保留。可用武器提升上限。</li>', zhTW: '<li><b>HP</b> · 敵人攻擊主公的 HP。HP 歸零即失敗。<b>整段冒險持續保留</b>，勝利時回復一部分，平定戰役時完全回復。</li><li><b>MP</b> · 使用技能的資源。<b>每場戰鬥開始時回復 10%</b>，整段冒險持續保留。可用武器提升上限。</li>' },
    'hh.guideCardH': { ko: '🎴 카드 전투', en: '🎴 Card Combat', ja: '🎴 カード戦闘', zh: '🎴 卡牌战斗', zhTW: '🎴 卡牌戰鬥' },
    'hh.guideCardL': { ko: '<li>하단은 <b>3구역</b> — 왼쪽 뽑을 더미 / 가운데 공격 덱(3장) / 오른쪽 사용한 더미.</li><li>가운데 카드를 <b>쓰면 공격</b>합니다. <b>턴 종료 시 남은 카드는 버려집니다</b>(주공 방어막은 방어막 스킬·철벽부 등으로 올립니다).</li><li>적은 다음 행동을 머리 위에 <b>예고</b>합니다. 뽑을 더미가 비면 사용한 더미를 섞어 보충합니다.</li>', en: '<li>The bottom has <b>3 zones</b> — draw pile (left) / attack deck of 3 cards (center) / discard pile (right).</li><li>Using a center card <b>attacks</b>. <b>Cards left at the end of the turn are discarded</b> (raise the Lord\'s shield with shield skills, the Iron Wall charm, etc.).</li><li>Enemies <b>telegraph</b> their next action above their head. When the draw pile is empty, the discard pile is shuffled back in.</li>', ja: '<li>下部は<b>3区域</b> — 左がドロー山 / 中央が攻撃デッキ(3枚) / 右が使用済みの山。</li><li>中央のカードを<b>使うと攻撃</b>します。<b>ターン終了時に残ったカードは捨てられます</b>(主公の防御膜は防御膜スキル・鉄壁符などで上げます)。</li><li>敵は次の行動を頭上に<b>予告</b>します。ドロー山が空になると使用済みの山を混ぜて補充します。</li>', zh: '<li>下方为<b>3区</b> — 左侧抽牌堆 / 中间攻击牌组(3张) / 右侧弃牌堆。</li><li><b>使用</b>中间的卡牌即可发起攻击。<b>回合结束时剩余卡牌将被弃置</b>(主公护盾通过护盾技能、铁壁符等提升)。</li><li>敌人会在头顶<b>预告</b>下一步行动。抽牌堆为空时，会洗入弃牌堆补充。</li>', zhTW: '<li>下方為<b>3區</b> — 左側抽牌堆 / 中間攻擊牌組(3張) / 右側棄牌堆。</li><li><b>使用</b>中間的卡牌即可發起攻擊。<b>回合結束時剩餘卡牌將被棄置</b>(主公護盾透過護盾技能、鐵壁符等提升)。</li><li>敵人會在頭頂<b>預告</b>下一步行動。抽牌堆為空時，會洗入棄牌堆補充。</li>' },
    'hh.guideActH': { ko: '⚔️ 행동', en: '⚔️ Actions', ja: '⚔️ 行動', zh: '⚔️ 行动', zhTW: '⚔️ 行動' },
    'hh.guideActL': { ko: '<li><b>기본 공격</b> · 적에게 공격력만큼 피해. <b>치명타</b>(기본 1%)가 터지면 2배! 적도 치명타를 냅니다.</li><li><b>스킬</b> · 강타·화공(광역)·연속·방어막·고무·<b>매혹</b>(적 1턴 행동 불가) 등. MP를 소모합니다.</li><li><b>회복 스킬</b> · 주공 HP를 회복합니다(MP 소모·회복 없음).</li>', en: '<li><b>Basic Attack</b> · Deals damage equal to ATK. A <b>critical</b> (1% base) doubles it! Enemies can crit too.</li><li><b>Skills</b> · Smash, Fire Attack (AoE), Combo, Shield, Inspire, <b>Charm</b> (enemy cannot act for 1 turn), and more. They consume MP.</li><li><b>Heal Skills</b> · Restore the Lord\'s HP (consume MP; do not restore it).</li>', ja: '<li><b>通常攻撃</b> · 敵に攻撃力分のダメージ。<b>会心の一撃</b>(基本1%)が出ると2倍！敵も会心を出します。</li><li><b>スキル</b> · 強打・火攻(範囲)・連続・防御膜・鼓舞・<b>魅了</b>(敵1ターン行動不能)など。MPを消費します。</li><li><b>回復スキル</b> · 主公のHPを回復します(MP消費・回復なし)。</li>', zh: '<li><b>普通攻击</b> · 对敌人造成等同攻击力的伤害。触发<b>暴击</b>(基础 1%)则翻倍！敌人也会暴击。</li><li><b>技能</b> · 强击、火攻(范围)、连击、护盾、鼓舞、<b>魅惑</b>(敌方 1 回合无法行动)等。消耗 MP。</li><li><b>回复技能</b> · 回复主公 HP(消耗 MP，不回复 MP)。</li>', zhTW: '<li><b>普通攻擊</b> · 對敵人造成等同攻擊力的傷害。觸發<b>暴擊</b>(基礎 1%)則翻倍！敵人也會暴擊。</li><li><b>技能</b> · 強擊、火攻(範圍)、連擊、護盾、鼓舞、<b>魅惑</b>(敵方 1 回合無法行動)等。消耗 MP。</li><li><b>回復技能</b> · 回復主公 HP(消耗 MP，不回復 MP)。</li>' },
    'hh.guideWpnH': { ko: '🗡️ 무기 · 장수', en: '🗡️ Weapons · Officers', ja: '🗡️ 武器 · 武将', zh: '🗡️ 武器 · 武将', zhTW: '🗡️ 武器 · 武將' },
    'hh.guideWpnL': { ko: '<li>장수 등급에 따라 무기 장착 수가 다릅니다 — <b>C 0 · R 1 · SR 2 · SSR 3</b>.</li><li>무기 효과: 공격력+, 2회 연속 공격, 독, <b>치명타 확률+</b>, <b>회피 확률+</b>(명마), 주공 HP·MP 증가.</li><li><b>회피</b>(적토마·적로·절영·조황비전)는 적의 공격을 일정 확률로 무효화합니다.</li><li>장수는 <b>중복 수집 불가</b>. 지도의 <b>👥 장수 / 🗡️ 장비</b> 버튼에서 확인·장착하세요.</li>', en: '<li>The number of weapon slots depends on officer rarity — <b>C 0 · R 1 · SR 2 · SSR 3</b>.</li><li>Weapon effects: +ATK, double consecutive attacks, poison, <b>+crit chance</b>, <b>+evasion chance</b> (famed steeds), +Lord HP·MP.</li><li><b>Evasion</b> (Red Hare, Dilu, Jueying, Zhaohuang Feidian) negates an enemy attack at a set chance.</li><li>Officers <b>cannot be collected as duplicates</b>. Check and equip them from the <b>👥 Officers / 🗡️ Gear</b> buttons on the map.</li>', ja: '<li>武将のレアリティによって武器の装着数が異なります — <b>C 0 · R 1 · SR 2 · SSR 3</b>。</li><li>武器効果:攻撃力+、2回連続攻撃、毒、<b>会心率+</b>、<b>回避率+</b>(名馬)、主公HP·MP増加。</li><li><b>回避</b>(赤兎馬・的盧・絶影・爪黄飛電)は敵の攻撃を一定確率で無効化します。</li><li>武将は<b>重複収集不可</b>。マップの<b>👥 武将 / 🗡️ 装備</b>ボタンで確認・装着しましょう。</li>', zh: '<li>武器装备数量取决于武将品级 — <b>C 0 · R 1 · SR 2 · SSR 3</b>。</li><li>武器效果:攻击力+、连续攻击 2 次、中毒、<b>暴击率+</b>、<b>闪避率+</b>(名马)、提升主公 HP·MP。</li><li><b>闪避</b>(赤兔马、的卢、绝影、爪黄飞电)有一定几率使敌方攻击无效。</li><li>武将<b>不可重复收集</b>。请在地图的<b>👥 武将 / 🗡️ 装备</b>按钮中查看与装备。</li>', zhTW: '<li>武器裝備數量取決於武將品級 — <b>C 0 · R 1 · SR 2 · SSR 3</b>。</li><li>武器效果:攻擊力+、連續攻擊 2 次、中毒、<b>暴擊率+</b>、<b>閃避率+</b>(名馬)、提升主公 HP·MP。</li><li><b>閃避</b>(赤兔馬、的盧、絕影、爪黃飛電)有一定機率使敵方攻擊無效。</li><li>武將<b>不可重複收集</b>。請在地圖的<b>👥 武將 / 🗡️ 裝備</b>按鈕中查看與裝備。</li>' },
    'hh.guideModeH': { ko: '🟢🟠🔴 모드 (노멀 → 하드 → 극악)', en: '🟢🟠🔴 Modes (Normal → Hard → Brutal)', ja: '🟢🟠🔴 モード (ノーマル → ハード → 極悪)', zh: '🟢🟠🔴 模式 (普通 → 困难 → 极难)', zhTW: '🟢🟠🔴 模式 (普通 → 困難 → 極難)' },
    'hh.guideModeL': { ko: '<li><b>노멀</b>로 시작 → 천하통일하면 <b>하드</b> 해금 → 클리어하면 <b>극악</b> 해금.</li><li><b>하드</b>: 적 HP 2배 · 적장 공격 +50%. <b>극악</b>: 적 HP 3배 · 적장 공격 +100% · 적장 치명타 10%.</li><li>상위 모드일수록 골드 보상이 늘어납니다.</li>', en: '<li>Start on <b>Normal</b> → unify the realm to unlock <b>Hard</b> → clear it to unlock <b>Brutal</b>.</li><li><b>Hard</b>: enemy HP ×2 · enemy commander ATK +50%. <b>Brutal</b>: enemy HP ×3 · enemy commander ATK +100% · enemy commander crit 10%.</li><li>Higher modes grant greater gold rewards.</li>', ja: '<li><b>ノーマル</b>で開始 → 天下統一すると<b>ハード</b>解放 → クリアすると<b>極悪</b>解放。</li><li><b>ハード</b>:敵HP2倍 · 敵将攻撃+50%。<b>極悪</b>:敵HP3倍 · 敵将攻撃+100% · 敵将会心10%。</li><li>上位モードほどゴールド報酬が増えます。</li>', zh: '<li>从<b>普通</b>开始 → 天下统一后解锁<b>困难</b> → 通关后解锁<b>极难</b>。</li><li><b>困难</b>:敌方 HP 2 倍 · 敌将攻击 +50%。<b>极难</b>:敌方 HP 3 倍 · 敌将攻击 +100% · 敌将暴击 10%。</li><li>模式越高，金币奖励越多。</li>', zhTW: '<li>從<b>普通</b>開始 → 天下統一後解鎖<b>困難</b> → 通關後解鎖<b>極難</b>。</li><li><b>困難</b>:敵方 HP 2 倍 · 敵將攻擊 +50%。<b>極難</b>:敵方 HP 3 倍 · 敵將攻擊 +100% · 敵將暴擊 10%。</li><li>模式越高，金幣獎勵越多。</li>' },
    'hh.guideGrowH': { ko: '💰 성장 · 보상', en: '💰 Growth · Rewards', ja: '💰 成長 · 報酬', zh: '💰 成长 · 奖励', zhTW: '💰 成長 · 獎勵' },
    'hh.guideGrowL': { ko: '<li>전투 보상으로 장수·유물을 얻고, <b>출진 5·10회</b> 뒤 보물상자(무기)를 엽니다.</li><li>출진 전 <b>저잣거리</b>에서 골드로 장수·무기·강화를 구매할 수 있습니다.</li><li><b>히어로즈 블러드</b>에서 이기면 그 점수만큼 골드를 추가로 받습니다(지면 차감).</li>', en: '<li>Earn officers and relics as battle rewards, and open a treasure chest (weapon) after the <b>5th and 10th sorties</b>.</li><li>Before a sortie you can buy officers, weapons, and upgrades with gold at the <b>marketplace</b>.</li><li>Win at <b>Heroes Blood</b> to gain extra gold equal to your score (lose and it is deducted).</li>', ja: '<li>戦闘報酬で武将・遺物を得て、<b>出陣5・10回</b>後に宝箱(武器)を開けます。</li><li>出陣前に<b>市場</b>でゴールドを使い武将・武器・強化を購入できます。</li><li><b>ヒーローズブラッド</b>で勝つとそのスコア分のゴールドを追加で得ます(負けると差し引き)。</li>', zh: '<li>通过战斗奖励获得武将与遗物，<b>出阵第 5、10 次</b>后开启宝箱(武器)。</li><li>出阵前可在<b>集市</b>用金币购买武将、武器与强化。</li><li>在<b>英雄之血</b>中获胜可额外获得等同分数的金币(落败则扣除)。</li>', zhTW: '<li>透過戰鬥獎勵獲得武將與遺物，<b>出陣第 5、10 次</b>後開啟寶箱(武器)。</li><li>出陣前可在<b>集市</b>用金幣購買武將、武器與強化。</li><li>在<b>英雄之血</b>中獲勝可額外獲得等同分數的金幣(落敗則扣除)。</li>' },
    'hh.guideClose': { ko: '확인', en: 'OK', ja: '確認', zh: '确认', zhTW: '確認' },
    'hh.rosterTitle': { ko: '수집한 장수', en: 'Collected Officers', ja: '収集した武将', zh: '已收集武将', zhTW: '已收集武將' },
    'hh.formationTitle': { ko: '출진 덱 편성', en: 'Sortie Deck Setup', ja: '出陣デッキ編成', zh: '出阵牌组编成', zhTW: '出陣牌組編成' },
    'hh.formationHint': { ko: '카드를 탭해 <b>출진 덱</b>에 넣고 빼세요 (최소 10장·최대 30장). <b>🗡 장비</b> 버튼으로 무기를 장착합니다.', en: 'Tap cards to add or remove them from the <b>sortie deck</b> (min 10, max 30). Equip weapons with the <b>🗡 Gear</b> button.', ja: 'カードをタップして<b>出陣デッキ</b>に入れたり外したりします (最小10枚・最大30枚)。<b>🗡 装備</b>ボタンで武器を装着します。', zh: '点击卡牌将其加入或移出<b>出阵牌组</b>(最少 10 张·最多 30 张)。用<b>🗡 装备</b>按钮装备武器。', zhTW: '點擊卡牌將其加入或移出<b>出陣牌組</b>(最少 10 張·最多 30 張)。用<b>🗡 裝備</b>按鈕裝備武器。' },
    'hh.creditsSkip': { ko: '⏸ 멈춤/재생', en: '⏸ Pause/Play', ja: '⏸ 停止/再生', zh: '⏸ 暂停/播放', zhTW: '⏸ 暫停/播放' },

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
