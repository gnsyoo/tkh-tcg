# 배포 · 버전 운영 규칙

이 프로젝트는 **GitHub Pages**로 배포되며, 배포 단위로 버전을 관리합니다.
브라우저 캐시 때문에 변경이 즉시 반영되지 않는 문제를 막기 위해, 배포할 때마다
버전을 올리고 모든 HTML의 에셋(css/js/이미지) 참조에 `?v=<버전>` 캐시버스터를 붙입니다.

## 버전 체계 (3자리: MAJOR.MIDDLE.MINOR)

- 형식: `MAJOR.MIDDLE.MINOR` (예: `1.3.1`)
- **단일 소스:** [`version.json`](version.json) — 항상 *마지막으로 배포된* 버전을 가리킵니다.
- **MINOR(마이너):** 배포마다 +1 합니다. (예: `1.3.0` → `1.3.1` → `1.3.2` …)
- **MIDDLE(미들):** 다음 두 경우에 +1 하고, 이때 **MINOR는 0으로 초기화**합니다.
  - 큰 변경 건이 있을 때 (수동: `node scripts/release.js middle`)
  - MINOR가 많이 올라갔을 때 — **20에 도달하면 자동으로** MIDDLE +1, MINOR 0
    (예: `1.3.19` → 다음 배포 → `1.4.0`)
- **MAJOR(메이저):** 대규모 변경 시에만 수동으로 +1 하고, **MIDDLE·MINOR를 0으로 초기화**합니다.
  (수동: `node scripts/release.js major`)

## 캐시버스터 동작 방식

`index.html`, `heroes.html`, `daejang.html`, `queensblood.html` 안의 로컬 에셋 참조는
빌드 시 다음과 같이 버전 쿼리스트링이 붙습니다.

```html
<link rel="stylesheet" href="css/heroes.css?v=1.3.1">
<script src="js/heroes.js?v=1.3.1"></script>
```

버전이 바뀌면 URL이 달라져 브라우저가 새 파일을 강제로 다시 받습니다.
(외부 URL·`data:`·앵커는 제외됩니다. 단일 빌드 파일 `dist/play.html`은 모든 에셋을
인라인하므로 쿼리스트링이 필요 없습니다.)

## 첫 화면 변경 내역 (필수)

**배포할 때마다 첫 화면(`index.html`)의 변경 내역(📜)을 갱신합니다.**

- `node scripts/release.js`가 첫 화면의 **버전 뱃지(`verBadge`)** 와 **변경 내역 헤더 버전**을
  새 버전·날짜로 자동 갱신합니다.
- **변경 항목(내용)은 사람이 직접 추가**합니다 — `index.html`의 `#changelogModal` 안
  해당 날짜 `<ul>` 상단에 이번 버전의 변경 요약 `<li>`를 추가하세요.
  (세부 항목은 `docs/07-changelog.md`에도 함께 정리)

## 배포 절차

1. 코드 변경 작업 후 커밋.
2. **첫 화면 변경 내역 추가** — `index.html` 변경 내역에 이번 버전 변경 요약 `<li>`를 작성.
3. 릴리스 스크립트 실행 — 버전 +1 · 에셋 스탬프 · 버전 뱃지/헤더 갱신 · 단일 빌드 재생성:
   ```bash
   node scripts/release.js           # 마이너 +1 (기본)
   node scripts/release.js middle    # 큰 변경 — 미들 +1, 마이너 0
   node scripts/release.js major     # 메이저 +1, 미들·마이너 0
   node scripts/release.js 3.1.0     # 버전 직접 지정
   ```
4. 변경된 파일 커밋: `version.json`, 각 `*.html`, `dist/play.html`.
   ```bash
   git add version.json *.html dist/play.html
   git commit -m "release vX.Y.Z — <요약>"
   ```
5. `main`에 푸시 → GitHub Actions(`.github/workflows/pages.yml`)가 Pages로 자동 배포.
   ```bash
   git push origin main
   ```

> **규칙 요약**
> 1. `main`으로의 배포 푸시 직전에는 반드시 `node scripts/release.js`(또는 `middle`/`major`)를 실행해 버전을 올린다. (건너뛰면 캐시 때문에 변경이 사용자에게 보이지 않을 수 있다.)
> 2. 매 배포마다 첫 화면 변경 내역에 이번 버전 변경 항목을 추가한다.
> 3. MINOR가 20에 도달하면 자동으로 MIDDLE로 올림된다. 큰 변경은 `middle`로 직접 올린다.

## 데이터 정합성 규칙 (영웅전 · 대장전 동시 적용)

장수·장비·유물 등 **공유 데이터를 추가/변경하면 영웅전과 대장전에 함께 반영**해
두 게임의 정합성을 유지합니다.

- **단일 소스:** 장수/장비/유물 데이터는 [`js/heroes_data.js`](js/heroes_data.js)
  (`HW_HEROES` · `HW_WEAPONS` · `HW_RELICS` …)에만 정의하고, 영웅전(`js/heroes.js`)과
  대장전(`js/daejang.js`)이 **이 데이터를 공유**합니다. 한쪽에 따로 정의하지 않습니다.
- **수집 기록 공유:** `hw_collected_heroes` · `hw_collected_weapons` · `hw_collected_relics`
  (localStorage)를 두 게임이 공유합니다 — 도감 탭(장수/장비/유물)도 양쪽에 동일하게 둡니다.
- **효과 배선:** 새 유물/장비 효과를 추가하면, **두 전투 엔진(`heroes.js`·`daejang.js`)에
  모두 배선**합니다. 공유 효과 훅 예시 — `lordMaxHp()` / `lordMaxMp()`(maxHp·maxMp),
  `critChance()`(crit), 전투 시작(startAtk·startBlock·startPoison), 기본 공격(lifesteal),
  골드 보상(goldBonus). *전투 승리 후 지속 효과(winHeal·winMp)처럼 모드 구조상 적용되지
  않는 경우는 예외*로 두되, 데이터·도감에는 양쪽 모두 노출합니다.
- **체크리스트:** 새 장수/장비/유물 추가 시 — ① `heroes_data.js`에 정의 ② 효과를
  `heroes.js`·`daejang.js` 양쪽에 배선 ③ 도감(장수/장비/유물 탭)에서 양쪽 노출 확인
  ④ 보상/획득 경로(전투 보상·보물 이벤트·연승 보상 등) 연결.

## 배포 주소

https://gnsyoo.github.io/tkh-tcg/
