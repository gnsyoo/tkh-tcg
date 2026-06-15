# 📚 삼국지 카드 게임 — 문서

이 폴더는 프로젝트에 **현재까지 구현된 모든 기능**을 상세히 정리한 문서 모음입니다.
주제별로 파일을 분리했습니다.

| 파일 | 내용 |
|------|------|
| [01-overview.md](01-overview.md) | 프로젝트 개요 · 목표 · 기술 스택 · 화면 흐름 |
| [02-heroes-game.md](02-heroes-game.md) | **삼국지 영웅모집** — 주공/MP/무기/매혹/스테이지/보상/엔딩 등 전체 규칙 |
| [03-queensblood-game.md](03-queensblood-game.md) | **히어로즈 블러드** — 보드/폰/정산/패스/골드 연동/덱빌더/AI |
| [04-data-reference.md](04-data-reference.md) | 데이터 레퍼런스 — 장수 50종, 무기, 유물, 적, 적장, 전역, 난이도 표 |
| [05-architecture.md](05-architecture.md) | 코드 구조 · 저장 포맷 · 공용 유틸 · FX · 번들 · 배포 |
| [06-testing-balance.md](06-testing-balance.md) | 헤드리스 검증 하니스 · 밸런싱 시뮬레이터 · 기능 테스트 |
| [07-changelog.md](07-changelog.md) | 구현 변경 이력(주요 마일스톤) |

> 게임 자체의 빠른 소개는 저장소 루트의 [`README.md`](../README.md)를 참고하세요.

## 한눈 요약

- **두 개의 게임**: 로그라이크 카드 전투 **삼국지 영웅모집**과 보드 배치 카드 게임 **히어로즈 블러드**.
- **순수 웹**: HTML + CSS + Vanilla JS, 빌드/의존성 0, 오프라인 동작, 모바일 지원.
- **두 게임의 연동**: 히어로즈 블러드 결과(승/패 포인트)가 영웅모집의 골드로 정산됩니다.
- **검증**: 브라우저 없이 두 게임을 끝까지 자동 플레이하는 헤드리스 하니스와 AI 자가대국 밸런싱 스크립트로 회귀를 잡습니다.
- **배포**: GitHub Pages (`gnsyoo.github.io/tcg-game-mockup/`).
