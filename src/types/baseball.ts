// PRD.md 43장 "데이터 구조" 그대로 이식.

export type CardSource = "general" | "baseball";

export interface KboGame {
  gameId: string;
  date: string; // YYYY-MM-DD
  stadium: string;
  status: "scheduled" | "final" | "canceled";
  home: KboTeamScore;
  away: KboTeamScore;
  cancelReason?: string;
}

export interface KboTeamScore {
  code: string; // 구단 코드
  name: string;
  score: number | null; // 미종료·취소 시 null
}
