import { BLEND_MODES } from "../../types/canvas";
import type { BlendMode, ImageFilters, ImageLayer, Layer, ShapeLayer, TextLayer } from "../../types/canvas";
import { TextStylePanel } from "./TextStylePanel";

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

const ALIGN_BUTTONS: Array<{ mode: AlignMode; icon: string; label: string }> = [
  { mode: "left", icon: "⇤", label: "왼쪽" },
  { mode: "hcenter", icon: "↔", label: "가로 가운데" },
  { mode: "right", icon: "⇥", label: "오른쪽" },
  { mode: "top", icon: "⤒", label: "위" },
  { mode: "vcenter", icon: "↕", label: "세로 가운데" },
  { mode: "bottom", icon: "⤓", label: "아래" },
];

const BLEND_LABELS: Record<BlendMode, string> = { multiply: "곱하기", screen: "스크린", overlay: "오버레이", darken: "어둡게", lighten: "밝게" };

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
  onCompareOriginal: (active: boolean) => void;
  onAlign: (mode: AlignMode) => void;
  layer: Layer | null;
  onChange: (changes: Partial<Layer>, coalesceKey?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const FILTER_PRESETS: Array<{ label: string; filters: ImageFilters }> = [
  { label: "원본", filters: {} },
  { label: "흑백", filters: { grayscale: true } },
  { label: "세피아", filters: { sepia: true } },
  { label: "선명", filters: { contrast: 25, brightness: 0.05 } },
  { label: "어둡게", filters: { brightness: -0.3 } },
  { label: "흐림", filters: { blur: 8 } },
];

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
    <section className="panel-section" aria-label="이미지 자르기">
      <h3>자르기</h3>
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
    </section>
  );
}

function ShapeSection({ layer, onChange }: { layer: ShapeLayer; onChange: Props["onChange"] }) {
  return (
    <section className="panel-section" aria-label="도형 스타일">
      <h3>도형</h3>
      <div className="panel-fields">
        <label><span>채우기</span><div className="color-field"><input type="color" value={layer.fillColor} onChange={(e) => onChange({ fillColor: e.target.value }, "shape-fill")} /><input value={layer.fillColor} onChange={(e) => onChange({ fillColor: e.target.value }, "shape-fill")} aria-label="채우기 색상 코드" /></div></label>
        <label><span>테두리</span><div className="color-field"><input type="color" value={layer.strokeColor ?? "#000000"} onChange={(e) => onChange({ strokeColor: e.target.value }, "shape-stroke")} /><input type="range" min="0" max="40" value={layer.strokeWidth ?? 0} onChange={(e) => onChange({ strokeWidth: Number(e.target.value) }, "shape-stroke-w")} aria-label="테두리 두께" /><output>{layer.strokeWidth ?? 0}</output></div></label>
        {layer.shapeType === "rectangle" && (
          <label><span>모서리 둥글기 <output>{layer.cornerRadius ?? 0}</output></span><input type="range" min="0" max="300" value={layer.cornerRadius ?? 0} onChange={(e) => onChange({ cornerRadius: Number(e.target.value) }, "shape-radius")} /></label>
        )}
      </div>
    </section>
  );
}

function ImageAdjustSection({ layer, onChange, onCompareOriginal }: { layer: ImageLayer; onChange: Props["onChange"]; onCompareOriginal: Props["onCompareOriginal"] }) {
  const filters = layer.filters ?? {};
  const setFilters = (changes: ImageFilters, key?: string) => onChange({ filters: { ...filters, ...changes } }, key);

  return (
    <section className="panel-section" aria-label="이미지 보정">
      <h3>이미지 보정</h3>
      <button type="button" className="btn" title="누르고 있는 동안 보정 전 원본을 보여 줍니다"
        onPointerDown={() => onCompareOriginal(true)} onPointerUp={() => onCompareOriginal(false)} onPointerLeave={() => onCompareOriginal(false)} onPointerCancel={() => onCompareOriginal(false)}>
        ◐ 누르는 동안 원본 보기
      </button>
      <div className="filter-presets">
        {FILTER_PRESETS.map((preset) => (
          <button key={preset.label} type="button" onClick={() => onChange({ filters: preset.filters })}>{preset.label}</button>
        ))}
      </div>
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
      </div>
    </section>
  );
}

export function PropertiesPanel({ layer, canvasSize, isCropMode, onToggleCropMode, onCompareOriginal, onAlign, onChange, onDuplicate, onDelete }: Props) {
  if (!layer) {
    return (
      <aside className="properties-panel" aria-label="속성">
        <h2>속성</h2>
        <p className="panel-placeholder">캔버스에서 레이어를 선택하면 속성이 나타납니다.<br />단축키: Ctrl+Z 실행 취소 · Ctrl+Shift+Z 다시 실행 · Ctrl+D 복제 · Delete 삭제 · 방향키 이동</p>
      </aside>
    );
  }

  return (
    <aside className="properties-panel" aria-label="속성">
      <div className="panel-title-row">
        <h2>{layer.name}</h2>
        <div className="panel-title-actions">
          <button type="button" onClick={onDuplicate} title="복제 (Ctrl+D)" aria-label="복제">⧉</button>
          <button type="button" className="danger" onClick={onDelete} title="삭제 (Delete)" aria-label="삭제">✕</button>
        </div>
      </div>

      {layer.type === "text" && (
        <TextStylePanel layer={layer as TextLayer} onChange={(changes) => onChange(changes, "text-style")} />
      )}
      {layer.type === "image" && <ImageCropSection layer={layer} canvasSize={canvasSize} isCropMode={isCropMode} onToggleCropMode={onToggleCropMode} onChange={onChange} />}
      {layer.type === "shape" && <ShapeSection layer={layer} onChange={onChange} />}
      {layer.type === "image" && <ImageAdjustSection layer={layer} onChange={onChange} onCompareOriginal={onCompareOriginal} />}

      <section className="panel-section" aria-label="공통 속성">
        <h3>공통</h3>
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
      </section>
    </aside>
  );
}
