# card-news-maker

이미지에 문구를 얹어 카드뉴스·밈을 만드는 웹 도구. 로그인 없이 브라우저에서 바로 쓰고,
업로드한 이미지는 서버로 전송되지 않는다. 밈 자막 프리셋·이모지 스티커·이미지 보정·실행 취소를 지원한다.

> **상태: 2차 고도화 진행 중 (2026-11-02).** 야구 탭·KBO 프록시·구단 엠블럼을 제거하고,
> 실행 취소/다시 실행·정렬 스냅 가이드·이미지 보정·밈 프리셋·이모지 스티커·키보드 단축키와
> 새 UI(도구 레일 + 속성 패널, 인디고/바이올렛 테마)를 추가했다. 1차 제출 시점(`c75185d`/`9c362ac`)
> 산출물은 git 이력에 그대로 남아 있다. 진행 상황은 항상 `작업내역_체크리스트.md`가 최신이다.

**배포 주소:** https://card-news-maker-beige.vercel.app/

## 문서 색인

| 파일 | 용도 |
|---|---|
| `작업내역_체크리스트.md` | **진행 상황·결정 기록·작업 로그.** AI 공용 인수인계 파일이자 단일 진실 공급원 |
| `PRD.md` | 개발요청서 45장. 기능 요구사항·화면 설계·데이터 구조(43·44장 야구/백엔드는 폐기, 45장이 2차 기능) |
| `CLAUDE.md` | AI가 폴더를 통째로 읽지 않도록 하는 토큰 절약 규칙 |
| `AGENTS.md` / `GEMINI.md` | Codex·Antigravity 프로젝트 진입 지침 |
| `docs/01_기획.md` | 구현된 아키텍처·기술 선택 요약 |
| `docs/05_배포.md` | Vercel 배포 구조·재검증 절차 |
| `docs/00_과제_요구사항_매핑.md` | 과제 자체 점검 20개 항목의 구현·증거 매핑 |
| `docs/검증안내서.md` | 평가자가 30초 안에 확인하는 검증 절차 |
| `docs/트러블슈팅.md` | 실제 결함과 근본 해결 기록 |
| `docs/AI_3줄.md` | AI에게 맡긴 일·사용자가 판단한 일·반려한 제안 |
| `docs/포트폴리오_추가용_소개글.md` | 포트폴리오용 프로젝트 소개문 |
| `docs/과제_제출_보고서.md` | 32장 제출 덱 원본(Marp Markdown) |
| `docs/과제_제출_보고서.pptx` / `.pdf` | 최종 제출 산출물 |
| `docs/evidence/` | 제출 보고서에 사용한 검증 캡처 15종 |
| `design/` | 화면 시안 원본(`*.dc.html`)과 아트보드 배치(`canvas.json`) |

`PRD.md`에서 자주 찾는 장:

| 찾는 내용 | 장 |
|---|---|
| 기능 요구사항 (F-01~) | 13장 |
| 화면 설계·UX | 19장 |
| 데이터 구조 (`CanvasProject`, `Layer`) | 21장 |
| 기술 스택 선정 근거 | 22장 |
| 저장·처리 원칙 | 24장 |

## 기술 스택

- **프론트엔드**: React + TypeScript + Konva.js + Vite — 정적 빌드
- **백엔드**: 없음 (야구 탭 제거로 서버리스 함수도 삭제)
- **저장**: localStorage

**이미지 편집은 전부 브라우저 안에서 끝나며 사용자 이미지는 서버로 가지 않는다.**

## 폴더 구조

```text
card-news-maker/
├── PRD.md                       # 개발요청서 45장
├── CLAUDE.md                    # AI 작업 규칙
├── AGENTS.md / GEMINI.md        # Codex / Antigravity 진입 지침
├── README.md
├── 작업내역_체크리스트.md         # 진행 상황·결정 기록
├── docs/                        # 기획·배포·검증·제출 보고서·증거 자료·`07_레퍼런스_분석.md`
├── design/                      # 화면 시안 4장 + canvas.json (구현 완료 후 참고용, 코드는 이미 별도)
├── index.html
├── vite.config.ts
├── tsconfig*.json                # app / node 두 프로젝트로 분리
└── src/
    ├── main.tsx
    ├── App.tsx                  # 편집기 셸 (상단바·도구 레일·밈/템플릿/레이어 서랍·속성 패널·단축키)
    ├── index.css                # 2차 디자인 토큰(인디고 + 바이올렛→핑크 그라디언트)
    ├── components/canvas/       # CanvasStage(렌더링·스냅·줌), ImageLayerNode(보정·자르기), Rulers(눈금자)
    ├── components/editor/       # PropertiesPanel(공통 투명도·이미지 보정), TextStylePanel
    ├── components/layer/        # LayerPanel
    ├── components/template/     # TemplatePanel(내 템플릿), GalleryPanel(갤러리)(내 템플릿), GalleryPanel(갤러리)
    ├── components/shape/        # ShapePanel — 도형 추가
    ├── components/export/       # ExportDialog — 형식·품질·크기·워터마크
    ├── components/command/      # CommandPalette — Ctrl+K
    ├── components/help/         # ShortcutHelp — 단축키 도움말
    ├── components/meme/         # MemePanel — 자막 프리셋·이모지 스티커
    ├── features/export/         # exportImage — 워터마크·형식 변환, downloadCanvas
    ├── features/image/          # loadImageFile — F-01 형식·용량 검증
    ├── features/export/         # downloadCanvas — PNG/JPG 내보내기
    ├── features/template/       # templateStore — CRUD·JSON 가져오기/내보내기
    ├── features/history/        # useProjectHistory — 실행 취소/다시 실행(연속 변경 병합)
    ├── features/layer/          # groups — 그룹 정규화·멤버 조회
    ├── features/sticker/        # stickerStore — 내 스티커 저장
    ├── features/meme/           # memePresets — 자막 레이어 프리셋·이모지 스티커
    ├── types/                   # canvas.ts(21장)
    └── utils/                   # createProject.ts, textDefaults.ts
```

## 주요 편집 기능

| 기능 | 설명 |
|---|---|
| 실행 취소 / 다시 실행 | Ctrl+Z, Ctrl+Shift+Z(Ctrl+Y). 슬라이더 조작은 한 단계로 묶음 |
| 정렬 스냅 가이드 | 드래그 중 캔버스·다른 레이어의 가장자리/중앙에 자석처럼 붙고 분홍 점선 표시 |
| 이미지 보정 | 흑백·세피아·선명·어둡게·흐림 프리셋 + 밝기/대비/흐림 슬라이더 |
| 밈 프리셋 | 클래식 상·하단, 중앙 한 줄, 영화 자막, 말풍선, 속보 뉴스 |
| 이모지 스티커 | 24종, 크기·회전 가능 |
| 줌/패닝 | Ctrl+휠 또는 우하단 ± 버튼(25~400%), 확대 시 스크롤로 이동 |
| 텍스트 그림자 | 색·번짐·가로/세로 오프셋 |
| 템플릿 갤러리 | 카드뉴스·밈·공지·SNS 20종, 클릭하면 캔버스 교체(실행 취소 가능) |
| 레이어 정렬 | 레이어 목록에서 ⋮⋮ 손잡이를 끌어 순서 변경(마우스·터치, ▲▼ 버튼도 가능) |
| 이미지 자르기 | 비율 버튼(1:1·4:5·16:9·9:16·캔버스) + 확대 100~500% + 가로/세로 위치 슬라이더 |
| 직접 자르기 | 속성 패널에서 자르기 모드 → 이미지를 끌어 위치, 휠로 확대 |
| 글꼴 | 한글 웹폰트 12종(Noto Sans/Serif KR, 주아, 도현, 검은고딕 등) |
| 레이어 그룹 | 다중 선택 → 그룹 만들기. 이동·표시·잠금을 함께 적용 |
| 내 스티커 | 이미지를 올려 투명 PNG 스티커로 저장(브라우저 localStorage, 최대 24개) |
| 도형 | 사각형·둥근 사각형·원·별·삼각형·구분선, 채우기·테두리·모서리 조절 |
| 정렬 | 캔버스 기준 왼쪽/가운데/오른쪽/위/가운데/아래(그룹은 묶음 기준) |
| 혼합 모드 | 곱하기·스크린·오버레이·어둡게·밝게 |
| 이미지 보정 확장 | 채도·색조·필름 입자·모자이크, 누르는 동안 원본 비교 |
| 보정 프리셋 강도 | 프리셋(흑백·세피아·선명·빈티지 등) 선택 후 0~200% 강도 슬라이더 |
| 내보내기 | PNG·JPG·WebP, 품질, 50/100/200%, 글자 워터마크, 예상 용량·미리보기(Ctrl+E) |
| 눈금자·가이드 | Shift+R로 눈금자, 눈금자를 클릭하면 가이드선(스냅 대상, 내보내기에는 미포함) |
| 명령 팔레트 | Ctrl+K — 기능 이름으로 검색해 실행 |
| 단축키 도움말 | `?` 또는 Ctrl+/ |
| 단축키 | Ctrl+D 복제, Delete 삭제, 방향키 1px(Shift 10px) 이동, Esc 선택 해제 |

## 범위 밖

- **수익화 전부** (광고·결제·구독·프리미엄 잠금) — 과제 범위에서 영구 제외. `PRD.md` 40장은 기록용으로만 남긴다.
- 회원가입·로그인·클라우드 저장·협업 편집 — `PRD.md` 42장 "절대 먼저 만들지 말아야 할 기능"
- 동영상·GIF 편집, 고급 사진 보정, 템플릿 마켓 — `PRD.md` 11장 초기 제외 범위
