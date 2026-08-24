import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Konva from "konva";
import { Stage, Layer as KonvaLayer, Rect, Circle, Text as KonvaText, Transformer } from "react-konva";
import type { CanvasProject, Layer } from "../../types/canvas";
import { ImageLayerNode } from "./ImageLayerNode";

export interface CanvasStageHandle {
  toDataUrl: (format: "png" | "jpg", quality?: number) => string;
}

interface Props {
  project: CanvasProject;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onChangeLayer: (layerId: string, changes: Partial<Layer>) => void;
}

function readNodeTransform(node: Konva.Node) {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  node.scaleX(1);
  node.scaleY(1);
  return { x: node.x(), y: node.y(), width: Math.max(10, node.width() * scaleX), height: Math.max(10, node.height() * scaleY), rotation: node.rotation() };
}

// 캔버스를 컨테이너 크기에 맞춰(fit) 표시한다 — PRD 14장.
export const CanvasStage = forwardRef<CanvasStageHandle, Props>(function CanvasStage(
  { project, selectedLayerId, onSelectLayer, onChangeLayer }, ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef(new Map<string, Konva.Node>());
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const padding = 32;
  const availableWidth = Math.max(size.width - padding * 2, 1);
  const availableHeight = Math.max(size.height - padding * 2, 1);
  const scale = Math.min(availableWidth / project.width, availableHeight / project.height, 1);
  const stageWidth = project.width * scale;
  const stageHeight = project.height * scale;

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const selectedNode = selectedLayerId ? nodeRefs.current.get(selectedLayerId) : undefined;
    transformer.nodes(selectedNode ? [selectedNode] : []);
    transformer.getLayer()?.batchDraw();
  }, [project.layers, selectedLayerId]);

  useImperativeHandle(ref, () => ({
    toDataUrl(format, quality = 0.9) {
      const stage = stageRef.current;
      if (!stage || scale <= 0) throw new Error("캔버스를 아직 렌더링하지 못했습니다.");
      const transformer = transformerRef.current;
      transformer?.hide();

      // 원본 1:1 크기로 임시 전환하여 부동소수점 오차 없는 정확한 픽셀 크기(1080x1080, 1080x1350, 1080x1920) 보장
      const prevWidth = stage.width();
      const prevHeight = stage.height();
      const prevScaleX = stage.scaleX();
      const prevScaleY = stage.scaleY();

      stage.width(project.width);
      stage.height(project.height);
      stage.scaleX(1);
      stage.scaleY(1);
      stage.draw();

      try {
        return stage.toDataURL({
          mimeType: format === "jpg" ? "image/jpeg" : "image/png",
          quality,
          pixelRatio: 1,
        });
      } finally {
        stage.width(prevWidth);
        stage.height(prevHeight);
        stage.scaleX(prevScaleX);
        stage.scaleY(prevScaleY);
        transformer?.show();
        stage.draw();
      }
    },
  }), [project.width, project.height, scale]);

  const sortedLayers = [...project.layers].sort((a, b) => a.zIndex - b.zIndex);
  const rememberNode = (layerId: string) => (node: Konva.Node | null) => {
    if (node) nodeRefs.current.set(layerId, node);
    else nodeRefs.current.delete(layerId);
  };
  const commitTransform = (layer: Layer, node: Konva.Node) => {
    const transform = readNodeTransform(node);
    if (layer.type === "text") {
      const fontScale = transform.height / layer.height;
      onChangeLayer(layer.id, { ...transform, height: layer.height, fontSize: Math.max(8, layer.fontSize * fontScale) } as Partial<Layer>);
      return;
    }
    onChangeLayer(layer.id, transform as Partial<Layer>);
  };

  return (
    <div ref={containerRef} className="canvas-stage-area">
      <div className="canvas-shadow">
        <Stage ref={stageRef} width={stageWidth} height={stageHeight} scaleX={scale} scaleY={scale}
          onMouseDown={(event) => { if (event.target === event.target.getStage()) onSelectLayer(null); }}
          onTouchStart={(event) => { if (event.target === event.target.getStage()) onSelectLayer(null); }}>
          <KonvaLayer>
            <Rect x={0} y={0} width={project.width} height={project.height} fill={project.backgroundColor} listening={false} />
            {sortedLayers.length === 0 && <KonvaText text="이미지를 업로드하거나 텍스트를 추가해 보세요" x={0} y={project.height / 2 - 16} width={project.width} align="center" fontSize={28} fill="#B8B8B8" listening={false} />}
            {sortedLayers.map((layer) => {
              if (layer.type === "image") {
                return <ImageLayerNode key={layer.id} layer={layer} nodeRef={rememberNode(layer.id)} onSelect={() => onSelectLayer(layer.id)} onDragEnd={(node) => onChangeLayer(layer.id, { x: node.x(), y: node.y() })} onTransformEnd={(node) => commitTransform(layer, node)} />;
              }
              if (layer.type === "shape") {
                // speechBubble은 아직 어디서도 쓰지 않아 rectangle로 대체 렌더링한다.
                const shared = {
                  ref: rememberNode(layer.id), rotation: layer.rotation, visible: layer.visible,
                  listening: !layer.locked, draggable: !layer.locked, fill: layer.fillColor,
                  stroke: layer.strokeColor, strokeWidth: layer.strokeWidth ?? 0,
                  onClick: () => onSelectLayer(layer.id), onTap: () => onSelectLayer(layer.id),
                  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => onChangeLayer(layer.id, { x: event.target.x(), y: event.target.y() }),
                  onTransformEnd: (event: Konva.KonvaEventObject<Event>) => commitTransform(layer, event.target),
                };
                if (layer.shapeType === "circle") {
                  const radius = Math.min(layer.width, layer.height) / 2;
                  return <Circle key={layer.id} {...shared} x={layer.x + layer.width / 2} y={layer.y + layer.height / 2} radius={radius} />;
                }
                return <Rect key={layer.id} {...shared} x={layer.x} y={layer.y} width={layer.width} height={layer.height} />;
              }
              if (layer.type === "text") {
                return <KonvaText ref={rememberNode(layer.id)} key={layer.id} x={layer.x} y={layer.y} width={layer.width} height={layer.height}
                  text={layer.text} fontSize={layer.fontSize} fontFamily={layer.fontFamily} fill={layer.color} align={layer.align}
                  fontStyle={[layer.bold ? "bold" : "", layer.italic ? "italic" : ""].filter(Boolean).join(" ") || "normal"}
                  lineHeight={layer.lineHeight} letterSpacing={layer.letterSpacing} rotation={layer.rotation} visible={layer.visible}
                  listening={!layer.locked} draggable={!layer.locked} stroke={layer.strokeColor} strokeWidth={layer.strokeWidth ?? 0}
                  fillAfterStrokeEnabled={true}
                  onClick={() => onSelectLayer(layer.id)} onTap={() => onSelectLayer(layer.id)}
                  onDragEnd={(event) => onChangeLayer(layer.id, { x: event.target.x(), y: event.target.y() })}
                  onTransformEnd={(event) => commitTransform(layer, event.target)} />;
              }
              return null;
            })}
            <Transformer ref={transformerRef} rotateEnabled enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
              borderStroke="#f6b83f" anchorFill="#ffffff" anchorStroke="#f6b83f" anchorSize={12 / scale} borderStrokeWidth={2 / scale} />
          </KonvaLayer>
        </Stage>
      </div>
    </div>
  );
});
