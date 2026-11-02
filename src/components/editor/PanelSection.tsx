import { useState } from "react";

// 접어 둔 섹션 제목을 기억한다(레이어를 바꿔 선택해도 같은 섹션은 접힌 채 유지). 메모리에만 저장한다.
const collapsedTitles = new Set<string>();

interface Props {
  title: string;
  label?: string;
  children: React.ReactNode;
}

/** 속성 패널의 접고 펼 수 있는 섹션(LightCraft의 Light·Color·Effects 섹션 방식). */
export function PanelSection({ title, label, children }: Props) {
  const [open, setOpen] = useState(() => !collapsedTitles.has(title));
  const toggle = () => {
    if (open) collapsedTitles.add(title);
    else collapsedTitles.delete(title);
    setOpen(!open);
  };
  return (
    <section className={`panel-section ${open ? "" : "collapsed"}`} aria-label={label ?? title}>
      <h3>
        <button type="button" className="section-toggle" aria-expanded={open} onClick={toggle}>
          <span className="chevron" aria-hidden="true">{open ? "▾" : "▸"}</span>
          {title}
        </button>
      </h3>
      {open && children}
    </section>
  );
}
