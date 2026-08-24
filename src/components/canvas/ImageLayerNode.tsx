import { Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import type { ImageLayer } from "../../types/canvas";
import type Konva from "konva";

interface Props {
  layer: ImageLayer;
  nodeRef?: (node: Konva.Image | null) => void;
  onSelect: () => void;
  onDragEnd: (node: Konva.Image) => void;
  onTransformEnd: (node: Konva.Image) => void;
}

export function ImageLayerNode({ layer, nodeRef, onSelect, onDragEnd, onTransformEnd }: Props) {
  const [image] = useImage(layer.src);

  if (!image) return null;

  return (
    <KonvaImage
      ref={nodeRef}
      image={image}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      visible={layer.visible}
      listening={!layer.locked}
      draggable={!layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(event) => onDragEnd(event.target as Konva.Image)}
      onTransformEnd={(event) => onTransformEnd(event.target as Konva.Image)}
    />
  );
}
