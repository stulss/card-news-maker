import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Konva from "konva";
import { Stage, Layer as KonvaLayer, Rect, Ellipse, Star, RegularPolygon, Line, Text as KonvaText, Transformer } from "react-konva";
import type { BlendMode, CanvasProject, Layer, ShapeLayer } from "../../types/canvas";
import { ImageLayerNode } from "./ImageLayerNode";

export interface CanvasStageHandle {
  toDataUrl: (format: "png" | "jpg", quality?: number) => string;
}

interface Props {
  project: CanvasProject;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onChangeLayer: (layerId: string, changes: Partial<Layer>, coalesceKey?: string) => void;
  onMoveLayers: (layerIds: string[], dx: number, dy: number) => void;
  cropLayerId?: string | null;
  originalViewLayerId?: string | null;
}

// 노드 좌표가 도형의 중심인 도형들(Konva Ellipse/Star/RegularPolygon)
const isCenterShape = (layer: Layer): layer is ShapeLayer => layer.type === "shape" && (layer.shapeType === "circle" || layer.shapeType === "star" || layer.shapeType === "triangle");

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

function readNodeTransform(node: Konva.Node) {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  node.scaleX(1);
  node.scaleY(1);
  return { x: node.x(), y: node.y(), width: Math.max(10, node.width() * scaleX), height: Math.max(10, node.height() * scaleY), rotation: node.rotation() };
}

// 캔버스를 컨테이너 크기에 맞춰(fit) 표시한다 — PRD 14장.
export const CanvasStage = forwardRef<CanvasStageHandle, Props>(function CanvasStage(
  { project, selectedLayerId, onSelectLayer, onChangeLayer, onMoveLayers, cropLayerId = null, originalViewLayerId = null }, ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const contentLayerRef = useRef<Konva.Layer>(null);
  const nodeRefs = useRef(new Map<string, Konva.Node>());
  const dragRef = useRef<{ node: Konva.Node; startX: number; startY: number; members: Array<{ node: Konva.Node; x: number; y: number }> } | null>(null);
  const [guides, setGuides] = useState<Array<{ axis: "x" | "y"; position: number }>>([]);
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

  // 캔버스는 쓰이지 않은 웹폰트를 스스로 불러오지 않는다 — 텍스트 레이어가 쓰는 글꼴을 직접 로드한 뒤 다시 그린다.
  const fontKey = project.layers.flatMap((layer) => layer.type === "text" ? [`${layer.italic ? "italic " : ""}${layer.bold ? "bold" : "normal"}|${layer.fontFamily}`] : []).join(";");
  useEffect(() => {
    const requests = [...new Set(fontKey.split(";").filter(Boolean))].map((entry) => {
      const [style, family] = entry.split("|");
      const quoted = /[",]/.test(family) ? family : `"${family}"`;
      return document.fonts.load(`${style.replace("normal", "")} 32px ${quoted}`.trim(), "가나다ABC").catch(() => []);
    });
    Promise.all(requests).then(() => stageRef.current?.batchDraw());
  }, [fontKey]);

  // Ctrl(또는 ⌘)+휠로 확대/축소. React 합성 이벤트는 passive라 preventDefault가 안 되어 직접 등록한다.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((current) => clampZoom(current * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    // 캔버스는 draw 시점에 이미 로드된 폰트만 쓴다 — 웹폰트 로드가 첫 렌더보다 늦게 끝나면
    // 다시 그려주지 않는 한 폴백 폰트로 굳어버린다.
    document.fonts.ready.then(() => stageRef.current?.batchDraw());
  }, []);

  const padding = 32;
  const availableWidth = Math.max(size.width - padding * 2, 1);
  const availableHeight = Math.max(size.height - padding * 2, 1);
  const fitScale = Math.min(availableWidth / project.width, availableHeight / project.height, 1);
  const scale = fitScale * zoom;
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

  // 드래그 중 캔버스 가장자리·중앙, 다른 레이어의 가장자리·중앙에 달라붙는 정렬 가이드.
  const isCropDrag = (node: Konva.Node) => !!cropLayerId && nodeRefs.current.get(cropLayerId) === node;

  const handleDragStart = (event: Konva.KonvaEventObject<DragEvent>) => {
    const node = event.target;
    dragRef.current = null;
    if (node === node.getStage() || isCropDrag(node)) return;
    const entry = [...nodeRefs.current.entries()].find(([, candidate]) => candidate === node);
    const layer = entry && project.layers.find((candidate) => candidate.id === entry[0]);
    if (!layer) return;
    // 같은 그룹의 나머지(보이고 잠기지 않은) 레이어가 드래그 중 함께 움직이도록 시작 위치를 기억한다.
    const members = layer.groupId
      ? project.layers.filter((other) => other.groupId === layer.groupId && other.id !== layer.id && other.visible && !other.locked)
        .flatMap((other) => { const memberNode = nodeRefs.current.get(other.id); return memberNode ? [{ node: memberNode, x: memberNode.x(), y: memberNode.y() }] : []; })
      : [];
    dragRef.current = { node, members, startX: node.x(), startY: node.y() };
  };

  const handleDragMove = (event: Konva.KonvaEventObject<DragEvent>) => {
    const node = event.target;
    const contentLayer = contentLayerRef.current;
    if (!contentLayer || node === node.getStage() || isCropDrag(node)) return;
    const groupMembers = new Set((dragRef.current?.node === node ? dragRef.current.members : []).map((member) => member.node));
    const box = node.getClientRect({ relativeTo: contentLayer });
    const threshold = 8 / scale;
    const targets = { x: [0, project.width / 2, project.width], y: [0, project.height / 2, project.height] };
    nodeRefs.current.forEach((other) => {
      if (other === node || groupMembers.has(other) || !other.visible()) return;
      const rect = other.getClientRect({ relativeTo: contentLayer });
      targets.x.push(rect.x, rect.x + rect.width / 2, rect.x + rect.width);
      targets.y.push(rect.y, rect.y + rect.height / 2, rect.y + rect.height);
    });
    const pick = (points: number[], candidates: number[]) => {
      let best: { delta: number; position: number } | null = null;
      for (const point of points) for (const candidate of candidates) {
        const delta = candidate - point;
        if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, position: candidate };
      }
      return best;
    };
    const snapX = pick([box.x, box.x + box.width / 2, box.x + box.width], targets.x);
    const snapY = pick([box.y, box.y + box.height / 2, box.y + box.height], targets.y);
    if (snapX) node.x(node.x() + snapX.delta);
    if (snapY) node.y(node.y() + snapY.delta);
    const drag = dragRef.current;
    if (drag && drag.node === node) {
      const dx = node.x() - drag.startX;
      const dy = node.y() - drag.startY;
      drag.members.forEach((member) => { member.node.x(member.x + dx); member.node.y(member.y + dy); });
    }
    setGuides([
      ...(snapX ? [{ axis: "x" as const, position: snapX.position }] : []),
      ...(snapY ? [{ axis: "y" as const, position: snapY.position }] : []),
    ]);
  };

  const sortedLayers = [...project.layers].sort((a, b) => a.zIndex - b.zIndex);
  const rememberNode = (layerId: string) => (node: Konva.Node | null) => {
    if (node) nodeRefs.current.set(layerId, node);
    else nodeRefs.current.delete(layerId);
  };
  // 이동 확정: 노드의 이동량(dx, dy)을 그룹 전체에 같은 값으로 적용한다. 원형 도형은 좌표 기준이 중심이라 오프셋을 보정한다.
  const commitMove = (layer: Layer, node: Konva.Node) => {
    if (cropLayerId === layer.id) return;
    const origin = isCenterShape(layer)
      ? { x: layer.x + layer.width / 2, y: layer.y + layer.height / 2 } : { x: layer.x, y: layer.y };
    const ids = layer.groupId
      ? project.layers.filter((other) => other.groupId === layer.groupId && !other.locked).map((other) => other.id)
      : [layer.id];
    onMoveLayers(ids, node.x() - origin.x, node.y() - origin.y);
  };

  const commitTransform = (layer: Layer, node: Konva.Node) => {
    const transform = readNodeTransform(node);
    if (isCenterShape(layer)) {
      // 원·별·삼각형은 노드 좌표가 중심이라 레이어의 좌상단 좌표로 바꿔 저장한다. 별·삼각형은 정사각형을 유지한다.
      if (layer.shapeType !== "circle") { const side = Math.max(transform.width, transform.height); transform.width = side; transform.height = side; }
      transform.x -= transform.width / 2;
      transform.y -= transform.height / 2;
    }
    if (layer.type === "text") {
      const fontScale = transform.height / layer.height;
      onChangeLayer(layer.id, { ...transform, height: layer.height, fontSize: Math.max(8, layer.fontSize * fontScale) } as Partial<Layer>);
      return;
    }
    onChangeLayer(layer.id, transform as Partial<Layer>);
  };

  return (
    <div className="canvas-stage-area">
     <div ref={containerRef} className="canvas-scroll">
      <div className="canvas-shadow">
        <Stage ref={stageRef} width={stageWidth} height={stageHeight} scaleX={scale} scaleY={scale}
          onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={() => { setGuides([]); dragRef.current = null; }}
          onMouseDown={(event) => { if (event.target === event.target.getStage()) onSelectLayer(null); }}
          onTouchStart={(event) => { if (event.target === event.target.getStage()) onSelectLayer(null); }}>
          <KonvaLayer ref={contentLayerRef}>
            <Rect x={0} y={0} width={project.width} height={project.height} fill={project.backgroundColor} listening={false} />
            {sortedLayers.length === 0 && <KonvaText text="이미지를 업로드하거나 텍스트를 추가해 보세요" x={0} y={project.height / 2 - 16} width={project.width} align="center" fontSize={28} fill="#B8B8B8" listening={false} />}
            {sortedLayers.map((layer) => {
              if (layer.type === "image") {
                return <ImageLayerNode key={layer.id} layer={layer} cropMode={cropLayerId === layer.id} ignoreFilters={originalViewLayerId === layer.id} onCropChange={(changes, key) => onChangeLayer(layer.id, changes, key)} nodeRef={rememberNode(layer.id)} onSelect={() => onSelectLayer(layer.id)} onDragEnd={(node) => commitMove(layer, node)} onTransformEnd={(node) => commitTransform(layer, node)} />;
              }
              if (layer.type === "shape") {
                // speechBubble은 아직 어디서도 쓰지 않아 rectangle로 대체 렌더링한다.
                const shared = {
                  ref: rememberNode(layer.id), rotation: layer.rotation, visible: layer.visible, opacity: layer.opacity ?? 1,
                  globalCompositeOperation: (layer.blendMode ?? "source-over") as BlendMode | "source-over",
                  listening: !layer.locked, draggable: !layer.locked, fill: layer.fillColor,
                  stroke: layer.strokeColor, strokeWidth: layer.strokeWidth ?? 0,
                  onClick: () => onSelectLayer(layer.id), onTap: () => onSelectLayer(layer.id),
                  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => commitMove(layer, event.target),
                  onTransformEnd: (event: Konva.KonvaEventObject<Event>) => commitTransform(layer, event.target),
                };
                const cx = layer.x + layer.width / 2;
                const cy = layer.y + layer.height / 2;
                const radius = Math.min(layer.width, layer.height) / 2;
                if (layer.shapeType === "circle") return <Ellipse key={layer.id} {...shared} x={cx} y={cy} radiusX={layer.width / 2} radiusY={layer.height / 2} />;
                if (layer.shapeType === "star") return <Star key={layer.id} {...shared} x={cx} y={cy} numPoints={5} innerRadius={radius * 0.45} outerRadius={radius} />;
                if (layer.shapeType === "triangle") return <RegularPolygon key={layer.id} {...shared} x={cx} y={cy} sides={3} radius={radius} />;
                return <Rect key={layer.id} {...shared} x={layer.x} y={layer.y} width={layer.width} height={layer.height} cornerRadius={layer.cornerRadius ?? 0} />;
              }
              if (layer.type === "text") {
                return <KonvaText ref={rememberNode(layer.id)} key={layer.id} x={layer.x} y={layer.y} width={layer.width} height={layer.height}
                  text={layer.text} fontSize={layer.fontSize} fontFamily={layer.fontFamily} fill={layer.color} align={layer.align}
                  fontStyle={[layer.bold ? "bold" : "", layer.italic ? "italic" : ""].filter(Boolean).join(" ") || "normal"}
                  lineHeight={layer.lineHeight} letterSpacing={layer.letterSpacing} rotation={layer.rotation} visible={layer.visible} opacity={layer.opacity ?? 1}
                  globalCompositeOperation={layer.blendMode ?? "source-over"}
                  listening={!layer.locked} draggable={!layer.locked} stroke={layer.strokeColor} strokeWidth={layer.strokeWidth ?? 0}
                  shadowEnabled={!!layer.shadow} shadowColor={layer.shadow?.color} shadowBlur={layer.shadow?.blur ?? 0}
                  shadowOffsetX={layer.shadow?.offsetX ?? 0} shadowOffsetY={layer.shadow?.offsetY ?? 0}
                  fillAfterStrokeEnabled={true}
                  onClick={() => onSelectLayer(layer.id)} onTap={() => onSelectLayer(layer.id)}
                  onDragEnd={(event) => commitMove(layer, event.target)}
                  onTransformEnd={(event) => commitTransform(layer, event.target)} />;
              }
              return null;
            })}
            {guides.map((guide) => (
              <Line key={`${guide.axis}-${guide.position}`} listening={false} stroke="#ff4d8d" strokeWidth={1.5 / scale} dash={[6 / scale, 4 / scale]}
                points={guide.axis === "x" ? [guide.position, 0, guide.position, project.height] : [0, guide.position, project.width, guide.position]} />
            ))}
            <Transformer ref={transformerRef} rotateEnabled enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
              borderStroke="#f6b83f" anchorFill="#ffffff" anchorStroke="#f6b83f" anchorSize={12 / scale} borderStrokeWidth={2 / scale} />
          </KonvaLayer>
        </Stage>
      </div>
     </div>
      <div className="zoom-controls" role="group" aria-label="확대/축소">
        <button type="button" onClick={() => setZoom((z) => clampZoom(z / 1.25))} aria-label="축소">−</button>
        <button type="button" className="zoom-value" onClick={() => setZoom(1)} title="화면에 맞추기" aria-label="화면에 맞추기">{Math.round(zoom * 100)}%</button>
        <button type="button" onClick={() => setZoom((z) => clampZoom(z * 1.25))} aria-label="확대">+</button>
      </div>
    </div>
  );
});
