import type { ShadowStyle } from "../../types/canvas";

export interface ShadowPreset {
  label: string;
  shadow: ShadowStyle | undefined;
}

/** 그림자·글로우 원클릭 프리셋(색은 rgba 문자열로 둔다 — Konva가 8자리 hex를 보장하지 않음). */
export const SHADOW_PRESETS: ShadowPreset[] = [
  { label: "없음", shadow: undefined },
  { label: "부드럽게", shadow: { offsetX: 0, offsetY: 12, blur: 28, color: "rgba(0, 0, 0, 0.35)" } },
  { label: "선명하게", shadow: { offsetX: 6, offsetY: 8, blur: 0, color: "rgba(0, 0, 0, 0.45)" } },
  { label: "레트로 입체", shadow: { offsetX: 10, offsetY: 10, blur: 0, color: "rgba(124, 58, 237, 0.9)" } },
  { label: "네온 보라", shadow: { offsetX: 0, offsetY: 0, blur: 36, color: "rgba(168, 85, 247, 1)" } },
  { label: "네온 핑크", shadow: { offsetX: 0, offsetY: 0, blur: 36, color: "rgba(244, 114, 182, 1)" } },
  { label: "네온 시안", shadow: { offsetX: 0, offsetY: 0, blur: 36, color: "rgba(34, 211, 238, 1)" } },
];
