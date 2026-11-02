// 영역 기반 이미지 효과(브라우저 캔버스만 사용, 서버 전송 없음).
// - 스티커 외곽선: 투명 배경 PNG(예: AI 배경 제거 결과)의 윤곽에 굵은 선을 둘러 "스티커"처럼 만든다.
// - 하늘 제거(간이): 위쪽에서 이어지는 푸른·밝은 영역을 투명하게 만든다(AI가 아닌 색 기반 휴리스틱이라 맑은/흐린 낮 하늘에 적합).

const MAX_SIDE = 2048;

export type ImageEffectKind = "blur-bg" | "outline-thin" | "outline" | "outline-thick" | "sky";

export function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    image.src = src;
  });
}

async function toCanvas(src: string, maxSide = MAX_SIDE) {
  const image = await loadImageElement(src);
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("캔버스를 만들 수 없습니다.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { canvas, context };
}

/** 가우시안 블러. `ctx.filter`를 지원하지 않는 브라우저는 축소→확대로 근사한다. */
export function blurCanvas(source: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const context = out.getContext("2d");
  if (!context) return source;
  // Safari 일부 버전은 ctx.filter가 없다(타입상으로는 항상 있어서 별도로 검사한다).
  const supportsFilter = "filter" in (context as unknown as Record<string, unknown>);
  if (supportsFilter) {
    context.filter = `blur(${radius}px)`;
    // 가장자리가 투명해지며 어두워지는 것을 막으려고 블러 반경만큼 바깥까지 늘려 그린다.
    context.drawImage(source, -radius, -radius, source.width + radius * 2, source.height + radius * 2);
    context.filter = "none";
    return out;
  }
  const factor = Math.max(2, Math.round(radius));
  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.round(source.width / factor));
  small.height = Math.max(1, Math.round(source.height / factor));
  small.getContext("2d")?.drawImage(source, 0, 0, small.width, small.height);
  context.imageSmoothingQuality = "high";
  context.drawImage(small, 0, 0, out.width, out.height);
  return out;
}

/** 스티커 외곽선: 윤곽을 `thickness`px(긴 변 기준 비율) 만큼 흰색(또는 지정색)으로 둘러싼다. 가장자리 여백이 필요해 결과가 약간 커진다. */
export async function addStickerOutline(src: string, thicknessRatio: number, color = "#ffffff"): Promise<string> {
  const { canvas: base } = await toCanvas(src, 1800);
  const thickness = Math.max(2, Math.round(Math.max(base.width, base.height) * thicknessRatio));
  const pad = thickness + 2;
  // 실루엣(윤곽)만 지정색으로 칠한 캔버스
  const silhouette = document.createElement("canvas");
  silhouette.width = base.width;
  silhouette.height = base.height;
  const silContext = silhouette.getContext("2d");
  if (!silContext) throw new Error("캔버스를 만들 수 없습니다.");
  silContext.drawImage(base, 0, 0);
  silContext.globalCompositeOperation = "source-in";
  silContext.fillStyle = color;
  silContext.fillRect(0, 0, silhouette.width, silhouette.height);

  const out = document.createElement("canvas");
  out.width = base.width + pad * 2;
  out.height = base.height + pad * 2;
  const context = out.getContext("2d");
  if (!context) throw new Error("캔버스를 만들 수 없습니다.");
  const steps = 36;
  for (let ring = 1; ring <= 2; ring++) {
    const radius = (thickness * ring) / 2;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      context.drawImage(silhouette, pad + Math.cos(angle) * radius, pad + Math.sin(angle) * radius);
    }
  }
  context.drawImage(base, pad, pad);
  return out.toDataURL("image/png");
}

/**
 * 하늘 제거(간이): 맨 윗줄의 "하늘색 같은" 픽셀에서 시작해, 이어진 하늘 같은 픽셀(푸른색 우세 또는 밝고 채도가 낮은 구름)을 투명하게 만든다.
 * 색 기반이라 노을·밤하늘·복잡한 구름에는 부정확하다. 가장자리는 살짝 부드럽게 한다.
 */
export async function removeSky(src: string): Promise<{ dataUrl: string; coverage: number }> {
  const { canvas, context } = await toCanvas(src, 1400);
  const { width, height } = canvas;
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  const skyLike = (index: number) => {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const blueish = b > r + 8 && b >= g - 8 && b > 90;
    const cloud = min > 165 && max - min < 48;
    return blueish || cloud;
  };

  const limitY = Math.floor(height * 0.85); // 아래쪽 15%는 하늘로 보지 않는다
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  for (let x = 0; x < width; x++) if (skyLike(x * 4)) { stack.push(x); visited[x] = 1; }
  while (stack.length > 0) {
    const position = stack.pop() as number;
    const x = position % width;
    const y = (position - x) / width;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= limitY) continue;
      const next = ny * width + nx;
      if (visited[next] || !skyLike(next * 4)) continue;
      visited[next] = 1;
      stack.push(next);
    }
  }

  // 하늘 영역을 부드러운 알파 마스크로 만들어(블러 후) 투명하게 한다.
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const maskContext = mask.getContext("2d");
  if (!maskContext) throw new Error("캔버스를 만들 수 없습니다.");
  const maskData = maskContext.createImageData(width, height);
  let covered = 0;
  for (let i = 0; i < visited.length; i++) {
    if (visited[i]) { maskData.data[i * 4 + 3] = 255; covered++; }
  }
  maskContext.putImageData(maskData, 0, 0);
  const soft = blurCanvas(mask, Math.max(1, Math.round(Math.max(width, height) * 0.0015)));
  const softData = soft.getContext("2d")?.getImageData(0, 0, width, height).data;
  if (softData) {
    for (let i = 0; i < visited.length; i++) data[i * 4 + 3] = Math.round(data[i * 4 + 3] * (1 - softData[i * 4 + 3] / 255));
  }
  context.putImageData(image, 0, 0);
  return { dataUrl: canvas.toDataURL("image/png"), coverage: covered / visited.length };
}
