import { useRef, useState } from "react";
import type { SavedTemplate } from "../../features/template/templateStore";

interface Props {
  templates: SavedTemplate[];
  onCreate: (name: string) => boolean;
  onLoad: (template: SavedTemplate) => void;
  onRename: (templateId: string, name: string) => boolean;
  onDelete: (templateId: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function TemplatePanel({ templates, onCreate, onLoad, onRename, onDelete, onExport, onImport }: Props) {
  const [newName, setNewName] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="template-panel" aria-label="템플릿 관리">
      <h2>템플릿</h2>
      <form className="template-create" onSubmit={(event) => { event.preventDefault(); if (onCreate(newName)) setNewName(""); }}>
        <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="새 템플릿 이름" aria-label="새 템플릿 이름" />
        <button type="submit">현재 캔버스 저장</button>
      </form>

      <div className="template-list">
        {templates.map((template) => (
          <article className="template-item" key={template.id}>
            <input key={template.name} defaultValue={template.name} aria-label={`${template.name} 이름`} onBlur={(event) => { if (event.target.value !== template.name && !onRename(template.id, event.target.value)) event.target.value = template.name; }} />
            <div className="template-meta">{template.canvas.width} × {template.canvas.height} · 레이어 {template.canvas.layers.length}</div>
            <div className="template-actions">
              <button type="button" onClick={() => onLoad(template)}>불러오기</button>
              <button type="button" className="danger" onClick={() => onDelete(template.id)}>삭제</button>
            </div>
          </article>
        ))}
      </div>

      <div className="template-transfer">
        <button type="button" onClick={onExport}>JSON 내보내기</button>
        <button type="button" onClick={() => importInputRef.current?.click()}>JSON 가져오기</button>
        <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onImport(file); }} />
      </div>
    </aside>
  );
}
