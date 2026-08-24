import { useRef, useState } from "react";
import { CanvasStage } from "./components/canvas/CanvasStage";
import type { CanvasStageHandle } from "./components/canvas/CanvasStage";
import { TextStylePanel } from "./components/editor/TextStylePanel";
import { LayerPanel } from "./components/layer/LayerPanel";
import { TemplatePanel } from "./components/template/TemplatePanel";
import { createEmptyProject } from "./utils/createProject";
import { loadImageFile, ImageUploadError } from "./features/image/loadImageFile";
import { createExportFileName, downloadDataUrl } from "./features/export/downloadCanvas";
import type { ImageLayer, Layer, TextLayer } from "./types/canvas";
import {
  createDefaultTemplates,
  createTemplate,
  loadTemplates,
  parseTemplateBundle,
  projectFromTemplate,
  saveTemplates,
  serializeTemplates,
  TEMPLATE_EXPORT_FILE_NAME,
  TemplateValidationError,
} from "./features/template/templateStore";
import type { SavedTemplate } from "./features/template/templateStore";
import "./App.css";

const RATIO_PRESETS = [
  { label: "1:1", width: 1080, height: 1080 },
  { label: "4:5", width: 1080, height: 1350 },
  { label: "9:16", width: 1080, height: 1920 },
] as const;

function initializeTemplates() {
  try {
    return { templates: loadTemplates(), error: null as string | null };
  } catch (error) {
    return {
      templates: createDefaultTemplates(),
      error: error instanceof Error ? error.message : "저장된 템플릿을 불러오지 못했습니다.",
    };
  }
}

function App() {
  const [project, setProject] = useState(() => createEmptyProject(1080, 1080));
  const [initialTemplates] = useState(initializeTemplates);
  const [templates, setTemplates] = useState(initialTemplates.templates);
  const [sidebarTab, setSidebarTab] = useState<"layers" | "templates">("layers");
  const [errorMessage, setErrorMessage] = useState<string | null>(initialTemplates.error);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasStageRef = useRef<CanvasStageHandle>(null);

  const selectedLayer = project.layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedTextLayer = selectedLayer?.type === "text" ? selectedLayer : null;

  function updateLayer(layerId: string, changes: Partial<Layer>) {
    setProject((current) => ({
      ...current,
      layers: current.layers.map((layer) => layer.id === layerId ? { ...layer, ...changes } as Layer : layer),
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleToggleVisible(layerId: string) {
    const layer = project.layers.find((l) => l.id === layerId);
    if (layer) updateLayer(layerId, { visible: !layer.visible });
  }

  function handleToggleLocked(layerId: string) {
    const layer = project.layers.find((l) => l.id === layerId);
    if (layer) updateLayer(layerId, { locked: !layer.locked });
  }

  function handleMoveLayer(layerId: string, direction: "up" | "down") {
    const sorted = [...project.layers].sort((a, b) => a.zIndex - b.zIndex);
    const index = sorted.findIndex((l) => l.id === layerId);
    if (index < 0) return;

    if (direction === "up" && index < sorted.length - 1) {
      const temp = sorted[index].zIndex;
      sorted[index].zIndex = sorted[index + 1].zIndex;
      sorted[index + 1].zIndex = temp;
    } else if (direction === "down" && index > 0) {
      const temp = sorted[index].zIndex;
      sorted[index].zIndex = sorted[index - 1].zIndex;
      sorted[index - 1].zIndex = temp;
    }

    setProject((current) => ({
      ...current,
      layers: [...sorted],
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleDeleteLayer(layerId: string) {
    setProject((current) => ({
      ...current,
      layers: current.layers.filter((l) => l.id !== layerId),
      updatedAt: new Date().toISOString(),
    }));
    if (selectedLayerId === layerId) setSelectedLayerId(null);
  }

  function commitTemplates(nextTemplates: SavedTemplate[]) {
    saveTemplates(nextTemplates);
    setTemplates(nextTemplates);
  }

  function handleCreateTemplate(name: string) {
    try {
      const template = createTemplate(name, project);
      commitTemplates([...templates, template]);
      setErrorMessage(null);
      setStatusMessage(`"${template.name}" 템플릿을 저장했습니다.`);
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "템플릿을 저장하지 못했습니다.");
      setStatusMessage(null);
      return false;
    }
  }

  function handleLoadTemplate(template: SavedTemplate) {
    setProject(projectFromTemplate(template));
    setSelectedLayerId(null);
    setErrorMessage(null);
    setStatusMessage(`"${template.name}" 템플릿을 불러왔습니다.`);
  }

  function handleRenameTemplate(templateId: string, name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("템플릿 이름을 입력해 주세요.");
      return false;
    }
    try {
      const now = new Date().toISOString();
      const next = templates.map((template) => template.id === templateId ? { ...template, name: trimmedName, updatedAt: now } : template);
      commitTemplates(next);
      setErrorMessage(null);
      setStatusMessage("템플릿 이름을 수정했습니다.");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "템플릿 이름을 수정하지 못했습니다.");
      return false;
    }
  }

  function handleDeleteTemplate(templateId: string) {
    try {
      commitTemplates(templates.filter((template) => template.id !== templateId));
      setErrorMessage(null);
      setStatusMessage("템플릿을 삭제했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "템플릿을 삭제하지 못했습니다.");
    }
  }

  function handleExportTemplates() {
    const blob = new Blob([serializeTemplates(templates)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = TEMPLATE_EXPORT_FILE_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatusMessage(`${templates.length}개 템플릿을 내보냈습니다.`);
  }

  async function handleImportTemplates(file: File) {
    try {
      const imported = parseTemplateBundle(await file.text());
      commitTemplates(imported);
      setErrorMessage(null);
      setStatusMessage(`${imported.length}개 템플릿을 가져왔습니다.`);
    } catch (error) {
      console.error("Template import failed", error);
      setErrorMessage(error instanceof TemplateValidationError ? error.message : "JSON 파일을 읽지 못했습니다. 기존 템플릿은 유지됩니다.");
      setStatusMessage(null);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택 가능하도록 초기화
    if (!file) return;

    try {
      const { src, naturalWidth, naturalHeight } = await loadImageFile(file);

      // cover 방식으로 캔버스를 꽉 채우도록 배치 (F-01 완료 조건: 캔버스에 정상 표시)
      const canvasRatio = project.width / project.height;
      const imageRatio = naturalWidth / naturalHeight;
      let width: number, height: number, x: number, y: number;

      if (imageRatio > canvasRatio) {
        height = project.height;
        width = height * imageRatio;
        x = (project.width - width) / 2;
        y = 0;
      } else {
        width = project.width;
        height = width / imageRatio;
        x = 0;
        y = (project.height - height) / 2;
      }

      const newLayer: ImageLayer = {
        id: crypto.randomUUID(),
        type: "image",
        src,
        x,
        y,
        width,
        height,
        rotation: 0,
        zIndex: project.layers.length,
        visible: true,
        locked: false,
        name: file.name,
      };

      setProject((p) => ({ ...p, layers: [...p.layers, newLayer], updatedAt: new Date().toISOString() }));
      setSelectedLayerId(newLayer.id);
      setErrorMessage(null);
    } catch (err) {
      if (err instanceof ImageUploadError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("이미지를 불러오지 못했습니다. 다시 시도해 주세요.");
      }
    }
  }

  function handleAddText() {
    const newLayer: TextLayer = {
      id: crypto.randomUUID(),
      type: "text",
      text: "오늘도 화이팅!",
      x: 80,
      y: project.height - 200,
      width: project.width - 160,
      height: 120,
      rotation: 0,
      zIndex: project.layers.length,
      visible: true,
      locked: false,
      name: `텍스트 ${project.layers.filter((l) => l.type === "text").length + 1}`,
      fontFamily: "IBM Plex Sans KR",
      fontSize: 64,
      color: "#ffffff",
      bold: true,
      italic: false,
      align: "center",
      lineHeight: 1.3,
      letterSpacing: 0,
      strokeColor: "#000000",
      strokeWidth: 6,
    };
    setProject((p) => ({ ...p, layers: [...p.layers, newLayer], updatedAt: new Date().toISOString() }));
    setSelectedLayerId(newLayer.id);
  }

  function handleDownload(format: "png" | "jpg") {
    try {
      const dataUrl = canvasStageRef.current?.toDataUrl(format, 0.9);
      if (!dataUrl) throw new Error("캔버스를 아직 렌더링하지 못했습니다.");
      downloadDataUrl(dataUrl, createExportFileName(format));
      setErrorMessage(null);
    } catch (error) {
      console.error("Canvas export failed", error);
      setErrorMessage("다운로드에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          height: 56,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-panel)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: "var(--color-accent)" }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>카드뉴스 메이커</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", background: "oklch(0.23 0.008 264)", borderRadius: 7, padding: 2, border: "1px solid var(--color-border)" }} role="group" aria-label="화면비 선택">
            {RATIO_PRESETS.map((preset) => {
              const isActive = project.width === preset.width && project.height === preset.height;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setProject((p) => ({ ...p, width: preset.width, height: preset.height, updatedAt: new Date().toISOString() }))}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 5,
                    border: "none",
                    background: isActive ? "var(--color-accent)" : "transparent",
                    color: isActive ? "var(--color-accent-text)" : "var(--color-text-muted)",
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    cursor: "pointer",
                  }}
                  aria-pressed={isActive}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={toolbarButtonStyle}
          >
            이미지 추가
          </button>
          <button type="button" onClick={handleAddText} style={toolbarButtonStyle}>
            텍스트 추가
          </button>
          <button type="button" onClick={() => handleDownload("jpg")} style={toolbarButtonStyle}>
            JPG 다운로드
          </button>
          <button type="button" onClick={() => handleDownload("png")} style={{ ...toolbarButtonStyle, background: "var(--color-accent)", color: "var(--color-accent-text)", fontWeight: 600 }}>
            PNG 다운로드
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={handleFileSelected}
        />
      </header>

      {errorMessage && (
        <div
          style={{
            padding: "10px 20px",
            background: "oklch(0.30 0.10 25)",
            color: "oklch(0.92 0.03 25)",
            fontSize: 13,
          }}
        >
          {errorMessage}
        </div>
      )}

      {statusMessage && !errorMessage && <div className="status-banner" role="status">{statusMessage}</div>}

      <main className="editor-workspace">
        <div className="left-sidebar" style={{ display: "flex", flexDirection: "column", width: 260, flexShrink: 0, borderRight: "1px solid var(--color-border)", background: "var(--color-bg-panel)" }}>
          <div className="sidebar-tabs">
            <button
              type="button"
              className={`sidebar-tab-btn ${sidebarTab === "layers" ? "active" : ""}`}
              onClick={() => setSidebarTab("layers")}
            >
              레이어 ({project.layers.length})
            </button>
            <button
              type="button"
              className={`sidebar-tab-btn ${sidebarTab === "templates" ? "active" : ""}`}
              onClick={() => setSidebarTab("templates")}
            >
              템플릿 ({templates.length})
            </button>
          </div>

          {sidebarTab === "layers" ? (
            <LayerPanel
              layers={project.layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onToggleVisible={handleToggleVisible}
              onToggleLocked={handleToggleLocked}
              onMoveLayer={handleMoveLayer}
              onDeleteLayer={handleDeleteLayer}
            />
          ) : (
            <TemplatePanel
              templates={templates}
              onCreate={handleCreateTemplate}
              onLoad={handleLoadTemplate}
              onRename={handleRenameTemplate}
              onDelete={handleDeleteTemplate}
              onExport={handleExportTemplates}
              onImport={handleImportTemplates}
            />
          )}
        </div>

        <CanvasStage ref={canvasStageRef} project={project} selectedLayerId={selectedLayerId} onSelectLayer={setSelectedLayerId} onChangeLayer={updateLayer} />
        <TextStylePanel layer={selectedTextLayer} onChange={(changes) => { if (selectedTextLayer) updateLayer(selectedTextLayer.id, changes); }} />
      </main>
    </div>
  );
}

const toolbarButtonStyle: React.CSSProperties = {
  height: 34,
  display: "flex",
  alignItems: "center",
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text)",
  fontSize: 13,
  fontFamily: "inherit",
  cursor: "pointer",
};

export default App;
