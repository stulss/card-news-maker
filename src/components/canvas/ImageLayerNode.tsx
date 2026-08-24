import { Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import type { ImageLayer } from "../../types/canvas";

interface Props {
  layer: ImageLayer;
}

export function ImageLayerNode({ layer }: Props) {
  const [image] = useImage(layer.src);

  if (!image) return null;

  return (
    <KonvaImage
      image={image}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      visible={layer.visible}
      listening={!layer.locked}
    />
  );
}
