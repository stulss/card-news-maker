import type { CanvasProject, Layer, ShapeLayer, TextLayer } from "../../types/canvas";
import { isLightColor } from "./gradients";

export interface TextPreset {
  id: string;
  label: string;
  sample: string;
  style: { fontWeight: number; fontStyle?: string; color?: string; fontSize: number; letterSpacing?: number; textShadow?: string; WebkitTextStroke?: string };
  build: (project: CanvasProject) => Layer[];
}

const ACCENT = "#8b5cf6";

/** 배경(단색 또는 그라디언트 시작색)의 밝기에 맞는 글자색 */
function palette(project: CanvasProject) {
  const base = project.backgroundGradient?.from ?? project.backgroundColor;
  const light = isLightColor(base) ?? false;
  return { ink: light ? "#111827" : "#ffffff", muted: light ? "#4b5563" : "#cbd5e1", accent: ACCENT };
}

function textLayer(project: CanvasProject, name: string, text: string, rect: { x: number; y: number; width: number; height: number }, style: Partial<TextLayer>): TextLayer {
  const { ink } = palette(project);
  return {
    id: crypto.randomUUID(), type: "text", name, text, ...rect, rotation: 0, zIndex: 0, visible: true, locked: false,
    fontFamily: "IBM Plex Sans KR", fontSize: 64, color: ink, bold: true, italic: false, align: "left",
    lineHeight: 1.25, letterSpacing: 0, strokeColor: "#000000", strokeWidth: 0, ...style,
  };
}

function shapeLayer(name: string, rect: { x: number; y: number; width: number; height: number }, fillColor: string, style: Partial<ShapeLayer> = {}): ShapeLayer {
  return { id: crypto.randomUUID(), type: "shape", shapeType: "rectangle", name, ...rect, rotation: 0, zIndex: 0, visible: true, locked: false, fillColor, ...style };
}

export const TEXT_PRESETS: TextPreset[] = [
  {
    id: "headline", label: "헤드라인", sample: "큰 제목", style: { fontWeight: 800, fontSize: 30 },
    build: (p) => [textLayer(p, "헤드라인", "제목을 입력하세요", { x: p.width * 0.075, y: p.height * 0.16, width: p.width * 0.85, height: p.width * 0.34 }, { fontSize: Math.round(p.width * 0.105), lineHeight: 1.15 })],
  },
  {
    id: "subhead", label: "서브헤드", sample: "소제목", style: { fontWeight: 700, fontSize: 24 },
    build: (p) => [textLayer(p, "서브헤드", "소제목을 입력하세요", { x: p.width * 0.075, y: p.height * 0.4, width: p.width * 0.85, height: p.width * 0.14 }, { fontSize: Math.round(p.width * 0.058) })],
  },
  {
    id: "body", label: "본문", sample: "본문 내용을 적어요", style: { fontWeight: 400, fontSize: 17 },
    build: (p) => [textLayer(p, "본문", "핵심 내용을 두세 줄로\n간결하게 적어 주세요.", { x: p.width * 0.075, y: p.height * 0.5, width: p.width * 0.85, height: p.width * 0.24 }, { fontSize: Math.round(p.width * 0.04), bold: false, lineHeight: 1.55, color: palette(p).ink })],
  },
  {
    id: "caption", label: "캡션", sample: "출처 · 날짜", style: { fontWeight: 400, fontSize: 14, color: "#94a3b8" },
    build: (p) => [textLayer(p, "캡션", "출처 · 날짜", { x: p.width * 0.075, y: p.height * 0.9, width: p.width * 0.85, height: p.width * 0.06 }, { fontSize: Math.round(p.width * 0.028), bold: false, color: palette(p).muted, letterSpacing: 1 })],
  },
  {
    id: "number", label: "큰 숫자", sample: "01", style: { fontWeight: 900, fontSize: 38, color: ACCENT },
    build: (p) => [textLayer(p, "큰 숫자", "01", { x: p.width * 0.075, y: p.height * 0.12, width: p.width * 0.5, height: p.width * 0.26 }, { fontSize: Math.round(p.width * 0.2), color: ACCENT, lineHeight: 1 })],
  },
  {
    id: "quote", label: "인용구", sample: "“ 한 문장 ”", style: { fontWeight: 600, fontStyle: "italic", fontSize: 20 },
    build: (p) => [textLayer(p, "인용구", "“기억에 남는 한 문장을\n여기에 적어 보세요”", { x: p.width * 0.1, y: p.height * 0.35, width: p.width * 0.8, height: p.width * 0.32 }, { fontSize: Math.round(p.width * 0.058), italic: true, align: "center", lineHeight: 1.4 })],
  },
  {
    id: "outline", label: "아웃라인", sample: "OUTLINE", style: { fontWeight: 900, fontSize: 26, color: "transparent", WebkitTextStroke: "1.5px currentColor", letterSpacing: 2 },
    build: (p) => [textLayer(p, "아웃라인 제목", "OUTLINE", { x: p.width * 0.075, y: p.height * 0.3, width: p.width * 0.85, height: p.width * 0.2 }, { fontSize: Math.round(p.width * 0.15), color: "rgba(0,0,0,0)", strokeColor: palette(p).ink, strokeWidth: Math.max(3, Math.round(p.width * 0.004)), letterSpacing: 4 })],
  },
  {
    id: "shadow", label: "그림자 제목", sample: "SHADOW", style: { fontWeight: 900, fontSize: 26, textShadow: "3px 4px 0 rgba(139, 92, 246, 0.55)" },
    build: (p) => [textLayer(p, "그림자 제목", "SHADOW", { x: p.width * 0.075, y: p.height * 0.3, width: p.width * 0.85, height: p.width * 0.2 }, { fontSize: Math.round(p.width * 0.15), shadow: { offsetX: 8, offsetY: 10, blur: 0, color: "rgba(139, 92, 246, 0.67)" } })],
  },
  {
    id: "badge", label: "배지", sample: "NEW", style: { fontWeight: 800, fontSize: 18 },
    build: (p) => {
      const groupId = crypto.randomUUID();
      const width = p.width * 0.24;
      const height = p.width * 0.085;
      const x = p.width * 0.075;
      const y = p.height * 0.1;
      return [
        { ...shapeLayer("배지 바탕", { x, y, width, height }, ACCENT, { cornerRadius: height / 2 }), groupId },
        { ...textLayer(p, "배지 글자", "NEW", { x, y: y + height * 0.2, width, height: height * 0.6 }, { fontSize: Math.round(height * 0.5), color: "#ffffff", align: "center", letterSpacing: 2 }), groupId },
      ];
    },
  },
  {
    id: "highlight", label: "형광펜", sample: "강조 문구", style: { fontWeight: 800, fontSize: 22 },
    build: (p) => {
      const groupId = crypto.randomUUID();
      const x = p.width * 0.075;
      const y = p.height * 0.45;
      const fontSize = Math.round(p.width * 0.065);
      return [
        { ...shapeLayer("형광펜", { x, y: y + fontSize * 0.5, width: p.width * 0.62, height: fontSize * 0.62 }, "#fde047", { opacity: 0.92 }), groupId },
        { ...textLayer(p, "형광펜 글자", "강조할 문구", { x, y, width: p.width * 0.62, height: fontSize * 1.3 }, { fontSize, color: "#111827" }), groupId },
      ];
    },
  },
];
