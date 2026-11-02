import { useMemo } from "react";
import { Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import type { BlendMode, TextLayer } from "../../types/canvas";
import { renderCurvedText } from "../../features/design/curvedText";

interface Props {
  layer: TextLayer;
  fontTick: number; // 웹폰트가 로드되면 바뀌는 값 — 비트맵을 다시 그리게 한다
  nodeRef: (node: Konva.Image | null) => void;
  onSelect: () => void;
  onDragEnd: (node: Konva.Node) => void;
  onTransformEnd: (node: Konva.Node) => void;
}

/** 곡선 글자(`TextLayer.curve`)는 비트맵으로 그려 Image 노드로 표시한다. 이동·크기·회전·그림자 처리는 다른 레이어와 같다. */
export function CurvedTextNode({ layer, fontTick, nodeRef, onSelect, onDragEnd, onTransformEnd }: Props) {
  const { text, fontFamily, fontSize, bold, italic, color, fillGradient, strokeColor, strokeWidth, letterSpacing, curve, width, height } = layer;
  const bitmap = useMemo(
    () => renderCurvedText({ ...layer, text, fontFamily, fontSize, bold, italic, color, fillGradient, strokeColor, strokeWidth, letterSpacing, curve, width, height }),
    // fontTick: 글꼴 로드 후 재생성. layer 전체가 아니라 그림에 영향을 주는 값만 의존성으로 둔다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, fontFamily, fontSize, bold, italic, color, JSON.stringify(fillGradient), strokeColor, strokeWidth, letterSpacing, curve, width, height, fontTick],
  );
  return (
    <KonvaImage
      ref={nodeRef}
      image={bitmap}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      visible={layer.visible}
      opacity={layer.opacity ?? 1}
      globalCompositeOperation={(layer.blendMode ?? "source-over") as BlendMode | "source-over"}
      listening={!layer.locked}
      draggable={!layer.locked}
      shadowEnabled={!!layer.shadow}
      shadowColor={layer.shadow?.color}
      shadowBlur={layer.shadow?.blur ?? 0}
      shadowOffsetX={layer.shadow?.offsetX ?? 0}
      shadowOffsetY={layer.shadow?.offsetY ?? 0}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(event) => onDragEnd(event.target)}
      onTransformEnd={(event) => onTransformEnd(event.target)}
    />
  );
}
