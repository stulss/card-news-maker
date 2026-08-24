# KBO 구단 엠블럼 출처

과제 제출용 **비상업적 이용**을 전제로, KBO(한국야구위원회) 공식 홈페이지가 자체 일정·구단정보
페이지(`Kbo/League/TeamInfo.aspx`)에서 직접 서빙하는 구단 엠블럼 이미지를 그대로 사용한다.

## 출처 선정에 대한 메모

`작업내역_체크리스트.md`의 기존 결정 기록은 "각 구단 공식 CI 페이지"에서 개별 수집하는 방향이었으나,
실제 조사 결과 KBO 리그 공식 사이트(`koreabaseball.com`)가 10개 구단 엠블럼을 동일한 CDN
경로(`KBO_IMAGE/emblem/regular/fixed/emblem_<코드>.png`)에서 통일된 포맷으로 제공하고 있음을 확인했다.
리그 공식 사이트 자체가 각 구단의 상위 기구이자 이 이미지들을 실제 서비스(일정표, 구단 정보 페이지)에
쓰고 있으므로, 10곳의 개별 구단 사이트를 각각 조사하는 대신 이 단일하고 검증 가능한 공식 출처를 썼다.

## 파일 목록

| 파일 | 구단 코드 | 구단명 | 원본 크기 | 출처 URL | 취득일 |
|---|---|---|---|---|---|
| `HH.png` | HH | 한화 이글스 | 64×41 | https://www.koreabaseball.com/Kbo/League/TeamInfo.aspx (이미지: `//6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_HH.png`) | 2026-08-24 |
| `HT.png` | HT | KIA 타이거즈 | 64×41 | 〃 `emblem_HT.png` | 2026-08-24 |
| `KT.png` | KT | kt wiz | 64×41 | 〃 `emblem_KT.png` | 2026-08-24 |
| `LG.png` | LG | LG 트윈스 | 64×41 | 〃 `emblem_LG.png` | 2026-08-24 |
| `LT.png` | LT | 롯데 자이언츠 | 64×41 | 〃 `emblem_LT.png` | 2026-08-24 |
| `NC.png` | NC | NC 다이노스 | 64×41 | 〃 `emblem_NC.png` | 2026-08-24 |
| `OB.png` | OB | 두산 베어스 | 64×41 | 〃 `emblem_OB.png` | 2026-08-24 |
| `SK.png` | SK | SSG 랜더스 | 64×41 | 〃 `emblem_SK.png` | 2026-08-24 |
| `SS.png` | SS | 삼성 라이온즈 | 64×41 | 〃 `emblem_SS.png` | 2026-08-24 |
| `WO.png` | WO | 키움 히어로즈 | 64×41 | 〃 `emblem_WO.png` | 2026-08-24 |

구단 코드는 KBO 공식 일정 API(`ws/Schedule.asmx/GetScheduleList`)가 응답에 포함하는 경기 ID
(`YYYYMMDD` + 원정팀코드 + 홈팀코드 + 경기번호, 예: `20260801HHKT0`)에서 그대로 가져온 KBO 공식 약어다.
과거 명칭을 쓰던 구단(SK→SSG, HT는 해태 시절 코드를 KIA가 승계, OB는 OB 베어스 시절 코드를 두산이 승계)도
KBO가 현재까지 이 코드를 그대로 쓰고 있어 별도 매핑 없이 재사용했다.

## 이용 제약

- 원본 파일을 변형·재도안·색상 변경하지 않고 그대로 보관한다.
- 엠블럼의 권리는 각 구단 및 KBO에 있으며, 본 도구는 **비상업적 과제 제출 용도**로만 이 이미지를 표시한다.
  (도움말/저작권 안내 화면에 동일한 문구를 노출한다 — `src/components/help/CopyrightNotice.tsx` 참고)
- **해상도 한계**: KBO 공식 사이트가 제공하는 최대 해상도가 64×41px이다. 스코어보드 카드(1080px)에서
  큰 배지로 확대하면 흐려질 수 있으므로, 렌더러에서는 폭 120px 이하로만 사용하고 팀 상징색 배경과
  함께 배치해 식별성을 보완한다. 더 높은 해상도가 필요해지면 각 구단 개별 CI 페이지를 다시 조사한다.
- 상업적 이용으로 전환할 경우 KBO 및 각 구단의 별도 허락이 필요하다. 로고 렌더링 코드는
  `src/features/baseball/scoreboardRenderer.ts` 한 곳에 모아, 필요시 팀 상징색만 쓰는 형태로
  되돌리기 쉽게 했다.
