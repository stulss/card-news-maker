import { useEffect, useMemo, useRef, useState } from "react";

export interface Command {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  shortcut?: string;
  run: () => void;
}

interface Props {
  commands: Command[];
  onClose: () => void;
}

export function CommandPalette({ commands, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matched = commands.filter((command) => {
      const haystack = `${command.label} ${command.group} ${command.keywords ?? ""}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
    return matched.slice(0, 60);
  }, [commands, query]);

  useEffect(() => { listRef.current?.children[index]?.scrollIntoView({ block: "nearest" }); }, [index]);

  const runAt = (position: number) => {
    const command = results[position];
    if (!command) return;
    onClose();
    // 팔레트가 닫힌 뒤 실행해야 포커스·단축키 상태가 꼬이지 않는다.
    window.setTimeout(command.run, 0);
  };

  return (
    <div className="modal-backdrop palette-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal palette" role="dialog" aria-modal="true" aria-label="명령 팔레트">
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          placeholder="명령 검색 (예: 별, 정렬, 내보내기, 눈금자)"
          aria-label="명령 검색"
          onChange={(event) => { setQuery(event.target.value); setIndex(0); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setIndex((current) => Math.min(results.length - 1, current + 1)); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setIndex((current) => Math.max(0, current - 1)); }
            else if (event.key === "Enter") { event.preventDefault(); runAt(index); }
            else if (event.key === "Escape") { event.preventDefault(); onClose(); }
          }}
        />
        <ul ref={listRef} className="palette-list" role="listbox">
          {results.length === 0 && <li className="palette-empty">일치하는 명령이 없습니다.</li>}
          {results.map((command, position) => (
            <li key={command.id} role="option" aria-selected={position === index} className={position === index ? "active" : ""}
              onMouseEnter={() => setIndex(position)} onClick={() => runAt(position)}>
              <span className="palette-group">{command.group}</span>
              <span className="palette-label">{command.label}</span>
              {command.shortcut && <kbd>{command.shortcut}</kbd>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
