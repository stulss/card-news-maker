# card-news-maker

이미지에 문구를 얹어 카드뉴스·밈을 만드는 웹 도구. 로그인 없이 브라우저에서 바로 쓰고,
업로드한 이미지는 서버로 전송되지 않는다. KBO 경기 결과를 스코어보드 카드뉴스로 만드는 탭을 별도로 둔다.

> **상태: 카드 1~5(일반 카드뉴스) 완료 + Phase 4(야구 결과 카드) 완료.**
> 편집·미리보기·화면비 전환·템플릿 CRUD·JSON 이동·모바일 반응형·야구 결과 카드 자동 생성까지
> 전부 동작하며 브라우저로 실검증했다. 남은 것은 Phase 5(배포)뿐이다.
> 진행 상황은 항상 `작업내역_체크리스트.md`가 최신이다.

## 문서 색인

| 파일 | 용도 |
|---|---|
| `작업내역_체크리스트.md` | **진행 상황·결정 기록·작업 로그.** AI 공용 인수인계 파일이자 단일 진실 공급원 |
| `PRD.md` | 개발요청서 44장. 기능 요구사항·화면 설계·데이터 구조·야구 탭·백엔드 명세 |
| `CLAUDE.md` | AI가 폴더를 통째로 읽지 않도록 하는 토큰 절약 규칙 |
| `design/` | 화면 시안 원본(`*.dc.html`)과 아트보드 배치(`canvas.json`) |

`PRD.md`에서 자주 찾는 장:

| 찾는 내용 | 장 |
|---|---|
| 기능 요구사항 (F-01~) | 13장 |
| 화면 설계·UX | 19장 |
| 데이터 구조 (`CanvasProject`, `Layer`) | 21장 |
| 기술 스택 선정 근거 | 22장 |
| 저장·처리 원칙 | 24장 |
| 야구 결과 카드뉴스 탭 (F-30~F-33) | 43장 |
| 백엔드 구조·API 명세 | 44장 |

## 기술 스택

- **프론트엔드**: React + TypeScript + Konva.js + Vite — 정적 빌드
- **백엔드**: 서버리스 함수 **1개** (KBO 경기 결과 조회 프록시)
- **저장**: localStorage

백엔드가 필요한 이유는 야구 데이터 하나뿐이다. 브라우저에서 KBO 사이트를 직접 호출하면 CORS로 차단되고,
원본 응답 형식이 바뀌어도 프론트를 고치지 않도록 서버에서 정규화한다.
**이미지 편집은 전부 브라우저 안에서 끝나며 사용자 이미지는 이 경로를 거치지 않는다.**

## 폴더 구조

```text
card-news-maker/
├── PRD.md                       # 개발요청서 44장
├── CLAUDE.md                    # AI 작업 규칙
├── README.md
├── 작업내역_체크리스트.md         # 진행 상황·결정 기록
├── docs/00_과제_요구사항_매핑.md  # 과제 채점 20개 항목 매핑
├── design/                      # 화면 시안 4장 + canvas.json (구현 완료 후 참고용, 코드는 이미 별도)
├── api/                         # 서버리스 함수(Vercel) — KBO 경기 결과 프록시
│   ├── _kboClient.ts            #   크롤링·정규화 로직 (Vercel 함수·로컬 dev 미들웨어 공용)
│   └── kbo-schedule.ts          #   GET /api/kbo-schedule?date=YYYY-MM-DD
├── public/
│   └── logos/                   # 구단 엠블럼 10종 + SOURCES.md(출처·취득일)
├── index.html
├── vite.config.ts               # KBO 프록시용 로컬 dev 미들웨어 포함
├── tsconfig*.json                # app / node / api 세 프로젝트로 분리
└── src/
    ├── main.tsx
    ├── App.tsx                  # 편집기 화면 셸 (레이어/템플릿/야구 3탭)
    ├── index.css                # 시안 색 토큰을 옮긴 CSS 변수
    ├── components/canvas/       # CanvasStage(이미지·텍스트·도형 렌더링), ImageLayerNode
    ├── components/editor/       # TextStylePanel
    ├── components/layer/        # LayerPanel
    ├── components/template/     # TemplatePanel
    ├── components/baseball/     # BaseballTab — 날짜 조회·경기 목록·카드 생성
    ├── features/image/          # loadImageFile — F-01 형식·용량 검증
    ├── features/export/         # downloadCanvas — PNG/JPG 내보내기
    ├── features/template/       # templateStore — CRUD·JSON 가져오기/내보내기
    ├── features/baseball/       # teams, fetchKboSchedule, buildScoreboardLayers
    ├── types/                   # canvas.ts(21장), baseball.ts(43장)
    └── utils/                   # createProject.ts
```

## 두 개의 탭

| 탭 | 역할 |
|---|---|
| 일반 카드 (기본) | 사용자가 이미지를 업로드해 문구를 얹는다 |
| 야구 카드 | 날짜를 고르면 그날 경기 결과로 스코어보드 카드를 자동 생성한다 |

탭은 **이미지 소스만** 전환한다. 편집기·텍스트 스타일 패널·미리보기·다운로드는 두 탭이 공통으로 쓴다.

## 범위 밖

- **수익화 전부** (광고·결제·구독·프리미엄 잠금) — 과제 범위에서 영구 제외. `PRD.md` 40장은 기록용으로만 남긴다.
- 회원가입·로그인·클라우드 저장·협업 편집 — `PRD.md` 42장 "절대 먼저 만들지 말아야 할 기능"
- 동영상·GIF 편집, 고급 사진 보정, 템플릿 마켓 — `PRD.md` 11장 초기 제외 범위

## 저작권

구단 엠블럼은 KBO(한국야구위원회) 공식 홈페이지가 서빙하는 이미지를 그대로 받아
**비상업적 과제 용도로만** 사용한다. 원본을 변형하지 않으며, 출처와 취득일은
`public/logos/SOURCES.md`에 기록한다. 엠블럼의 권리는 각 구단 및 KBO에 있다.
상업적 이용으로 전환하려면 각 구단·KBO의 별도 허락이 필요하다.
