import { ImageUploadError, validateImageFile } from "../image/loadImageFile";

export const STICKER_STORAGE_KEY = "card-news-user-stickers";
export const MAX_STICKERS = 24;
const MAX_STICKER_SIDE = 512; // 저장 용량(localStorage ~5MB)을 아끼기 위해 긴 변을 줄인다

export interface UserSticker {
  id: string;
  name: string;
  src: string; // data:image/png;base64,...
  width: number;
  height: number;
}

function isSticker(value: unknown): value is UserSticker {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.name === "string" && typeof v.src === "string" &&
    v.src.startsWith("data:image/png;base64,") && typeof v.width === "number" && v.width > 0 &&
    typeof v.height === "number" && v.height > 0;
}

export function loadStickers(): UserSticker[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STICKER_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSticker).slice(0, MAX_STICKERS) : [];
  } catch {
    return [];
  }
}

export function saveStickers(stickers: UserSticker[]) {
  try {
    localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(stickers));
  } catch {
    throw new ImageUploadError("스티커를 저장할 공간이 부족합니다. 안 쓰는 스티커를 삭제해 주세요.");
  }
}

/** 업로드한 이미지를 긴 변 512px 이하의 투명 PNG 스티커로 변환한다(서버로 보내지 않는다). */
export async function createStickerFromFile(file: File): Promise<UserSticker> {
  validateImageFile(file);
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new ImageUploadError("이미지 파일이 손상되어 열 수 없습니다."));
      img.src = url;
    });
    const ratio = Math.min(1, MAX_STICKER_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
    return { id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, "").slice(0, 24) || "스티커", src: canvas.toDataURL("image/png"), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
