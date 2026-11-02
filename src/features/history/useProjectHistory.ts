import { useCallback, useRef, useState } from "react";
import type { CanvasProject } from "../../types/canvas";

const MAX_HISTORY = 100;
const COALESCE_MS = 700;

interface HistoryState {
  past: CanvasProject[];
  present: CanvasProject;
  future: CanvasProject[];
}

type Updater = CanvasProject | ((current: CanvasProject) => CanvasProject);

/**
 * 캔버스 프로젝트의 실행 취소/다시 실행 이력.
 * 슬라이더·색상 선택처럼 짧은 시간에 연속 발생하는 변경은 같은 coalesceKey로 묶어 한 단계로 기록한다.
 */
export function useProjectHistory(initial: () => CanvasProject) {
  const [state, setState] = useState<HistoryState>(() => ({ past: [], present: initial(), future: [] }));
  const lastCommit = useRef<{ key: string; time: number } | null>(null);

  const setProject = useCallback((updater: Updater, coalesceKey?: string) => {
    setState((current) => {
      const next = typeof updater === "function" ? updater(current.present) : updater;
      if (next === current.present) return current;
      const now = Date.now();
      const last = lastCommit.current;
      const shouldMerge = coalesceKey !== undefined && last?.key === coalesceKey && now - last.time < COALESCE_MS;
      lastCommit.current = coalesceKey === undefined ? null : { key: coalesceKey, time: now };
      if (shouldMerge) return { ...current, present: next, future: [] };
      return { past: [...current.past, current.present].slice(-MAX_HISTORY), present: next, future: [] };
    });
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

  return {
    project: state.present,
    setProject,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
