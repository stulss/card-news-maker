import type { GradientFill, TextLayer } from "../../types/canvas";
import { withOpacity } from "./gradients";

/** 곡선 최대 각도(라디안, 약 150°). 곡선 값 ±100이 이 각도에 해당한다. */
const MAX_ANGLE = 2.6;

function fontString(layer: TextLayer) {
  const family = /[",]/.test(layer.fontFamily) ? layer.fontFamily : `"${layer.fontFamily}"`;
  return `${layer.italic ? "italic " : ""}${layer.bold ? "bold " : ""}${layer.fontSize}px ${family}`;
}

function measureAdvances(layer: TextLayer, context: CanvasRenderingContext2D) {
  context.font = fontString(layer);
  const chars = [...layer.text.replace(/\s*\n\s*/g, " ")];
  const advances = chars.map((char) => context.measureText(char).width + layer.letterSpacing);
  return { chars, advances, total: advances.reduce((sum, value) => sum + value, 0) };
}

/** 곡선 글자가 차지하는 세로 여유(호가 가장 많이 휜 높이). */
function sagitta(total: number, curve: number) {
  const theta = (Math.abs(curve) / 100) * MAX_ANGLE;
  if (theta < 0.01) return 0;
  const radius = total / theta;
  return radius * (1 - Math.cos(theta / 2));
}

/** 곡선 값에 맞는 글자 상자 높이(호가 잘리지 않도록). 글꼴·글자 크기를 바꾼 뒤 다시 호출해 맞춘다. */
export function curvedTextHeight(layer: TextLayer, curve: number): number {
  const context = document.createElement("canvas").getContext("2d");
  const { total } = context ? measureAdvances(layer, context) : { total: layer.width };
  return Math.ceil(layer.fontSize * 1.5 + sagitta(total, curve) + (layer.strokeWidth ?? 0));
}

function paintFor(context: CanvasRenderingContext2D, layer: TextLayer, gradient: GradientFill | undefined, width: number, height: number): string | CanvasGradient {
  if (!gradient) return layer.color;
  const stops = [withOpacity(gradient.from, gradient.fromOpacity), withOpacity(gradient.to, gradient.toOpacity)];
  let paint: CanvasGradient;
  if (gradient.type === "radial") {
    paint = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.hypot(width, height) / 2);
  } else {
    const radians = (gradient.angle * Math.PI) / 180;
    const dx = Math.sin(radians);
    const dy = -Math.cos(radians);
    const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
    paint = context.createLinearGradient(width / 2 - dx * half, height / 2 - dy * half, width / 2 + dx * half, height / 2 + dy * half);
  }
  paint.addColorStop(0, stops[0]);
  paint.addColorStop(1, stops[1]);
  return paint;
}

/**
 * 곡선(아치·스마일) 글자를 비트맵으로 그린다. 글자를 한 자씩 원호 위에 놓고 접선 방향으로 돌려 그린다.
 * Konva의 TextPath는 가운데 정렬·글자 간격 제어가 어려워 직접 그린다. 줄바꿈은 공백으로 이어 한 줄로 그린다.
 */
export function renderCurvedText(layer: TextLayer): HTMLCanvasElement {
  const scale = Math.min(2, 2400 / Math.max(layer.width, layer.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(layer.width * scale));
  canvas.height = Math.max(1, Math.round(layer.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.scale(scale, scale);

  const { chars, advances, total } = measureAdvances(layer, context);
  const curve = layer.curve ?? 0;
  const theta = (Math.abs(curve) / 100) * MAX_ANGLE;
  const width = layer.width;
  const height = layer.height;
  const strokeWidth = layer.strokeWidth ?? 0;
  const fill = paintFor(context, layer, layer.fillGradient, width, height);

  context.font = fontString(layer);
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.lineJoin = "round";
  context.fillStyle = fill;
  if (strokeWidth > 0) { context.strokeStyle = layer.strokeColor ?? "#000000"; context.lineWidth = strokeWidth * 2; }

  const drawChar = (char: string) => {
    if (strokeWidth > 0) context.strokeText(char, 0, 0);
    context.fillText(char, 0, 0);
  };

  if (theta < 0.01) {
    context.save();
    context.translate(width / 2, height / 2 + layer.fontSize * 0.35);
    const text = chars.join("");
    if (strokeWidth > 0) context.strokeText(text, 0, 0);
    context.fillText(text, 0, 0);
    context.restore();
    return canvas;
  }

  const radius = total / theta;
  const arch = curve > 0;
  // 아치: 가장 높은 글자의 기준선을 위쪽 여백에 두고 원의 중심을 아래에 둔다. 스마일은 반대.
  const apexBaseline = arch ? layer.fontSize * 1.05 + strokeWidth : height - layer.fontSize * 0.3 - strokeWidth;
  const centerY = arch ? apexBaseline + radius : apexBaseline - radius;
  let travelled = 0;
  chars.forEach((char, index) => {
    const phi = -theta / 2 + (travelled + advances[index] / 2) / radius;
    travelled += advances[index];
    context.save();
    context.translate(width / 2 + radius * Math.sin(phi), arch ? centerY - radius * Math.cos(phi) : centerY + radius * Math.cos(phi));
    context.rotate(arch ? phi : -phi);
    drawChar(char);
    context.restore();
  });
  return canvas;
}
