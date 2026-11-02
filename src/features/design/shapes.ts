// 100×100 상자 안에 그린 벡터 도형 경로(SVG path data). 레이어 크기에 맞춰 Konva에서는 scale로, 썸네일에서는 SVG viewBox로 늘린다.
export const PATH_SHAPES = {
  heart: "M50 90 C20 68 4 50 4 31 C4 16 15 6 28 6 C37 6 45 11 50 19 C55 11 63 6 72 6 C85 6 96 16 96 31 C96 50 80 68 50 90 Z",
  bubble: "M14 8 H86 Q96 8 96 18 V58 Q96 68 86 68 H40 L18 92 L23 68 H14 Q4 68 4 58 V18 Q4 8 14 8 Z",
  arrow: "M4 36 H58 V14 L96 50 L58 86 V64 H4 Z",
  bolt: "M60 4 L14 56 H44 L36 96 L86 40 H54 Z",
  bookmark: "M20 4 H80 V96 L50 72 L20 96 Z",
} as const;

export type PathShapeType = keyof typeof PATH_SHAPES;

export const isPathShape = (shapeType: string): shapeType is PathShapeType => shapeType in PATH_SHAPES;

export const SHAPE_LABELS: Record<string, string> = {
  rectangle: "사각형", circle: "원", star: "별", triangle: "삼각형",
  heart: "하트", bubble: "말풍선", arrow: "화살표", bolt: "번개", bookmark: "북마크",
};

/** 썸네일(CSS)에서 별·삼각형을 그리는 clip-path */
export const CLIP_PATHS: Record<string, string> = {
  triangle: "polygon(50% 0%, 100% 100%, 0% 100%)",
  star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
};
