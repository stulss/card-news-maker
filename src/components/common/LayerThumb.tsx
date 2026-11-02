import type { Layer } from "../../types/canvas";

interface Props {
  width: number;
  height: number;
  backgroundColor: string;
  layers: Layer[];
}

/** 레이어 데이터만으로 그리는 가벼운 CSS 썸네일(갤러리·슬라이드 목록 공용). 필터·자르기 확대는 근사하거나 생략한다. */
export function LayerThumb({ width, height, backgroundColor, layers }: Props) {
  const ordered = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  return (
    <div className="thumb" style={{ aspectRatio: `${width} / ${height}`, background: backgroundColor }}>
      {ordered.map((layer) => {
        if (!layer.visible) return null;
        const box = { left: `${(layer.x / width) * 100}%`, top: `${(layer.y / height) * 100}%`, width: `${(layer.width / width) * 100}%`, height: `${(layer.height / height) * 100}%`, opacity: layer.opacity ?? 1 };
        if (layer.type === "shape") {
          const radius = layer.shapeType === "circle" ? "50%" : layer.cornerRadius ? `${(layer.cornerRadius / width) * 100}cqw` : 0;
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
        if (layer.type === "image") {
          return <img key={layer.id} className="thumb-item thumb-image" alt="" src={layer.src} style={box} />;
        }
        return null;
      })}
    </div>
  );
}
