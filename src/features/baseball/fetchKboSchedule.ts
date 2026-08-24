// PRD.md 43장 F-31 경기 목록 조회 — 백엔드 프록시(api/kbo-schedule.ts) 호출.

import type { KboGame } from "../../types/baseball";

export class KboScheduleRequestError extends Error {}

export async function fetchKboSchedule(date: string): Promise<KboGame[]> {
  let res: Response;
  try {
    res = await fetch(`/api/kbo-schedule?date=${encodeURIComponent(date)}`);
  } catch {
    throw new KboScheduleRequestError("네트워크 오류로 경기 일정을 불러오지 못했습니다.");
  }

  if (res.status === 400) {
    throw new KboScheduleRequestError("날짜 형식이 올바르지 않습니다.");
  }
  if (!res.ok) {
    throw new KboScheduleRequestError("경기 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return (await res.json()) as KboGame[];
}
