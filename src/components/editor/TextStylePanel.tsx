import type { TextLayer } from "../../types/canvas";
import { PanelSection } from "./PanelSection";
import { GradientEditor } from "./DesignControls";
import { SHADOW_PRESETS } from "../../features/design/effects";

interface Props {
  layer: TextLayer;
  onChange: (changes: Partial<TextLayer>) => void;
}

// 웹폰트는 index.html의 Google Fonts(모두 SIL OFL)에서 불러온다. 캔버스 쪽 로딩은 CanvasStage의 fontKey 효과가 맡는다.
const FONT_OPTIONS = [
  "IBM Plex Sans KR", "Noto Sans KR", "Noto Serif KR", "Gowun Batang",
  "Black Han Sans", "Jua", "Do Hyeon", "Gaegu", "Nanum Pen Script",
  "Malgun Gothic", "Arial", "Georgia",
];

export function TextStylePanel({ layer, onChange }: Props) {
  return (
    <PanelSection title="텍스트" label="텍스트 스타일">
      {(
        <div className="panel-fields">
          <label>
            <span>문구</span>
            <textarea
              className="text-input"
              value={layer.text}
              rows={3}
              onChange={(event) => onChange({ text: event.target.value })}
              placeholder="문구를 입력하세요"
            />
          </label>

          <label>
            <span>글꼴</span>
            <select value={layer.fontFamily} onChange={(event) => onChange({ fontFamily: event.target.value })}>
              {(FONT_OPTIONS.includes(layer.fontFamily) ? FONT_OPTIONS : [layer.fontFamily, ...FONT_OPTIONS]).map((font) => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}
            </select>
          </label>

          <label>
            <span>크기 <output>{layer.fontSize} px</output></span>
            <input type="range" min="12" max="240" value={layer.fontSize} onChange={(event) => onChange({ fontSize: Number(event.target.value) })} />
          </label>

          <label>
            <span>줄 간격 <output>{layer.lineHeight.toFixed(2)}</output></span>
            <input type="range" min="0.8" max="2.4" step="0.05" value={layer.lineHeight} onChange={(event) => onChange({ lineHeight: Number(event.target.value) })} />
          </label>

          <label>
            <span>글자 간격 <output>{layer.letterSpacing}</output></span>
            <input type="range" min="-5" max="40" value={layer.letterSpacing} onChange={(event) => onChange({ letterSpacing: Number(event.target.value) })} />
          </label>

          <GradientEditor label="글자 색" color={layer.color} gradient={layer.fillGradient} showPresets onColorChange={(color) => onChange({ color })} onGradientChange={(fillGradient) => onChange({ fillGradient })} />

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

          <fieldset>
            <legend>그림자</legend>
            <div className="chip-row" role="group" aria-label="그림자 프리셋">
              {SHADOW_PRESETS.map((preset) => (
                <button key={preset.label} type="button" onClick={() => onChange({ shadow: preset.shadow ? { ...preset.shadow } : undefined })}>{preset.label}</button>
              ))}
            </div>
            <label className="toggle-row">
              <input type="checkbox" checked={!!layer.shadow} onChange={(event) => onChange({ shadow: event.target.checked ? { offsetX: 4, offsetY: 4, blur: 8, color: "#000000" } : undefined })} />
              <span>사용</span>
            </label>
            {layer.shadow && (
              <div className="panel-fields">
                <div className="color-field">
                  <input type="color" value={layer.shadow.color} onChange={(event) => onChange({ shadow: { ...layer.shadow!, color: event.target.value } })} aria-label="그림자 색상" />
                  <input type="range" min="0" max="40" value={layer.shadow.blur} onChange={(event) => onChange({ shadow: { ...layer.shadow!, blur: Number(event.target.value) } })} aria-label="그림자 번짐" />
                  <output>{layer.shadow.blur}</output>
                </div>
                <div className="shadow-grid">
                  <label><span>가로 <output>{layer.shadow.offsetX}</output></span>
                    <input type="range" min="-30" max="30" value={layer.shadow.offsetX} onChange={(event) => onChange({ shadow: { ...layer.shadow!, offsetX: Number(event.target.value) } })} /></label>
                  <label><span>세로 <output>{layer.shadow.offsetY}</output></span>
                    <input type="range" min="-30" max="30" value={layer.shadow.offsetY} onChange={(event) => onChange({ shadow: { ...layer.shadow!, offsetY: Number(event.target.value) } })} /></label>
                </div>
              </div>
            )}
          </fieldset>
        </div>
      )}
    </PanelSection>
  );
}
