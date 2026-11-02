import type { CanvasProject, Layer, ShapeLayer, TextLayer } from "../../types/canvas";

export const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

export const EMOJI_STICKERS = [
  "😂", "🤣", "😭", "😎", "🥹", "😡", "🤔", "🙄",
  "👍", "👏", "🙏", "💪", "🔥", "💯", "✨", "❤️",
  "🎉", "💀", "👀", "🤡", "🐶", "🐱", "⚾", "🏆",
] as const;

export interface MemePreset {
  id: string;
  label: string;
  description: string;
}

export const MEME_PRESETS: MemePreset[] = [
  { id: "classic", label: "클래식 상·하단", description: "굵은 흰 글자 + 검은 외곽선" },
  { id: "center", label: "중앙 한 줄", description: "사진 한가운데 큰 자막" },
  { id: "subtitle", label: "영화 자막", description: "하단 반투명 띠 + 흰 글자" },
  { id: "bubble", label: "말풍선 대사", description: "흰 박스 안의 검은 글자" },
  { id: "breaking", label: "속보 뉴스", description: "빨간 라벨 + 하단 헤드라인 띠" },
];

function baseLayer(project: CanvasProject, offset: number, name: string) {
  return {
    id: crypto.randomUUID(), rotation: 0, zIndex: project.layers.length + offset,
    visible: true, locked: false, name,
  };
}

function text(project: CanvasProject, offset: number, name: string, content: string, rect: Pick<TextLayer, "x" | "y" | "width" | "height">, style: Partial<TextLayer>): TextLayer {
  return {
    ...baseLayer(project, offset, name), type: "text", text: content, ...rect,
    fontFamily: "IBM Plex Sans KR", fontSize: 80, color: "#ffffff", bold: true, italic: false,
    align: "center", lineHeight: 1.2, letterSpacing: 0, strokeColor: "#000000", strokeWidth: 0, ...style,
  };
}

function box(project: CanvasProject, offset: number, name: string, rect: Pick<ShapeLayer, "x" | "y" | "width" | "height">, style: Partial<ShapeLayer>): ShapeLayer {
  return { ...baseLayer(project, offset, name), type: "shape", shapeType: "rectangle", fillColor: "#000000", ...rect, ...style };
}

/** 현재 캔버스 크기에 비례해 배치한 밈 자막 레이어들을 만든다(기존 레이어 위에 추가). */
export function buildMemePreset(presetId: string, project: CanvasProject): Layer[] {
  const { width: W, height: H } = project;
  const margin = Math.round(W * 0.05);
  const inner = W - margin * 2;
  const size = Math.round(W * 0.085);

  switch (presetId) {
    case "classic":
      return [
        text(project, 0, "상단 자막", "상단 문구", { x: margin, y: margin, width: inner, height: size * 2.6 }, { fontSize: size, strokeWidth: Math.round(size * 0.12) }),
        text(project, 1, "하단 자막", "하단 문구", { x: margin, y: H - margin - size * 2.6, width: inner, height: size * 2.6 }, { fontSize: size, strokeWidth: Math.round(size * 0.12) }),
      ];
    case "center":
      return [text(project, 0, "중앙 자막", "여기에 한 줄", { x: margin, y: H / 2 - size, width: inner, height: size * 2 }, { fontSize: Math.round(size * 1.2), strokeWidth: Math.round(size * 0.14) })];
    case "subtitle": {
      const bandHeight = Math.round(size * 2.2);
      const y = H - margin - bandHeight;
      return [
        box(project, 0, "자막 띠", { x: 0, y, width: W, height: bandHeight }, { fillColor: "#000000", opacity: 0.65 }),
        text(project, 1, "자막", "대사를 입력하세요", { x: margin, y: y + bandHeight * 0.18, width: inner, height: bandHeight * 0.7 }, { fontSize: Math.round(size * 0.7), bold: false }),
      ];
    }
    case "bubble": {
      const bubbleHeight = Math.round(size * 2.4);
      return [
        box(project, 0, "말풍선", { x: margin, y: margin, width: inner, height: bubbleHeight }, { fillColor: "#ffffff", strokeColor: "#111111", strokeWidth: 4, cornerRadius: Math.round(size * 0.6) }),
        text(project, 1, "대사", "이 순간의 표정", { x: margin * 1.6, y: margin + bubbleHeight * 0.18, width: inner - margin * 0.6, height: bubbleHeight * 0.64 }, { fontSize: Math.round(size * 0.8), color: "#111111" }),
      ];
    }
    case "breaking": {
      const barHeight = Math.round(size * 2.4);
      const labelWidth = Math.round(W * 0.2);
      const y = H - margin - barHeight;
      return [
        box(project, 0, "헤드라인 띠", { x: 0, y, width: W, height: barHeight }, { fillColor: "#101828", opacity: 0.92 }),
        box(project, 1, "속보 라벨", { x: 0, y: y - Math.round(size * 0.9), width: labelWidth, height: Math.round(size * 0.9) }, { fillColor: "#e11d2e" }),
        text(project, 2, "속보 글자", "속보", { x: 0, y: y - Math.round(size * 0.85), width: labelWidth, height: Math.round(size * 0.8) }, { fontSize: Math.round(size * 0.6) }),
        text(project, 3, "헤드라인", "헤드라인을 입력하세요", { x: margin, y: y + barHeight * 0.16, width: inner, height: barHeight * 0.68 }, { fontSize: Math.round(size * 0.75), align: "left" }),
      ];
    }
    default:
      return [];
  }
}

export function buildEmojiSticker(emoji: string, project: CanvasProject): TextLayer {
  const size = Math.round(project.width * 0.18);
  return text(project, 0, `스티커 ${emoji}`, emoji, {
    x: (project.width - size * 1.4) / 2, y: (project.height - size * 1.4) / 2, width: size * 1.4, height: size * 1.4,
  }, { fontFamily: EMOJI_FONT, fontSize: size, strokeWidth: 0, bold: false, lineHeight: 1.1 });
}
