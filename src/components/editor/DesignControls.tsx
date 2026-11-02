import type { GradientFill, ShadowStyle } from "../../types/canvas";
import { GRADIENT_PRESETS, cssGradient } from "../../features/design/gradients";

/** 어떤 CSS 색(#hex 또는 rgba())이든 컬러 피커용 #rrggbb로 바꾼다. */
function toHex(color: string) {
  if (/^#[0-9a-f]{6}/i.test(color)) return color.slice(0, 7);
  const match = /rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(color);
  if (!match) return "#000000";
  return "#" + [match[1], match[2], match[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("");
}

function withAlpha(hex: string, alpha: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

interface GradientEditorProps {
  label: string;
  color: string;
  gradient?: GradientFill;
  showPresets?: boolean;
  onColorChange: (color: string) => void;
  onGradientChange: (gradient: GradientFill | undefined) => void;
}

/** 단색 ↔ 그라디언트 전환과 편집(색 두 개 + 각도 + 프리셋). 배경과 도형 채우기에서 함께 쓴다. */
export function GradientEditor({ label, color, gradient, showPresets = false, onColorChange, onGradientChange }: GradientEditorProps) {
  const hex = /^#[0-9a-f]{6}$/i.test(color) ? color : "#ffffff";
  return (
    <div className="panel-fields gradient-editor">
      <div className="field-group">
        <span className="field-label">{label}</span>
        <div className="chip-row" role="group" aria-label={`${label} 방식`}>
          <button type="button" className={!gradient ? "active" : ""} aria-pressed={!gradient} onClick={() => onGradientChange(undefined)}>단색</button>
          <button type="button" className={gradient ? "active" : ""} aria-pressed={!!gradient} onClick={() => onGradientChange(gradient ?? { from: hex, to: "#8b5cf6", angle: 135 })}>그라디언트</button>
        </div>
      </div>

      {!gradient ? (
        <div className="color-field">
          <input type="color" value={hex} onChange={(event) => onColorChange(event.target.value)} aria-label={`${label} 색상`} />
          <input value={color} onChange={(event) => onColorChange(event.target.value)} aria-label={`${label} 색상 코드`} />
        </div>
      ) : (
        <>
          <div className="gradient-preview" style={{ background: cssGradient(gradient) }} aria-hidden="true" />
          <div className="color-field">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(gradient.from) ? gradient.from : "#ffffff"} onChange={(event) => onGradientChange({ ...gradient, from: event.target.value })} aria-label="시작 색" />
            <span className="gradient-arrow" aria-hidden="true">→</span>
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(gradient.to) ? gradient.to : "#ffffff"} onChange={(event) => onGradientChange({ ...gradient, to: event.target.value })} aria-label="끝 색" />
            <button type="button" className="btn swap-btn" onClick={() => onGradientChange({ ...gradient, from: gradient.to, to: gradient.from })} title="색 바꾸기" aria-label="시작·끝 색 바꾸기">⇄</button>
          </div>
          <label className="field-group">
            <span className="field-label">각도 <output>{Math.round(gradient.angle)}°</output></span>
            <input type="range" min="0" max="360" value={gradient.angle} onChange={(event) => onGradientChange({ ...gradient, angle: Number(event.target.value) })} />
          </label>
        </>
      )}

      {showPresets && (
        <div className="gradient-presets" role="group" aria-label="그라디언트 프리셋">
          {GRADIENT_PRESETS.map((preset) => (
            <button key={preset.name} type="button" title={preset.name} aria-label={`${preset.name} 그라디언트`} style={{ background: cssGradient(preset.value) }} onClick={() => onGradientChange(preset.value)} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ShadowFieldsProps {
  shadow?: ShadowStyle;
  onChange: (shadow: ShadowStyle | undefined) => void;
}

/** 그림자 켜기/끄기와 색·번짐·오프셋(텍스트를 뺀 모든 레이어 공통). */
export function ShadowFields({ shadow, onChange }: ShadowFieldsProps) {
  return (
    <fieldset className="panel-fields shadow-fields">
      <legend>그림자</legend>
      <label className="toggle-row">
        <input type="checkbox" checked={!!shadow} onChange={(event) => onChange(event.target.checked ? { offsetX: 0, offsetY: 12, blur: 24, color: "rgba(0, 0, 0, 0.4)" } : undefined)} />
        <span>사용</span>
      </label>
      {shadow && (
        <>
          <div className="color-field">
            <input type="color" value={toHex(shadow.color)} onChange={(event) => onChange({ ...shadow, color: withAlpha(event.target.value, 0.45) })} aria-label="그림자 색상" />
            <input type="range" min="0" max="80" value={shadow.blur} onChange={(event) => onChange({ ...shadow, blur: Number(event.target.value) })} aria-label="그림자 번짐" />
            <output>{shadow.blur}</output>
          </div>
          <div className="shadow-grid">
            <label><span>가로 <output>{shadow.offsetX}</output></span>
              <input type="range" min="-60" max="60" value={shadow.offsetX} onChange={(event) => onChange({ ...shadow, offsetX: Number(event.target.value) })} /></label>
            <label><span>세로 <output>{shadow.offsetY}</output></span>
              <input type="range" min="-60" max="60" value={shadow.offsetY} onChange={(event) => onChange({ ...shadow, offsetY: Number(event.target.value) })} /></label>
          </div>
        </>
      )}
    </fieldset>
  );
}
