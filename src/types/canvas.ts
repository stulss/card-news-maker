// PRD.md 21장 "데이터 구조" 그대로 이식.
// 인터페이스를 고칠 때는 PRD.md 21장도 같이 갱신할 것 (CLAUDE.md 4번 원칙).

/** 선형 그라디언트. 각도는 CSS와 같다(0°=아래→위, 90°=왼쪽→오른쪽). */
export interface GradientFill {
  from: string;
  to: string;
  angle: number;
}

export interface CanvasProject {
  id: string;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundGradient?: GradientFill; // 있으면 단색 대신 그라디언트 배경
  layers: Layer[];
  createdAt: string;
  updatedAt: string;
}

// 허용하는 블렌드 모드는 화이트리스트로 제한한다. 임의 문자열(예: destination-out)을 열어 두면
// 가져온 템플릿 JSON이 아래 레이어를 지울 수 있기 때문이다(templateStore가 같은 목록으로 검증한다).
export const BLEND_MODES = ["multiply", "screen", "overlay", "darken", "lighten"] as const;
export type BlendMode = (typeof BLEND_MODES)[number];

export type Layer = ImageLayer | TextLayer | StickerLayer | ShapeLayer;

export interface BaseLayer {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  name: string;
  shadow?: ShadowStyle; // 모든 레이어 공통 그림자(텍스트·도형·이미지)
  blendMode?: BlendMode; // 없으면 일반(normal)
  groupId?: string; // 같은 값이면 한 그룹: 캔버스 이동·표시·잠금을 함께 적용한다(멤버 2개 미만이면 자동 해제)
  opacity?: number; // 0~1, 기본 1(불투명). 워터마크 등 반투명 레이어에 쓴다.
  // 블렌드 모드는 BLEND_MODES 화이트리스트만 허용한다(위 상수 주석 참고).
}

export interface ImageFilters {
  brightness?: number; // -1~1, 0이 원본
  contrast?: number; // -100~100, 0이 원본
  blur?: number; // 0~40 px
  saturation?: number; // -1~1, 0이 원본
  hue?: number; // -180~180도, 0이 원본
  grain?: number; // 0~100, 필름 입자(노이즈)
  mosaic?: number; // 0~40, 모자이크 블록 크기(px)
  grayscale?: boolean;
  sepia?: boolean;
}

export interface ImageLayer extends BaseLayer {
  type: "image";
  src: string;
  filters?: ImageFilters;
  cornerRadius?: number; // 모서리 둥글기(px)
  borderColor?: string;
  borderWidth?: number;
  cropZoom?: number; // 1~5, 자르기 확대 배율(1=박스를 꽉 채우는 cover)
  focusX?: number; // 0~1, 확대된 이미지에서 보여줄 가로 위치(0.5=중앙)
  focusY?: number; // 0~1, 세로 위치
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
}

export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  strokeColor?: string;
  strokeWidth?: number;
  shadow?: ShadowStyle;
  backgroundColor?: string;
}

export interface StickerLayer extends BaseLayer {
  type: "sticker";
  assetId: string;
  src: string;
}

export interface ShapeLayer extends BaseLayer {
  type: "shape";
  shapeType: "rectangle" | "circle" | "star" | "triangle" | "heart" | "bubble" | "arrow" | "bolt" | "bookmark" | "speechBubble";
  fillColor: string;
  fillGradient?: GradientFill; // 있으면 fillColor 대신 사용
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export interface ShadowStyle {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

export interface Template {
  id: string;
  name: string;
  width: number;
  height: number;
  category: "meme" | "card";
  layers: Layer[];
  license: LicenseInfo;
}

export interface LicenseInfo {
  source: string;
  license: string;
  author: string;
  commercialUse: boolean | "확인 필요";
  modifiable: boolean | "확인 필요";
  attributionRequired: boolean;
  verifiedAt: string;
}

export interface EditHistoryEntry {
  timestamp: string;
  snapshot: CanvasProject;
}

export interface DownloadSettings {
  format: "png" | "jpg";
  quality: number;
  fileName: string;
}

export interface UserSettings {
  language: "ko";
  lastUsedFont: string;
  lastCanvasSize: { width: number; height: number };
}
