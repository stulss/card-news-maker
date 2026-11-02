import type { GradientFill } from "../../types/canvas";

export interface GradientPreset {
  name: string;
  value: GradientFill;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { name: "오로라", value: { from: "#8b5cf6", to: "#ec4899", angle: 135 } },
  { name: "선셋", value: { from: "#f97316", to: "#ec4899", angle: 135 } },
  { name: "오션", value: { from: "#06b6d4", to: "#3b82f6", angle: 135 } },
  { name: "민트", value: { from: "#34d399", to: "#06b6d4", angle: 135 } },
  { name: "미드나잇", value: { from: "#0f172a", to: "#4338ca", angle: 160 } },
  { name: "포레스트", value: { from: "#064e3b", to: "#10b981", angle: 150 } },
  { name: "골드", value: { from: "#f59e0b", to: "#fde047", angle: 135 } },
  { name: "차콜", value: { from: "#111827", to: "#4b5563", angle: 160 } },
  { name: "코튼캔디", value: { from: "#fbcfe8", to: "#bfdbfe", angle: 120 } },
  { name: "피치", value: { from: "#fed7aa", to: "#fecdd3", angle: 135 } },
  { name: "라벤더", value: { from: "#ddd6fe", to: "#fbcfe8", angle: 135 } },
  { name: "스카이", value: { from: "#e0f2fe", to: "#a5b4fc", angle: 160 } },
];

/** #rrggbb + 불투명도 → rgba() 문자열(불투명이면 원래 값을 그대로 돌려준다). */
export function withOpacity(color: string, opacity = 1): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!match || opacity >= 1) return color;
  const n = Number.parseInt(match[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, opacity)})`;
}

/** CSS 그라디언트 문자열(썸네일·미리보기용). 각도 규칙은 CSS와 같다: 0°=아래→위, 90°=왼쪽→오른쪽. */
export function cssGradient(gradient: GradientFill) {
  const from = withOpacity(gradient.from, gradient.fromOpacity);
  const to = withOpacity(gradient.to, gradient.toOpacity);
  return gradient.type === "radial" ? `radial-gradient(circle at center, ${from}, ${to})` : `linear-gradient(${gradient.angle}deg, ${from}, ${to})`;
}

/**
 * Konva 노드용 그라디언트 속성. 선형은 CSS와 같은 각도 규칙을 쓰고 상자 대각 길이에 맞춰 양 끝이 모서리까지 닿게 하며,
 * 원형은 중심에서 모서리까지 퍼진다. centered=true면 노드 좌표 원점이 상자 중심인 도형(원·별·삼각형)용이다.
 */
export function konvaGradient(gradient: GradientFill, width: number, height: number, centered = false) {
  const cx = centered ? 0 : width / 2;
  const cy = centered ? 0 : height / 2;
  const stops = [0, withOpacity(gradient.from, gradient.fromOpacity), 1, withOpacity(gradient.to, gradient.toOpacity)];
  if (gradient.type === "radial") {
    return {
      fillRadialGradientStartPoint: { x: cx, y: cy },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndPoint: { x: cx, y: cy },
      fillRadialGradientEndRadius: Math.hypot(width, height) / 2,
      fillRadialGradientColorStops: stops,
    };
  }
  const radians = (gradient.angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  return {
    fillLinearGradientStartPoint: { x: cx - dx * half, y: cy - dy * half },
    fillLinearGradientEndPoint: { x: cx + dx * half, y: cy + dy * half },
    fillLinearGradientColorStops: stops,
  };
}

/** 색의 상대 밝기가 높은지(글자색을 정할 때 사용). 해석할 수 없으면 null. */
export function isLightColor(hex: string): boolean | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = Number.parseInt(match[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}
