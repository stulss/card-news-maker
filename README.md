# 카드툰 (card-news-maker)

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
| `docs/11_상용화_체크리스트.md` | 상용화 준비 상태·운영자가 직접 할 일·CSP/PWA/테스트 상세 |
| `CHANGELOG.md` | 버전별 변경 이력 |
| `docs/10_AI_배경제거와_고급편집.md` | AI 배경 제거·이력 패널·이미지 오리기·스티커 팩 |
| `docs/09_디자인_가이드.md` | 디자인 시스템·그래픽 도구·구현 메모 |
| `docs/08_인스타그램_사용가이드.md` | 인스타 규격·작업 순서·업로드 방법·한계 |
| `PRD.md` | 개발요청서 52장(48-1·48-2 포함). 기능 요구사항·화면 설계·데이터 구조(43·44장 야구/백엔드는 폐기, 45장이 2차 기능) |
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
├── PRD.md                       # 개발요청서 52장
├── CLAUDE.md                    # AI 작업 규칙
├── AGENTS.md / GEMINI.md        # Codex / Antigravity 진입 지침
├── README.md
├── CHANGELOG.md                 # 버전별 변경 이력 (현재 v1.1.0)
├── 작업내역_체크리스트.md         # 진행 상황·결정 기록
├── docs/                        # 기획·배포·검증·제출 보고서·증거 자료·`07_레퍼런스_분석.md`·`11_상용화_체크리스트.md`
├── design/                      # 화면 시안 4장 + canvas.json (구현 완료 후 참고용, 코드는 이미 별도)
├── public/                      # favicon·PWA(manifest·sw.js·아이콘)·robots.txt·legal/(개인정보·약관·라이선스 고지)
├── scripts/                     # generate-notices(라이선스 게이트)·serve-dist(운영 헤더 로컬 서빙)·make-icons
├── e2e/                         # Playwright 스모크 테스트(운영 빌드 + CSP)
├── .github/workflows/ci.yml     # CI: lint·tsc·라이선스·단위·감사·빌드·e2e
├── vercel.json                  # 보안 헤더(CSP 등)
├── index.html
├── vite.config.ts / vitest.config.mjs / playwright.config.ts
├── tsconfig*.json                # app / node 두 프로젝트로 분리
└── src/
    ├── __tests__/               # Vitest 단위 테스트
    ├── fonts.ts                 # 자체 호스팅 글꼴(@fontsource) 불러오기
    ├── main.tsx
    ├── App.tsx                  # 편집기 셸 (상단바·도구 레일·밈/템플릿/레이어 서랍·속성 패널·단축키)
    ├── index.css                # 2차 디자인 토큰(인디고 + 바이올렛→핑크 그라디언트)
    ├── components/canvas/       # CanvasStage(렌더링·스냅·줌), ImageLayerNode(보정·자르기), Rulers(눈금자)
    ├── components/editor/       # PropertiesPanel(공통 투명도·이미지 보정), TextStylePanel
    ├── components/layer/        # LayerPanel
    ├── components/template/     # TemplatePanel(내 템플릿), GalleryPanel(갤러리)
    ├── components/brand/        # BrandPanel — 브랜드 키트(색·글꼴)
    ├── components/elements/     # ElementsPanel — QR 코드·차트
    ├── components/about/        # AboutDialog — 메뉴·프로젝트 저장/열기·데이터 삭제·법적 고지
    ├── components/history/      # HistoryPanel — 작업 이력
    ├── components/size/         # SizeDialog — 캔버스 크기 프리셋·직접 입력
    ├── components/welcome/      # WelcomeCard — 빈 작업 시작 카드
    ├── components/text/         # TextPanel — 텍스트 스타일 프리셋
    ├── components/slides/       # SlideStrip — 슬라이드 목록
    ├── components/common/       # LayerThumb(공용 썸네일), ErrorBoundary(오류 복구), useModalFocus(포커스 가두기)
    ├── components/shape/        # ShapePanel — 도형 추가
    ├── components/export/       # ExportDialog — 형식·품질·크기·워터마크
    ├── components/command/      # CommandPalette — Ctrl+K
    ├── components/help/         # ShortcutHelp — 단축키 도움말
    ├── components/meme/         # MemePanel — 자막 프리셋·이모지 스티커
    ├── features/design/         # gradients·shapes·textPresets — 그래픽 도구 모듈
    ├── features/ai/             # removeBackground — 브라우저 내 AI 배경 제거
    ├── features/deck/           # Deck(슬라이드 묶음)·복제·크기 동기화
    ├── features/autosave/       # deckStore — IndexedDB 자동 저장·복원
    ├── features/export/         # exportImage(워터마크·페이지 번호), svgExport(벡터), zip, downloadCanvas
    ├── features/image/          # loadImageFile — F-01 형식·용량 검증
    ├── features/template/       # templateStore(CRUD·JSON 검증), galleryTemplates(갤러리 42종)
    ├── features/brand/          # brandStore(색·글꼴 저장·팔레트 추출), imagePalette(사진 색 뽑기·스포이드)
    ├── features/elements/       # qr(QR 생성), chart(차트 데이터 파싱·렌더)
    ├── features/project/        # projectFile — .cardnews.json 저장/열기·검증
    ├── features/privacy/        # clearData — 저장된 모든 데이터 지우기
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
| 브랜드 키트 | 색(12)·글꼴 저장 → 한 번에 적용, 사진에서 색 뽑기, 스포이드 (브라우저에만 저장) |
| 요소 | QR 코드(링크·계정), 차트(막대·가로 막대·도넛·원형) — 브라우저 안에서 그려 이미지로 추가 |
| 템플릿 갤러리 | 카드뉴스·밈·공지·SNS 42종(캐러셀 세트 3종 포함) |
| 이모지 스티커 | 24종, 크기·회전 가능 |
| 줌/패닝 | Ctrl+휠 또는 우하단 ± 버튼(25~400%), 확대 시 스크롤로 이동 |
| 텍스트 그림자 | 색·번짐·가로/세로 오프셋 |
| 템플릿 갤러리 | 카드뉴스·밈·공지·SNS 42종, 클릭하면 캔버스 교체(실행 취소 가능) |
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
| 보정 프리셋 강도 | 프리셋 18종(흑백·컬러·필름·푸드·풍경·인물 카테고리) 선택 후 0~200% 강도 슬라이더 |
| 내보내기 | PNG·JPG·WebP, 품질, 50/100/200%, 글자 워터마크, 예상 용량·미리보기(Ctrl+E) |
| 눈금자·가이드 | Shift+R로 눈금자, 눈금자를 클릭하면 가이드선(스냅 대상, 내보내기에는 미포함) |
| 명령 팔레트 | Ctrl+K — 기능 이름으로 검색해 실행 |
| 단축키 도움말 | `?` 또는 Ctrl+/ |
| 캐러셀(슬라이드) | 최대 10장, 캔버스 아래 슬라이드 목록(추가·복제·삭제·순서 변경), 5장·6장 세트 템플릿 |
| 인스타 내보내기 | 전체 장 ZIP(`01.jpg…`), 페이지 번호, JPG 92·1080px 원클릭, 캡션·해시태그 카운터, 모바일 공유 |
| 안전영역 가이드 | `IG` 버튼 — 스토리 UI 영역·프로필 그리드(3:4) 잘림 표시 |
| 자동 저장 | 작업 전체(사진 포함)를 브라우저에 자동 저장·복원 |
| 그라디언트·도형 | 배경·도형 그라디언트(프리셋 12종), 하트·말풍선·화살표·번개·북마크 벡터 도형 |
| 효과 | 모든 레이어 그림자, 이미지 모서리·테두리, 텍스트 스타일 프리셋(헤드라인·형광펜·배지 등) |
| 테마 | 다크/라이트 전환(☀/☾) |
| 스타일 복사 | 레이어 스타일 복사(⎘)·붙여넣기(⇩) |
| 효과 프리셋 | 그림자·네온 글로우 7종, 이미지 비네팅·시네마 프리셋, 혼합 모드 11종 |
| 구도 격자 | Shift+G — 3분할 / 12분할 격자 / 황금비 / 대각선(내보내기 제외) |
| 레이어 | 이름 더블클릭으로 바꾸기, 다중 선택 후 가로·세로 분포 |
| 로고 워터마크 | 내보내기에서 글자 또는 로고 이미지 워터마크 |
| 캔버스 크기 | ⤢ 버튼 — 인스타그램·유튜브·X·페이스북·핀터레스트 프리셋 + 직접 입력(100~4000px) |
| 사진 위 오버레이 | 도형 탭 — 하단·상단 어둡게, 전체 어둡게, 원형 비네팅(글자 가독성) |
| 작업 이력 | `기록` 탭 — 되돌리기 단계 목록, 클릭으로 점프 |
| 텍스트 그라디언트 | 글자 색을 그라디언트로(두 색·각도·원형·불투명도) |
| 이미지 모양 오리기 | 원형·별·삼각형·육각형·하트·말풍선 |
| 스티커 팩 | 배지·말풍선·강조·장식 22종(그룹) |
| 이미지 뒤집기 | 좌우·상하 |
| 텍스트 곡선 | 아치/스마일(-100~100) |
| SVG 내보내기 | 도형·글자·그라디언트·그림자·이미지 배치를 벡터로(전체는 ZIP) |
| 영역 효과 | AI 배경 흐리게(인물 모드), 스티커 외곽선, 하늘 제거(간이) |
| AI 배경 제거 | 사람 사진의 배경을 브라우저 안에서 지움(처음 한 번 모델 약 25MB 내려받기) |
| 시작 카드 | 빈 작업에서 크기·세트·갤러리로 바로 시작 |
| 단축키 | Ctrl+D 복제, Delete 삭제, 방향키 1px(Shift 10px) 이동, Esc 선택 해제 |

## 범위 밖

- **수익화 전부** (광고·결제·구독·프리미엄 잠금) — 과제 범위에서 영구 제외. `PRD.md` 40장은 기록용으로만 남긴다.
- 회원가입·로그인·클라우드 저장·협업 편집 — `PRD.md` 42장 "절대 먼저 만들지 말아야 할 기능"
- 동영상·GIF 편집, 고급 사진 보정, 템플릿 마켓 — `PRD.md` 11장 초기 제외 범위

## 서드파티

| 구성 | 라이선스 | 용도 |
|---|---|---|
| React, Konva, react-konva, use-image | MIT | 편집기·캔버스 |
| @huggingface/transformers (+ onnxruntime-web) | Apache-2.0 | AI 배경 제거 실행 |
| Xenova/modnet (MODNet 모델) | Apache-2.0 | AI 배경 제거 모델(처음 사용할 때 내려받음) |
| 한글 웹폰트 (`@fontsource/*`: IBM Plex Sans KR·Noto·고운바탕·주아·도현 등) | SIL OFL | 자체 호스팅(`src/fonts.ts`) — 외부 요청 없음 |
| Vitest, Playwright | MIT / Apache-2.0 | 개발·테스트 전용(배포물에 미포함) |

전체 목록은 앱 메뉴(☰) → 오픈소스 라이선스 고지(`public/legal/notices.html`, 빌드 때 자동 생성).

## 개발·검증 명령

| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run verify` | lint → tsc → 라이선스 검사 → 단위 테스트 → 빌드 → e2e (CI와 동일) |
| `npm test` / `npm run test:e2e` | Vitest / Playwright(운영 빌드 + CSP 헤더로 실행, 먼저 `npm run build`) |
| `node scripts/serve-dist.mjs 4173` | `dist/`를 `vercel.json` 헤더 그대로 로컬에서 서빙 |

운영 전 채울 것: `public/legal/*.html`의 `[대괄호]` 항목(운영자·문의처) — `docs/11_상용화_체크리스트.md` §2.
