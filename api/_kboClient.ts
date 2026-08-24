// PRD.md 44장 백엔드 구조 — GET /api/kbo-schedule?date=YYYY-MM-DD 의 실제 크롤링·정규화 로직.
// api/kbo-schedule.ts(Vercel 서버리스 함수)와 vite.config.ts(로컬 dev 미들웨어)가 이 모듈을 함께 쓴다.
//
// 데이터 출처: KBO 공식 홈페이지가 자체 일정 화면(Schedule.aspx)에서 쓰는 비공개 웹서비스
// `POST https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList`.
// 2026-08-24에 실제 요청으로 확인한 파라미터·응답 구조를 기준으로 파싱한다. KBO가 화면을 개편하면
// 이 파일만 고치면 되도록(PRD 44장 "응답 정규화" 원칙), 프론트는 KboGame[] 계약만 본다.

import type { KboGame, KboTeamScore } from "../src/types/baseball";

const KBO_ENDPOINT = "https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList";
// leId=1(1군 정규시즌), srIdList=0,9,6(정규시즌 관련 시리즈 구분값) — 실제 요청으로 검증된 값.
const KBO_FIXED_PARAMS = "leId=1&srIdList=0%2C9%2C6";

// KBO가 경기 ID(YYYYMMDD+원정팀+홈팀+경기번호)에 쓰는 공식 2글자 코드.
// SK→SSG, HT→KIA(해태 승계), OB→두산(OB 베어스 승계)처럼 과거 코드를 그대로 쓰는 구단도 있다.
const TEAM_CODE_BY_NAME: Record<string, string> = {
  "LG": "LG",
  "두산": "OB",
  "한화": "HH",
  "KT": "KT",
  "SSG": "SK",
  "키움": "WO",
  "삼성": "SS",
  "롯데": "LT",
  "KIA": "HT",
  "NC": "NC",
};

interface ScheduleCell {
  Text: string;
  Class: string | null;
}
interface ScheduleRow {
  row: ScheduleCell[];
}
interface ScheduleResponse {
  rows: ScheduleRow[];
}

export class KboFetchError extends Error {}
export class KboDateFormatError extends Error {}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

// "08.01(토)" -> "2026-08-01"
function parseDayCellToIso(dayText: string, year: string): string | null {
  const m = dayText.match(/(\d{2})\.(\d{2})/);
  if (!m) return null;
  return `${year}-${m[1]}-${m[2]}`;
}

function parsePlayCell(playHtml: string): { awayName: string; homeName: string; away: number | null; home: number | null } | null {
  const spans = [...playHtml.matchAll(/<span(?: class="([^"]*)")?>([^<]*)<\/span>/g)];
  // 팀명 2개(첫/마지막) + 점수 span 0개 또는 2개("vs" span은 값이 "vs"라서 걸러낸다)
  const nonVsSpans = spans.filter((s) => s[2] !== "vs");
  if (nonVsSpans.length !== 2 && nonVsSpans.length !== 4) return null;

  if (nonVsSpans.length === 2) {
    // 미시작 경기: <span>away</span> ... <span>home</span>
    return { awayName: nonVsSpans[0][2], homeName: nonVsSpans[1][2], away: null, home: null };
  }
  // 종료 경기: <span>away</span><span class="lose/win/same">n</span> ... <span class="...">n</span><span>home</span>
  const [awaySpan, awayScoreSpan, homeScoreSpan, homeSpan] = nonVsSpans;
  const awayScore = Number.parseInt(awayScoreSpan[2], 10);
  const homeScore = Number.parseInt(homeScoreSpan[2], 10);
  if (!Number.isFinite(awayScore) || !Number.isFinite(homeScore)) return null;
  return { awayName: awaySpan[2], homeName: homeSpan[2], away: awayScore, home: homeScore };
}

function buildTeamScore(name: string, score: number | null): KboTeamScore {
  return { code: TEAM_CODE_BY_NAME[name] ?? name, name, score };
}

/** KBO 응답 한 달치를 파싱해 요청한 날짜의 경기만 KboGame[]으로 정규화한다. */
function normalizeMonth(data: ScheduleResponse, targetDate: string, year: string): KboGame[] {
  const games: KboGame[] = [];
  let currentDate: string | null = null;
  let gameSeq = 0;
  let lastDateForSeq: string | null = null;

  for (const row of data.rows) {
    const cells = row.row;
    if (cells.length === 0) continue;

    const dayCell = cells.find((c) => c.Class === "day");
    if (dayCell) {
      currentDate = parseDayCellToIso(dayCell.Text, year);
    }
    if (!currentDate || currentDate !== targetDate) continue;

    const playCell = cells.find((c) => c.Class === "play");
    if (!playCell) continue;
    const parsed = parsePlayCell(playCell.Text);
    if (!parsed) continue;

    // stadium·취소사유는 항상 각 행의 마지막 두 칸(day 칸 유무와 무관하게 끝에서부터 고정 위치)
    const stadium = stripTags(cells[cells.length - 2]?.Text ?? "").trim();
    const cancelText = stripTags(cells[cells.length - 1]?.Text ?? "").trim();
    const isCanceled = cancelText !== "" && cancelText !== "-";

    gameSeq = currentDate === lastDateForSeq ? gameSeq + 1 : 0;
    lastDateForSeq = currentDate;

    const awayCode = TEAM_CODE_BY_NAME[parsed.awayName] ?? parsed.awayName;
    const homeCode = TEAM_CODE_BY_NAME[parsed.homeName] ?? parsed.homeName;
    const gameId = `${currentDate.replace(/-/g, "")}${awayCode}${homeCode}${gameSeq}`;

    const status: KboGame["status"] = isCanceled ? "canceled" : parsed.away === null ? "scheduled" : "final";

    games.push({
      gameId,
      date: currentDate,
      stadium,
      status,
      away: buildTeamScore(parsed.awayName, isCanceled ? null : parsed.away),
      home: buildTeamScore(parsed.homeName, isCanceled ? null : parsed.home),
      ...(isCanceled ? { cancelReason: cancelText } : {}),
    });
  }

  return games;
}

/**
 * date(YYYY-MM-DD)의 KBO 경기 목록을 가져온다.
 * @throws KboDateFormatError 날짜 형식이 잘못된 경우 (호출측에서 400으로 매핑)
 * @throws KboFetchError 외부 조회 실패 또는 응답 형식이 예상과 다른 경우 (호출측에서 502로 매핑)
 */
export async function fetchKboScheduleForDate(date: string): Promise<KboGame[]> {
  const m = date.match(DATE_RE);
  if (!m) throw new KboDateFormatError(`날짜 형식이 올바르지 않습니다: ${date}`);
  const [, year, month] = m;

  let res: Response;
  try {
    res = await fetch(KBO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.koreabaseball.com/Schedule/Schedule.aspx",
        "User-Agent": "Mozilla/5.0 (compatible; card-news-maker/1.0)",
      },
      body: `${KBO_FIXED_PARAMS}&seasonId=${year}&gameMonth=${month}&teamId=`,
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    throw new KboFetchError(`KBO 일정 조회에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!res.ok) throw new KboFetchError(`KBO 서버 응답 오류: ${res.status}`);

  let data: ScheduleResponse;
  try {
    data = (await res.json()) as ScheduleResponse;
    if (!Array.isArray(data.rows)) throw new Error("rows 필드가 배열이 아닙니다.");
  } catch (error) {
    throw new KboFetchError(`KBO 응답 형식이 예상과 다릅니다: ${error instanceof Error ? error.message : String(error)}`);
  }

  return normalizeMonth(data, date, year);
}

/** 응답 Cache-Control 값을 정한다 — 과거 날짜는 길게, 오늘·미래는 짧게 (PRD 44장 캐싱 정책). */
export function cacheControlForDate(date: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return date < today ? "public, max-age=86400, s-maxage=86400" : "public, max-age=600, s-maxage=600";
}
