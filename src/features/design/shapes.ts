// 100×100 상자 안에 그린 벡터 도형 경로(SVG path data). 레이어 크기에 맞춰 Konva에서는 scale로, 썸네일에서는 SVG viewBox로 늘린다.
export const PATH_SHAPES = {
  heart: "M50 90 C20 68 4 50 4 31 C4 16 15 6 28 6 C37 6 45 11 50 19 C55 11 63 6 72 6 C85 6 96 16 96 31 C96 50 80 68 50 90 Z",
  bubble: "M14 8 H86 Q96 8 96 18 V58 Q96 68 86 68 H40 L18 92 L23 68 H14 Q4 68 4 58 V18 Q4 8 14 8 Z",
  arrow: "M4 36 H58 V14 L96 50 L58 86 V64 H4 Z",
  bolt: "M60 4 L14 56 H44 L36 96 L86 40 H54 Z",
  bookmark: "M20 4 H80 V96 L50 72 L20 96 Z",
  diamond: "M50 2 L98 50 L50 98 L2 50 Z",
  cloud: "M26 80 C8 80 2 62 12 52 C6 38 20 26 34 32 C38 14 62 10 70 26 C86 20 100 36 92 52 C102 62 94 80 76 80 Z",
  check: "M8 54 L22 40 L40 58 L78 14 L92 28 L40 86 Z",
  plus: "M38 6 H62 V38 H94 V62 H62 V94 H38 V62 H6 V38 H38 Z",
  ribbon: "M2 18 H98 L86 50 L98 82 H2 L14 50 Z",
} as const;

export type PathShapeType = keyof typeof PATH_SHAPES;

export const isPathShape = (shapeType: string): shapeType is PathShapeType => shapeType in PATH_SHAPES;

export const SHAPE_LABELS: Record<string, string> = {
  rectangle: "사각형", circle: "원", star: "별", triangle: "삼각형",
  heart: "하트", bubble: "말풍선", arrow: "화살표", bolt: "번개", bookmark: "북마크",
  diamond: "마름모", cloud: "구름", check: "체크", plus: "더하기", ribbon: "리본",
};

/** 썸네일(CSS)에서 별·삼각형을 그리는 clip-path */
export const CLIP_PATHS: Record<string, string> = {
  hexagon: "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)",
  triangle: "polygon(50% 0%, 100% 100%, 0% 100%)",
  star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
};

/** 이미지 오리기(마스크)용 100×100 경로. 원은 타원으로 늘어난다. */
export const MASK_PATHS = {
  circle: "M50 0 A50 50 0 1 1 50 100 A50 50 0 1 1 50 0 Z",
  star: "M50 0 L61 35 L98 35 L68 57 L79 91 L50 70 L21 91 L32 57 L2 35 L39 35 Z",
  triangle: "M50 0 L100 100 L0 100 Z",
  hexagon: "M25 3 L75 3 L100 50 L75 97 L25 97 L0 50 Z",
  heart: PATH_SHAPES.heart,
  bubble: PATH_SHAPES.bubble,
} as const;

export type MaskShape = keyof typeof MASK_PATHS;

export const MASK_OPTIONS: Array<{ shape: MaskShape; label: string }> = [
  { shape: "circle", label: "원형" },
  { shape: "star", label: "별" },
  { shape: "triangle", label: "삼각형" },
  { shape: "hexagon", label: "육각형" },
  { shape: "heart", label: "하트" },
  { shape: "bubble", label: "말풍선" },
];
