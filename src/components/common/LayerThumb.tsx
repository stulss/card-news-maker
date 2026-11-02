import type { GradientFill, Layer } from "../../types/canvas";
import { cssGradient } from "../../features/design/gradients";
import { CLIP_PATHS, PATH_SHAPES, isPathShape } from "../../features/design/shapes";

interface Props {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundGradient?: GradientFill;
  layers: Layer[];
}

/** 레이어 데이터만으로 그리는 가벼운 CSS/SVG 썸네일(갤러리·슬라이드 목록 공용). 필터·자르기 확대는 근사하거나 생략한다. */
export function LayerThumb({ width, height, backgroundColor, backgroundGradient, layers }: Props) {
  const ordered = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  return (
    <div className="thumb" style={{ aspectRatio: `${width} / ${height}`, background: backgroundGradient ? cssGradient(backgroundGradient) : backgroundColor }}>
      {ordered.map((layer) => {
        if (!layer.visible) return null;
        const box = { left: `${(layer.x / width) * 100}%`, top: `${(layer.y / height) * 100}%`, width: `${(layer.width / width) * 100}%`, height: `${(layer.height / height) * 100}%`, opacity: layer.opacity ?? 1, transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined };
        if (layer.type === "shape") {
          const fill = layer.fillGradient ? cssGradient(layer.fillGradient) : layer.fillColor;
          if (isPathShape(layer.shapeType)) {
            const gradientId = `g-${layer.id}`;
            return (
              <svg key={layer.id} className="thumb-item" style={box} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {layer.fillGradient && (
                  <defs>
                    <linearGradient id={gradientId} gradientTransform={`rotate(${layer.fillGradient.angle - 90} .5 .5)`}>
                      <stop offset="0" stopColor={layer.fillGradient.from} stopOpacity={layer.fillGradient.fromOpacity ?? 1} /><stop offset="1" stopColor={layer.fillGradient.to} stopOpacity={layer.fillGradient.toOpacity ?? 1} />
                    </linearGradient>
                  </defs>
                )}
                <path d={PATH_SHAPES[layer.shapeType]} fill={layer.fillGradient ? `url(#${gradientId})` : layer.fillColor} />
              </svg>
            );
          }
          const radius = layer.shapeType === "circle" ? "50%" : layer.cornerRadius ? `${(layer.cornerRadius / width) * 100}cqw` : 0;
          return <div key={layer.id} className="thumb-item" style={{ ...box, background: fill, borderRadius: radius, clipPath: CLIP_PATHS[layer.shapeType] }} />;
        }
        if (layer.type === "text") {
          const justify = layer.align === "left" ? "flex-start" : layer.align === "right" ? "flex-end" : "center";
          return (
            <div key={layer.id} className="thumb-item" style={{ ...box, justifyContent: justify, textAlign: layer.align, color: layer.color, fontWeight: layer.bold ? 700 : 400, fontStyle: layer.italic ? "italic" : undefined, fontFamily: layer.fontFamily, fontSize: `${(layer.fontSize / width) * 100}cqw`, lineHeight: layer.lineHeight, ...(layer.fillGradient ? { backgroundImage: cssGradient(layer.fillGradient), WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : {}) }}>
              {layer.text}
            </div>
          );
        }
        if (layer.type === "image") {
          return <img key={layer.id} className="thumb-item thumb-image" alt="" src={layer.src} style={{ ...box, transform: [layer.rotation ? `rotate(${layer.rotation}deg)` : "", layer.flipX ? "scaleX(-1)" : "", layer.flipY ? "scaleY(-1)" : ""].filter(Boolean).join(" ") || undefined, borderRadius: layer.maskShape === "circle" ? "50%" : layer.cornerRadius ? `${(layer.cornerRadius / width) * 100}cqw` : undefined, clipPath: layer.maskShape ? CLIP_PATHS[layer.maskShape] : undefined }} />;
        }
        return null;
      })}
    </div>
  );
}
