import type { PathShapeType } from "./shapes";

export type ShapeKind = "rectangle" | "rounded" | "circle" | "star" | "triangle" | "line" | PathShapeType;

export const SHAPE_OPTIONS: Array<{ kind: ShapeKind; label: string; icon?: string }> = [
  { kind: "rectangle", label: "사각형", icon: "■" },
  { kind: "rounded", label: "둥근 사각형", icon: "▢" },
  { kind: "circle", label: "원", icon: "●" },
  { kind: "star", label: "별", icon: "★" },
  { kind: "triangle", label: "삼각형", icon: "▲" },
  { kind: "line", label: "구분선", icon: "━" },
  { kind: "heart", label: "하트" },
  { kind: "bubble", label: "말풍선" },
  { kind: "arrow", label: "화살표" },
  { kind: "bolt", label: "번개" },
  { kind: "bookmark", label: "북마크" },
  { kind: "diamond", label: "마름모" },
  { kind: "cloud", label: "구름" },
  { kind: "check", label: "체크" },
  { kind: "plus", label: "더하기" },
  { kind: "ribbon", label: "리본" },
];
