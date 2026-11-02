import { useEffect } from "react";

interface Props {
  onClose: () => void;
}

const SHORTCUT_GROUPS: Array<{ title: string; items: Array<{ keys: string; label: string }> }> = [
  {
    title: "편집",
    items: [
      { keys: "Ctrl + Z", label: "실행 취소" },
      { keys: "Ctrl + Shift + Z / Ctrl + Y", label: "다시 실행" },
      { keys: "Ctrl + D", label: "선택 레이어 복제" },
      { keys: "Delete / Backspace", label: "선택 레이어 삭제" },
      { keys: "방향키 (Shift = 10px)", label: "선택 레이어(그룹) 이동" },
      { keys: "Esc", label: "자르기 모드 종료 · 선택 해제" },
      { keys: "PageUp / PageDown", label: "이전·다음 슬라이드" },
    ],
  },
  {
    title: "도구·창",
    items: [
      { keys: "Ctrl + K", label: "명령 팔레트" },
      { keys: "Ctrl + E", label: "내보내기 창" },
      { keys: "Shift + R", label: "눈금자 켜기/끄기" },
      { keys: "Shift + G", label: "구도 격자 (3분할 → 격자 → 황금비 → 대각선 → 끄기)" },
      { keys: "? / Ctrl + /", label: "단축키 도움말" },
    ],
  },
  {
    title: "캔버스",
    items: [
      { keys: "Ctrl + 휠", label: "확대·축소" },
      { keys: "드래그", label: "이동(정렬 가이드에 달라붙음)" },
      { keys: "눈금자 클릭", label: "가이드선 추가(드래그 시 달라붙음)" },
      { keys: "자르기 모드 + 휠", label: "이미지 확대" },
      { keys: "⋮⋮ 손잡이 드래그", label: "레이어 순서 변경(터치 가능)" },
      { keys: "Ctrl + 클릭", label: "레이어 다중 선택(그룹용)" },
    ],
  },
];

export function ShortcutHelp({ onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal help-dialog" role="dialog" aria-modal="true" aria-label="단축키 도움말">
        <header className="modal-header">
          <h2>단축키 도움말</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">✕</button>
        </header>
        <div className="modal-body help-body">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              <dl>
                {group.items.map((item) => (
                  <div key={item.keys} className="shortcut-row"><dt><kbd>{item.keys}</kbd></dt><dd>{item.label}</dd></div>
                ))}
              </dl>
            </section>
          ))}
          <p className="panel-hint">Mac은 Ctrl 대신 ⌘를 사용합니다.</p>
        </div>
      </div>
    </div>
  );
}
