import type { TextLayer } from "../../types/canvas";

interface Props {
  layer: TextLayer | null;
  onChange: (changes: Partial<TextLayer>) => void;
}

const FONT_OPTIONS = ["IBM Plex Sans KR", "Malgun Gothic", "Arial", "Georgia"];

export function TextStylePanel({ layer, onChange }: Props) {
  return (
    <aside className="text-style-panel" aria-label="텍스트 스타일">
      <h2>텍스트 스타일</h2>
      {!layer ? (
        <p className="panel-placeholder">캔버스에서 텍스트 레이어를 선택하세요.</p>
      ) : (
        <div className="panel-fields">
          <label>
            <span>문구</span>
            <textarea
              value={layer.text}
              rows={3}
              onChange={(event) => onChange({ text: event.target.value })}
              placeholder="문구를 입력하세요"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "7px",
                border: "1px solid var(--color-border)",
                background: "oklch(0.23 0.008 264)",
                color: "var(--color-text)",
                font: "inherit",
                fontSize: "12px",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </label>

          <label>
            <span>글꼴</span>
            <select value={layer.fontFamily} onChange={(event) => onChange({ fontFamily: event.target.value })}>
              {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}
            </select>
          </label>

          <label>
            <span>크기 <output>{layer.fontSize} px</output></span>
            <input type="range" min="12" max="240" value={layer.fontSize} onChange={(event) => onChange({ fontSize: Number(event.target.value) })} />
          </label>

          <label>
            <span>글자 색상</span>
            <div className="color-field">
              <input type="color" value={layer.color} onChange={(event) => onChange({ color: event.target.value })} />
              <input value={layer.color} onChange={(event) => onChange({ color: event.target.value })} aria-label="글자 색상 코드" />
            </div>
          </label>

          <fieldset>
            <legend>정렬 · 스타일</legend>
            <div className="segmented-controls">
              {(["left", "center", "right"] as const).map((align) => (
                <button key={align} type="button" className={layer.align === align ? "active" : ""} onClick={() => onChange({ align })} aria-label={`${align} 정렬`}>
                  {align === "left" ? "≡←" : align === "center" ? "≡" : "→≡"}
                </button>
              ))}
              <button type="button" className={layer.bold ? "active" : ""} onClick={() => onChange({ bold: !layer.bold })} aria-label="굵게"><strong>B</strong></button>
              <button type="button" className={layer.italic ? "active" : ""} onClick={() => onChange({ italic: !layer.italic })} aria-label="기울임"><em>I</em></button>
            </div>
          </fieldset>

          <fieldset>
            <legend>외곽선</legend>
            <label className="toggle-row">
              <input type="checkbox" checked={(layer.strokeWidth ?? 0) > 0} onChange={(event) => onChange({ strokeWidth: event.target.checked ? 6 : 0 })} />
              <span>사용</span>
            </label>
            <div className="color-field">
              <input type="color" value={layer.strokeColor ?? "#000000"} onChange={(event) => onChange({ strokeColor: event.target.value })} />
              <input type="range" min="0" max="24" value={layer.strokeWidth ?? 0} onChange={(event) => onChange({ strokeWidth: Number(event.target.value) })} aria-label="외곽선 두께" />
              <output>{layer.strokeWidth ?? 0} px</output>
            </div>
          </fieldset>
        </div>
      )}
    </aside>
  );
}
