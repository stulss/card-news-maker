export const BRAND_STORAGE_KEY = "card-news-brand";
export const MAX_BRAND_COLORS = 12;

export interface BrandKit { colors: string[]; fontFamily?: string }

/** "#abc"·"abc"·"#AABBCC" → "#aabbcc". 올바르지 않으면 null. */
export function normalizeHex(value: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return `#${hex.toLowerCase()}`;
}

export function loadBrandKit(): BrandKit {
  try {
    const raw = JSON.parse(localStorage.getItem(BRAND_STORAGE_KEY) ?? "null") as { colors?: unknown; fontFamily?: unknown } | null;
    const colors = Array.isArray(raw?.colors) ? raw.colors.map((c) => (typeof c === "string" ? normalizeHex(c) : null)).filter((c): c is string => c !== null).slice(0, MAX_BRAND_COLORS) : [];
    return { colors, ...(typeof raw?.fontFamily === "string" ? { fontFamily: raw.fontFamily } : {}) };
  } catch {
    return { colors: [] };
  }
}

export function saveBrandKit(kit: BrandKit) {
  try { localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(kit)); } catch { /* 저장 공간이 없거나 막혀 있어도 앱은 동작 */ }
}

/** 이미지 픽셀(RGBA)에서 대표 색을 뽑는다: 4비트 양자화로 모은 뒤 비슷한 색은 합치고, 많이 쓰인 순으로 돌려준다. */
export function extractPalette(data: Uint8ClampedArray | number[], count = 6): string[] {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += data[i]; bucket.g += data[i + 1]; bucket.b += data[i + 2]; bucket.n += 1;
    buckets.set(key, bucket);
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).map((b) => ({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n }));
  const picked: Array<{ r: number; g: number; b: number }> = [];
  for (const color of sorted) {
    if (picked.every((p) => Math.hypot(p.r - color.r, p.g - color.g, p.b - color.b) > 64)) picked.push(color);
    if (picked.length >= count) break;
  }
  const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return picked.map((c) => `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`);
}
