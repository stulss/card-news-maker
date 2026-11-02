import { useCallback, useRef, useState } from "react";
import type { CanvasProject } from "../../types/canvas";
import type { Deck } from "../deck/deck";

const MAX_HISTORY = 100;
const COALESCE_MS = 700;

interface HistoryState {
  past: Deck[];
  present: Deck;
  future: Deck[];
}

type ProjectUpdater = CanvasProject | ((current: CanvasProject) => CanvasProject);
type DeckUpdater = (current: Deck) => Deck;

/**
 * 슬라이드 묶음(Deck)의 실행 취소/다시 실행 이력.
 * 이력의 단위는 덱 전체 스냅샷이며, 어느 슬라이드를 보고 있었는지(active)도 함께 기록한다 —
 * 다른 슬라이드에서 한 수정을 되돌리면 그 슬라이드로 돌아가서 변화가 눈에 보인다.
 * 슬라이드를 단순히 전환하는 것은 이력 단계로 치지 않는다.
 * 슬라이더·색상 선택처럼 짧은 시간에 연속 발생하는 변경은 같은 coalesceKey로 묶어 한 단계로 기록한다.
 */
export function useProjectHistory(initial: () => Deck) {
  const [state, setState] = useState<HistoryState>(() => ({ past: [], present: initial(), future: [] }));
  const lastCommit = useRef<{ key: string; time: number } | null>(null);

  const setDeck = useCallback((updater: DeckUpdater, coalesceKey?: string) => {
    setState((current) => {
      const next = updater(current.present);
      if (next === current.present) return current;
      const now = Date.now();
      const last = lastCommit.current;
      const shouldMerge = coalesceKey !== undefined && last?.key === coalesceKey && now - last.time < COALESCE_MS;
      lastCommit.current = coalesceKey === undefined ? null : { key: coalesceKey, time: now };
      if (shouldMerge) return { ...current, present: next, future: [] };
      return { past: [...current.past, current.present].slice(-MAX_HISTORY), present: next, future: [] };
    });
  }, []);

  /** 현재 보고 있는 슬라이드 하나를 수정한다. */
  const setProject = useCallback((updater: ProjectUpdater, coalesceKey?: string) => {
    setDeck((deck) => {
      const slide = deck.slides[deck.active];
      const next = typeof updater === "function" ? updater(slide) : updater;
      if (next === slide) return deck;
      return { ...deck, slides: deck.slides.map((candidate, index) => index === deck.active ? next : candidate) };
    }, coalesceKey);
  }, [setDeck]);

  /** 이력을 남기지 않고 보고 있는 슬라이드만 바꾼다. */
  const setActive = useCallback((index: number) => {
    lastCommit.current = null;
    setState((current) => {
      if (index < 0 || index >= current.present.slides.length || index === current.present.active) return current;
      return { ...current, present: { ...current.present, active: index } };
    });
  }, []);

  /** 덱 전체를 새로 교체하고 이력을 비운다(자동 저장 복원·새로 시작). */
  const replaceDeck = useCallback((deck: Deck) => {
    lastCommit.current = null;
    setState({ past: [], present: deck, future: [] });
  }, []);

  const undo = useCallback(() => {
    lastCommit.current = null;
    setState((current) => {
      const previous = current.past[current.past.length - 1];
      if (!previous) return current;
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] };
    });
  }, []);

  const redo = useCallback(() => {
    lastCommit.current = null;
    setState((current) => {
      const [next, ...rest] = current.future;
      if (!next) return current;
      return { past: [...current.past, current.present], present: next, future: rest };
    });
  }, []);

  const deck = state.present;
  return {
    deck,
    project: deck.slides[deck.active],
    setProject,
    setDeck,
    setActive,
    replaceDeck,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
