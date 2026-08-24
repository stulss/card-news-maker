// PRD.md 44장 — GET /api/kbo-schedule?date=YYYY-MM-DD
// Vercel 서버리스 함수 규칙(파일 경로 = 라우트, default export = 핸들러)을 그대로 따른다.
// `@vercel/node` 타입 의존성 없이 표준 Node http 타입만 쓴다 — VercelRequest/Response는
// IncomingMessage/ServerResponse의 상위 호환이라 이 시그니처로도 배포 시 그대로 동작한다.
// 같은 핸들러를 vite.config.ts의 로컬 dev 미들웨어에서도 재사용한다.

import type { IncomingMessage, ServerResponse } from "node:http";
import { cacheControlForDate, fetchKboScheduleForDate, KboDateFormatError, KboFetchError } from "./_kboClient";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "", "http://localhost");
  const date = url.searchParams.get("date") ?? "";

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const games = await fetchKboScheduleForDate(date);
    res.setHeader("Cache-Control", cacheControlForDate(date));
    res.statusCode = 200;
    res.end(JSON.stringify(games));
  } catch (error) {
    if (error instanceof KboDateFormatError) {
      res.statusCode = 400;
    } else if (error instanceof KboFetchError) {
      res.statusCode = 502;
    } else {
      res.statusCode = 500;
    }
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "알 수 없는 오류" }));
  }
}
