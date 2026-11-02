import { extractPalette } from "./brandStore";

/** 이미지(data URL·blob URL)를 작게 줄여 읽은 뒤 대표 색을 뽑는다. 사진은 브라우저 밖으로 나가지 않는다. */
export async function paletteFromImage(src: string, count = 6): Promise<string[]> {
  const image = new Image();
  image.src = src;
  await image.decode();
  const scale = Math.min(1, 96 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("색을 읽을 수 없는 브라우저입니다.");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return extractPalette(ctx.getImageData(0, 0, canvas.width, canvas.height).data, count);
}

interface EyeDropperLike { open: () => Promise<{ sRGBHex: string }> }
type EyeDropperCtor = new () => EyeDropperLike;

export const isEyeDropperSupported = () => typeof window !== "undefined" && "EyeDropper" in window;

/** 화면의 아무 색이나 찍어 고른다(Chrome·Edge). 취소하면 null. */
export async function pickScreenColor(): Promise<string | null> {
  const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
  if (!Ctor) return null;
  try { return (await new Ctor().open()).sRGBHex; } catch { return null; }
}
