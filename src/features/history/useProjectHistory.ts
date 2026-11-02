import { useCallback, useMemo, useState } from "react";
import type { CanvasProject } from "../../types/canvas";
import type { Deck } from "../deck/deck";

const MAX_HISTORY = 100;
const COALESCE_MS = 700;

interface HistoryState {
  past: Deck[];
  present: Deck;
  future: Deck[];
  /** 마지막 변경의 병합 키와 시각. 상태 안에 두어야 상태 갱신 함수가 순수하다(StrictMode의 이중 호출에도 안전). */
  last: { key: string; time: number } | null;
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
  const [state, setState] = useState<HistoryState>(() => ({ past: [], present: initial(), future: [], last: null }));

  const setDeck = useCallback((updater: DeckUpdater, coalesceKey?: string) => {
    setState((current) => {
      const next = updater(current.present);
      if (next === current.present) return current;
      const now = Date.now();
      const last = coalesceKey === undefined ? null : { key: coalesceKey, time: now };
      const shouldMerge = coalesceKey !== undefined && current.last?.key === coalesceKey && now - current.last.time < COALESCE_MS;
      if (shouldMerge) return { ...current, present: next, future: [], last };
      return { past: [...current.past, current.present].slice(-MAX_HISTORY), present: next, future: [], last };
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
    setState((current) => {
      if (index < 0 || index >= current.present.slides.length || index === current.present.active) return current;
      return { ...current, present: { ...current.present, active: index }, last: null };
    });
  }, []);

  /** 덱 전체를 새로 교체하고 이력을 비운다(자동 저장 복원·새로 시작). */
  const replaceDeck = useCallback((deck: Deck) => {
    setState({ past: [], present: deck, future: [], last: null });
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      const previous = current.past[current.past.length - 1];
      if (!previous) return current;
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future], last: null };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      const [next, ...rest] = current.future;
      if (!next) return current;
      return { past: [...current.past, current.present], present: next, future: rest, last: null };
    });
  }, []);

  /** 이력 전체(오래된 것 → 현재 → 되돌린 것). 작업 이력 패널에서 단계로 점프할 때 쓴다. */
  const timeline = useMemo(() => [...state.past, state.present, ...state.future], [state.past, state.present, state.future]);

  const jumpTo = useCallback((index: number) => {
    setState((current) => {
      const all = [...current.past, current.present, ...current.future];
      if (index < 0 || index >= all.length || index === current.past.length) return current;
      return { past: all.slice(0, index), present: all[index], future: all.slice(index + 1), last: null };
    });
  }, []);

  const deck = state.present;
  return {
    timeline,
    cursor: state.past.length,
    jumpTo,
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
