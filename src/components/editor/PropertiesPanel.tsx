import { BLEND_MODES } from "../../types/canvas";
import { useState } from "react";
import type { BlendMode, GradientFill, ImageFilters, ImageLayer, Layer, ShapeLayer, TextLayer } from "../../types/canvas";
import { TextStylePanel } from "./TextStylePanel";
import { PanelSection } from "./PanelSection";
import { GradientEditor, ShadowFields } from "./DesignControls";

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

const ALIGN_BUTTONS: Array<{ mode: AlignMode; icon: string; label: string }> = [
  { mode: "left", icon: "⇤", label: "왼쪽" },
  { mode: "hcenter", icon: "↔", label: "가로 가운데" },
  { mode: "right", icon: "⇥", label: "오른쪽" },
  { mode: "top", icon: "⤒", label: "위" },
  { mode: "vcenter", icon: "↕", label: "세로 가운데" },
  { mode: "bottom", icon: "⤓", label: "아래" },
];

const BLEND_LABELS: Record<BlendMode, string> = {
  multiply: "곱하기", screen: "스크린", overlay: "오버레이", darken: "어둡게", lighten: "밝게",
  "color-dodge": "색상 닷지", "color-burn": "색상 번", "hard-light": "하드 라이트", "soft-light": "소프트 라이트", difference: "차이", exclusion: "제외",
};

const CROP_RATIOS: Array<{ label: string; ratio: number | "canvas" }> = [
  { label: "1:1", ratio: 1 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "캔버스", ratio: "canvas" },
];

interface Props {
  canvasSize: { width: number; height: number };
  isCropMode: boolean;
  onToggleCropMode: () => void;
  canPasteStyle: boolean;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  background: { color: string; gradient?: GradientFill };
  slideCount: number;
  onBackgroundChange: (background: { color: string; gradient?: GradientFill }, coalesceKey?: string) => void;
  onApplyBackgroundToAll: () => void;
  onCompareOriginal: (active: boolean) => void;
  onAlign: (mode: AlignMode) => void;
  layer: Layer | null;
  onChange: (changes: Partial<Layer>, coalesceKey?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

interface FilterPreset {
  label: string;
  filters: ImageFilters;
}

// LightCraft의 프리셋 패널(흑백·컬러·필름·푸드·풍경·인물)을 참고해 이 프로젝트의 필터로 새로 구성한 룩 모음.
const PRESET_GROUPS: Array<{ title: string; presets: FilterPreset[] }> = [
  { title: "흑백", presets: [
    { label: "하이 콘트라스트", filters: { grayscale: true, contrast: 35 } },
    { label: "소프트 흑백", filters: { grayscale: true, contrast: -10, brightness: 0.05 } },
    { label: "세피아 톤", filters: { sepia: true, contrast: 6 } },
  ] },
  { title: "컬러", presets: [
    { label: "웜 글로우", filters: { hue: -12, saturation: 0.15, brightness: 0.04 } },
    { label: "쿨 모닝", filters: { hue: 18, saturation: -0.05, brightness: 0.04 } },
    { label: "비비드 팝", filters: { saturation: 0.55, contrast: 18 } },
    { label: "소프트 파스텔", filters: { saturation: -0.25, brightness: 0.12, contrast: -12 } },
  ] },
  { title: "필름", presets: [
    { label: "페이드 매트", filters: { contrast: -18, brightness: 0.06, saturation: -0.2, grain: 12 } },
    { label: "웜 필름", filters: { hue: -8, saturation: -0.1, contrast: 8, grain: 22, vignette: 20 } },
    { label: "빈티지", filters: { sepia: true, contrast: 10, grain: 25 } },
    { label: "시네마", filters: { contrast: 18, saturation: -0.15, vignette: 45, grain: 14 } },
  ] },
  { title: "푸드", presets: [
    { label: "프레시 브라이트", filters: { brightness: 0.1, saturation: 0.3, contrast: 10 } },
    { label: "따뜻한 식탁", filters: { hue: -10, saturation: 0.25, brightness: 0.04 } },
    { label: "다크 무디", filters: { brightness: -0.12, contrast: 28, saturation: -0.1, vignette: 35 } },
  ] },
  { title: "풍경", presets: [
    { label: "선명한 풍경", filters: { contrast: 22, saturation: 0.3 } },
    { label: "골든 아워", filters: { hue: -14, saturation: 0.3, brightness: 0.05, vignette: 15 } },
    { label: "차가운 톤", filters: { hue: -20, saturation: 0.15, brightness: 0.04 } },
  ] },
  { title: "인물", presets: [
    { label: "부드러운 피부", filters: { blur: 2, brightness: 0.05, contrast: -8 } },
    { label: "밝고 산뜻하게", filters: { brightness: 0.14, contrast: -6, saturation: 0.1 } },
    { label: "어둡게", filters: { brightness: -0.3 } },
  ] },
];

const FILTER_PRESETS: FilterPreset[] = [{ label: "원본", filters: {} }, ...PRESET_GROUPS.flatMap((group) => group.presets)];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// 프리셋 강도(0~200%): 숫자 값은 비례해서 키우고 줄인다. 흑백·세피아는 켜짐/꺼짐뿐이라 강도 50% 이상에서 켠다.
function scaleFilters(filters: ImageFilters, factor: number): ImageFilters {
  const out: ImageFilters = {};
  if (filters.brightness !== undefined) out.brightness = clamp(filters.brightness * factor, -1, 1);
  if (filters.contrast !== undefined) out.contrast = clamp(filters.contrast * factor, -100, 100);
  if (filters.blur !== undefined) out.blur = clamp(filters.blur * factor, 0, 40);
  if (filters.saturation !== undefined) out.saturation = clamp(filters.saturation * factor, -1, 1);
  if (filters.hue !== undefined) out.hue = clamp(filters.hue * factor, -180, 180);
  if (filters.grain !== undefined) out.grain = clamp(filters.grain * factor, 0, 100);
  if (filters.mosaic !== undefined) out.mosaic = clamp(filters.mosaic * factor, 0, 40);
  if (filters.vignette !== undefined) out.vignette = clamp(filters.vignette * factor, 0, 100);
  if (filters.grayscale && factor >= 0.5) out.grayscale = true;
  if (filters.sepia && factor >= 0.5) out.sepia = true;
  return out;
}

function ImageCropSection({ layer, canvasSize, isCropMode, onToggleCropMode, onChange }: { layer: ImageLayer; canvasSize: Props["canvasSize"]; isCropMode: boolean; onToggleCropMode: () => void; onChange: Props["onChange"] }) {
  const zoom = layer.cropZoom ?? 1;
  // 박스 비율을 바꾸면 중심은 유지하고, 캔버스 안에 들어오도록 가로·세로를 함께 줄인다.
  const applyRatio = (ratio: number | "canvas") => {
    const target = ratio === "canvas" ? canvasSize.width / canvasSize.height : ratio;
    let width = Math.max(layer.width, layer.height * target);
    let height = width / target;
    const fit = Math.min(1, canvasSize.width / width, canvasSize.height / height);
    width *= fit;
    height *= fit;
    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    onChange({ width, height, x: centerX - width / 2, y: centerY - height / 2 });
  };
  return (
    <PanelSection title="자르기" label="이미지 자르기">
      <button type="button" className={`btn ${isCropMode ? "primary" : ""}`} aria-pressed={isCropMode} onClick={onToggleCropMode}>
        {isCropMode ? "✓ 캔버스에서 자르는 중 (눌러서 완료)" : "✂ 캔버스에서 직접 자르기"}
      </button>
      <div className="filter-presets">
        {CROP_RATIOS.map((preset) => (
          <button key={preset.label} type="button" onClick={() => applyRatio(preset.ratio)}>{preset.label}</button>
        ))}
      </div>
      <div className="panel-fields">
        <label>
          <span>확대 <output>{Math.round(zoom * 100)}%</output></span>
          <input type="range" min="100" max="500" value={Math.round(zoom * 100)} onChange={(e) => onChange({ cropZoom: Number(e.target.value) / 100 }, "crop-zoom")} />
        </label>
        <label>
          <span>가로 위치 <output>{Math.round((layer.focusX ?? 0.5) * 100)}</output></span>
          <input type="range" min="0" max="100" value={Math.round((layer.focusX ?? 0.5) * 100)} onChange={(e) => onChange({ focusX: Number(e.target.value) / 100 }, "crop-x")} />
        </label>
        <label>
          <span>세로 위치 <output>{Math.round((layer.focusY ?? 0.5) * 100)}</output></span>
          <input type="range" min="0" max="100" value={Math.round((layer.focusY ?? 0.5) * 100)} onChange={(e) => onChange({ focusY: Number(e.target.value) / 100 }, "crop-y")} />
        </label>
        <button type="button" className="btn" onClick={() => onChange({ cropZoom: 1, focusX: 0.5, focusY: 0.5 })}>자르기 초기화</button>
      </div>
    </PanelSection>
  );
}

function ShapeSection({ layer, onChange }: { layer: ShapeLayer; onChange: Props["onChange"] }) {
  return (
    <PanelSection title="도형" label="도형 스타일">
      <GradientEditor label="채우기" color={layer.fillColor} gradient={layer.fillGradient} showPresets
        onColorChange={(color) => onChange({ fillColor: color }, "shape-fill")}
        onGradientChange={(gradient) => onChange({ fillGradient: gradient })} />
      <div className="panel-fields">
        <label><span>테두리</span><div className="color-field"><input type="color" value={layer.strokeColor ?? "#000000"} onChange={(e) => onChange({ strokeColor: e.target.value }, "shape-stroke")} /><input type="range" min="0" max="40" value={layer.strokeWidth ?? 0} onChange={(e) => onChange({ strokeWidth: Number(e.target.value) }, "shape-stroke-w")} aria-label="테두리 두께" /><output>{layer.strokeWidth ?? 0}</output></div></label>
        {layer.shapeType === "rectangle" && (
          <label><span>모서리 둥글기 <output>{layer.cornerRadius ?? 0}</output></span><input type="range" min="0" max="300" value={layer.cornerRadius ?? 0} onChange={(e) => onChange({ cornerRadius: Number(e.target.value) }, "shape-radius")} /></label>
        )}
      </div>
    </PanelSection>
  );
}

function ImageStyleSection({ layer, onChange }: { layer: ImageLayer; onChange: Props["onChange"] }) {
  return (
    <PanelSection title="모양" label="이미지 모양">
      <div className="panel-fields">
        <label><span>모서리 둥글기 <output>{layer.cornerRadius ?? 0}</output></span>
          <input type="range" min="0" max="500" value={layer.cornerRadius ?? 0} onChange={(e) => onChange({ cornerRadius: Number(e.target.value) }, "image-radius")} /></label>
        <label><span>테두리</span>
          <div className="color-field"><input type="color" value={layer.borderColor ?? "#ffffff"} onChange={(e) => onChange({ borderColor: e.target.value }, "image-border")} />
            <input type="range" min="0" max="60" value={layer.borderWidth ?? 0} onChange={(e) => onChange({ borderWidth: Number(e.target.value) }, "image-border-w")} aria-label="테두리 두께" /><output>{layer.borderWidth ?? 0}</output></div></label>
      </div>
    </PanelSection>
  );
}

function BackgroundSection({ background, slideCount, onBackgroundChange, onApplyBackgroundToAll }: Pick<Props, "background" | "slideCount" | "onBackgroundChange" | "onApplyBackgroundToAll">) {
  return (
    <PanelSection title="캔버스 배경" label="캔버스 배경">
      <GradientEditor label="배경" color={background.color} gradient={background.gradient} showPresets
        onColorChange={(color) => onBackgroundChange({ color, gradient: undefined }, "bg-color")}
        onGradientChange={(gradient) => onBackgroundChange({ color: background.color, gradient })} />
      {slideCount > 1 && <button type="button" className="btn" onClick={onApplyBackgroundToAll}>이 배경을 모든 슬라이드({slideCount}장)에 적용</button>}
    </PanelSection>
  );
}

function ImageAdjustSection({ layer, onChange, onCompareOriginal }: { layer: ImageLayer; onChange: Props["onChange"]; onCompareOriginal: Props["onCompareOriginal"] }) {
  const filters = layer.filters ?? {};
  const [preset, setPreset] = useState<string | null>(null);
  const [amount, setAmount] = useState(100);
  const activePreset = FILTER_PRESETS.find((candidate) => candidate.label === preset && candidate.label !== "원본");
  const setFilters = (changes: ImageFilters, key?: string) => onChange({ filters: { ...filters, ...changes } }, key);

  return (
    <PanelSection title="이미지 보정" label="이미지 보정">
      <button type="button" className="btn" title="누르고 있는 동안 보정 전 원본을 보여 줍니다"
        onPointerDown={() => onCompareOriginal(true)} onPointerUp={() => onCompareOriginal(false)} onPointerLeave={() => onCompareOriginal(false)} onPointerCancel={() => onCompareOriginal(false)}>
        ◐ 누르는 동안 원본 보기
      </button>
      <div className="filter-presets">
        <button type="button" className={preset === "원본" || preset === null ? "active" : ""} aria-pressed={preset === "원본"}
          onClick={() => { setPreset("원본"); setAmount(100); onChange({ filters: {} }); }}>원본</button>
      </div>
      {PRESET_GROUPS.map((group) => (
        <div key={group.title} className="preset-group">
          <span className="preset-group-label">{group.title}</span>
          <div className="filter-presets">
            {group.presets.map((candidate) => (
              <button key={candidate.label} type="button" className={preset === candidate.label ? "active" : ""} aria-pressed={preset === candidate.label}
                onClick={() => { setPreset(candidate.label); setAmount(100); onChange({ filters: scaleFilters(candidate.filters, 1) }); }}>{candidate.label}</button>
            ))}
          </div>
        </div>
      ))}
      {activePreset && (
        <label className="panel-fields">
          <span className="preset-amount-label">프리셋 강도 <output>{amount}%</output></span>
          <input type="range" min="0" max="200" value={amount} onChange={(event) => { const next = Number(event.target.value); setAmount(next); onChange({ filters: scaleFilters(activePreset.filters, next / 100) }, "filter-preset"); }} />
        </label>
      )}
      <div className="panel-fields">
        <label>
          <span>밝기 <output>{Math.round((filters.brightness ?? 0) * 100)}</output></span>
          <input type="range" min="-100" max="100" value={Math.round((filters.brightness ?? 0) * 100)} onChange={(e) => setFilters({ brightness: Number(e.target.value) / 100 }, "filter-brightness")} />
        </label>
        <label>
          <span>대비 <output>{filters.contrast ?? 0}</output></span>
          <input type="range" min="-100" max="100" value={filters.contrast ?? 0} onChange={(e) => setFilters({ contrast: Number(e.target.value) }, "filter-contrast")} />
        </label>
        <label>
          <span>흐림 <output>{filters.blur ?? 0}</output></span>
          <input type="range" min="0" max="40" value={filters.blur ?? 0} onChange={(e) => setFilters({ blur: Number(e.target.value) }, "filter-blur")} />
        </label>
        <label>
          <span>채도 <output>{Math.round((filters.saturation ?? 0) * 100)}</output></span>
          <input type="range" min="-100" max="100" value={Math.round((filters.saturation ?? 0) * 100)} onChange={(e) => setFilters({ saturation: Number(e.target.value) / 100 }, "filter-sat")} />
        </label>
        <label>
          <span>색조 <output>{filters.hue ?? 0}°</output></span>
          <input type="range" min="-180" max="180" value={filters.hue ?? 0} onChange={(e) => setFilters({ hue: Number(e.target.value) }, "filter-hue")} />
        </label>
        <label>
          <span>필름 입자 <output>{filters.grain ?? 0}</output></span>
          <input type="range" min="0" max="100" value={filters.grain ?? 0} onChange={(e) => setFilters({ grain: Number(e.target.value) }, "filter-grain")} />
        </label>
        <label>
          <span>모자이크 <output>{filters.mosaic ?? 0}</output></span>
          <input type="range" min="0" max="40" value={filters.mosaic ?? 0} onChange={(e) => setFilters({ mosaic: Number(e.target.value) }, "filter-mosaic")} />
        </label>
        <label>
          <span>비네팅 <output>{filters.vignette ?? 0}</output></span>
          <input type="range" min="0" max="100" value={filters.vignette ?? 0} onChange={(e) => setFilters({ vignette: Number(e.target.value) }, "filter-vignette")} />
        </label>
      </div>
    </PanelSection>
  );
}

export function PropertiesPanel({ layer, canvasSize, isCropMode, onToggleCropMode, canPasteStyle, onCopyStyle, onPasteStyle, background, slideCount, onBackgroundChange, onApplyBackgroundToAll, onCompareOriginal, onAlign, onChange, onDuplicate, onDelete }: Props) {
  if (!layer) {
    return (
      <aside className="properties-panel" aria-label="속성">
        <h2>속성</h2>
        <BackgroundSection background={background} slideCount={slideCount} onBackgroundChange={onBackgroundChange} onApplyBackgroundToAll={onApplyBackgroundToAll} />
        <p className="panel-placeholder">캔버스에서 레이어를 선택하면 해당 속성이 나타납니다. 단축키는 <kbd>?</kbd>, 모든 기능은 <kbd>Ctrl</kbd>+<kbd>K</kbd>.</p>
      </aside>
    );
  }

  return (
    <aside className="properties-panel" aria-label="속성">
      <div className="panel-title-row">
        <h2>{layer.name}</h2>
        <div className="panel-title-actions">
          <button type="button" onClick={onCopyStyle} title="이 레이어의 스타일 복사" aria-label="스타일 복사">⎘</button>
          <button type="button" onClick={onPasteStyle} disabled={!canPasteStyle} title="복사한 스타일 붙여넣기" aria-label="스타일 붙여넣기">⇩</button>
          <button type="button" onClick={onDuplicate} title="복제 (Ctrl+D)" aria-label="복제">⧉</button>
          <button type="button" className="danger" onClick={onDelete} title="삭제 (Delete)" aria-label="삭제">✕</button>
        </div>
      </div>

      {layer.type === "text" && (
        <TextStylePanel layer={layer as TextLayer} onChange={(changes) => onChange(changes, "text-style")} />
      )}
      {layer.type === "image" && <ImageCropSection layer={layer} canvasSize={canvasSize} isCropMode={isCropMode} onToggleCropMode={onToggleCropMode} onChange={onChange} />}
      {layer.type === "shape" && <ShapeSection layer={layer} onChange={onChange} />}
      {layer.type === "image" && <ImageStyleSection layer={layer} onChange={onChange} />}
      {layer.type === "image" && <ImageAdjustSection key={layer.id} layer={layer} onChange={onChange} onCompareOriginal={onCompareOriginal} />}

      <PanelSection title="공통" label="공통 속성">
        {layer.type !== "text" && <ShadowFields shadow={layer.shadow} onChange={(shadow) => onChange({ shadow })} />}
        <div className="align-row" role="group" aria-label="캔버스 기준 정렬">
          {ALIGN_BUTTONS.map((button) => (
            <button key={button.mode} type="button" title={`캔버스 ${button.label}에 맞춤`} aria-label={`캔버스 ${button.label}에 맞춤`} onClick={() => onAlign(button.mode)}>{button.icon}</button>
          ))}
        </div>
        <div className="panel-fields">
          <label>
            <span>혼합 모드</span>
            <select value={layer.blendMode ?? ""} onChange={(e) => onChange({ blendMode: (e.target.value || undefined) as BlendMode | undefined })}>
              <option value="">일반</option>
              {BLEND_MODES.map((mode) => <option key={mode} value={mode}>{BLEND_LABELS[mode]}</option>)}
            </select>
          </label>
          <label>
            <span>투명도 <output>{Math.round((layer.opacity ?? 1) * 100)}%</output></span>
            <input type="range" min="0" max="100" value={Math.round((layer.opacity ?? 1) * 100)} onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 }, "opacity")} />
          </label>
        </div>
      </PanelSection>
    </aside>
  );
}
