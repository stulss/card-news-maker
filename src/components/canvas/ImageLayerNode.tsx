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

  // cover 방식(PRD 21장 결정: "이미지는 cover 방식으로 캔버스 전체를 채움") — 레이어 박스와
  // 원본 이미지의 가로세로 비율이 다르면, 넘치는 쪽을 Konva의 crop으로 잘라내 채운다.
  const boxRatio = layer.width / layer.height;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const crop = imageRatio > boxRatio
    ? { x: (image.naturalWidth - image.naturalHeight * boxRatio) / 2, y: 0, width: image.naturalHeight * boxRatio, height: image.naturalHeight }
    : { x: 0, y: (image.naturalHeight - image.naturalWidth / boxRatio) / 2, width: image.naturalWidth, height: image.naturalWidth / boxRatio };

  return (
    <KonvaImage
      ref={nodeRef}
      image={image}
      crop={crop}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      visible={layer.visible}
      opacity={layer.opacity ?? 1}
      listening={!layer.locked}
      draggable={!layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(event) => onDragEnd(event.target as Konva.Image)}
      onTransformEnd={(event) => onTransformEnd(event.target as Konva.Image)}
    />
  );
}
