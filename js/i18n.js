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
    uiGearSub: { ko: '덱 장수들이 장착한 무기입니다', en: 'Weapons equipped by your deck officers', ja: 'デッキの武将が装備中の武器', zh: '卡组武将所装备的武器', zhTW: '牌組武將所裝備的武器' }
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
