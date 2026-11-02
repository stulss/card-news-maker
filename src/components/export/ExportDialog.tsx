import { useEffect, useState } from "react";
import { estimateBytes, formatBytes } from "../../features/export/exportImage";
import type { ExportSettings, WatermarkPosition } from "../../features/export/exportImage";
import type { ExportFormat } from "../../features/export/downloadCanvas";

export type ExportScope = "current" | "all";

interface Props {
  settings: ExportSettings;
  baseSize: { width: number; height: number };
  slideCount: number;
  activeIndex: number;
  caption: string;
  canShare: boolean;
  onChange: (settings: ExportSettings) => void;
  onCaptionChange: (caption: string) => void;
  onClose: () => void;
  onRender: (settings: ExportSettings) => Promise<string>;
  onDownload: (settings: ExportSettings, scope: ExportScope) => void;
  onShare: (settings: ExportSettings, scope: ExportScope) => void;
}

const FORMATS: Array<{ id: ExportFormat; label: string }> = [{ id: "png", label: "PNG" }, { id: "jpg", label: "JPG" }, { id: "webp", label: "WebP" }];
const SCALES: Array<{ id: ExportSettings["scale"]; label: string }> = [{ id: 0.5, label: "50%" }, { id: 1, label: "100%" }, { id: 2, label: "200%" }];
const POSITIONS: Array<{ id: WatermarkPosition; label: string }> = [
  { id: "br", label: "오른쪽 아래" }, { id: "bl", label: "왼쪽 아래" }, { id: "tr", label: "오른쪽 위" }, { id: "tl", label: "왼쪽 위" }, { id: "center", label: "가운데" },
];

const CAPTION_LIMIT = 2200; // 인스타그램 캡션 글자 수 상한
const HASHTAG_LIMIT = 30; // 게시물당 해시태그 상한

export function ExportDialog({ settings, baseSize, slideCount, activeIndex, caption, canShare, onChange, onCaptionChange, onClose, onRender, onDownload, onShare }: Props) {
  const [preview, setPreview] = useState<{ url: string; bytes: number } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [scope, setScope] = useState<ExportScope>(slideCount > 1 ? "all" : "current");
  const [copied, setCopied] = useState(false);
  const multi = slideCount > 1;
  const effectiveScope: ExportScope = multi ? scope : "current";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !(event.target instanceof HTMLTextAreaElement)) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 설정이 바뀔 때마다(짧게 지연) 실제로 인코딩해 보고 예상 용량·미리보기를 갱신한다(현재 보고 있는 슬라이드 기준).
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
  const hashtags = (caption.match(/#[^\s#]+/g) ?? []).length;
  const captionLength = [...caption].length;
  const lowRes = outWidth < 1080;

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal export-dialog" role="dialog" aria-modal="true" aria-label="내보내기">
        <header className="modal-header">
          <h2>내보내기 · 인스타그램</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">✕</button>
        </header>

        <div className="modal-body export-body">
          <div className="export-preview" aria-label="미리보기">
            {preview ? <img src={preview.url} alt={`${activeIndex + 1}번 슬라이드 미리보기`} /> : <span>{previewError ?? "미리보기 생성 중…"}</span>}
          </div>

          <div className="export-options">
            <div className="field-group">
              <span className="field-label">인스타그램 권장 설정</span>
              <button type="button" className="btn" onClick={() => onChange({ ...settings, format: "jpg", quality: 92, scale: 1 })}>JPG · 품질 92 · 가로 1080px 적용</button>
              <p className="panel-hint">피드는 4:5(1080×1350), 스토리·릴스는 9:16(1080×1920)이 가장 크게 보입니다. 게시물당 최대 10장.</p>
            </div>

            {multi && (
              <div className="field-group">
                <span className="field-label">범위</span>
                <div className="chip-row" role="group" aria-label="내보낼 범위">
                  <button type="button" className={effectiveScope === "all" ? "active" : ""} aria-pressed={effectiveScope === "all"} onClick={() => setScope("all")}>전체 {slideCount}장 (ZIP)</button>
                  <button type="button" className={effectiveScope === "current" ? "active" : ""} aria-pressed={effectiveScope === "current"} onClick={() => setScope("current")}>이 장만 ({activeIndex + 1}번)</button>
                </div>
                <label className="toggle-row"><input type="checkbox" checked={settings.pageNumber} onChange={(event) => onChange({ ...settings, pageNumber: event.target.checked })} /><span>하단에 페이지 번호(1 / {slideCount}) 넣기</span></label>
              </div>
            )}

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
              {lowRes && <p className="export-warn">⚠ 가로 1080px보다 작아 인스타그램에서 흐리게 보일 수 있어요.</p>}
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

            <fieldset className="field-group watermark-group">
              <legend className="field-label">캡션 · 해시태그</legend>
              <textarea className="text-input" rows={5} value={caption} placeholder={"게시물 설명을 적고 #해시태그 를 붙여 보세요.\\n(이 창에서 복사해 인스타그램 앱에 붙여넣기)"} aria-label="캡션" onChange={(event) => onCaptionChange(event.target.value)} />
              <div className="caption-meta">
                <span className={captionLength > CAPTION_LIMIT ? "over" : ""}>{captionLength} / {CAPTION_LIMIT}자</span>
                <span className={hashtags > HASHTAG_LIMIT ? "over" : ""}>해시태그 {hashtags} / {HASHTAG_LIMIT}</span>
                <button type="button" className="btn" onClick={copyCaption} disabled={!caption.trim()}>{copied ? "복사됨 ✓" : "캡션 복사"}</button>
              </div>
            </fieldset>
          </div>
        </div>

        <footer className="modal-footer">
          <span className="export-size">
            {previewError ? "⚠ " + previewError : preview ? `이 장 예상 ${formatBytes(preview.bytes)}${effectiveScope === "all" ? ` · 전체 약 ${formatBytes(preview.bytes * slideCount)}` : ""}` : "계산 중…"}
          </span>
          <button type="button" className="btn" onClick={onClose}>취소</button>
          {canShare && <button type="button" className="btn" disabled={!!previewError} onClick={() => onShare(settings, effectiveScope)} title="휴대폰에서는 공유 창으로 인스타그램 앱에 바로 보낼 수 있어요">공유 (인스타 앱)</button>}
          <button type="button" className="btn primary" disabled={!!previewError} onClick={() => onDownload(settings, effectiveScope)}>
            {effectiveScope === "all" ? `ZIP 다운로드 (${slideCount}장)` : "다운로드"}
          </button>
        </footer>
      </div>
    </div>
  );
}
