import type { Deck } from "../deck/deck";
import { MAX_SLIDES } from "../deck/deck";
import { parseTemplateBundle } from "../template/templateStore";
import type { SavedTemplate } from "../template/templateStore";
import type { CanvasProject, Layer } from "../../types/canvas";

// 작업 중인 덱을 IndexedDB에 자동 저장해 새로고침·실수로 탭을 닫아도 복구한다(서버로 보내지 않는다).
// localStorage(≈5MB)는 사진 한 장에도 넘칠 수 있어 IndexedDB를 쓴다.

const DB_NAME = "card-news-maker";
const STORE = "kv";
const KEY = "deck";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

const dataUrlCache = new Map<string, string>();

/** 새로고침하면 사라지는 blob: 주소는 저장용 data URL로 바꾼다(같은 주소는 한 번만 변환). */
async function toPersistentSrc(src: string): Promise<string> {
  if (!src.startsWith("blob:")) return src;
  const cached = dataUrlCache.get(src);
  if (cached) return cached;
  const blob = await (await fetch(src)).blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  dataUrlCache.set(src, dataUrl);
  return dataUrl;
}

async function persistLayers(layers: Layer[]): Promise<Layer[]> {
  return Promise.all(layers.map(async (layer) => layer.type === "image" || layer.type === "sticker" ? { ...layer, src: await toPersistentSrc(layer.src) } : layer));
}

export async function saveDeck(deck: Deck): Promise<void> {
  const slides = await Promise.all(deck.slides.map(async (slide) => ({ ...slide, layers: await persistLayers(slide.layers) })));
  await withStore("readwrite", (store) => store.put({ slides, active: deck.active, savedAt: new Date().toISOString() }, KEY));
}

export async function clearSavedDeck(): Promise<void> {
  await withStore("readwrite", (store) => store.delete(KEY));
}

/** 파일·저장소에서 읽은 덱 후보를 검증해 Deck으로 만든다. 템플릿 JSON과 같은 검증기를 쓰며, 잘못되면 오류를 던진다. */
export function validateDeck(raw: unknown): Deck {
  const saved = raw as { slides?: CanvasProject[]; active?: number } | undefined;
  if (!saved || !Array.isArray(saved.slides) || saved.slides.length === 0 || saved.slides.length > MAX_SLIDES) throw new Error("slides");
  const now = new Date().toISOString();
  const bundle = JSON.stringify({
    version: 1,
    templates: saved.slides.map((slide, index): SavedTemplate => ({
      id: String(slide.id ?? index), name: `slide-${index}`, createdAt: now, updatedAt: now,
      canvas: { width: slide.width, height: slide.height, backgroundColor: slide.backgroundColor, backgroundGradient: slide.backgroundGradient, layers: slide.layers },
    })),
  });
  const validated = parseTemplateBundle(bundle);
  const slides: CanvasProject[] = validated.map((template, index) => ({
    id: String(saved.slides![index].id ?? crypto.randomUUID()), ...template.canvas, createdAt: saved.slides![index].createdAt ?? now, updatedAt: saved.slides![index].updatedAt ?? now,
  }));
  const active = typeof saved.active === "number" ? Math.min(Math.max(0, Math.floor(saved.active)), slides.length - 1) : 0;
  return { slides, active };
}

/** 사진의 blob: 주소를 data URL로 바꾼 덱(파일 저장·자동 저장용). */
export async function toPersistentDeck(deck: Deck): Promise<Deck> {
  const slides = await Promise.all(deck.slides.map(async (slide) => ({ ...slide, layers: await persistLayers(slide.layers) })));
  return { slides, active: deck.active };
}

/** 저장된 덱을 읽는다. 검증을 통과한 경우에만 돌려주고, 깨졌으면 null. */
export async function loadSavedDeck(): Promise<Deck | null> {
  try {
    return validateDeck(await withStore("readonly", (store) => store.get(KEY)));
  } catch {
    return null;
  }
}
