// 새 텍스트 레이어의 기본 글자색·외곽선색을 캔버스 배경 밝기에 맞춰 정한다.
// 기본 배경이 흰색(#ffffff)인데 기본 글자색도 흰색이라 글자가 배경에 묻혀 보이지 않던 문제를 막는다.

export interface TextColorDefaults {
  color: string;
  strokeColor: string;
}

/** #rgb / #rrggbb 를 0~1 상대 휘도로. 파싱할 수 없으면 null. */
function relativeLuminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let body = m[1];
  if (body.length === 3) body = body.split("").map((c) => c + c).join("");
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear(Number.parseInt(body.slice(0, 2), 16));
  const g = toLinear(Number.parseInt(body.slice(2, 4), 16));
  const b = toLinear(Number.parseInt(body.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b; // WCAG 상대 휘도
}

/**
 * 배경색에 대비되는 기본 글자색/외곽선색.
 * 밝은 배경 → 진한 글자 + 흰 외곽선, 어두운 배경 → 흰 글자 + 검은 외곽선.
 * 색을 해석할 수 없으면(그라디언트·CSS 함수 등) 사진 위 문구에 흔한 흰 글자 조합을 유지한다.
 */
export function textColorDefaultsFor(backgroundColor: string): TextColorDefaults {
  const luminance = relativeLuminance(backgroundColor);
  if (luminance === null) return { color: "#ffffff", strokeColor: "#000000" };
  return luminance > 0.5
    ? { color: "#111111", strokeColor: "#ffffff" }
    : { color: "#ffffff", strokeColor: "#000000" };
}
