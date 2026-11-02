import { useMemo, useState } from "react";
import { GALLERY_CATEGORIES, createGalleryTemplates } from "../../features/template/galleryTemplates";
import { LayerThumb } from "../common/LayerThumb";
import type { GalleryTemplate } from "../../features/template/galleryTemplates";

interface Props {
  onApply: (template: GalleryTemplate) => void;
}

export function GalleryPanel({ onApply }: Props) {
  const [category, setCategory] = useState<(typeof GALLERY_CATEGORIES)[number]>("전체");
  const templates = useMemo(() => createGalleryTemplates(), []);
  const visible = category === "전체" ? templates : templates.filter((template) => template.category === category);

  return (
    <aside className="side-panel" aria-label="템플릿 갤러리">
      <h2>갤러리</h2>
      <p className="panel-hint">누르면 현재 캔버스를 템플릿으로 교체합니다. Ctrl+Z로 되돌릴 수 있어요.</p>
      <div className="chip-row" role="group" aria-label="카테고리">
        {GALLERY_CATEGORIES.map((name) => (
          <button key={name} type="button" className={category === name ? "active" : ""} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>
        ))}
      </div>
      <div className="gallery-grid">
        {visible.map((template) => (
          <button key={template.id} type="button" className="gallery-card" onClick={() => onApply(template)}>
            <div className="thumb-wrap">
              <LayerThumb {...template.canvas} />
              {template.slides && <span className="set-badge">{template.slides.length}장</span>}
            </div>
            <span className="name">{template.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
