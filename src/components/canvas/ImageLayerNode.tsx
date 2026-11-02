import { useEffect, useMemo, useRef } from "react";
import { Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import type { ImageLayer } from "../../types/canvas";
import { renderMaskedImage } from "../../features/design/maskImage";

interface Props {
  layer: ImageLayer;
  cropMode?: boolean;
  ignoreFilters?: boolean; // 원본 비교(누르는 동안 보정을 끄고 보여 줌)
  onCropChange?: (changes: Partial<ImageLayer>, coalesceKey: string) => void;
  nodeRef?: (node: Konva.Image | null) => void;
  onSelect: () => void;
  onDragEnd: (node: Konva.Image) => void;
  onTransformEnd: (node: Konva.Image) => void;
}

/** 가장자리를 어둡게 하는 비네팅. 중심부는 그대로 두고 바깥으로 갈수록 곡선으로 어두워진다(노드 속성 `vignette` 0~100). */
function vignetteFilter(this: Konva.Node, imageData: ImageData) {
  const amount = (Number(this.getAttr("vignette")) || 0) / 100;
  if (amount <= 0) return;
  const { data, width, height } = imageData;
  const cx = width / 2;
  const cy = height / 2;
  const maxDistance = Math.hypot(cx, cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.hypot(x - cx, y - cy) / maxDistance;
      const falloff = Math.max(0, distance - 0.3) / 0.7;
      const factor = 1 - amount * Math.min(1, falloff ** 1.7 * 1.25);
      const index = (y * width + x) * 4;
      data[index] *= factor;
      data[index + 1] *= factor;
      data[index + 2] *= factor;
    }
  }
}

/** 레이어 상자에 cover로 채우고(확대·위치 반영) 원본에서 보여줄 영역을 계산한다. */
function computeCrop(naturalWidth: number, naturalHeight: number, width: number, height: number, zoom = 1, focusX = 0.5, focusY = 0.5) {
  const boxRatio = width / height;
  const imageRatio = naturalWidth / naturalHeight;
  const coverWidth = imageRatio > boxRatio ? naturalHeight * boxRatio : naturalWidth;
  const coverHeight = imageRatio > boxRatio ? naturalHeight : naturalWidth / boxRatio;
  const cropWidth = coverWidth / zoom;
  const cropHeight = coverHeight / zoom;
  return { crop: { x: (naturalWidth - cropWidth) * focusX, y: (naturalHeight - cropHeight) * focusY, width: cropWidth, height: cropHeight }, cropWidth, cropHeight };
}

function activeFilters(layer: ImageLayer, ignore: boolean) {
  const f = ignore ? undefined : layer.filters;
  const list: Array<typeof Konva.Filters.Brighten> = [];
  if (!f) return list;
  if (f.brightness) list.push(Konva.Filters.Brighten);
  if (f.contrast) list.push(Konva.Filters.Contrast);
  if (f.blur) list.push(Konva.Filters.Blur);
  if (f.grayscale) list.push(Konva.Filters.Grayscale);
  if (f.sepia) list.push(Konva.Filters.Sepia);
  if (f.saturation || f.hue) list.push(Konva.Filters.HSL);
  if (f.grain) list.push(Konva.Filters.Noise);
  if (f.mosaic) list.push(Konva.Filters.Pixelate);
  if (f.vignette) list.push(vignetteFilter);
  return list;
}

export function ImageLayerNode({ layer, cropMode = false, ignoreFilters = false, onCropChange, nodeRef, onSelect, onDragEnd, onTransformEnd }: Props) {
  const [image] = useImage(layer.src);
  const localRef = useRef<Konva.Image | null>(null);
  const filters = activeFilters(layer, ignoreFilters);
  const hasFilters = filters.length > 0;
  const filterKey = JSON.stringify(ignoreFilters ? {} : layer.filters ?? {});
  // 자르기 모드에서 드래그하는 동안의 최신 focus/zoom. 이벤트가 리렌더보다 빨리 와도 값이 밀리지 않게 ref로 들고 있는다.
  const cropState = useRef({ focusX: 0.5, focusY: 0.5, zoom: 1, pointer: { x: 0, y: 0 }, anchor: { x: 0, y: 0 } });
  useEffect(() => {
    cropState.current.focusX = layer.focusX ?? 0.5;
    cropState.current.focusY = layer.focusY ?? 0.5;
    cropState.current.zoom = layer.cropZoom ?? 1;
  }, [layer.focusX, layer.focusY, layer.cropZoom]);

  const { maskShape, width: boxWidth, height: boxHeight, cropZoom, focusX, focusY, borderColor, borderWidth } = layer;
  // 모양 오리기: 오려 낸 결과를 새 비트맵으로 만들어 Image 노드에 넘긴다(Konva는 임의 모양 클리핑을 지원하지 않음).
  const masked = useMemo(() => {
    if (!image || !maskShape) return null;
    const { crop: maskCrop } = computeCrop(image.naturalWidth, image.naturalHeight, boxWidth, boxHeight, cropZoom, focusX, focusY);
    return renderMaskedImage(image, { width: boxWidth, height: boxHeight, crop: maskCrop, mask: maskShape, borderColor, borderWidth });
  }, [image, maskShape, boxWidth, boxHeight, cropZoom, focusX, focusY, borderColor, borderWidth]);

  // Konva 필터는 노드를 캐시해야 적용된다. 필터가 없으면 캐시를 풀어 원본 렌더링을 유지한다.
  useEffect(() => {
    const node = localRef.current;
    if (!node || !image) return;
    if (hasFilters) node.cache({ pixelRatio: 1 });
    else node.clearCache();
    node.getLayer()?.batchDraw();
  }, [image, masked, hasFilters, filterKey, layer.width, layer.height]);

  if (!image) return null;

  // cover 방식(PRD 21장 결정: "이미지는 cover 방식으로 캔버스 전체를 채움") — 박스와 원본의 비율이 다르면 넘치는 쪽을 crop으로 잘라낸다.
  const { crop, cropWidth, cropHeight } = computeCrop(image.naturalWidth, image.naturalHeight, layer.width, layer.height, layer.cropZoom, layer.focusX, layer.focusY);

  return (
    <KonvaImage
      ref={(node) => { localRef.current = node; nodeRef?.(node); }}
      image={masked ?? image}
      crop={masked ? undefined : crop}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      scaleX={layer.flipX ? -1 : 1}
      scaleY={layer.flipY ? -1 : 1}
      offsetX={layer.flipX ? layer.width : 0}
      offsetY={layer.flipY ? layer.height : 0}
      visible={layer.visible}
      opacity={layer.opacity ?? 1}
      cornerRadius={masked ? 0 : layer.cornerRadius ?? 0}
      stroke={!masked && layer.borderWidth ? layer.borderColor ?? "#ffffff" : undefined}
      strokeWidth={masked ? 0 : layer.borderWidth ?? 0}
      shadowEnabled={!!layer.shadow}
      shadowColor={layer.shadow?.color}
      shadowBlur={layer.shadow?.blur ?? 0}
      shadowOffsetX={layer.shadow?.offsetX ?? 0}
      shadowOffsetY={layer.shadow?.offsetY ?? 0}
      filters={filters}
      brightness={ignoreFilters ? 0 : layer.filters?.brightness ?? 0}
      contrast={ignoreFilters ? 0 : layer.filters?.contrast ?? 0}
      blurRadius={ignoreFilters ? 0 : layer.filters?.blur ?? 0}
      saturation={ignoreFilters ? 0 : layer.filters?.saturation ?? 0}
      hue={ignoreFilters ? 0 : (((layer.filters?.hue ?? 0) % 360) + 360) % 360}
      noise={(ignoreFilters ? 0 : layer.filters?.grain ?? 0) / 100}
      pixelSize={Math.max(1, ignoreFilters ? 1 : layer.filters?.mosaic ?? 1)}
      vignette={ignoreFilters ? 0 : layer.filters?.vignette ?? 0}
      globalCompositeOperation={layer.blendMode ?? "source-over"}
      listening={!layer.locked}
      draggable={!layer.locked}
      dragBoundFunc={cropMode ? () => cropState.current.anchor : undefined}
      onDragStart={(event) => {
        if (!cropMode) return;
        cropState.current.anchor = event.target.getAbsolutePosition();
        cropState.current.pointer = event.target.getStage()?.getPointerPosition() ?? { x: 0, y: 0 };
      }}
      onDragMove={(event) => {
        if (!cropMode) return;
        const stage = event.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (!stage || !pointer) return;
        const state = cropState.current;
        // 화면 픽셀 이동량 → 캔버스 단위 → 원본 이미지 픽셀. 이미지를 끈 방향과 반대로 보여줄 영역이 이동한다.
        const dx = (pointer.x - state.pointer.x) / stage.scaleX();
        const dy = (pointer.y - state.pointer.y) / stage.scaleY();
        state.pointer = pointer;
        const availableX = image.naturalWidth - cropWidth;
        const availableY = image.naturalHeight - cropHeight;
        const clamp = (value: number) => Math.min(1, Math.max(0, value));
        if (availableX > 0) state.focusX = clamp(state.focusX - (dx * (cropWidth / layer.width)) / availableX);
        if (availableY > 0) state.focusY = clamp(state.focusY - (dy * (cropHeight / layer.height)) / availableY);
        onCropChange?.({ focusX: state.focusX, focusY: state.focusY }, "crop-drag");
      }}
      onWheel={(event) => {
        if (!cropMode) return;
        event.evt.preventDefault();
        const next = Math.min(5, Math.max(1, cropState.current.zoom * (event.evt.deltaY < 0 ? 1.08 : 1 / 1.08)));
        cropState.current.zoom = next;
        onCropChange?.({ cropZoom: next }, "crop-wheel");
      }}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(event) => onDragEnd(event.target as Konva.Image)}
      onTransformEnd={(event) => onTransformEnd(event.target as Konva.Image)}
    />
  );
}
