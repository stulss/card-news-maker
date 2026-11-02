import { useMemo, useState } from "react";
import { GALLERY_CATEGORIES, createGalleryTemplates } from "../../features/template/galleryTemplates";
import type { GalleryTemplate } from "../../features/template/galleryTemplates";

interface Props {
  onApply: (template: GalleryTemplate) => void;
}

function Thumb({ template }: { template: GalleryTemplate }) {
  const { width, height, backgroundColor, layers } = template.canvas;
  return (
    <div className="thumb" style={{ aspectRatio: `${width} / ${height}`, background: backgroundColor }}>
      {layers.map((layer) => {
        const box = { left: `${(layer.x / width) * 100}%`, top: `${(layer.y / height) * 100}%`, width: `${(layer.width / width) * 100}%`, height: `${(layer.height / height) * 100}%`, opacity: layer.opacity ?? 1 };
        if (layer.type === "shape") {
          const radius = layer.cornerRadius ? `${(layer.cornerRadius / width) * 100}cqw` : 0;
          return <div key={layer.id} className="thumb-item" style={{ ...box, background: layer.fillColor, borderRadius: radius }} />;
        }
        if (layer.type === "text") {
          const justify = layer.align === "left" ? "flex-start" : layer.align === "right" ? "flex-end" : "center";
          return (
            <div key={layer.id} className="thumb-item" style={{ ...box, justifyContent: justify, textAlign: layer.align, color: layer.color, fontWeight: layer.bold ? 700 : 400, fontFamily: layer.fontFamily, fontSize: `${(layer.fontSize / width) * 100}cqw` }}>
              {layer.text}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
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
            <Thumb template={template} />
            <span className="name">{template.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
