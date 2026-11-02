import type { CanvasProject, GradientFill, ImageLayer, Layer, ShapeLayer, TextLayer } from "../../types/canvas";
import { MASK_PATHS, PATH_SHAPES, isPathShape } from "../design/shapes";
import { renderCurvedText } from "../design/curvedText";
import { loadImageElement } from "../design/imageEffects";
import { withOpacity } from "../design/gradients";

// 레이어를 그대로 벡터(SVG)로 옮긴다. 도형·글자·배경 그라디언트·그림자·혼합 모드·회전은 보존하고, 이미지는 자르기·모양 오리기·뒤집기·기본 보정(CSS 필터)을 반영한다.
// 반영하지 않는 것: 비네팅·필름 입자·모자이크(픽셀 필터), 글꼴 파일(글꼴 이름만 기록 — 보는 기기에 없으면 대체 글꼴로 보임).

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (value: number) => Math.round(value * 100) / 100;

interface Ctx {
  defs: string[];
  next: number;
}
const newId = (context: Ctx, prefix: string) => `${prefix}${context.next++}`;

function gradientDef(id: string, gradient: GradientFill, width: number, height: number): string {
  const from = withOpacity(gradient.from, gradient.fromOpacity);
  const to = withOpacity(gradient.to, gradient.toOpacity);
  // rgba() 색은 stop-color에 쓰지 못하는 뷰어가 있어 색과 불투명도를 분리한다.
  const split = (css: string, fallbackOpacity: number | undefined) => {
    const match = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(css);
    return match ? { color: `rgb(${match[1]},${match[2]},${match[3]})`, opacity: Number(match[4]) } : { color: css, opacity: fallbackOpacity ?? 1 };
  };
  const a = split(from, gradient.fromOpacity);
  const b = split(to, gradient.toOpacity);
  const stopXml = `<stop offset="0" stop-color="${esc(a.color)}" stop-opacity="${a.opacity}"/><stop offset="1" stop-color="${esc(b.color)}" stop-opacity="${b.opacity}"/>`;
  if (gradient.type === "radial") {
    return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(width / 2)}" cy="${n(height / 2)}" r="${n(Math.hypot(width, height) / 2)}">${stopXml}</radialGradient>`;
  }
  const radians = (gradient.angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(width / 2 - dx * half)}" y1="${n(height / 2 - dy * half)}" x2="${n(width / 2 + dx * half)}" y2="${n(height / 2 + dy * half)}">${stopXml}</linearGradient>`;
}

function paint(context: Ctx, color: string, gradient: GradientFill | undefined, width: number, height: number): string {
  if (!gradient) return esc(color);
  const id = newId(context, "g");
  context.defs.push(gradientDef(id, gradient, width, height));
  return `url(#${id})`;
}

function fontFamilyAttr(family: string) {
  return esc(/[",]/.test(family) ? family.replace(/"/g, "'") : `'${family}', sans-serif`);
}

function wrapLines(layer: TextLayer): string[] {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return layer.text.split("\n");
  context.font = `${layer.italic ? "italic " : ""}${layer.bold ? "bold " : ""}${layer.fontSize}px ${/[",]/.test(layer.fontFamily) ? layer.fontFamily : `"${layer.fontFamily}"`}`;
  const measure = (text: string) => context.measureText(text).width + layer.letterSpacing * [...text].length;
  const lines: string[] = [];
  for (const paragraph of layer.text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= layer.width || !line) {
        // 한 단어가 상자보다 길면 글자 단위로 끊는다
        if (measure(candidate) > layer.width && !line) {
          let chunk = "";
          for (const char of [...candidate]) {
            if (measure(chunk + char) > layer.width && chunk) { lines.push(chunk); chunk = char; } else chunk += char;
          }
          line = chunk;
        } else line = candidate;
      } else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

async function toDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  const blob = await (await fetch(src)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function shapeSvg(context: Ctx, layer: ShapeLayer): string {
  const { width: w, height: h } = layer;
  const stroke = layer.strokeWidth ? ` stroke="${esc(layer.strokeColor ?? "#000000")}" stroke-width="${n(layer.strokeWidth)}" stroke-linejoin="round"` : "";
  if (isPathShape(layer.shapeType)) {
    const fill = paint(context, layer.fillColor, layer.fillGradient, 100, 100);
    return `<path d="${PATH_SHAPES[layer.shapeType]}" transform="scale(${n(w / 100)} ${n(h / 100)})" fill="${fill}"${layer.strokeWidth ? ` stroke="${esc(layer.strokeColor ?? "#000000")}" stroke-width="${n(layer.strokeWidth)}" vector-effect="non-scaling-stroke" stroke-linejoin="round"` : ""}/>`;
  }
  const fill = paint(context, layer.fillColor, layer.fillGradient, w, h);
  if (layer.shapeType === "circle") return `<ellipse cx="${n(w / 2)}" cy="${n(h / 2)}" rx="${n(w / 2)}" ry="${n(h / 2)}" fill="${fill}"${stroke}/>`;
  const radius = Math.min(w, h) / 2;
  if (layer.shapeType === "star") {
    const points = Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 === 0 ? radius : radius * 0.45;
      const angle = (-90 + i * 36) * (Math.PI / 180);
      return `${n(w / 2 + r * Math.cos(angle))},${n(h / 2 + r * Math.sin(angle))}`;
    }).join(" ");
    return `<polygon points="${points}" fill="${fill}"${stroke}/>`;
  }
  if (layer.shapeType === "triangle") {
    const points = [-90, 30, 150].map((deg) => `${n(w / 2 + radius * Math.cos((deg * Math.PI) / 180))},${n(h / 2 + radius * Math.sin((deg * Math.PI) / 180))}`).join(" ");
    return `<polygon points="${points}" fill="${fill}"${stroke}/>`;
  }
  return `<rect width="${n(w)}" height="${n(h)}" rx="${n(layer.cornerRadius ?? 0)}" fill="${fill}"${stroke}/>`;
}

function textSvg(context: Ctx, layer: TextLayer): string {
  if (layer.curve) {
    // 곡선 글자는 비트맵으로 그려 두었으므로 그대로 이미지로 넣는다.
    return `<image href="${renderCurvedText(layer).toDataURL("image/png")}" width="${n(layer.width)}" height="${n(layer.height)}"/>`;
  }
  const fill = paint(context, layer.color, layer.fillGradient, layer.width, layer.height);
  const anchor = layer.align === "left" ? "start" : layer.align === "right" ? "end" : "middle";
  const x = layer.align === "left" ? 0 : layer.align === "right" ? layer.width : layer.width / 2;
  const lineHeight = layer.fontSize * layer.lineHeight;
  const stroke = layer.strokeWidth ? ` stroke="${esc(layer.strokeColor ?? "#000000")}" stroke-width="${n(layer.strokeWidth)}" stroke-linejoin="round" paint-order="stroke"` : "";
  const lines = wrapLines(layer).map((line, index) => `<text x="${n(x)}" y="${n((index + 0.5) * lineHeight)}" text-anchor="${anchor}" dominant-baseline="central" xml:space="preserve">${esc(line)}</text>`).join("");
  return `<g font-family="${fontFamilyAttr(layer.fontFamily)}" font-size="${n(layer.fontSize)}" font-weight="${layer.bold ? 700 : 400}" font-style="${layer.italic ? "italic" : "normal"}" letter-spacing="${n(layer.letterSpacing)}" fill="${fill}"${stroke}>${lines}</g>`;
}

async function imageSvg(context: Ctx, layer: ImageLayer): Promise<string> {
  const { width: w, height: h } = layer;
  const loaded = await loadImageElement(layer.src);
  const naturalWidth = loaded.naturalWidth;
  const naturalHeight = loaded.naturalHeight;
  const zoom = layer.cropZoom ?? 1;
  const boxRatio = w / h;
  const imageRatio = naturalWidth / naturalHeight;
  const coverWidth = imageRatio > boxRatio ? naturalHeight * boxRatio : naturalWidth;
  const coverHeight = imageRatio > boxRatio ? naturalHeight : naturalWidth / boxRatio;
  const cropWidth = coverWidth / zoom;
  const cropHeight = coverHeight / zoom;
  const cropX = (naturalWidth - cropWidth) * (layer.focusX ?? 0.5);
  const cropY = (naturalHeight - cropHeight) * (layer.focusY ?? 0.5);

  const f = layer.filters ?? {};
  const filter = [
    f.brightness ? `brightness(${n(1 + f.brightness)})` : "",
    f.contrast ? `contrast(${n(1 + f.contrast / 100)})` : "",
    f.saturation ? `saturate(${n(Math.max(0, 1 + f.saturation))})` : "",
    f.hue ? `hue-rotate(${n(f.hue)}deg)` : "",
    f.blur ? `blur(${n(f.blur)}px)` : "",
    f.grayscale ? "grayscale(1)" : "",
    f.sepia ? "sepia(1)" : "",
  ].filter(Boolean).join(" ");

  const clipId = newId(context, "c");
  context.defs.push(layer.maskShape
    ? `<clipPath id="${clipId}"><path d="${MASK_PATHS[layer.maskShape]}" transform="scale(${n(w / 100)} ${n(h / 100)})"/></clipPath>`
    : `<clipPath id="${clipId}"><rect width="${n(w)}" height="${n(h)}" rx="${n(layer.cornerRadius ?? 0)}"/></clipPath>`);
  const href = await toDataUrl(layer.src);
  const flip = layer.flipX || layer.flipY ? ` transform="translate(${layer.flipX ? n(w) : 0} ${layer.flipY ? n(h) : 0}) scale(${layer.flipX ? -1 : 1} ${layer.flipY ? -1 : 1})"` : "";
  const picture = `<g clip-path="url(#${clipId})"><g${flip}><svg x="0" y="0" width="${n(w)}" height="${n(h)}" viewBox="${n(cropX)} ${n(cropY)} ${n(cropWidth)} ${n(cropHeight)}" preserveAspectRatio="none" overflow="hidden"><image href="${href}" width="${naturalWidth}" height="${naturalHeight}"${filter ? ` style="filter:${filter}"` : ""}/></svg></g></g>`;
  let border = "";
  if (layer.borderWidth) {
    const common = `fill="none" stroke="${esc(layer.borderColor ?? "#ffffff")}" stroke-width="${n(layer.borderWidth)}" stroke-linejoin="round"`;
    border = layer.maskShape
      ? `<path d="${MASK_PATHS[layer.maskShape]}" transform="scale(${n(w / 100)} ${n(h / 100)})" vector-effect="non-scaling-stroke" ${common}/>`
      : `<rect width="${n(w)}" height="${n(h)}" rx="${n(layer.cornerRadius ?? 0)}" ${common}/>`;
  }
  return picture + border;
}

async function layerSvg(context: Ctx, layer: Layer): Promise<string> {
  let inner = "";
  if (layer.type === "shape") inner = shapeSvg(context, layer);
  else if (layer.type === "text") inner = textSvg(context, layer);
  else if (layer.type === "image") inner = await imageSvg(context, layer);
  else return "";

  const centered = layer.type === "shape" && (layer.shapeType === "circle" || layer.shapeType === "star" || layer.shapeType === "triangle");
  const transform = centered
    ? `translate(${n(layer.x + layer.width / 2)} ${n(layer.y + layer.height / 2)}) rotate(${n(layer.rotation)}) translate(${n(-layer.width / 2)} ${n(-layer.height / 2)})`
    : `translate(${n(layer.x)} ${n(layer.y)}) rotate(${n(layer.rotation)})`;
  let filterAttr = "";
  if (layer.shadow) {
    const id = newId(context, "s");
    const match = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(layer.shadow.color);
    const color = match ? `rgb(${match[1]},${match[2]},${match[3]})` : layer.shadow.color;
    const opacity = match ? match[4] : "1";
    context.defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${n(layer.shadow.offsetX)}" dy="${n(layer.shadow.offsetY)}" stdDeviation="${n(layer.shadow.blur / 2)}" flood-color="${esc(color)}" flood-opacity="${opacity}"/></filter>`);
    filterAttr = ` filter="url(#${id})"`;
  }
  const blend = layer.blendMode ? ` style="mix-blend-mode:${layer.blendMode}"` : "";
  return `<g id="${esc(layer.name)}" transform="${transform}"${layer.opacity !== undefined && layer.opacity < 1 ? ` opacity="${n(layer.opacity)}"` : ""}${filterAttr}${blend}>${inner}</g>`;
}

/** 슬라이드 한 장을 SVG 문자열로 만든다. */
export async function slideToSvg(slide: CanvasProject): Promise<string> {
  const context: Ctx = { defs: [], next: 1 };
  const background = paint(context, slide.backgroundColor, slide.backgroundGradient, slide.width, slide.height);
  const layers = await Promise.all([...slide.layers].filter((layer) => layer.visible).sort((a, b) => a.zIndex - b.zIndex).map((layer) => layerSvg(context, layer)));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${slide.width}" height="${slide.height}" viewBox="0 0 ${slide.width} ${slide.height}">\n<defs>${context.defs.join("")}</defs>\n<rect width="${slide.width}" height="${slide.height}" fill="${background}"/>\n${layers.join("\n")}\n</svg>\n`;
}

export function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
