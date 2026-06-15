# 06 · 검증 · 밸런싱

브라우저 없이(헤드리스) 두 게임을 끝까지 자동 플레이해 **크래시/회귀**를 잡고,
AI 자가대국으로 **밸런스**를 측정합니다.

## 1. 헤드리스 스모크 하니스 — `/tmp/harness.js`

- 작은 DOM 스텁을 만들고 `vm`으로 각 엔진 소스를 실행한 뒤,
  `innerHTML`을 정규식으로 읽어 합성 클릭 이벤트로 두 게임을 자동 진행합니다.
- 두 게임이 **예외 없이 끝까지** 도달하는지 확인(영웅모집은 천하통일 `#creditsModal` 또는 패배 `#overModal`).

```bash
node /tmp/harness.js
```

예시 출력:
```
=== Heroes Wanted ===
{"diff":"easy","battles":96,"result":"👑 천하통일!"}
{"diff":"normal","battles":95,"result":"💀 주공 전사"}
{"diff":"hard","battles":60,"result":"💀 주공 전사"}
```

## 2. 밸런싱 시뮬레이터 — `scripts/balance.js`

- **히어로즈 블러드**: 노출된 순수 함수(`window.__QB__`)로 AI vs AI 자가대국(수천 판) — 선공 이점·덱 승률.
- **영웅모집**: 스킬/무기/방어를 사용하는 자동 플레이 봇으로 난이도별 **클리어율·평균 도달층** 측정.

```bash
node scripts/balance.js
```

현재 기준치(50런/난이도, 준최적 봇):

```
난이도 easy    클리어율  ~92%   평균 도달층 ~95/8
난이도 normal  클리어율  ~62%   평균 도달층 ~93/8
난이도 hard    클리어율  ~10%   평균 도달층 ~80/8
```

> 봇은 사람보다 최적에 가깝게 플레이합니다. 즉 **하=충분히 클리어 가능 / 중=반반 / 상=도전적**.
> 밸런스는 전투 모델/장수 등급이 바뀔 때마다 다시 측정·튜닝합니다(난이도 배수 `HW_DIFF`).

## 3. 기능 테스트 — `/tmp/feat-test.js`

- 히어로즈 블러드 덱 빌더, 영웅모집 저장/이어하기 등에 대한 단정(assertion) 16건.

```bash
node /tmp/feat-test.js   # → "16 passed, 0 failed"
```

## 4. 커밋 전 체크리스트

```bash
node -c js/heroes.js && node -c js/heroes_data.js && node -c js/queensblood.js   # 구문
node /tmp/harness.js        # 크래시 없이 완주
node /tmp/feat-test.js      # 16 passed
node scripts/balance.js     # 난이도 그라데이션 확인
node scripts/build-single.js  # dist/play.html 재빌드
```

> 샌드박스에서 `*.github.io`/CDN 송신이 막혀 있어 시각(브라우저) 검증은 직접 불가합니다.
> 따라서 위 헤드리스 절차로 회귀를 잡고, 배포 성공은 GitHub Actions로 확인합니다.
