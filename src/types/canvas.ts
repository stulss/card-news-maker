// PRD.md 21장 "데이터 구조" 그대로 이식.
// 인터페이스를 고칠 때는 PRD.md 21장도 같이 갱신할 것 (CLAUDE.md 4번 원칙).

export interface CanvasProject {
  id: string;
  width: number;
  height: number;
  backgroundColor: string;
  layers: Layer[];
  createdAt: string;
  updatedAt: string;
}

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
}

export interface ImageLayer extends BaseLayer {
  type: "image";
  src: string;
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
  shapeType: "rectangle" | "circle" | "speechBubble";
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
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
