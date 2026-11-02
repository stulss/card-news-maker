import { useEffect, useState } from "react";

interface Props {
  width: number;
  height: number;
  onApply: (width: number, height: number) => void;
  onClose: () => void;
}

const MIN_SIZE = 100;
const MAX_SIZE = 4000;

const GROUPS: Array<{ title: string; sizes: Array<{ label: string; width: number; height: number; note?: string }> }> = [
  { title: "인스타그램", sizes: [
    { label: "피드 4:5", width: 1080, height: 1350, note: "권장" },
    { label: "정사각형 1:1", width: 1080, height: 1080 },
    { label: "프로필 그리드 3:4", width: 1080, height: 1440 },
    { label: "스토리·릴스 9:16", width: 1080, height: 1920 },
    { label: "가로형 1.91:1", width: 1080, height: 566 },
  ] },
  { title: "다른 SNS·웹", sizes: [
    { label: "유튜브 썸네일", width: 1280, height: 720 },
    { label: "링크 공유 이미지", width: 1200, height: 630 },
    { label: "X(트위터) 헤더", width: 1500, height: 500 },
    { label: "페이스북 커버", width: 1640, height: 624 },
    { label: "핀터레스트 핀", width: 1000, height: 1500 },
  ] },
];

/** 캔버스 크기 설정: SNS별 프리셋과 직접 입력(PhotoCraft의 새 문서·VectorCraft의 Social 프리셋을 참고). */
export function SizeDialog({ width, height, onApply, onClose }: Props) {
  const [custom, setCustom] = useState({ width: String(width), height: String(height) });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const parsed = { width: Math.round(Number(custom.width)), height: Math.round(Number(custom.height)) };
  const valid = [parsed.width, parsed.height].every((value) => Number.isFinite(value) && value >= MIN_SIZE && value <= MAX_SIZE);
  const ratio = valid ? (parsed.width / parsed.height).toFixed(2) : "–";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal size-dialog" role="dialog" aria-modal="true" aria-label="캔버스 크기">
        <header className="modal-header">
          <h2>캔버스 크기</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">✕</button>
        </header>
        <div className="modal-body size-body">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="size-group-title">{group.title}</h3>
              <div className="size-grid">
                {group.sizes.map((size) => {
                  const active = size.width === width && size.height === height;
                  return (
                    <button key={size.label} type="button" className={`size-card ${active ? "active" : ""}`} aria-pressed={active} onClick={() => { onApply(size.width, size.height); onClose(); }}>
                      <span className="welcome-size-shape" style={{ aspectRatio: `${size.width} / ${size.height}` }} aria-hidden="true" />
                      <strong>{size.label}{size.note && <em>{size.note}</em>}</strong>
                      <small>{size.width} × {size.height}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <section>
            <h3 className="size-group-title">직접 입력 (px)</h3>
            <div className="size-custom">
              <label><span>가로</span><input type="number" min={MIN_SIZE} max={MAX_SIZE} value={custom.width} onChange={(event) => setCustom({ ...custom, width: event.target.value })} aria-label="가로 크기" /></label>
              <button type="button" className="btn swap-btn" onClick={() => setCustom({ width: custom.height, height: custom.width })} title="가로·세로 바꾸기" aria-label="가로 세로 바꾸기">⇄</button>
              <label><span>세로</span><input type="number" min={MIN_SIZE} max={MAX_SIZE} value={custom.height} onChange={(event) => setCustom({ ...custom, height: event.target.value })} aria-label="세로 크기" /></label>
              <span className="size-ratio">비율 {ratio}</span>
            </div>
            <p className="panel-hint">{MIN_SIZE}~{MAX_SIZE}px. 모든 슬라이드의 크기가 함께 바뀌고, 이미 놓은 레이어는 크기를 따라 늘어나지 않습니다. 인스타그램은 가로 1080px이 가장 선명합니다.</p>
          </section>
        </div>
        <footer className="modal-footer">
          <span className="export-size">현재 {width} × {height}px</span>
          <button type="button" className="btn" onClick={onClose}>취소</button>
          <button type="button" className="btn primary" disabled={!valid} onClick={() => { onApply(parsed.width, parsed.height); onClose(); }}>적용</button>
        </footer>
      </div>
    </div>
  );
}
