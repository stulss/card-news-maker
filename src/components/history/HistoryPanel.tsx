import { useEffect, useMemo, useRef } from "react";
import { describeChange } from "../../features/history/describe";
import type { Deck } from "../../features/deck/deck";

interface Props {
  timeline: Deck[];
  cursor: number;
  onJump: (index: number) => void;
}

/** 작업 이력: 되돌리기 단계를 목록으로 보고 원하는 단계로 바로 이동한다(LightCraft의 History 패널을 참고). */
export function HistoryPanel({ timeline, cursor, onJump }: Props) {
  const labels = useMemo(() => timeline.map((deck, index) => (index === 0 ? "처음 상태" : describeChange(timeline[index - 1], deck))), [timeline]);
  const currentRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { currentRef.current?.scrollIntoView({ block: "nearest" }); }, [cursor, timeline.length]);

  return (
    <aside className="side-panel" aria-label="작업 이력">
      <h2>작업 이력</h2>
      <p className="panel-hint">단계를 누르면 그 시점으로 돌아가요. 새로 수정하면 그 뒤의 단계는 사라집니다(Ctrl+Z / Ctrl+Shift+Z).</p>
      <ol className="history-list">
        {labels.map((label, index) => {
          const isCurrent = index === cursor;
          return (
            <li key={index}>
              <button
                ref={isCurrent ? currentRef : undefined}
                type="button"
                className={`history-item ${isCurrent ? "current" : ""} ${index > cursor ? "undone" : ""}`}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onJump(index)}
              >
                <span className="history-index">{index}</span>
                <span className="history-label">{label}</span>
                {isCurrent && <span className="history-badge">현재</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
