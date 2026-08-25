// PRD.md 43장 "구단 로고·엠블럼 정책" — 팀 상징색은 스코어보드 배경에 쓴다.
// 색상값은 널리 알려진 구단 대표색을 근사한 것으로, 공식 브랜드 가이드 원본 대조는 하지 않았다
// (엠블럼처럼 저작물을 그대로 복제하는 것이 아니라 배경색 참고용이라 근사치로 충분하다고 판단).

export interface KboTeamMeta {
  code: string;
  primaryColor: string;
  textColor: "#ffffff" | "#0a0a0a";
  logoSrc: string;
  /** 원본 엠블럼의 가로/세로 비율. 스코어보드에서 잘림 없이 배치하는 데 사용한다. */
  logoAspectRatio: number;
}

export const KBO_TEAMS: Record<string, KboTeamMeta> = {
  HH: { code: "HH", primaryColor: "#ff6600", textColor: "#0a0a0a", logoSrc: "/logos/HH.png", logoAspectRatio: 300 / 300 },
  HT: { code: "HT", primaryColor: "#ea0029", textColor: "#ffffff", logoSrc: "/logos/HT.png", logoAspectRatio: 474 / 376 },
  KT: { code: "KT", primaryColor: "#000000", textColor: "#ffffff", logoSrc: "/logos/KT.png", logoAspectRatio: 267 / 283 },
  LG: { code: "LG", primaryColor: "#c30452", textColor: "#ffffff", logoSrc: "/logos/LG.png", logoAspectRatio: 120 / 120 },
  LT: { code: "LT", primaryColor: "#041e42", textColor: "#ffffff", logoSrc: "/logos/LT.png", logoAspectRatio: 1209 / 944 },
  NC: { code: "NC", primaryColor: "#315288", textColor: "#ffffff", logoSrc: "/logos/NC.png", logoAspectRatio: 1001 / 689 },
  OB: { code: "OB", primaryColor: "#131230", textColor: "#ffffff", logoSrc: "/logos/OB.png", logoAspectRatio: 244 / 244 },
  SK: { code: "SK", primaryColor: "#ce0e2d", textColor: "#ffffff", logoSrc: "/logos/SK.png", logoAspectRatio: 1235 / 728 },
  SS: { code: "SS", primaryColor: "#074ca1", textColor: "#ffffff", logoSrc: "/logos/SS.png", logoAspectRatio: 480 / 480 },
  WO: { code: "WO", primaryColor: "#8c1d40", textColor: "#ffffff", logoSrc: "/logos/WO.png", logoAspectRatio: 531 / 391 },
};

export function teamMeta(code: string): KboTeamMeta {
  return KBO_TEAMS[code] ?? { code, primaryColor: "#3a3a3a", textColor: "#ffffff", logoSrc: "", logoAspectRatio: 1 };
}
