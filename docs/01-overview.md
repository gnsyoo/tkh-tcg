# 01 · 프로젝트 개요

## 목적

**삼국지 테마의 로그라이크 TCG 목업**입니다. 두 가지 게임 모드를 웹으로 프로토타이핑하여
구현 가능성과 게임성(재미·밸런스)을 빠르게 확인하는 것이 목표입니다.

> 최종 빌드는 Unity로 진행하되, 빠른 확인을 위해 먼저 웹으로 만들었습니다.
> 규칙 로직이 순수 함수에 가깝게 분리되어 있어 추후 C#로 옮기기 쉽습니다.

## 두 개의 게임

| 게임 | 장르 | 핵심 |
|------|------|------|
| **삼국 영웅전** (`heroes.html`) | 로그라이크 카드 전투 | 주공(나)의 HP/MP를 지키며 8개 역사 전역을 평정 |
| **히어로즈 블러드** (`queensblood.html`) | 보드 배치 카드 게임 | 3×5 보드에 카드를 놓아 무력 총합으로 승부 (FF7 리버스의 Queen's Blood 스타일) |

두 게임은 **골드로 연동**됩니다 — 자세한 내용은 [03-queensblood-game.md](03-queensblood-game.md#골드-연동)와
[02-heroes-game.md](02-heroes-game.md#히어로즈-블러드-골드-연동) 참고.

## 기술 스택 (추천 사유 포함)

**HTML + CSS + Vanilla JavaScript** — 프레임워크/빌드 도구/외부 라이브러리 0.

- **무설치·즉시 실행**: 파일을 브라우저로 열기만 하면 PC·모바일 어디서나 동작.
- **모바일 지원**: 반응형 레이아웃 + 탭(터치) 조작.
- **의존성 0 / 오프라인**: 외부 이미지 서버 없이 **이모지 + CSS 그라데이션 + 절차적 초상화**로 아트를 구성.
- **이식성**: 데이터(`*_data.js`)와 규칙 로직 분리.

## 화면 흐름

```
index.html (난이도 상/중/하 선택 + 게임 선택)
├─ heroes.html ── 시작 모달(이어하기/새 모험)
│   └─ 지도(맵) ⇄ 전투 ⇄ 보상/저잣거리 → … → 천하통일 → 엔딩 크레딧
└─ queensblood.html ── 덱 편집 → 대국 → 정산(골드 연동)
```

난이도는 첫 페이지에서 고르며 URL 파라미터(`?diff=`)와 `localStorage`(`tcg_difficulty`)로 전달됩니다.

## 폴더 구조 (요약)

```
index.html / heroes.html / queensblood.html
css/   common.css · home.css · heroes.css · queensblood.css
js/    util.js · heroes_data.js · heroes.js · qb_data.js · queensblood.js
dist/  play.html          (단일 파일 번들)
scripts/ build-single.js · balance.js
docs/  (이 문서들)
```

자세한 코드 구조는 [05-architecture.md](05-architecture.md) 참고.
