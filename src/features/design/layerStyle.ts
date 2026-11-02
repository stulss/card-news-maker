import type { BlendMode, GradientFill, ImageFilters, ImageLayer, Layer, ShadowStyle } from "../../types/canvas";

/** 복사해 둔 레이어 스타일(그래픽 스타일). 내용(글자·이미지)·위치·크기는 포함하지 않는다. */
export interface LayerStyle {
  type: Layer["type"];
  common: { opacity?: number; blendMode?: BlendMode; shadow?: ShadowStyle };
  shape?: { fillColor: string; fillGradient?: GradientFill; strokeColor?: string; strokeWidth?: number; cornerRadius?: number };
  text?: { fontFamily: string; bold: boolean; italic: boolean; color: string; fillGradient?: GradientFill; align: "left" | "center" | "right"; lineHeight: number; letterSpacing: number; strokeColor?: string; strokeWidth?: number };
  image?: { filters?: ImageFilters; maskShape?: ImageLayer["maskShape"]; cornerRadius?: number; borderColor?: string; borderWidth?: number };
}

export function copyStyle(layer: Layer): LayerStyle {
  const style: LayerStyle = {
    type: layer.type,
    common: structuredClone({ opacity: layer.opacity, blendMode: layer.blendMode, shadow: layer.shadow }),
  };
  if (layer.type === "shape") {
    style.shape = structuredClone({ fillColor: layer.fillColor, fillGradient: layer.fillGradient, strokeColor: layer.strokeColor, strokeWidth: layer.strokeWidth, cornerRadius: layer.cornerRadius });
  } else if (layer.type === "text") {
    style.text = structuredClone({ fontFamily: layer.fontFamily, bold: layer.bold, italic: layer.italic, color: layer.color, fillGradient: layer.fillGradient, align: layer.align, lineHeight: layer.lineHeight, letterSpacing: layer.letterSpacing, strokeColor: layer.strokeColor, strokeWidth: layer.strokeWidth });
  } else if (layer.type === "image") {
    style.image = structuredClone({ filters: layer.filters, maskShape: layer.maskShape, cornerRadius: layer.cornerRadius, borderColor: layer.borderColor, borderWidth: layer.borderWidth });
  }
  return style;
}

/**
 * 복사한 스타일을 대상 레이어에 입히기 위한 변경값을 만든다.
 * 공통 속성(투명도·혼합 모드·그림자)은 레이어 종류와 상관없이 적용하고, 종류별 속성은 같은 종류일 때만 적용한다.
 */
export function pasteStyle(target: Layer, style: LayerStyle): Partial<Layer> {
  const changes: Record<string, unknown> = structuredClone({ opacity: style.common.opacity, blendMode: style.common.blendMode, shadow: style.common.shadow });
  if (target.type === style.type) {
    const specific = style.shape ?? style.text ?? style.image;
    if (specific) Object.assign(changes, structuredClone(specific));
  }
  return changes as Partial<Layer>;
}
