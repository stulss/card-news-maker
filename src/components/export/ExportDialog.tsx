import { useEffect, useState } from "react";
import { estimateBytes, formatBytes } from "../../features/export/exportImage";
import type { ExportSettings, WatermarkPosition } from "../../features/export/exportImage";
import type { ExportFormat } from "../../features/export/downloadCanvas";

interface Props {
  settings: ExportSettings;
  baseSize: { width: number; height: number };
  onChange: (settings: ExportSettings) => void;
  onClose: () => void;
  onRender: (settings: ExportSettings) => Promise<string>;
  onDownload: (settings: ExportSettings) => void;
}

const FORMATS: Array<{ id: ExportFormat; label: string }> = [{ id: "png", label: "PNG" }, { id: "jpg", label: "JPG" }, { id: "webp", label: "WebP" }];
const SCALES: Array<{ id: ExportSettings["scale"]; label: string }> = [{ id: 0.5, label: "50%" }, { id: 1, label: "100%" }, { id: 2, label: "200%" }];
const POSITIONS: Array<{ id: WatermarkPosition; label: string }> = [
  { id: "br", label: "오른쪽 아래" }, { id: "bl", label: "왼쪽 아래" }, { id: "tr", label: "오른쪽 위" }, { id: "tl", label: "왼쪽 위" }, { id: "center", label: "가운데" },
];

export function ExportDialog({ settings, baseSize, onChange, onClose, onRender, onDownload }: Props) {
  const [preview, setPreview] = useState<{ url: string; bytes: number } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 설정이 바뀔 때마다(짧게 지연) 실제로 인코딩해 보고 예상 용량·미리보기를 갱신한다.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      onRender(settings).then((url) => {
        if (cancelled) return;
        setPreview({ url, bytes: estimateBytes(url) });
        setPreviewError(null);
      }).catch((error: unknown) => {
        if (cancelled) return;
        setPreview(null);
        setPreviewError(error instanceof Error ? error.message : "미리보기를 만들지 못했습니다.");
      });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [settings, onRender]);

  const setWatermark = (changes: Partial<ExportSettings["watermark"]>) => onChange({ ...settings, watermark: { ...settings.watermark, ...changes } });
  const outWidth = Math.round(baseSize.width * settings.scale);
  const outHeight = Math.round(baseSize.height * settings.scale);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal export-dialog" role="dialog" aria-modal="true" aria-label="내보내기">
        <header className="modal-header">
          <h2>내보내기</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">✕</button>
        </header>

        <div className="modal-body export-body">
          <div className="export-preview" aria-label="미리보기">
            {preview ? <img src={preview.url} alt="내보내기 미리보기" /> : <span>{previewError ?? "미리보기 생성 중…"}</span>}
          </div>

          <div className="export-options">
            <div className="field-group">
              <span className="field-label">형식</span>
              <div className="chip-row" role="group" aria-label="형식">
                {FORMATS.map((format) => (
                  <button key={format.id} type="button" className={settings.format === format.id ? "active" : ""} aria-pressed={settings.format === format.id} onClick={() => onChange({ ...settings, format: format.id })}>{format.label}</button>
                ))}
              </div>
            </div>

            <label className="field-group">
              <span className="field-label">품질 <output>{settings.format === "png" ? "무손실" : settings.quality}</output></span>
              <input type="range" min="1" max="100" value={settings.quality} disabled={settings.format === "png"} onChange={(event) => onChange({ ...settings, quality: Number(event.target.value) })} />
            </label>

            <div className="field-group">
              <span className="field-label">크기 <output>{outWidth} × {outHeight}px</output></span>
              <div className="chip-row" role="group" aria-label="크기">
                {SCALES.map((scale) => (
                  <button key={scale.id} type="button" className={settings.scale === scale.id ? "active" : ""} aria-pressed={settings.scale === scale.id} onClick={() => onChange({ ...settings, scale: scale.id })}>{scale.label}</button>
                ))}
              </div>
            </div>

            <fieldset className="field-group watermark-group">
              <legend className="field-label">워터마크</legend>
              <label className="toggle-row"><input type="checkbox" checked={settings.watermark.enabled} onChange={(event) => setWatermark({ enabled: event.target.checked })} /><span>글자 워터마크 넣기</span></label>
              {settings.watermark.enabled && (
                <>
                  <input className="text-input" value={settings.watermark.text} maxLength={60} placeholder="예: @my_account" aria-label="워터마크 문구" onChange={(event) => setWatermark({ text: event.target.value })} />
                  <select value={settings.watermark.position} aria-label="워터마크 위치" onChange={(event) => setWatermark({ position: event.target.value as WatermarkPosition })}>
                    {POSITIONS.map((position) => <option key={position.id} value={position.id}>{position.label}</option>)}
                  </select>
                  <label className="field-group"><span className="field-label">진하기 <output>{settings.watermark.opacity}%</output></span>
                    <input type="range" min="10" max="100" value={settings.watermark.opacity} onChange={(event) => setWatermark({ opacity: Number(event.target.value) })} /></label>
                  <label className="field-group"><span className="field-label">글자 크기 <output>{settings.watermark.size}%</output></span>
                    <input type="range" min="2" max="12" value={settings.watermark.size} onChange={(event) => setWatermark({ size: Number(event.target.value) })} /></label>
                </>
              )}
            </fieldset>
          </div>
        </div>

        <footer className="modal-footer">
          <span className="export-size">{previewError ? "⚠ " + previewError : preview ? `예상 용량 ${formatBytes(preview.bytes)}` : "계산 중…"}</span>
          <button type="button" className="btn" onClick={onClose}>취소</button>
          <button type="button" className="btn primary" disabled={!!previewError} onClick={() => onDownload(settings)}>다운로드</button>
        </footer>
      </div>
    </div>
  );
}
