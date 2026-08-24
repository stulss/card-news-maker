import { useEffect, useRef, useState } from "react";
import { Stage, Layer as KonvaLayer, Rect, Text as KonvaText } from "react-konva";
import type { CanvasProject } from "../../types/canvas";
import { ImageLayerNode } from "./ImageLayerNode";

interface Props {
  project: CanvasProject;
}

// 캔버스를 컨테이너 크기에 맞춰(fit) 표시한다 — PRD 14장:
// "캔버스는 확대·축소 없이 항상 화면에 맞춰(fit) 표시하는 것을 기본으로 한다."
export function CanvasStage({ project }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const padding = 32;
  const availableWidth = Math.max(size.width - padding * 2, 1);
  const availableHeight = Math.max(size.height - padding * 2, 1);
  const scale = Math.min(availableWidth / project.width, availableHeight / project.height, 1);

  const stageWidth = project.width * scale;
  const stageHeight = project.height * scale;

  const sortedLayers = [...project.layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      ref={containerRef}
      style={{
        flexGrow: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg-canvas-area)",
      }}
    >
      <div style={{ boxShadow: "0 24px 60px -16px rgba(0,0,0,0.6)" }}>
        <Stage width={stageWidth} height={stageHeight} scaleX={scale} scaleY={scale}>
          <KonvaLayer>
            <Rect x={0} y={0} width={project.width} height={project.height} fill={project.backgroundColor} />

            {sortedLayers.length === 0 && (
              <KonvaText
                text="이미지를 업로드하거나 텍스트를 추가해 보세요"
                x={0}
                y={project.height / 2 - 16}
                width={project.width}
                align="center"
                fontSize={28}
                fill="#B8B8B8"
              />
            )}

            {sortedLayers.map((layer) => {
              if (layer.type === "image") {
                return <ImageLayerNode key={layer.id} layer={layer} />;
              }
              if (layer.type === "text") {
                return (
                  <KonvaText
                    key={layer.id}
                    x={layer.x}
                    y={layer.y}
                    width={layer.width}
                    text={layer.text}
                    fontSize={layer.fontSize}
                    fontFamily={layer.fontFamily}
                    fill={layer.color}
                    align={layer.align}
                    fontStyle={[layer.bold ? "bold" : "", layer.italic ? "italic" : ""].filter(Boolean).join(" ") || "normal"}
                    lineHeight={layer.lineHeight}
                    letterSpacing={layer.letterSpacing}
                    rotation={layer.rotation}
                    visible={layer.visible}
                    listening={!layer.locked}
                    stroke={layer.strokeColor}
                    strokeWidth={layer.strokeWidth ?? 0}
                  />
                );
              }
              // sticker/shape 레이어는 아직 MVP 범위 밖(F-10, P2)
              return null;
            })}
          </KonvaLayer>
        </Stage>
      </div>
    </div>
  );
}
