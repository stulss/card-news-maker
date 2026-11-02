import { useCallback, useEffect, useRef, useState } from "react";
import { CanvasStage } from "./components/canvas/CanvasStage";
import type { CanvasStageHandle } from "./components/canvas/CanvasStage";
import { PropertiesPanel } from "./components/editor/PropertiesPanel";
import { MemePanel } from "./components/meme/MemePanel";
import { LayerPanel } from "./components/layer/LayerPanel";
import { TemplatePanel } from "./components/template/TemplatePanel";
import { GalleryPanel } from "./components/template/GalleryPanel";
import { ShapePanel } from "./components/shape/ShapePanel";
import { ExportDialog } from "./components/export/ExportDialog";
import { ShortcutHelp } from "./components/help/ShortcutHelp";
import { CommandPalette } from "./components/command/CommandPalette";
import type { Command } from "./components/command/CommandPalette";
import type { RulerGuide } from "./components/canvas/Rulers";
import { loadExportSettings, renderExport, saveExportSettings } from "./features/export/exportImage";
import type { ExportSettings } from "./features/export/exportImage";
import type { ShapeKind } from "./components/shape/ShapePanel";
import type { AlignMode } from "./components/editor/PropertiesPanel";
import type { GalleryTemplate } from "./features/template/galleryTemplates";
import { useProjectHistory } from "./features/history/useProjectHistory";
import { buildEmojiSticker, buildMemePreset } from "./features/meme/memePresets";
import { groupMemberIds, normalizeGroups } from "./features/layer/groups";
import { createStickerFromFile, loadStickers, saveStickers } from "./features/sticker/stickerStore";
import type { UserSticker } from "./features/sticker/stickerStore";
import { createEmptyProject } from "./utils/createProject";
import { textColorDefaultsFor } from "./utils/textDefaults";
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
  const { project, setProject, undo, redo, canUndo, canRedo } = useProjectHistory(() => createEmptyProject(1080, 1080));
  const [initialTemplates] = useState(initializeTemplates);
  const [templates, setTemplates] = useState(initialTemplates.templates);
  const [sidebarTab, setSidebarTab] = useState<"layers" | "templates" | "meme" | "gallery" | "shapes">("gallery");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isStyleSheetOpen, setIsStyleSheetOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialTemplates.error);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [cropTargetId, setCropTargetId] = useState<string | null>(null);
  const [isComparingOriginal, setIsComparingOriginal] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(loadExportSettings);
  const [rulersVisible, setRulersVisible] = useState(false);
  const [rulerGuides, setRulerGuides] = useState<RulerGuide[]>([]);
  const [userStickers, setUserStickers] = useState<UserSticker[]>(loadStickers);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasStageRef = useRef<CanvasStageHandle>(null);

  const selectedLayer = project.layers.find((layer) => layer.id === selectedLayerId) ?? null;
  // 자르기 모드는 선택된 이미지 레이어 하나에만 적용된다(다른 레이어를 고르면 자동으로 꺼진 것으로 취급).
  const cropLayerId = selectedLayer?.type === "image" && selectedLayer.id === cropTargetId ? selectedLayer.id : null;
  const nextZIndex = project.layers.reduce((max, layer) => Math.max(max, layer.zIndex), -1) + 1;

  function updateLayer(layerId: string, changes: Partial<Layer>, coalesceKey?: string) {
    setProject((current) => ({
      ...current,
      layers: current.layers.map((layer) => layer.id === layerId ? { ...layer, ...changes } as Layer : layer),
      updatedAt: new Date().toISOString(),
    }), coalesceKey);
  }

  function addLayers(newLayers: Layer[]) {
    if (newLayers.length === 0) return;
    const placed = newLayers.map((layer, index) => ({ ...layer, zIndex: nextZIndex + index }));
    setProject((p) => ({ ...p, layers: [...p.layers, ...placed], updatedAt: new Date().toISOString() }));
    setSelectedLayerId(placed[0].id);
  }

  function handleDuplicateLayer() {
    if (!selectedLayer) return;
    addLayers([{ ...structuredClone(selectedLayer), id: crypto.randomUUID(), x: selectedLayer.x + 30, y: selectedLayer.y + 30, name: `${selectedLayer.name} 복사`, locked: false, groupId: undefined }]);
  }

  function handleApplyMemePreset(presetId: string) {
    addLayers(buildMemePreset(presetId, project));
    setErrorMessage(null);
    setIsMobileSidebarOpen(false);
  }

  function handleAddSticker(emoji: string) {
    addLayers([buildEmojiSticker(emoji, project)]);
    setIsMobileSidebarOpen(false);
  }

  // 키보드 단축키 — 입력창에 포커스가 있을 때는 브라우저 기본 동작(글자 편집 취소 등)을 그대로 둔다.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      // 명령 팔레트는 입력창에 포커스가 있어도 열리고 닫힌다.
      if (mod && key === "k") { event.preventDefault(); setIsPaletteOpen((open) => !open); return; }
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (isExportOpen || isHelpOpen || isPaletteOpen) return; // 창이 열려 있는 동안 캔버스 단축키는 막는다
      if (mod && key === "e") { event.preventDefault(); setIsExportOpen(true); return; }
      if ((mod && key === "/") || event.key === "?") { event.preventDefault(); setIsHelpOpen(true); return; }
      if (!mod && event.shiftKey && key === "r") { event.preventDefault(); setRulersVisible((visible) => !visible); return; }
      if (mod && key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (mod && key === "y") { event.preventDefault(); redo(); return; }
      if (!selectedLayer) return;
      if (mod && key === "d") { event.preventDefault(); handleDuplicateLayer(); return; }
      if (key === "delete" || key === "backspace") { event.preventDefault(); handleDeleteLayer(selectedLayer.id); return; }
      if (key === "escape") { if (cropLayerId) setCropTargetId(null); else setSelectedLayerId(null); return; }
      const step = event.shiftKey ? 10 : 1;
      const moves: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] };
      const move = moves[key];
      if (move && !selectedLayer.locked) {
        event.preventDefault();
        handleMoveLayers(groupMemberIds(project.layers, selectedLayer).filter((id) => !project.layers.find((l) => l.id === id)?.locked), move[0], move[1], "nudge");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // 표시·잠금은 그룹 단위로 적용한다(그룹이 없으면 레이어 하나).
  function setLayerFlag(layerId: string, flag: "visible" | "locked") {
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer) return;
    const members = new Set(groupMemberIds(project.layers, layer));
    const value = !layer[flag];
    setProject((p) => ({ ...p, layers: p.layers.map((l) => members.has(l.id) ? { ...l, [flag]: value } as Layer : l), updatedAt: new Date().toISOString() }));
  }

  const handleToggleVisible = (layerId: string) => setLayerFlag(layerId, "visible");
  const handleToggleLocked = (layerId: string) => setLayerFlag(layerId, "locked");

  function handleMoveLayers(layerIds: string[], dx: number, dy: number, coalesceKey?: string) {
    if (!dx && !dy) return;
    const ids = new Set(layerIds);
    setProject((p) => ({ ...p, layers: p.layers.map((l) => ids.has(l.id) ? { ...l, x: l.x + dx, y: l.y + dy } : l), updatedAt: new Date().toISOString() }), coalesceKey);
  }

  function handleGroupLayers(layerIds: string[]) {
    if (layerIds.length < 2) return;
    const ids = new Set(layerIds);
    const groupId = crypto.randomUUID();
    setProject((p) => ({ ...p, layers: normalizeGroups(p.layers.map((l) => ids.has(l.id) ? { ...l, groupId } : l)), updatedAt: new Date().toISOString() }));
    setStatusMessage(`${layerIds.length}개 레이어를 그룹으로 묶었습니다. 이동·숨김·잠금이 함께 적용됩니다.`);
  }

  function handleUngroupLayers(groupIds: string[]) {
    const targets = new Set(groupIds);
    setProject((p) => ({ ...p, layers: p.layers.map((l) => { if (!l.groupId || !targets.has(l.groupId)) return l; const { groupId: _removed, ...rest } = l; return rest as Layer; }), updatedAt: new Date().toISOString() }));
    setStatusMessage("그룹을 해제했습니다.");
  }

  async function handleUploadSticker(file: File) {
    try {
      const sticker = await createStickerFromFile(file);
      const next = [...userStickers, sticker];
      saveStickers(next);
      setUserStickers(next);
      setErrorMessage(null);
      setStatusMessage(`"${sticker.name}" 스티커를 저장했습니다. 눌러서 캔버스에 추가하세요.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "스티커를 저장하지 못했습니다.");
    }
  }

  function handleAddUserSticker(stickerId: string) {
    const sticker = userStickers.find((s) => s.id === stickerId);
    if (!sticker) return;
    // 캔버스 폭의 40%(세로는 60%) 안에 비율을 유지해 가운데에 놓는다.
    const fit = Math.min((project.width * 0.4) / sticker.width, (project.height * 0.6) / sticker.height);
    const width = sticker.width * fit;
    const height = sticker.height * fit;
    addLayers([{
      id: crypto.randomUUID(), type: "image", src: sticker.src, name: sticker.name,
      x: (project.width - width) / 2, y: (project.height - height) / 2, width, height,
      rotation: 0, zIndex: 0, visible: true, locked: false,
    }]);
    setIsMobileSidebarOpen(false);
  }

  function handleAddShape(kind: ShapeKind, fillColor: string) {
    const base = Math.round(project.width * 0.33);
    const sizes: Record<ShapeKind, { width: number; height: number }> = {
      rectangle: { width: Math.round(project.width * 0.45), height: Math.round(project.width * 0.28) },
      rounded: { width: Math.round(project.width * 0.45), height: Math.round(project.width * 0.28) },
      circle: { width: base, height: base },
      star: { width: base, height: base },
      triangle: { width: base, height: base },
      line: { width: Math.round(project.width * 0.55), height: Math.max(8, Math.round(project.width * 0.01)) },
    };
    const { width, height } = sizes[kind];
    const labels: Record<ShapeKind, string> = { rectangle: "사각형", rounded: "둥근 사각형", circle: "원", star: "별", triangle: "삼각형", line: "구분선" };
    addLayers([{
      id: crypto.randomUUID(), type: "shape", name: labels[kind],
      shapeType: kind === "rounded" || kind === "line" ? "rectangle" : kind,
      x: (project.width - width) / 2, y: (project.height - height) / 2, width, height,
      rotation: 0, zIndex: 0, visible: true, locked: false, fillColor,
      cornerRadius: kind === "rounded" ? Math.round(height * 0.2) : undefined,
    }]);
    setIsMobileSidebarOpen(false);
  }

  // 캔버스 기준 정렬. 그룹에 속한 레이어는 그룹 전체의 경계 상자를 기준으로 함께 움직인다.
  function handleAlign(mode: AlignMode) {
    if (!selectedLayer) return;
    const ids = groupMemberIds(project.layers, selectedLayer);
    const members = project.layers.filter((l) => ids.includes(l.id) && !l.locked);
    if (members.length === 0) return;
    const minX = Math.min(...members.map((l) => l.x));
    const maxX = Math.max(...members.map((l) => l.x + l.width));
    const minY = Math.min(...members.map((l) => l.y));
    const maxY = Math.max(...members.map((l) => l.y + l.height));
    const dx = mode === "left" ? -minX : mode === "right" ? project.width - maxX : mode === "hcenter" ? project.width / 2 - (minX + maxX) / 2 : 0;
    const dy = mode === "top" ? -minY : mode === "bottom" ? project.height - maxY : mode === "vcenter" ? project.height / 2 - (minY + maxY) / 2 : 0;
    handleMoveLayers(members.map((l) => l.id), dx, dy);
  }

  function handleDeleteUserSticker(stickerId: string) {
    const next = userStickers.filter((s) => s.id !== stickerId);
    try { saveStickers(next); } catch (error) { console.error("Sticker storage failed", error); }
    setUserStickers(next);
  }

  // 레이어 순서는 항상 새 배열/새 객체로 바꾼다 — 이력(undo) 스냅샷과 객체를 공유하므로 제자리 수정 금지.
  function reorderLayers(move: (idsFrontToBack: string[]) => string[]) {
    setProject((current) => {
      const frontToBack = [...current.layers].sort((a, b) => b.zIndex - a.zIndex).map((layer) => layer.id);
      const next = move(frontToBack);
      if (next.join() === frontToBack.join()) return current;
      const zIndexById = new Map(next.map((id, index) => [id, next.length - 1 - index]));
      return {
        ...current,
        layers: current.layers.map((layer) => ({ ...layer, zIndex: zIndexById.get(layer.id) ?? layer.zIndex })),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function handleMoveLayer(layerId: string, direction: "up" | "down") {
    reorderLayers((ids) => {
      const index = ids.indexOf(layerId);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleReorderLayer(fromId: string, toId: string) {
    reorderLayers((ids) => {
      const next = ids.filter((id) => id !== fromId);
      const toIndex = next.indexOf(toId);
      if (toIndex < 0 || !ids.includes(fromId)) return ids;
      // 아래로 끌면 대상 뒤에, 위로 끌면 대상 앞에 놓아 맨 위·맨 아래 위치에도 도달할 수 있게 한다.
      next.splice(ids.indexOf(fromId) < ids.indexOf(toId) ? toIndex + 1 : toIndex, 0, fromId);
      return next;
    });
  }

  function handleApplyGalleryTemplate(template: GalleryTemplate) {
    const layers = structuredClone(template.canvas.layers).map((layer) => ({ ...layer, id: crypto.randomUUID() }));
    setProject((p) => ({ ...p, width: template.canvas.width, height: template.canvas.height, backgroundColor: template.canvas.backgroundColor, layers, updatedAt: new Date().toISOString() }));
    setSelectedLayerId(null);
    setErrorMessage(null);
    setStatusMessage(`"${template.name}" 템플릿을 적용했습니다. 문구를 눌러 바꿔 보세요.`);
    setIsMobileSidebarOpen(false);
  }

  function handleDeleteLayer(layerId: string) {
    setProject((current) => ({
      ...current,
      layers: normalizeGroups(current.layers.filter((l) => l.id !== layerId)),
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
        zIndex: nextZIndex,
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
    // 배경이 밝으면 진한 글자, 어두우면 흰 글자 — 흰 배경에 흰 글자가 되어 안 보이던 문제 방지
    const { color, strokeColor } = textColorDefaultsFor(project.backgroundColor);
    const newLayer: TextLayer = {
      id: crypto.randomUUID(),
      type: "text",
      text: "오늘도 화이팅!",
      x: 80,
      y: project.height - 200,
      width: project.width - 160,
      height: 120,
      rotation: 0,
      zIndex: nextZIndex,
      visible: true,
      locked: false,
      name: `텍스트 ${project.layers.filter((l) => l.type === "text").length + 1}`,
      fontFamily: "IBM Plex Sans KR",
      fontSize: 64,
      color,
      bold: true,
      italic: false,
      align: "center",
      lineHeight: 1.3,
      letterSpacing: 0,
      strokeColor,
      strokeWidth: 6,
    };
    setProject((p) => ({ ...p, layers: [...p.layers, newLayer], updatedAt: new Date().toISOString() }));
    setSelectedLayerId(newLayer.id);
  }

  // 내보내기 창: 캔버스를 PNG로 뽑은 뒤 워터마크·형식·품질을 적용한다(미리보기와 다운로드가 같은 경로).
  const renderExportData = useCallback(async (settings: ExportSettings) => {
    const stage = canvasStageRef.current;
    if (!stage) throw new Error("캔버스를 아직 렌더링하지 못했습니다.");
    return renderExport(stage.toDataUrl("png", 1, settings.scale), settings);
  }, []);

  async function handleExportDownload(settings: ExportSettings) {
    try {
      const dataUrl = await renderExportData(settings);
      downloadDataUrl(dataUrl, createExportFileName(settings.format));
      saveExportSettings(settings);
      setIsExportOpen(false);
      setErrorMessage(null);
      setStatusMessage(`${settings.format.toUpperCase()} 파일로 내보냈습니다.`);
    } catch (error) {
      console.error("Export failed", error);
      setErrorMessage(error instanceof Error ? error.message : "내보내기에 실패했습니다.");
    }
  }

  function handleAddGuide(axis: "x" | "y", position: number) {
    setRulerGuides((guides) => guides.some((g) => g.axis === axis && g.position === position) ? guides : [...guides, { id: crypto.randomUUID(), axis, position }]);
  }

  function buildCommands(): Command[] {
    const hasSelection = !!selectedLayer;
    const list: Command[] = [
      { id: "undo", group: "편집", label: "실행 취소", shortcut: "Ctrl+Z", keywords: "undo 되돌리기", run: undo },
      { id: "redo", group: "편집", label: "다시 실행", shortcut: "Ctrl+Shift+Z", keywords: "redo", run: redo },
      { id: "add-image", group: "추가", label: "이미지 추가", keywords: "사진 업로드 image", run: () => fileInputRef.current?.click() },
      { id: "add-text", group: "추가", label: "텍스트 추가", keywords: "글자 문구 text", run: handleAddText },
      ...(["rectangle", "rounded", "circle", "star", "triangle", "line"] as const).map((kind): Command => ({
        id: `shape-${kind}`, group: "도형", label: `${{ rectangle: "사각형", rounded: "둥근 사각형", circle: "원", star: "별", triangle: "삼각형", line: "구분선" }[kind]} 추가`,
        keywords: "shape 도형", run: () => handleAddShape(kind, "#8b5cf6"),
      })),
      ...["classic", "center", "subtitle", "bubble", "breaking"].map((presetId): Command => ({
        id: `meme-${presetId}`, group: "밈", label: `밈 자막: ${{ classic: "클래식 상·하단", center: "중앙 한 줄", subtitle: "영화 자막", bubble: "말풍선 대사", breaking: "속보 뉴스" }[presetId]}`,
        keywords: "meme 자막", run: () => handleApplyMemePreset(presetId),
      })),
      ...(([["gallery", "갤러리"], ["shapes", "도형"], ["meme", "밈·스티커"], ["templates", "내 템플릿"], ["layers", "레이어"]]) as const).map(([tab, name]): Command => ({
        id: `tab-${tab}`, group: "패널", label: `${name} 패널 열기`, keywords: "panel tab", run: () => { setSidebarTab(tab); setIsMobileSidebarOpen(true); },
      })),
      ...RATIO_PRESETS.map((preset): Command => ({
        id: `ratio-${preset.label}`, group: "캔버스", label: `화면비 ${preset.label}`, keywords: "비율 크기 ratio",
        run: () => setProject((p) => ({ ...p, width: preset.width, height: preset.height, updatedAt: new Date().toISOString() })),
      })),
      { id: "rulers", group: "보기", label: rulersVisible ? "눈금자 끄기" : "눈금자 켜기", shortcut: "Shift+R", keywords: "ruler 가이드", run: () => setRulersVisible((visible) => !visible) },
      { id: "clear-guides", group: "보기", label: "가이드선 모두 지우기", keywords: "guide", run: () => setRulerGuides([]) },
      { id: "export", group: "내보내기", label: "내보내기 창 열기 (PNG·JPG·WebP·워터마크)", shortcut: "Ctrl+E", keywords: "export 다운로드 저장 webp 워터마크", run: () => setIsExportOpen(true) },
      { id: "quick-png", group: "내보내기", label: "PNG로 바로 저장", keywords: "download", run: () => handleDownload("png") },
      { id: "quick-jpg", group: "내보내기", label: "JPG로 바로 저장", keywords: "download", run: () => handleDownload("jpg") },
      { id: "help", group: "도움말", label: "단축키 도움말", shortcut: "?", keywords: "shortcut keyboard 키보드", run: () => setIsHelpOpen(true) },
    ];
    if (hasSelection) {
      list.push(
        { id: "duplicate", group: "선택 레이어", label: "복제", shortcut: "Ctrl+D", run: handleDuplicateLayer },
        { id: "delete", group: "선택 레이어", label: "삭제", shortcut: "Delete", run: () => handleDeleteLayer(selectedLayer.id) },
        ...(["left", "hcenter", "right", "top", "vcenter", "bottom"] as const).map((mode): Command => ({
          id: `align-${mode}`, group: "선택 레이어", label: `캔버스 ${{ left: "왼쪽", hcenter: "가로 가운데", right: "오른쪽", top: "위", vcenter: "세로 가운데", bottom: "아래" }[mode]} 정렬`,
          keywords: "align 정렬 맞춤", run: () => handleAlign(mode),
        })),
      );
    }
    return list;
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

  function openTab(tab: "layers" | "templates" | "meme" | "gallery" | "shapes") {
    setIsStyleSheetOpen(false);
    setIsMobileSidebarOpen(sidebarTab === tab ? !isMobileSidebarOpen : true);
    setSidebarTab(tab);
  }

  const railTabs = [
    { id: "gallery", icon: "▦", label: "갤러리" },
    { id: "shapes", icon: "◆", label: "도형" },
    { id: "meme", icon: "😂", label: "밈" },
    { id: "templates", icon: "★", label: "내 템플릿" },
    { id: "layers", icon: "☰", label: "레이어" },
  ] as const;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-group">
          <div className="app-brand"><span className="brand-mark" aria-hidden="true" />카드뉴스 메이커</div>
          <div className="history-buttons" role="group" aria-label="실행 취소">
            <button type="button" onClick={undo} disabled={!canUndo} title="실행 취소 (Ctrl+Z)" aria-label="실행 취소">↶</button>
            <button type="button" onClick={redo} disabled={!canRedo} title="다시 실행 (Ctrl+Shift+Z)" aria-label="다시 실행">↷</button>
          </div>
        </div>

        <div className="topbar-group topbar-center">
          <div className="ratio-selector" role="group" aria-label="화면비 선택">
            {RATIO_PRESETS.map((preset) => {
              const isActive = project.width === preset.width && project.height === preset.height;
              return (
                <button key={preset.label} type="button" className={isActive ? "active" : ""} aria-pressed={isActive}
                  onClick={() => setProject((p) => ({ ...p, width: preset.width, height: preset.height, updatedAt: new Date().toISOString() }))}>
                  {preset.label}
                </button>
              );
            })}
          </div>
          <label className="bg-picker" title="배경색">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(project.backgroundColor) ? project.backgroundColor : "#ffffff"}
              onChange={(event) => setProject((p) => ({ ...p, backgroundColor: event.target.value, updatedAt: new Date().toISOString() }), "background")} />
            <span>배경</span>
          </label>
        </div>

        <div className="topbar-group">
          <button type="button" className={`btn icon-only ${rulersVisible ? "active" : ""}`} aria-pressed={rulersVisible} onClick={() => setRulersVisible((v) => !v)} title="눈금자 (Shift+R)" aria-label="눈금자 켜기/끄기">📏</button>
          <button type="button" className="btn icon-only" onClick={() => setIsPaletteOpen(true)} title="명령 팔레트 (Ctrl+K)" aria-label="명령 팔레트">⌕</button>
          <button type="button" className="btn icon-only desktop-only" onClick={() => setIsHelpOpen(true)} title="단축키 도움말 (?)" aria-label="단축키 도움말">⌨</button>
          <button type="button" className="btn desktop-only" onClick={() => setIsExportOpen(true)} title="내보내기 (Ctrl+E)">내보내기…</button>
          <button type="button" className="btn primary desktop-only" onClick={() => handleDownload("png")}>PNG 다운로드</button>
          <button type="button" className="btn primary mobile-only" onClick={() => setIsExportOpen(true)}>저장</button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFileSelected} />
      </header>

      {errorMessage && <div className="banner error" role="alert">{errorMessage}</div>}
      {statusMessage && !errorMessage && <div className="banner" role="status">{statusMessage}</div>}

      <main className="workspace">
        <nav className="tool-rail" aria-label="편집 도구">
          <button type="button" onClick={() => fileInputRef.current?.click()}><span aria-hidden="true">▧</span><span>이미지</span></button>
          <button type="button" onClick={handleAddText}><span aria-hidden="true">T</span><span>텍스트</span></button>
          {railTabs.map((tab) => (
            <button key={tab.id} type="button" className={sidebarTab === tab.id ? "active" : ""} aria-pressed={sidebarTab === tab.id} onClick={() => openTab(tab.id)}>
              <span aria-hidden="true">{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
          <button type="button" className={`mobile-only ${isStyleSheetOpen ? "active" : ""}`} aria-expanded={isStyleSheetOpen}
            onClick={() => { setIsMobileSidebarOpen(false); setIsStyleSheetOpen((isOpen) => !isOpen); }}><span aria-hidden="true">Aa</span><span>속성</span></button>
        </nav>

        <button type="button" className={`drawer-backdrop ${isMobileSidebarOpen ? "visible" : ""}`} aria-label="패널 닫기" onClick={() => setIsMobileSidebarOpen(false)} />
        <div className={`side-drawer ${isMobileSidebarOpen ? "mobile-open" : ""}`}>
          {sidebarTab === "shapes" && <ShapePanel onAddShape={handleAddShape} />}
          {sidebarTab === "gallery" && <GalleryPanel onApply={handleApplyGalleryTemplate} />}
          {sidebarTab === "meme" && <MemePanel onApplyPreset={handleApplyMemePreset} onAddSticker={handleAddSticker} userStickers={userStickers} onUploadSticker={handleUploadSticker} onAddUserSticker={handleAddUserSticker} onDeleteUserSticker={handleDeleteUserSticker} />}
          {sidebarTab === "layers" && (
            <LayerPanel
              layers={project.layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onToggleVisible={handleToggleVisible}
              onToggleLocked={handleToggleLocked}
              onMoveLayer={handleMoveLayer}
              onDeleteLayer={handleDeleteLayer}
              onReorderLayer={handleReorderLayer}
              onGroupLayers={handleGroupLayers}
              onUngroupLayers={handleUngroupLayers}
            />
          )}
          {sidebarTab === "templates" && (
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

        <CanvasStage ref={canvasStageRef} project={project} selectedLayerId={selectedLayerId} onSelectLayer={setSelectedLayerId} onChangeLayer={updateLayer} onMoveLayers={handleMoveLayers} cropLayerId={cropLayerId} originalViewLayerId={isComparingOriginal ? selectedLayerId : null}
          rulersVisible={rulersVisible} rulerGuides={rulerGuides} onAddGuide={handleAddGuide} onClearGuides={() => setRulerGuides([])} />
        {cropLayerId && (
          <div className="crop-hint" role="status">
            <span>✂ 자르기 모드 · 이미지를 끌어 위치 조정 · 마우스 휠(또는 속성 슬라이더)로 확대</span>
            <button type="button" onClick={() => setCropTargetId(null)}>완료</button>
          </div>
        )}

        <div className={`props-shell ${isStyleSheetOpen ? "mobile-open" : ""}`}>
          <button type="button" className="props-peek" aria-expanded={isStyleSheetOpen} onClick={() => setIsStyleSheetOpen((isOpen) => !isOpen)}>
            <span className="sheet-grabber" aria-hidden="true" />
            <span className="sheet-summary">{selectedLayer ? `속성 · ${selectedLayer.name}` : "레이어를 선택하세요"}</span>
            <span aria-hidden="true">{isStyleSheetOpen ? "⌄" : "⌃"}</span>
          </button>
          <PropertiesPanel layer={selectedLayer} isCropMode={!!cropLayerId} onToggleCropMode={() => setCropTargetId(cropLayerId ? null : selectedLayer?.id ?? null)} onCompareOriginal={setIsComparingOriginal} onAlign={handleAlign} canvasSize={{ width: project.width, height: project.height }} onChange={(changes, key) => { if (selectedLayer) updateLayer(selectedLayer.id, changes, key); }}
            onDuplicate={handleDuplicateLayer} onDelete={() => { if (selectedLayer) handleDeleteLayer(selectedLayer.id); }} />
        </div>
      </main>

      {isExportOpen && (
        <ExportDialog settings={exportSettings} baseSize={{ width: project.width, height: project.height }} onChange={setExportSettings}
          onClose={() => setIsExportOpen(false)} onRender={renderExportData} onDownload={handleExportDownload} />
      )}
      {isHelpOpen && <ShortcutHelp onClose={() => setIsHelpOpen(false)} />}
      {isPaletteOpen && <CommandPalette commands={buildCommands()} onClose={() => setIsPaletteOpen(false)} />}
    </div>
  );
}

export default App;
