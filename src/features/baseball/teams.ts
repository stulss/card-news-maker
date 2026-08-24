// PRD.md 43장 "구단 로고·엠블럼 정책" — 팀 상징색은 스코어보드 배경에 쓴다.
// 색상값은 널리 알려진 구단 대표색을 근사한 것으로, 공식 브랜드 가이드 원본 대조는 하지 않았다
// (엠블럼처럼 저작물을 그대로 복제하는 것이 아니라 배경색 참고용이라 근사치로 충분하다고 판단).

export interface KboTeamMeta {
  code: string;
  primaryColor: string;
  textColor: "#ffffff" | "#0a0a0a";
  logoSrc: string;
}

export const KBO_TEAMS: Record<string, KboTeamMeta> = {
  HH: { code: "HH", primaryColor: "#ff6600", textColor: "#0a0a0a", logoSrc: "/logos/HH.png" },
  HT: { code: "HT", primaryColor: "#ea0029", textColor: "#ffffff", logoSrc: "/logos/HT.png" },
  KT: { code: "KT", primaryColor: "#000000", textColor: "#ffffff", logoSrc: "/logos/KT.png" },
  LG: { code: "LG", primaryColor: "#c30452", textColor: "#ffffff", logoSrc: "/logos/LG.png" },
  LT: { code: "LT", primaryColor: "#041e42", textColor: "#ffffff", logoSrc: "/logos/LT.png" },
  NC: { code: "NC", primaryColor: "#315288", textColor: "#ffffff", logoSrc: "/logos/NC.png" },
  OB: { code: "OB", primaryColor: "#131230", textColor: "#ffffff", logoSrc: "/logos/OB.png" },
  SK: { code: "SK", primaryColor: "#ce0e2d", textColor: "#ffffff", logoSrc: "/logos/SK.png" },
  SS: { code: "SS", primaryColor: "#074ca1", textColor: "#ffffff", logoSrc: "/logos/SS.png" },
  WO: { code: "WO", primaryColor: "#8c1d40", textColor: "#ffffff", logoSrc: "/logos/WO.png" },
};

export function teamMeta(code: string): KboTeamMeta {
  return KBO_TEAMS[code] ?? { code, primaryColor: "#3a3a3a", textColor: "#ffffff", logoSrc: "" };
}
