import { MASK_PATHS } from "./shapes";
import type { MaskShape } from "./shapes";

interface Options {
  width: number; // 레이어 상자(캔버스 단위)
  height: number;
  crop: { x: number; y: number; width: number; height: number }; // 원본에서 보여줄 영역(자르기·확대 반영)
  mask: MaskShape;
  borderColor?: string;
  borderWidth?: number;
}

/**
 * 이미지를 지정한 모양(원·별·하트…)으로 오려 낸 캔버스를 만든다. 가장자리는 투명이 된다.
 * Konva의 Image는 임의 모양 클리핑을 지원하지 않으므로, 오려 낸 결과를 새 비트맵으로 만들어 Image 노드에 넘긴다.
 */
export function renderMaskedImage(image: CanvasImageSource, options: Options): HTMLCanvasElement {
  const { width, height, crop, mask, borderColor, borderWidth = 0 } = options;
  const scale = Math.min(2, 2400 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  const path = new Path2D(MASK_PATHS[mask]);

  context.save();
  context.scale(canvas.width / 100, canvas.height / 100);
  context.clip(path);
  context.setTransform(1, 0, 0, 1, 0, 0); // 클리핑 영역은 유지한 채 좌표계만 원래대로
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  context.restore();

  if (borderWidth > 0) {
    context.save();
    context.scale(canvas.width / 100, canvas.height / 100);
    context.lineJoin = "round";
    context.lineWidth = (borderWidth * scale) / ((canvas.width + canvas.height) / 200);
    context.strokeStyle = borderColor ?? "#ffffff";
    context.stroke(path);
    context.restore();
  }
  return canvas;
}
