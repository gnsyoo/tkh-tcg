# 배포 · 버전 운영 규칙

이 프로젝트는 **GitHub Pages**로 배포되며, 배포 단위로 버전을 관리합니다.
브라우저 캐시 때문에 변경이 즉시 반영되지 않는 문제를 막기 위해, 배포할 때마다
버전을 올리고 모든 HTML의 에셋(css/js/이미지) 참조에 `?v=<버전>` 캐시버스터를 붙입니다.

## 버전 체계

- 형식: `MAJOR.MINOR` (예: `1.2`)
- **단일 소스:** [`version.json`](version.json) — 항상 *마지막으로 배포된* 버전을 가리킵니다.
- **배포마다 마이너(MINOR) 버전을 +1** 합니다. (예: `1.1` → `1.2` → `1.3` …)
- 메이저(MAJOR)는 큰 변경이 있을 때만 수동으로 올립니다(마이너는 0으로 리셋).

## 캐시버스터 동작 방식

`index.html`, `heroes.html`, `daejang.html`, `queensblood.html` 안의 로컬 에셋 참조는
빌드 시 다음과 같이 버전 쿼리스트링이 붙습니다.

```html
<link rel="stylesheet" href="css/heroes.css?v=1.2">
<script src="js/heroes.js?v=1.2"></script>
```

버전이 바뀌면 URL이 달라져 브라우저가 새 파일을 강제로 다시 받습니다.
(외부 URL·`data:`·앵커는 제외됩니다. 단일 빌드 파일 `dist/play.html`은 모든 에셋을
인라인하므로 쿼리스트링이 필요 없습니다.)

## 배포 절차

1. 코드 변경 작업 후 커밋.
2. 릴리스 스크립트 실행 — 마이너 버전 +1 · 에셋 스탬프 · 단일 빌드 재생성:
   ```bash
   node scripts/release.js
   ```
   - 메이저 올리기: `node scripts/release.js major`
   - 버전 직접 지정: `node scripts/release.js 3.4`
3. 변경된 파일 커밋: `version.json`, 각 `*.html`, `dist/play.html`.
   ```bash
   git add version.json *.html dist/play.html
   git commit -m "release vX.Y — <요약>"
   ```
4. `main`에 푸시 → GitHub Actions(`.github/workflows/pages.yml`)가 Pages로 자동 배포.
   ```bash
   git push origin main
   ```

> **규칙:** `main`으로의 배포 푸시 직전에는 반드시 `node scripts/release.js`를 실행해
> 마이너 버전을 올린다. (이 과정을 건너뛰면 캐시 때문에 변경이 사용자에게 보이지 않을 수 있다.)

## 배포 주소

https://gnsyoo.github.io/tkh-tcg/
