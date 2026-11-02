import type { ExportFormat } from "./downloadCanvas";

export type WatermarkPosition = "br" | "bl" | "tr" | "tl" | "center";

export interface ExportSettings {
  format: ExportFormat;
  quality: number; // 1~100, PNG에서는 무시
  scale: 0.5 | 1 | 2;
  watermark: {
    enabled: boolean;
    text: string;
    position: WatermarkPosition;
    opacity: number; // 10~100
    size: number; // 캔버스 폭 대비 글자 크기 %, 2~12
  };
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: "png",
  quality: 90,
  scale: 1,
  watermark: { enabled: false, text: "@my_account", position: "br", opacity: 70, size: 4 },
};

const STORAGE_KEY = "card-news-export-settings";
const FORMATS: ExportFormat[] = ["png", "jpg", "webp"];
const POSITIONS: WatermarkPosition[] = ["br", "bl", "tr", "tl", "center"];

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/** 저장된 설정을 읽는다. 없거나 깨져 있으면 기본값(항목별로 검증해 안전한 값만 사용). */
export function loadExportSettings(): ExportSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<ExportSettings> | null;
    if (!raw || typeof raw !== "object") return DEFAULT_EXPORT_SETTINGS;
    const watermark = (raw.watermark ?? {}) as Partial<ExportSettings["watermark"]>;
    const defaults = DEFAULT_EXPORT_SETTINGS;
    return {
      format: FORMATS.includes(raw.format as ExportFormat) ? (raw.format as ExportFormat) : defaults.format,
      quality: clamp(raw.quality, 1, 100, defaults.quality),
      scale: raw.scale === 0.5 || raw.scale === 2 ? raw.scale : 1,
      watermark: {
        enabled: watermark.enabled === true,
        text: typeof watermark.text === "string" ? watermark.text.slice(0, 60) : defaults.watermark.text,
        position: POSITIONS.includes(watermark.position as WatermarkPosition) ? (watermark.position as WatermarkPosition) : defaults.watermark.position,
        opacity: clamp(watermark.opacity, 10, 100, defaults.watermark.opacity),
        size: clamp(watermark.size, 2, 12, defaults.watermark.size),
      },
    };
  } catch {
    return DEFAULT_EXPORT_SETTINGS;
  }
}

export function saveExportSettings(settings: ExportSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 저장 공간이 없어도 내보내기 자체에는 영향 없음
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("내보낼 이미지를 만들지 못했습니다."));
    image.src = src;
  });
}

/** 캔버스가 만든 PNG(원본 품질)에 워터마크를 얹고 선택한 형식·품질로 다시 인코딩한다. */
export async function renderExport(pngDataUrl: string, settings: ExportSettings): Promise<string> {
  const image = await loadImage(pngDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("내보내기 캔버스를 만들지 못했습니다.");
  context.drawImage(image, 0, 0);

  const { watermark } = settings;
  if (watermark.enabled && watermark.text.trim()) {
    const fontSize = Math.max(10, Math.round((canvas.width * watermark.size) / 100));
    await document.fonts.load(`700 ${fontSize}px "IBM Plex Sans KR"`, watermark.text).catch(() => []);
    const margin = Math.round(fontSize * 0.8);
    context.save();
    context.font = `700 ${fontSize}px "IBM Plex Sans KR", "Malgun Gothic", sans-serif`;
    context.globalAlpha = watermark.opacity / 100;
    context.fillStyle = "#ffffff";
    context.shadowColor = "rgba(0, 0, 0, 0.55)";
    context.shadowBlur = fontSize * 0.25;
    context.textBaseline = "alphabetic";
    const textWidth = context.measureText(watermark.text).width;
    const left = watermark.position === "bl" || watermark.position === "tl" ? margin
      : watermark.position === "center" ? (canvas.width - textWidth) / 2 : canvas.width - textWidth - margin;
    const baseline = watermark.position === "tl" || watermark.position === "tr" ? margin + fontSize * 0.85
      : watermark.position === "center" ? canvas.height / 2 + fontSize * 0.35 : canvas.height - margin;
    context.fillText(watermark.text, left, baseline);
    context.restore();
  }

  const mime = settings.format === "png" ? "image/png" : settings.format === "jpg" ? "image/jpeg" : "image/webp";
  const result = canvas.toDataURL(mime, settings.quality / 100);
  // 브라우저가 WebP 인코딩을 지원하지 않으면 조용히 PNG로 바뀌므로 감지해서 알린다.
  if (!result.startsWith(`data:${mime}`)) throw new Error("이 브라우저는 선택한 형식으로 저장할 수 없습니다. 다른 형식을 골라 주세요.");
  return result;
}

export function estimateBytes(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  return Math.round(((dataUrl.length - comma - 1) * 3) / 4);
}

export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
