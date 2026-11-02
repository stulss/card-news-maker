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

/** CSS `linear-gradient` 문자열(썸네일·미리보기용). 각도 규칙은 CSS와 같다: 0°=아래→위, 90°=왼쪽→오른쪽. */
export function cssGradient(gradient: GradientFill) {
  return `linear-gradient(${gradient.angle}deg, ${gradient.from}, ${gradient.to})`;
}

/**
 * Konva 노드용 선형 그라디언트 속성. CSS와 같은 각도 규칙을 쓰고, 상자 대각 길이에 맞춰 양 끝이 모서리까지 닿게 한다.
 * centered=true면 노드 좌표 원점이 상자 중심인 도형(원·별·삼각형)용이다.
 */
export function konvaGradient(gradient: GradientFill, width: number, height: number, centered = false) {
  const radians = (gradient.angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  const cx = centered ? 0 : width / 2;
  const cy = centered ? 0 : height / 2;
  return {
    fillLinearGradientStartPoint: { x: cx - dx * half, y: cy - dy * half },
    fillLinearGradientEndPoint: { x: cx + dx * half, y: cy + dy * half },
    fillLinearGradientColorStops: [0, gradient.from, 1, gradient.to],
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
