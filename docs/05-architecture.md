# 05 · 코드 구조 · 저장 · 배포

## 파일 구조

```
index.html              첫 페이지(게임/난이도 선택)
heroes.html             삼국 영웅전
queensblood.html        히어로즈 블러드
css/
  common.css            공통 스타일/변수
  home.css              첫 페이지
  heroes.css            영웅전(전투/지도/주공바/무기UI/매혹/엔딩 크레딧 등)
  queensblood.css       히어로즈 블러드(보드/핸드/정산)
js/
  util.js               공통 헬퍼(TCG 네임스페이스)
  heroes_data.js        장수 58 · 무기 25 · 유물 · 적 · 적장 · 전역 · 난이도
  heroes.js             영웅전 엔진·UI (단일 IIFE)
  qb_data.js            히어로즈 블러드 카드 44 · 덱
  queensblood.js        히어로즈 블러드 엔진·UI (단일 IIFE)
  daejang.js            삼국 대장전(레이드) 엔진·UI — 영웅전 덱(hw_save) 공유
dist/
  play.html             단일 파일 번들(아래 빌드 참고)
scripts/
  build-single.js       모든 자원을 dist/play.html로 인라인
  balance.js            AI 자가대국/자동플레이 밸런싱
docs/                   이 문서들
.github/workflows/pages.yml  GitHub Pages 자동 배포
```

## 공통 유틸 — `TCG` (`js/util.js`)

- `getDifficulty()` / `diffLabel()` — URL `?diff=` 또는 `localStorage['tcg_difficulty']`.
- `portrait(emoji, seed, extraClass)` — **절차적 초상화**(시드 기반 색/메달리온, 외부 이미지 없음).
- `shuffle / pick / hue / delay / toast` — 공용 헬퍼.
- `sfx(name)` / `isMuted()` / `toggleMute()` / `audioResume()` — WebAudio 효과음(음소거 `localStorage['tcg_muted']`).

## 영웅전 런타임 상태 (`run`)

```js
run = {
  party: [ { uid, def, atk, weapons:[wid,...] }, ... ],  // 장수(=카드)
  gold, mainStage, subStage, relics:[], weapons:[wid,...],// weapons = 보유 무기 인벤토리
  sorties,            // 누적 출진 횟수(보물상자 5/10 트리거)
  lordHp,             // 주공 HP(모험 내내 유지)
  stageShopped, combat
}
run.combat = {
  main, sub, enemies:[{def,name,emoji,hp,maxHp,atk,block,poison,charmed,intent},...],
  round,
  lord: { hp, maxHp, mp, maxMp, block },   // 주공(전투 인스턴스)
  atkBuff,
  draw:[uid...], center:[uid...], used:[uid...],
  sel, targeting, pending, phase, log
}
```

핵심 헬퍼: `weaponSlots(h)`(`slotsForRarity`: C=0·R=1·SR=2·SSR=3), `heroWpns/wpnVal/hasWpnFlag`,
`critChance/rollCrit`(기본 1%+무기), `effAtk`, `defenseOf`, `lordMaxHp/lordMaxMp`, `skillMp`,
`ownedHeroIds`(중복 수집 방지), `freeWeaponIds`(미장착 무기), `applyBonusGold`.

## 공통: 플로팅 메뉴

각 게임 상단 바를 우측 상단 **플로팅 메뉴 버튼(`#fmToggle` → `#fmPanel`)**으로 통합했습니다.
`TCG.initFloatMenu()`(util.js)가 토글/바깥 클릭 닫기/링크 클릭 닫기를 처리합니다.
패널 안의 정보(골드·층·난이도 등)는 세로로 정렬되어 **줄바꿈 없이** 표시됩니다.

## 저장 포맷 (localStorage)

| 키 | 내용 |
|----|------|
| `tcg_difficulty` | 선택 난이도 |
| `tcg_muted` | 음소거 |
| `hw_save` | 영웅전 진행 저장(**v3**) |
| `hw_bonus_gold` | 히어로즈 블러드 → 영웅전 정산 골드(누적) |
| `qb_deck` / `qb_rows` | 히어로즈 블러드 사용자 덱(15장) / 판 크기(3·4) |
| `qb_winstreak` | 히어로즈 블러드 연승(3연승 시 제갈량 획득) |
| `hw_collected_heroes` / `hw_collected_weapons` | 컬렉션(도감) — 영구 수집 기록 |
| `hw_grant_heroes` | 다른 모드(QB 연승·대장전)에서 해금된 장수 대기열 → 영웅전이 영입 |
| `hw_raid_cleared` | 대장전에서 격파한 레이드 보스 키 목록 |

`hw_save`(v3) 필드: `party[{id,atk,uid,weapons[]}]`, `gold, mainStage, subStage, relics[], weapons[], sorties, lordHp, lordMp`.
QB는 `qb_deck`(덱)·`qb_rows`(판 크기)도 저장.
구버전 단일 무기(`weapon`) 저장은 로드시 배열로 자동 변환(SSR 슬롯 수로 잘림).

## 전투 FX 레이어

연출은 별도 `#fxLayer` div에 절대 위치로 렌더되어, `renderCombat()`의 `innerHTML` 재작성에도
**살아남습니다**. 좌표는 `getBoundingClientRect` 기준 상대 변환(`rectOf`).

## 단일 파일 번들 (`dist/play.html`)

```bash
node scripts/build-single.js   # heroes.html + css + js 를 하나로 인라인 → dist/play.html
```

오프라인/단일 파일 공유용. 빌드 후에는 소스 변경 시 **재빌드 필요**.

## 배포 (GitHub Pages)

- `.github/workflows/pages.yml`가 브랜치 푸시 시 자동 배포.
- 공개 주소: `https://gnsyoo.github.io/tcg-game-mockup/`.
- 필요 설정: 저장소 Pages Source = **GitHub Actions**.
