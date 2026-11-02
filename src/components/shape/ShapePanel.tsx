import { useState } from "react";

export type ShapeKind = "rectangle" | "rounded" | "circle" | "star" | "triangle" | "line";

interface Props {
  onAddShape: (kind: ShapeKind, fillColor: string) => void;
}

const SHAPES: Array<{ kind: ShapeKind; label: string; icon: string }> = [
  { kind: "rectangle", label: "사각형", icon: "■" },
  { kind: "rounded", label: "둥근 사각형", icon: "▢" },
  { kind: "circle", label: "원", icon: "●" },
  { kind: "star", label: "별", icon: "★" },
  { kind: "triangle", label: "삼각형", icon: "▲" },
  { kind: "line", label: "구분선", icon: "━" },
];

const SWATCHES = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#38bdf8", "#ffffff", "#111827"];

export function ShapePanel({ onAddShape }: Props) {
  const [color, setColor] = useState(SWATCHES[0]);
  return (
    <aside className="side-panel" aria-label="도형">
      <h2>도형</h2>
      <p className="panel-hint">색을 고른 뒤 도형을 누르면 캔버스 가운데에 추가됩니다. 색·테두리·모서리는 속성 패널에서 바꿀 수 있어요.</p>
      <div className="color-field">
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="도형 색상" />
        <div className="swatch-row">
          {SWATCHES.map((swatch) => (
            <button key={swatch} type="button" className={swatch === color ? "active" : ""} style={{ background: swatch }} onClick={() => setColor(swatch)} aria-label={`색상 ${swatch}`} />
          ))}
        </div>
      </div>
      <div className="shape-grid">
        {SHAPES.map((shape) => (
          <button key={shape.kind} type="button" className="preset-card shape-card" onClick={() => onAddShape(shape.kind, color)}>
            <span className="shape-icon" aria-hidden="true" style={{ color }}>{shape.icon}</span>
            <strong>{shape.label}</strong>
          </button>
        ))}
      </div>
    </aside>
  );
}
