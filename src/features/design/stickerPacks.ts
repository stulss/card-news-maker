import type { CanvasProject, Layer, ShapeLayer, TextLayer } from "../../types/canvas";

/**
 * 내장 스티커 팩. 각 스티커는 100×100 "단위 칸" 안에 도형·글자 레이어로 그려 두고,
 * 캔버스에 넣을 때 크기에 맞춰 늘려 한 그룹으로 추가한다(이미지 파일이 없어 저작권 문제가 없다).
 */
export interface StickerItem {
  id: string;
  label: string;
  build: () => Layer[];
}

export interface StickerPack {
  id: string;
  title: string;
  items: StickerItem[];
}

type Rect = { x: number; y: number; width: number; height: number };

const base = { rotation: 0, zIndex: 0, visible: true, locked: false } as const;

function shape(name: string, shapeType: ShapeLayer["shapeType"], rect: Rect, fillColor: string, style: Partial<ShapeLayer> = {}): ShapeLayer {
  return { id: crypto.randomUUID(), type: "shape", name, shapeType, ...rect, ...base, fillColor, ...style };
}

function label(name: string, text: string, rect: Rect, fontSize: number, color: string, style: Partial<TextLayer> = {}): TextLayer {
  return {
    id: crypto.randomUUID(), type: "text", name, text, ...rect, ...base, fontFamily: "IBM Plex Sans KR", fontSize, color, bold: true,
    italic: false, align: "center", lineHeight: 1.1, letterSpacing: 0, strokeColor: "#000000", strokeWidth: 0, ...style,
  };
}

const NONE = "rgba(0,0,0,0)";

function pill(text: string, fill: string, ink = "#ffffff", extra: Partial<ShapeLayer> = {}): Layer[] {
  return [
    shape("배지 바탕", "rectangle", { x: 6, y: 32, width: 88, height: 36 }, fill, { cornerRadius: 18, ...extra }),
    label("배지 글자", text, { x: 6, y: 40, width: 88, height: 22 }, 19, ink, { letterSpacing: 1 }),
  ];
}

function disc(text: string, fill: string, ink = "#ffffff", fontSize = 26, extra: Partial<ShapeLayer> = {}): Layer[] {
  return [
    shape("원 바탕", "circle", { x: 6, y: 6, width: 88, height: 88 }, fill, extra),
    label("원 글자", text, { x: 6, y: 50 - fontSize * 0.55, width: 88, height: fontSize * 1.1 }, fontSize, ink),
  ];
}

function bubble(text: string, fill: string, ink: string, stroke = "#111827"): Layer[] {
  return [
    shape("말풍선", "bubble", { x: 4, y: 8, width: 92, height: 84 }, fill, { strokeColor: stroke, strokeWidth: 3 }),
    label("말풍선 글자", text, { x: 12, y: 26, width: 76, height: 28 }, 24, ink),
  ];
}

export const STICKER_PACKS: StickerPack[] = [
  { id: "badge", title: "배지", items: [
    { id: "badge-new", label: "NEW", build: () => pill("NEW", "#8b5cf6") },
    { id: "badge-free", label: "무료", build: () => pill("FREE", "#10b981") },
    { id: "badge-hot", label: "HOT", build: () => disc("HOT", "#ef4444") },
    { id: "badge-sale", label: "SALE", build: () => disc("SALE", "#ec4899", "#ffffff", 24, { fillGradient: { from: "#f97316", to: "#ec4899", angle: 135 } }) },
    { id: "badge-best", label: "BEST", build: () => [shape("별 바탕", "star", { x: 4, y: 4, width: 92, height: 92 }, "#f59e0b"), label("별 글자", "BEST", { x: 4, y: 42, width: 92, height: 18 }, 16, "#451a03")] },
    { id: "badge-one", label: "1위", build: () => disc("1위", "#f59e0b", "#451a03", 34, { fillGradient: { from: "#fde047", to: "#f59e0b", angle: 135 }, strokeColor: "#ffffff", strokeWidth: 4 }) },
    { id: "badge-deadline", label: "마감임박", build: () => [shape("테두리", "rectangle", { x: 6, y: 32, width: 88, height: 36 }, NONE, { cornerRadius: 18, strokeColor: "#ef4444", strokeWidth: 3 }), label("글자", "마감임박", { x: 6, y: 41, width: 88, height: 20 }, 17, "#ef4444")] },
  ] },
  { id: "bubble", title: "말풍선", items: [
    { id: "bubble-what", label: "헐!", build: () => bubble("헐!", "#ffffff", "#111827") },
    { id: "bubble-tip", label: "꿀팁", build: () => bubble("꿀팁", "#fde047", "#422006") },
    { id: "bubble-lol", label: "ㅋㅋㅋ", build: () => bubble("ㅋㅋㅋ", "#fbcfe8", "#831843") },
    { id: "bubble-look", label: "주목!", build: () => bubble("주목!", "#8b5cf6", "#ffffff", "#ffffff") },
  ] },
  { id: "emphasis", title: "강조", items: [
    { id: "emphasis-arrow", label: "화살표", build: () => [shape("화살표", "arrow", { x: 6, y: 25, width: 88, height: 50 }, "#ef4444", { shadow: { offsetX: 0, offsetY: 3, blur: 6, color: "rgba(0, 0, 0, 0.3)" } })] },
    { id: "emphasis-underline", label: "형광 밑줄", build: () => [shape("밑줄", "rectangle", { x: 4, y: 42, width: 92, height: 16 }, "#fde047", { cornerRadius: 8, opacity: 0.9 })] },
    { id: "emphasis-ring", label: "동그라미", build: () => [shape("동그라미", "circle", { x: 6, y: 18, width: 88, height: 64 }, NONE, { strokeColor: "#ef4444", strokeWidth: 5 })] },
    { id: "emphasis-check", label: "체크", build: () => disc("✓", "#10b981", "#ffffff", 46) },
    { id: "emphasis-question", label: "물음표", build: () => disc("?", "#3b82f6", "#ffffff", 50) },
    { id: "emphasis-exclaim", label: "느낌표", build: () => disc("!", "#ef4444", "#ffffff", 50) },
  ] },
  { id: "deco", title: "장식", items: [
    { id: "deco-sparkle", label: "반짝이", build: () => [shape("큰 별", "star", { x: 22, y: 22, width: 56, height: 56 }, "#fde047"), shape("작은 별", "star", { x: 66, y: 6, width: 26, height: 26 }, "#fbbf24"), shape("작은 별 2", "star", { x: 8, y: 66, width: 22, height: 22 }, "#fcd34d")] },
    { id: "deco-hearts", label: "하트", build: () => [shape("큰 하트", "heart", { x: 28, y: 30, width: 50, height: 46 }, "#ec4899"), shape("하트 2", "heart", { x: 6, y: 8, width: 28, height: 26 }, "#f9a8d4", { rotation: -14 }), shape("하트 3", "heart", { x: 68, y: 6, width: 24, height: 22 }, "#f472b6", { rotation: 12 })] },
    { id: "deco-bolt", label: "번개", build: () => [shape("번개", "bolt", { x: 22, y: 4, width: 56, height: 92 }, "#facc15", { strokeColor: "#a16207", strokeWidth: 2 })] },
    { id: "deco-bookmark", label: "북마크", build: () => [shape("북마크", "bookmark", { x: 26, y: 4, width: 48, height: 92 }, "#ef4444")] },
    { id: "deco-confetti", label: "컨페티", build: () => [
      shape("조각 1", "rectangle", { x: 10, y: 14, width: 14, height: 6 }, "#ec4899", { rotation: 30 }),
      shape("조각 2", "circle", { x: 70, y: 10, width: 10, height: 10 }, "#38bdf8"),
      shape("조각 3", "rectangle", { x: 44, y: 44, width: 16, height: 6 }, "#facc15", { rotation: -25 }),
      shape("조각 4", "triangle", { x: 16, y: 66, width: 14, height: 14 }, "#10b981", { rotation: 20 }),
      shape("조각 5", "circle", { x: 76, y: 62, width: 12, height: 12 }, "#8b5cf6"),
      shape("조각 6", "rectangle", { x: 60, y: 82, width: 16, height: 6 }, "#f97316", { rotation: 40 }),
    ] },
  ] },
];

/** 단위 칸(100×100) 스티커를 현재 캔버스 크기에 맞춰 늘리고 가운데에 놓아, 한 그룹으로 묶은 레이어들을 만든다. */
export function instantiateSticker(item: StickerItem, project: CanvasProject, zIndexStart: number): Layer[] {
  const k = (Math.min(project.width, project.height) * 0.34) / 100;
  const offsetX = project.width / 2 - 50 * k;
  const offsetY = project.height / 2 - 50 * k;
  const groupId = crypto.randomUUID();
  return item.build().map((layer, index) => {
    const scaled: Layer = {
      ...layer, id: crypto.randomUUID(), groupId, zIndex: zIndexStart + index,
      x: offsetX + layer.x * k, y: offsetY + layer.y * k, width: layer.width * k, height: layer.height * k,
    } as Layer;
    if (scaled.type === "text") {
      scaled.fontSize = layer.type === "text" ? layer.fontSize * k : scaled.fontSize;
      scaled.letterSpacing = scaled.letterSpacing * k;
    }
    if (scaled.type === "shape") {
      if (scaled.cornerRadius) scaled.cornerRadius *= k;
      if (scaled.strokeWidth) scaled.strokeWidth = Math.max(1, scaled.strokeWidth * k);
    }
    if (scaled.shadow) scaled.shadow = { ...scaled.shadow, offsetX: scaled.shadow.offsetX * k, offsetY: scaled.shadow.offsetY * k, blur: scaled.shadow.blur * k };
    return scaled;
  });
}
