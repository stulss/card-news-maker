import type { CanvasProject } from "../../types/canvas";
import { MAX_SLIDES } from "../../features/deck/deck";
import { LayerThumb } from "../common/LayerThumb";

interface Props {
  slides: CanvasProject[];
  active: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}

/** 캔버스 아래 슬라이드(캐러셀 장) 목록. 인스타그램 한 게시물은 최대 10장이다. */
export function SlideStrip({ slides, active, onSelect, onAdd, onDuplicate, onDelete, onMove }: Props) {
  const full = slides.length >= MAX_SLIDES;
  return (
    <div className="slide-strip" role="group" aria-label="슬라이드 목록">
      <div className="slide-list">
        {slides.map((slide, index) => (
          <button key={slide.id} type="button" className={`slide-item ${index === active ? "active" : ""}`} aria-pressed={index === active} aria-label={`${index + 1}번 슬라이드`} style={{ width: `${(64 * slide.width) / slide.height}px` }} onClick={() => onSelect(index)}>
            <LayerThumb width={slide.width} height={slide.height} backgroundColor={slide.backgroundColor} layers={slide.layers} />
            <span className="slide-number">{index + 1}</span>
          </button>
        ))}
        <button type="button" className="slide-add" disabled={full} onClick={onAdd} title={full ? `최대 ${MAX_SLIDES}장` : "빈 슬라이드 추가"} aria-label="슬라이드 추가">＋</button>
      </div>
      <div className="slide-actions">
        <span className="slide-count">{active + 1} / {slides.length}장 <small>(최대 {MAX_SLIDES})</small></span>
        <button type="button" onClick={() => onMove(-1)} disabled={active === 0} title="앞으로 이동" aria-label="슬라이드 앞으로 이동">◀</button>
        <button type="button" onClick={() => onMove(1)} disabled={active === slides.length - 1} title="뒤로 이동" aria-label="슬라이드 뒤로 이동">▶</button>
        <button type="button" onClick={onDuplicate} disabled={full} title="이 슬라이드 복제" aria-label="슬라이드 복제">⧉</button>
        <button type="button" className="danger" onClick={onDelete} disabled={slides.length <= 1} title="이 슬라이드 삭제" aria-label="슬라이드 삭제">✕</button>
      </div>
    </div>
  );
}
