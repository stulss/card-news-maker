import type { CanvasProject, ShapeLayer } from "../../types/canvas";

export type OverlayKind = "bottom" | "top" | "dim" | "vignette";

export const OVERLAY_OPTIONS: Array<{ kind: OverlayKind; label: string; hint: string }> = [
  { kind: "bottom", label: "하단 어둡게", hint: "아래에서 위로 옅어지는 어둠" },
  { kind: "top", label: "상단 어둡게", hint: "위에서 아래로 옅어지는 어둠" },
  { kind: "dim", label: "전체 어둡게", hint: "사진 전체를 살짝 눌러 줌" },
  { kind: "vignette", label: "원형 비네팅", hint: "가장자리만 어둡게" },
];

/**
 * 사진 위에 깔아 글자를 잘 읽히게 하는 반투명 오버레이 도형.
 * LightCraft의 선형·원형 그라디언트 마스크를 카드뉴스 용도로 줄인 것(투명 → 어두움 그라디언트).
 */
export function buildOverlay(kind: OverlayKind, project: CanvasProject): ShapeLayer {
  const base = {
    id: crypto.randomUUID(), type: "shape" as const, shapeType: "rectangle" as const, rotation: 0, zIndex: 0,
    visible: true, locked: false, fillColor: "#000000",
  };
  const { width: W, height: H } = project;
  const label = OVERLAY_OPTIONS.find((option) => option.kind === kind)?.label ?? "오버레이";
  switch (kind) {
    case "bottom":
      return { ...base, name: label, x: 0, y: H * 0.45, width: W, height: H * 0.55, fillGradient: { from: "#000000", to: "#000000", angle: 180, fromOpacity: 0, toOpacity: 0.8 } };
    case "top":
      return { ...base, name: label, x: 0, y: 0, width: W, height: H * 0.55, fillGradient: { from: "#000000", to: "#000000", angle: 0, fromOpacity: 0, toOpacity: 0.8 } };
    case "dim":
      return { ...base, name: label, x: 0, y: 0, width: W, height: H, opacity: 0.35 };
    default:
      return { ...base, name: label, x: 0, y: 0, width: W, height: H, fillGradient: { type: "radial", from: "#000000", to: "#000000", angle: 0, fromOpacity: 0, toOpacity: 0.7 } };
  }
}
