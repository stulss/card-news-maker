import { useState } from "react";
import { PATH_SHAPES, isPathShape } from "../../features/design/shapes";
import { SHAPE_OPTIONS } from "../../features/design/shapeOptions";
import type { ShapeKind } from "../../features/design/shapeOptions";

export type { ShapeKind };

interface Props {
  onAddShape: (kind: ShapeKind, fillColor: string, gradient: boolean) => void;
}

const SWATCHES = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#38bdf8", "#ffffff", "#111827"];

export function ShapePanel({ onAddShape }: Props) {
  const [color, setColor] = useState(SWATCHES[0]);
  const [gradient, setGradient] = useState(false);
  return (
    <aside className="side-panel" aria-label="도형">
      <h2>도형</h2>
      <p className="panel-hint">색을 고른 뒤 도형을 누르면 캔버스 가운데에 추가됩니다. 색·그라디언트·테두리·그림자는 속성 패널에서 바꿀 수 있어요.</p>
      <div className="color-field">
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="도형 색상" />
        <div className="swatch-row">
          {SWATCHES.map((swatch) => (
            <button key={swatch} type="button" className={swatch === color ? "active" : ""} style={{ background: swatch }} onClick={() => setColor(swatch)} aria-label={`색상 ${swatch}`} />
          ))}
        </div>
      </div>
      <label className="toggle-row"><input type="checkbox" checked={gradient} onChange={(event) => setGradient(event.target.checked)} /><span>그라디언트로 추가</span></label>
      <div className="shape-grid">
        {SHAPE_OPTIONS.map((shape) => (
          <button key={shape.kind} type="button" className="preset-card shape-card" onClick={() => onAddShape(shape.kind, color, gradient)}>
            {isPathShape(shape.kind)
              ? <svg className="shape-icon" viewBox="0 0 100 100" aria-hidden="true"><path d={PATH_SHAPES[shape.kind]} fill={color} /></svg>
              : <span className="shape-icon" aria-hidden="true" style={{ color }}>{shape.icon}</span>}
            <strong>{shape.label}</strong>
          </button>
        ))}
      </div>
    </aside>
  );
}
