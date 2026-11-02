import type { CanvasProject } from "../../types/canvas";
import { createEmptyProject } from "../../utils/createProject";

/** 인스타그램 캐러셀은 게시물당 최대 10장이다. */
export const MAX_SLIDES = 10;

/** 한 게시물(캐러셀)을 이루는 슬라이드 묶음. 모든 슬라이드는 같은 캔버스 크기를 쓴다. */
export interface Deck {
  slides: CanvasProject[];
  active: number;
}

export function createDeck(width = 1080, height = 1350): Deck {
  return { slides: [createEmptyProject(width, height)], active: 0 };
}

/** 레이어 id를 새로 발급한 복제본(슬라이드 복제·템플릿 적용용). */
export function cloneSlide(slide: CanvasProject): CanvasProject {
  const now = new Date().toISOString();
  return {
    ...structuredClone(slide),
    id: crypto.randomUUID(),
    layers: structuredClone(slide.layers).map((layer) => ({ ...layer, id: crypto.randomUUID() })),
    createdAt: now,
    updatedAt: now,
  };
}

export function withCanvasSize(deck: Deck, width: number, height: number): Deck {
  if (deck.slides.every((slide) => slide.width === width && slide.height === height)) return deck;
  const now = new Date().toISOString();
  return { ...deck, slides: deck.slides.map((slide) => ({ ...slide, width, height, updatedAt: now })) };
}
