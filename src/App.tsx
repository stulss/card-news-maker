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
import { SHAPE_OPTIONS } from "./features/design/shapeOptions";
import type { ShapeKind } from "./features/design/shapeOptions";
import { TextPanel } from "./components/text/TextPanel";
import { WelcomeCard } from "./components/welcome/WelcomeCard";
import { SizeDialog } from "./components/size/SizeDialog";
import { AboutDialog } from "./components/about/AboutDialog";
import { MAX_PROJECT_BYTES, ProjectFileError, createProjectFileName, parseProject, serializeProject } from "./features/project/projectFile";
import { HistoryPanel } from "./components/history/HistoryPanel";
import { STICKER_PACKS, instantiateSticker } from "./features/design/stickerPacks";
import { AI_MODEL_NOTICE, blurBackground, removeBackground } from "./features/ai/removeBackground";
import { addStickerOutline, removeSky } from "./features/design/imageEffects";
import type { ImageEffectKind } from "./features/design/imageEffects";
import { slideToSvg, svgToDataUrl } from "./features/export/svgExport";
import { OVERLAY_OPTIONS, buildOverlay } from "./features/design/overlays";
import type { OverlayKind } from "./features/design/overlays";
import { createGalleryTemplates } from "./features/template/galleryTemplates";
import { TEXT_PRESETS } from "./features/design/textPresets";
import { copyStyle, pasteStyle } from "./features/design/layerStyle";
import type { LayerStyle } from "./features/design/layerStyle";
import type { AlignMode } from "./components/editor/PropertiesPanel";
import type { GalleryTemplate } from "./features/template/galleryTemplates";
import { useProjectHistory } from "./features/history/useProjectHistory";
import { MAX_SLIDES, cloneSlide, createDeck, withCanvasSize } from "./features/deck/deck";
import { SlideStrip } from "./components/slides/SlideStrip";
import { createZip, dataUrlToBytes } from "./features/export/zip";
import { clearSavedDeck, loadSavedDeck, saveDeck } from "./features/autosave/deckStore";
import type { ExportScope } from "./components/export/ExportDialog";
import { buildEmojiSticker, buildMemePreset } from "./features/meme/memePresets";
import { groupMemberIds, normalizeGroups } from "./features/layer/groups";
import { createStickerFromFile, loadStickers, saveStickers } from "./features/sticker/stickerStore";
import type { UserSticker } from "./features/sticker/stickerStore";
import { createEmptyProject } from "./utils/createProject";
import { textColorDefaultsFor } from "./utils/textDefaults";
import { loadImageFile, ImageUploadError } from "./features/image/loadImageFile";
import { createExportFileName, downloadDataUrl } from "./features/export/downloadCanvas";
import type { GradientFill, ImageLayer, Layer, TextLayer } from "./types/canvas";
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
  { label: "1:1", width: 1080, height: 1080, hint: "정사각형 피드" },
  { label: "4:5", width: 1080, height: 1350, hint: "인스타 피드 권장(가장 크게 보임)" },
  { label: "3:4", width: 1080, height: 1440, hint: "프로필 그리드 비율" },
  { label: "9:16", width: 1080, height: 1920, hint: "스토리·릴스" },
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
  const { deck, project, timeline, cursor, jumpTo, setProject, setDeck, setActive, replaceDeck, undo, redo, canUndo, canRedo } = useProjectHistory(() => createDeck(1080, 1350));
  const [initialTemplates] = useState(initializeTemplates);
  const [templates, setTemplates] = useState(initialTemplates.templates);
  const [sidebarTab, setSidebarTab] = useState<"layers" | "templates" | "meme" | "gallery" | "shapes" | "text" | "history">("gallery");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isStyleSheetOpen, setIsStyleSheetOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialTemplates.error);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [cropTargetId, setCropTargetId] = useState<string | null>(null);
  const [isComparingOriginal, setIsComparingOriginal] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [igGuide, setIgGuide] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null);
  const [caption, setCaption] = useState(() => { try { return localStorage.getItem("card-news-caption") ?? ""; } catch { return ""; } });
  const [autosaveReady, setAutosaveReady] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const aiConfirmed = useRef(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(loadExportSettings);
  const [rulersVisible, setRulersVisible] = useState(false);
  const [gridMode, setGridMode] = useState<"off" | "thirds" | "grid" | "golden" | "diagonal">("off");
  const [styleClipboard, setStyleClipboard] = useState<LayerStyle | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() => { try { return localStorage.getItem("card-news-theme") === "light" ? "light" : "dark"; } catch { return "dark"; } });
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
      if (mod && key === "s") { event.preventDefault(); handleSaveProject(); return; }
      if (mod && key === "o") { event.preventDefault(); projectInputRef.current?.click(); return; }
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (isExportOpen || isHelpOpen || isPaletteOpen || isSizeOpen || isAboutOpen) return; // 창이 열려 있는 동안 캔버스 단축키는 막는다
      if (mod && key === "e") { event.preventDefault(); setIsExportOpen(true); return; }
      if (key === "pageup" || key === "pagedown") { event.preventDefault(); selectSlide(Math.min(deck.slides.length - 1, Math.max(0, deck.active + (key === "pagedown" ? 1 : -1)))); return; }
      if ((mod && key === "/") || event.key === "?") { event.preventDefault(); setIsHelpOpen(true); return; }
      if (!mod && event.shiftKey && key === "g") { event.preventDefault(); cycleGrid(); return; }
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

  function handleRenameLayer(layerId: string, name: string) {
    updateLayer(layerId, { name });
  }

  // 고른 레이어 3개 이상의 간격을 같게 맞춘다(양 끝 두 레이어는 제자리, 가운데가 움직임).
  function handleDistribute(layerIds: string[], axis: "x" | "y") {
    const position = axis === "x" ? "x" : "y";
    const size = axis === "x" ? "width" : "height";
    setProject((p) => {
      const targets = p.layers.filter((layer) => layerIds.includes(layer.id) && !layer.locked).sort((a, b) => a[position] - b[position]);
      if (targets.length < 3) return p;
      const first = targets[0];
      const last = targets[targets.length - 1];
      const total = last[position] + last[size] - first[position];
      const used = targets.reduce((sum, layer) => sum + layer[size], 0);
      const gap = (total - used) / (targets.length - 1);
      const next = new Map<string, number>();
      let cursor = first[position];
      for (const layer of targets) { next.set(layer.id, cursor); cursor += layer[size] + gap; }
      return { ...p, layers: p.layers.map((layer) => next.has(layer.id) ? { ...layer, [position]: next.get(layer.id) } as Layer : layer), updatedAt: new Date().toISOString() };
    });
    setStatusMessage(`${layerIds.length}개 레이어의 ${axis === "x" ? "가로" : "세로"} 간격을 같게 맞췄습니다.`);
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

  function handleCopyStyle() {
    if (!selectedLayer) return;
    setStyleClipboard(copyStyle(selectedLayer));
    setStatusMessage("스타일을 복사했습니다. 다른 레이어를 선택하고 붙여넣기(⇩)를 누르세요.");
  }

  function handlePasteStyle() {
    if (!selectedLayer || !styleClipboard) return;
    updateLayer(selectedLayer.id, pasteStyle(selectedLayer, styleClipboard));
    setStatusMessage(selectedLayer.type === styleClipboard.type ? "스타일을 붙여넣었습니다." : "다른 종류의 레이어라 투명도·혼합 모드·그림자만 붙여넣었습니다.");
  }

  const isEmptyDeck = deck.slides.length === 1 && project.layers.length === 0;

  function handleStartSet() {
    const set = createGalleryTemplates().find((template) => template.slides);
    if (set) handleApplyGalleryTemplate(set);
  }

  const canvasHint = cropLayerId
    ? "이미지를 끌어 보이는 영역 이동 · 마우스 휠로 확대 · Esc로 종료"
    : selectedLayer
      ? "드래그 이동 · 모서리 핸들로 크기·회전 · 방향키 미세 이동 · Ctrl+D 복제 · Delete 삭제"
      : "레이어를 클릭해 선택 · Ctrl+휠 확대 · Ctrl+K 명령 검색 · ? 단축키";

  const GRID_ORDER = ["off", "thirds", "grid", "golden", "diagonal"] as const;
  const GRID_LABELS = { off: "끄기", thirds: "3분할", grid: "촘촘한 격자", golden: "황금비", diagonal: "대각선" } as const;
  const nextGrid = GRID_ORDER[(GRID_ORDER.indexOf(gridMode) + 1) % GRID_ORDER.length];
  const cycleGrid = () => setGridMode(nextGrid);

  // 사진 바로 위(가장 위의 이미지 레이어 다음)에 깔아야 그 위의 글자는 그대로 위에 남는다.
  function handleAddOverlay(kind: OverlayKind) {
    const overlay = buildOverlay(kind, project);
    const topImage = project.layers.filter((layer) => layer.type === "image").reduce((max, layer) => Math.max(max, layer.zIndex), -1);
    const zIndex = topImage >= 0 ? topImage + 0.5 : nextZIndex;
    setProject((p) => ({ ...p, layers: [...p.layers, { ...overlay, zIndex }], updatedAt: new Date().toISOString() }));
    setSelectedLayerId(overlay.id);
    setIsMobileSidebarOpen(false);
    setStatusMessage(topImage >= 0 ? `"${overlay.name}"을 사진 바로 위에 놓았습니다. 글자는 그 위에 있어요.` : `"${overlay.name}"을 추가했습니다. 사진 위로 순서를 맞춰 주세요.`);
  }

  function handleAddStickerPackItem(itemId: string) {
    const item = STICKER_PACKS.flatMap((pack) => pack.items).find((candidate) => candidate.id === itemId);
    if (!item) return;
    addLayers(instantiateSticker(item, project, nextZIndex));
    setIsMobileSidebarOpen(false);
  }

  // 선택한 이미지의 원본을 새 PNG로 바꾸는 작업(AI 배경 제거·흐리게, 외곽선, 하늘 제거). Ctrl+Z로 되돌릴 수 있다.
  // AI 작업은 모델 파일을 내려받기 전에 한 번 동의를 받는다.
  async function runImageTask(needsAi: boolean, task: (src: string, report: (message: string) => void) => Promise<string>, done: string, extra: Partial<ImageLayer> = {}) {
    if (!selectedLayer || selectedLayer.type !== "image" || aiStatus) return;
    if (needsAi && !aiConfirmed.current) {
      if (!window.confirm(AI_MODEL_NOTICE)) return;
      aiConfirmed.current = true;
    }
    const target = selectedLayer;
    setErrorMessage(null);
    setAiStatus("처리 중…");
    try {
      const dataUrl = await task(target.src, setAiStatus);
      updateLayer(target.id, { src: dataUrl, ...extra });
      setStatusMessage(done);
    } catch (error) {
      console.error("Image task failed", error);
      setErrorMessage(`이미지 효과를 적용하지 못했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}${needsAi ? " (네트워크 연결과 브라우저를 확인해 주세요)" : ""}`);
    } finally {
      setAiStatus(null);
    }
  }

  const handleRemoveBackground = () => runImageTask(true, removeBackground, "배경을 지웠습니다. 마음에 들지 않으면 Ctrl+Z로 되돌리세요.", { maskShape: undefined });

  function handleImageEffect(kind: ImageEffectKind) {
    if (kind === "blur-bg") return runImageTask(true, (src, report) => blurBackground(src, report), "배경을 흐리게 했습니다. 마음에 들지 않으면 Ctrl+Z로 되돌리세요.");
    if (kind === "sky") {
      return runImageTask(false, async (src, report) => {
        report("하늘을 찾는 중…");
        const { dataUrl, coverage } = await removeSky(src);
        if (coverage < 0.02) throw new Error("하늘로 보이는 영역을 찾지 못했습니다(위쪽이 맑은·흐린 낮 하늘인 사진에서 동작해요).");
        return dataUrl;
      }, "하늘을 지웠습니다. 뒤에 색이나 그라디언트 도형을 깔아 새 하늘을 만들어 보세요.");
    }
    const ratio = kind === "outline-thin" ? 0.012 : kind === "outline" ? 0.022 : 0.036;
    return runImageTask(false, (src) => addStickerOutline(src, ratio), "스티커 외곽선을 넣었습니다. 투명 배경(PNG) 이미지에서 가장 잘 보여요.");
  }

  function handleAddTextPreset(presetId: string) {
    const preset = TEXT_PRESETS.find((candidate) => candidate.id === presetId);
    if (!preset) return;
    addLayers(preset.build(project));
    setIsMobileSidebarOpen(false);
  }

  function handleBackgroundChange(next: { color: string; gradient?: GradientFill }, coalesceKey?: string) {
    setProject((p) => ({ ...p, backgroundColor: next.color, backgroundGradient: next.gradient, updatedAt: new Date().toISOString() }), coalesceKey);
  }

  function handleApplyBackgroundToAll() {
    setDeck((current) => {
      const source = current.slides[current.active];
      return { ...current, slides: current.slides.map((slide) => ({ ...slide, backgroundColor: source.backgroundColor, backgroundGradient: source.backgroundGradient })) };
    });
    setStatusMessage("이 배경을 모든 슬라이드에 적용했습니다.");
  }

  function handleAddShape(kind: ShapeKind, fillColor: string, gradient = false) {
    const base = Math.round(project.width * 0.33);
    const sizes: Record<ShapeKind, { width: number; height: number }> = {
      rectangle: { width: Math.round(project.width * 0.45), height: Math.round(project.width * 0.28) },
      rounded: { width: Math.round(project.width * 0.45), height: Math.round(project.width * 0.28) },
      circle: { width: base, height: base },
      star: { width: base, height: base },
      triangle: { width: base, height: base },
      line: { width: Math.round(project.width * 0.55), height: Math.max(8, Math.round(project.width * 0.01)) },
      heart: { width: base, height: Math.round(base * 0.92) },
      bubble: { width: Math.round(base * 1.25), height: Math.round(base * 1.0) },
      arrow: { width: Math.round(base * 1.3), height: Math.round(base * 0.8) },
      bolt: { width: Math.round(base * 0.7), height: Math.round(base * 1.0) },
      bookmark: { width: Math.round(base * 0.6), height: Math.round(base * 1.0) },
    };
    const { width, height } = sizes[kind];
    const label = SHAPE_OPTIONS.find((option) => option.kind === kind)?.label ?? "도형";
    const companion = fillColor.toLowerCase() === "#ec4899" ? "#8b5cf6" : "#ec4899";
    addLayers([{
      id: crypto.randomUUID(), type: "shape", name: label,
      shapeType: kind === "rounded" || kind === "line" ? "rectangle" : kind,
      x: (project.width - width) / 2, y: (project.height - height) / 2, width, height,
      rotation: 0, zIndex: 0, visible: true, locked: false, fillColor,
      fillGradient: gradient ? { from: fillColor, to: companion, angle: 135 } : undefined,
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
    const freshLayers = (layers: Layer[]) => structuredClone(layers).map((layer) => ({ ...layer, id: crypto.randomUUID() }));
    const now = new Date().toISOString();
    if (template.slides) {
      // 여러 장짜리 세트는 덱 전체를 교체한다(실행 취소 가능).
      const slides = template.slides.map((canvas) => ({ id: crypto.randomUUID(), ...structuredClone(canvas), layers: freshLayers(canvas.layers), createdAt: now, updatedAt: now }));
      setDeck(() => ({ slides, active: 0 }));
    } else {
      // 한 장짜리는 보고 있는 슬라이드만 교체하고, 캔버스 크기는 모든 슬라이드에 맞춘다.
      setDeck((current) => withCanvasSize({
        ...current,
        slides: current.slides.map((slide, index) => index === current.active
          ? { ...slide, backgroundColor: template.canvas.backgroundColor, backgroundGradient: template.canvas.backgroundGradient, layers: freshLayers(template.canvas.layers), updatedAt: now } : slide),
      }, template.canvas.width, template.canvas.height));
    }
    setSelectedLayerId(null);
    setCropTargetId(null);
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
    setDeck((current) => withCanvasSize({
      ...current,
      slides: current.slides.map((slide, index) => index === current.active ? projectFromTemplate(template) : slide),
    }, template.canvas.width, template.canvas.height));
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
  const pageRef = useRef({ index: 0, total: 1 });
  const slideRef = useRef(project);
  useEffect(() => { pageRef.current = { index: deck.active, total: deck.slides.length }; slideRef.current = project; });

  const renderExportData = useCallback(async (settings: ExportSettings) => {
    if (settings.format === "svg") return svgToDataUrl(await slideToSvg(slideRef.current)); // 미리보기·현재 장 SVG
    const stage = canvasStageRef.current;
    if (!stage) throw new Error("캔버스를 아직 렌더링하지 못했습니다.");
    return renderExport(stage.toDataUrl("png", 1, settings.scale), settings, pageRef.current);
  }, []);

  /** 슬라이드 하나가 화면에 완전히 그려질 때까지 기다린다(이미지 로드·글꼴·필터 캐시). */
  async function waitForSlide(slideId: string) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const stage = canvasStageRef.current;
      if (stage && stage.projectId() === slideId && stage.isReady()) { await new Promise((resolve) => window.setTimeout(resolve, 150)); return; }
      await new Promise((resolve) => window.setTimeout(resolve, 60));
    }
    throw new Error("슬라이드를 그리는 데 시간이 너무 오래 걸립니다. 이미지가 너무 크지 않은지 확인해 주세요.");
  }

  /** 범위에 맞는 슬라이드들을 차례로 그려 파일 데이터로 만든다. 여러 장이면 슬라이드를 전환하며 캡처하고 원래 보던 장으로 돌아온다. */
  async function renderSlideFiles(settings: ExportSettings, scope: ExportScope) {
    const total = deck.slides.length;
    const ext = settings.format;
    if (ext === "svg") {
      // SVG는 화면을 캡처하지 않고 슬라이드 데이터에서 바로 만든다.
      const indices = scope === "current" || total === 1 ? [deck.active] : deck.slides.map((_, index) => index);
      const encoder = new TextEncoder();
      const out: Array<{ name: string; dataUrl: string; bytes: Uint8Array | null }> = [];
      for (const index of indices) {
        const svg = await slideToSvg(deck.slides[index]);
        out.push({ name: indices.length === 1 ? createExportFileName("svg") : `${String(index + 1).padStart(2, "0")}.svg`, dataUrl: svgToDataUrl(svg), bytes: encoder.encode(svg) });
      }
      return out;
    }
    if (scope === "current" || total === 1) {
      return [{ name: createExportFileName(ext), dataUrl: await renderExportData(settings), bytes: null as Uint8Array | null }];
    }
    const original = deck.active;
    setSelectedLayerId(null);
    setCropTargetId(null);
    setIsComparingOriginal(false);
    const files: Array<{ name: string; dataUrl: string }> = [];
    try {
      for (let index = 0; index < total; index++) {
        setExportProgress({ done: index, total });
        setActive(index);
        await waitForSlide(deck.slides[index].id);
        const stage = canvasStageRef.current;
        if (!stage) throw new Error("캔버스를 아직 렌더링하지 못했습니다.");
        const dataUrl = await renderExport(stage.toDataUrl("png", 1, settings.scale), settings, { index, total });
        files.push({ name: `${String(index + 1).padStart(2, "0")}.${ext}`, dataUrl });
      }
    } finally {
      setActive(original);
      setExportProgress(null);
    }
    return files.map((file) => ({ ...file, bytes: null as Uint8Array | null }));
  }

  async function handleExportDownload(settings: ExportSettings, scope: ExportScope) {
    saveExportSettings(settings);
    setIsExportOpen(false);
    try {
      const files = await renderSlideFiles(settings, scope);
      if (files.length === 1) {
        downloadDataUrl(files[0].dataUrl, files[0].name);
        setStatusMessage(`${settings.format.toUpperCase()} 파일로 내보냈습니다.`);
      } else {
        const zip = createZip(files.map((file) => ({ name: file.name, data: file.bytes ?? dataUrlToBytes(file.dataUrl) })));
        const url = URL.createObjectURL(zip);
        downloadDataUrl(url, createExportFileName("zip"));
        window.setTimeout(() => URL.revokeObjectURL(url), 10000);
        setStatusMessage(`${files.length}장을 ZIP으로 내보냈습니다. 압축을 풀어 순서대로(01, 02, …) 인스타그램에 올리세요.`);
      }
      setErrorMessage(null);
    } catch (error) {
      console.error("Export failed", error);
      setErrorMessage(error instanceof Error ? error.message : "내보내기에 실패했습니다.");
    }
  }

  async function handleExportShare(settings: ExportSettings, scope: ExportScope) {
    saveExportSettings(settings);
    setIsExportOpen(false);
    try {
      const files = await renderSlideFiles(settings, scope);
      const mime = settings.format === "png" ? "image/png" : settings.format === "jpg" ? "image/jpeg" : settings.format === "svg" ? "image/svg+xml" : "image/webp";
      const shareFiles = files.map((file, index) => new File([(file.bytes ?? dataUrlToBytes(file.dataUrl)) as BlobPart], files.length === 1 ? file.name : `${String(index + 1).padStart(2, "0")}.${settings.format}`, { type: mime }));
      if (!navigator.canShare?.({ files: shareFiles })) throw new Error("이 기기는 파일 공유를 지원하지 않습니다. ZIP/이미지를 내려받아 인스타그램 앱에서 선택해 주세요.");
      await navigator.share({ files: shareFiles, text: caption || undefined });
      setStatusMessage("공유 창을 열었습니다. 인스타그램을 선택해 게시물을 이어서 작성하세요.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return; // 사용자가 공유 창을 닫음
      console.error("Share failed", error);
      setErrorMessage(error instanceof Error ? error.message : "공유에 실패했습니다.");
    }
  }

  // ----- 슬라이드(캐러셀) 관리
  function selectSlide(index: number) {
    setActive(index);
    setSelectedLayerId(null);
    setCropTargetId(null);
  }

  function handleAddSlide() {
    if (deck.slides.length >= MAX_SLIDES) return;
    const now = new Date().toISOString();
    setDeck((current) => {
      const base = current.slides[current.active];
      const blank = { ...createEmptyProject(base.width, base.height), backgroundColor: base.backgroundColor, createdAt: now, updatedAt: now };
      const slides = [...current.slides.slice(0, current.active + 1), blank, ...current.slides.slice(current.active + 1)];
      return { slides, active: current.active + 1 };
    });
    setSelectedLayerId(null);
  }

  function handleDuplicateSlide() {
    if (deck.slides.length >= MAX_SLIDES) return;
    setDeck((current) => {
      const copy = cloneSlide(current.slides[current.active]);
      const slides = [...current.slides.slice(0, current.active + 1), copy, ...current.slides.slice(current.active + 1)];
      return { slides, active: current.active + 1 };
    });
    setSelectedLayerId(null);
  }

  function handleDeleteSlide() {
    if (deck.slides.length <= 1) return;
    setDeck((current) => {
      const slides = current.slides.filter((_, index) => index !== current.active);
      return { slides, active: Math.min(current.active, slides.length - 1) };
    });
    setSelectedLayerId(null);
  }

  function handleMoveSlide(direction: -1 | 1) {
    setDeck((current) => {
      const target = current.active + direction;
      if (target < 0 || target >= current.slides.length) return current;
      const slides = [...current.slides];
      [slides[current.active], slides[target]] = [slides[target], slides[current.active]];
      return { slides, active: target };
    });
  }

  function handleSetCanvasSize(width: number, height: number) {
    setDeck((current) => withCanvasSize(current, width, height));
  }

  // 프로젝트 파일(.cardnews.json): 모든 슬라이드·사진을 내 컴퓨터에 저장하고 다시 열어 이어서 작업한다.
  async function handleSaveProject() {
    try {
      const text = await serializeProject(deck);
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      downloadDataUrl(url, createProjectFileName());
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setErrorMessage(null);
      setStatusMessage("프로젝트를 파일로 저장했습니다. 나중에 ‘프로젝트 열기’(Ctrl+O)로 이어서 작업할 수 있어요.");
    } catch (error) {
      console.error("Project save failed", error);
      setErrorMessage("프로젝트를 저장하지 못했습니다. 사진이 너무 크지 않은지 확인하고 다시 시도해 주세요.");
    }
  }

  async function handleProjectFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > MAX_PROJECT_BYTES) throw new ProjectFileError("프로젝트 파일이 너무 큽니다(300MB 초과).");
      const opened = parseProject(await file.text());
      if (!window.confirm(`현재 작업을 “${file.name}”의 내용(${opened.slides.length}장)으로 바꿀까요?\n\n지금 작업은 사라지고 실행 취소 기록도 비워집니다. 필요하면 먼저 ‘프로젝트 저장’을 해 두세요.`)) return;
      replaceDeck(opened);
      setSelectedLayerId(null);
      setCropTargetId(null);
      setErrorMessage(null);
      setStatusMessage(`프로젝트를 열었습니다(${opened.slides.length}장).`);
    } catch (error) {
      setErrorMessage(error instanceof ProjectFileError ? error.message : "프로젝트 파일을 열지 못했습니다.");
    }
  }

  function handleNewDeck() {
    if (!window.confirm("현재 작업을 모두 지우고 새로 시작할까요? (실행 취소 기록도 사라집니다)")) return;
    replaceDeck(createDeck(1080, 1350));
    setSelectedLayerId(null);
    setCropTargetId(null);
    clearSavedDeck().catch(() => undefined);
    setStatusMessage("새 작업을 시작했습니다.");
  }

  // ----- 자동 저장(IndexedDB): 시작할 때 복원하고, 변경 후 1.5초 뒤 저장한다.
  useEffect(() => {
    loadSavedDeck().then((saved) => {
      if (saved) {
        replaceDeck(saved);
        setStatusMessage("이전에 작업하던 내용을 불러왔습니다. 처음부터 하려면 명령 팔레트(Ctrl+K)에서 ‘새로 시작’을 고르세요.");
      }
      setAutosaveReady(true);
    }).catch(() => setAutosaveReady(true));
  }, [replaceDeck]);

  useEffect(() => {
    if (!autosaveReady) return;
    const timer = window.setTimeout(() => { saveDeck(deck).catch((error) => console.warn("Autosave failed", error)); }, 1500);
    return () => window.clearTimeout(timer);
  }, [deck, autosaveReady]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("card-news-theme", theme); } catch { /* 저장 공간 없음: 무시 */ }
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem("card-news-caption", caption); } catch { /* 저장 공간 없음: 무시 */ }
  }, [caption]);

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
      ...SHAPE_OPTIONS.map((option): Command => ({
        id: `shape-${option.kind}`, group: "도형", label: `${option.label} 추가`, keywords: "shape 도형",
        run: () => handleAddShape(option.kind, "#8b5cf6", false),
      })),
      ...TEXT_PRESETS.map((preset): Command => ({
        id: `text-${preset.id}`, group: "텍스트", label: `텍스트 스타일: ${preset.label}`, keywords: "text 글자 타이포", run: () => handleAddTextPreset(preset.id),
      })),
      { id: "theme", group: "보기", label: theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환", keywords: "theme dark light 밝은 어두운", run: () => setTheme((t) => (t === "dark" ? "light" : "dark")) },
      ...["classic", "center", "subtitle", "bubble", "breaking"].map((presetId): Command => ({
        id: `meme-${presetId}`, group: "밈", label: `밈 자막: ${{ classic: "클래식 상·하단", center: "중앙 한 줄", subtitle: "영화 자막", bubble: "말풍선 대사", breaking: "속보 뉴스" }[presetId]}`,
        keywords: "meme 자막", run: () => handleApplyMemePreset(presetId),
      })),
      ...(([["gallery", "갤러리"], ["shapes", "도형"], ["meme", "밈·스티커"], ["templates", "내 템플릿"], ["layers", "레이어"], ["history", "작업 이력"]]) as const).map(([tab, name]): Command => ({
        id: `tab-${tab}`, group: "패널", label: `${name} 패널 열기`, keywords: "panel tab", run: () => { setSidebarTab(tab); setIsMobileSidebarOpen(true); },
      })),
      ...RATIO_PRESETS.map((preset): Command => ({
        id: `ratio-${preset.label}`, group: "캔버스", label: `화면비 ${preset.label}`, keywords: "비율 크기 ratio",
        run: () => handleSetCanvasSize(preset.width, preset.height),
      })),
      { id: "canvas-size", group: "캔버스", label: "캔버스 크기 설정… (SNS 프리셋·직접 입력)", keywords: "size 크기 사이즈 해상도 가로 세로 유튜브 썸네일 핀터레스트", run: () => setIsSizeOpen(true) },
      ...OVERLAY_OPTIONS.map((option): Command => ({ id: `overlay-${option.kind}`, group: "오버레이", label: `사진 위 오버레이: ${option.label}`, keywords: "overlay 그라디언트 가독성 글자", run: () => handleAddOverlay(option.kind) })),
      { id: "slide-add", group: "슬라이드", label: "슬라이드 추가", keywords: "carousel 캐러셀 장 페이지", run: handleAddSlide },
      { id: "slide-dup", group: "슬라이드", label: "현재 슬라이드 복제", keywords: "carousel 캐러셀", run: handleDuplicateSlide },
      { id: "slide-del", group: "슬라이드", label: "현재 슬라이드 삭제", keywords: "carousel 캐러셀", run: handleDeleteSlide },
      { id: "slide-prev", group: "슬라이드", label: "이전 슬라이드", shortcut: "PageUp", run: () => selectSlide(Math.max(0, deck.active - 1)) },
      { id: "slide-next", group: "슬라이드", label: "다음 슬라이드", shortcut: "PageDown", run: () => selectSlide(Math.min(deck.slides.length - 1, deck.active + 1)) },
      { id: "ig-guide", group: "보기", label: igGuide ? "인스타 안전영역 가이드 끄기" : "인스타 안전영역 가이드 켜기", keywords: "instagram 인스타 safe zone 그리드", run: () => setIgGuide((on) => !on) },
      { id: "save-project", group: "파일", label: "프로젝트 저장 (.cardnews.json)", shortcut: "Ctrl+S", keywords: "save 저장 백업 파일", run: handleSaveProject },
      { id: "open-project", group: "파일", label: "프로젝트 열기…", shortcut: "Ctrl+O", keywords: "open 열기 불러오기", run: () => projectInputRef.current?.click() },
      { id: "about", group: "도움말", label: "메뉴·정보 (개인정보·약관·데이터 관리)", keywords: "about 정보 개인정보 약관 라이선스 데이터 삭제", run: () => setIsAboutOpen(true) },
      { id: "new-deck", group: "파일", label: "새로 시작 (현재 작업 지우기)", keywords: "reset new 초기화", run: handleNewDeck },
      { id: "grid", group: "보기", label: `구도 격자: ${GRID_LABELS[nextGrid]}으로 전환`, shortcut: "Shift+G", keywords: "grid thirds 3분할 구도 격자", run: cycleGrid },
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
        ...(selectedLayer.type === "image" ? [{ id: "ai-remove-bg", group: "선택 레이어", label: "AI 배경 제거 (사람 사진)", keywords: "ai 배경 제거 누끼 remove background", run: handleRemoveBackground } as Command,
          { id: "ai-blur-bg", group: "선택 레이어", label: "AI 배경 흐리게 (인물 모드)", keywords: "ai blur background 아웃포커스", run: () => handleImageEffect("blur-bg") } as Command,
          { id: "sticker-outline", group: "선택 레이어", label: "스티커 외곽선 넣기", keywords: "outline sticker 스티커 테두리", run: () => handleImageEffect("outline") } as Command,
          { id: "remove-sky", group: "선택 레이어", label: "하늘 제거 (간이)", keywords: "sky 하늘", run: () => handleImageEffect("sky") } as Command,
          { id: "flip-x", group: "선택 레이어", label: "이미지 좌우 뒤집기", keywords: "flip mirror 거울", run: () => updateLayer(selectedLayer.id, { flipX: !selectedLayer.flipX }) } as Command,
          { id: "flip-y", group: "선택 레이어", label: "이미지 상하 뒤집기", keywords: "flip 반전", run: () => updateLayer(selectedLayer.id, { flipY: !selectedLayer.flipY }) } as Command] : []),
        { id: "copy-style", group: "선택 레이어", label: "스타일 복사", keywords: "style graphic 그래픽 스타일", run: handleCopyStyle },
        ...(styleClipboard ? [{ id: "paste-style", group: "선택 레이어", label: "스타일 붙여넣기", keywords: "style graphic 그래픽 스타일", run: handlePasteStyle } as Command] : []),
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

  function openTab(tab: "layers" | "templates" | "meme" | "gallery" | "shapes" | "text" | "history") {
    setIsStyleSheetOpen(false);
    setIsMobileSidebarOpen(sidebarTab === tab ? !isMobileSidebarOpen : true);
    setSidebarTab(tab);
  }

  const railTabs = [
    { id: "text", icon: "T", label: "텍스트" },
    { id: "gallery", icon: "▦", label: "갤러리" },
    { id: "shapes", icon: "◆", label: "도형" },
    { id: "meme", icon: "😂", label: "밈" },
    { id: "templates", icon: "★", label: "내 템플릿" },
    { id: "layers", icon: "☰", label: "레이어" },
    { id: "history", icon: "⟲", label: "기록" },
  ] as const;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-group">
          <div className="app-brand"><span className="brand-mark" aria-hidden="true" />카드툰</div>
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
                <button key={preset.label} type="button" className={isActive ? "active" : ""} aria-pressed={isActive} title={preset.hint}
                  onClick={() => handleSetCanvasSize(preset.width, preset.height)}>
                  {preset.label}
                </button>
              );
            })}
          </div>
          <button type="button" className="btn icon-only" onClick={() => setIsSizeOpen(true)} title="캔버스 크기 (SNS 프리셋·직접 입력)" aria-label="캔버스 크기 설정">⤢</button>
          <label className="bg-picker" title="배경색">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(project.backgroundColor) ? project.backgroundColor : "#ffffff"}
              onChange={(event) => setProject((p) => ({ ...p, backgroundColor: event.target.value, backgroundGradient: undefined, updatedAt: new Date().toISOString() }), "background")} />
            <span>배경</span>
          </label>
        </div>

        <div className="topbar-group">
          <button type="button" className="btn icon-only" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} title="테마 전환 (다크/라이트)" aria-label="테마 전환">{theme === "dark" ? "☀" : "☾"}</button>
          <button type="button" className={`btn ig-toggle ${igGuide ? "active" : ""}`} aria-pressed={igGuide} onClick={() => setIgGuide((on) => !on)} title="인스타그램 안전영역 가이드 (스토리 UI 영역·프로필 그리드 잘림)">IG</button>
          <button type="button" className={`btn icon-only ${rulersVisible ? "active" : ""}`} aria-pressed={rulersVisible} onClick={() => setRulersVisible((v) => !v)} title="눈금자 (Shift+R)" aria-label="눈금자 켜기/끄기">📏</button>
          <button type="button" className="btn icon-only" onClick={() => setIsPaletteOpen(true)} title="명령 팔레트 (Ctrl+K)" aria-label="명령 팔레트">⌕</button>
          <button type="button" className="btn icon-only" onClick={() => setIsAboutOpen(true)} title="메뉴·정보 (프로젝트 저장·열기, 데이터 관리, 약관)" aria-label="메뉴 및 정보">☰</button>
          <button type="button" className="btn icon-only desktop-only" onClick={() => setIsHelpOpen(true)} title="단축키 도움말 (?)" aria-label="단축키 도움말">⌨</button>
          <button type="button" className="btn desktop-only" onClick={() => setIsExportOpen(true)} title="내보내기 (Ctrl+E)">내보내기…</button>
          <button type="button" className="btn primary desktop-only" onClick={() => handleDownload("png")}>PNG 다운로드</button>
          <button type="button" className="btn primary mobile-only" onClick={() => setIsExportOpen(true)}>저장</button>
        </div>

        <input ref={projectInputRef} type="file" accept=".json,application/json" hidden onChange={handleProjectFileSelected} />
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFileSelected} />
      </header>

      {errorMessage && <div className="banner error" role="alert">{errorMessage}</div>}
      {statusMessage && !errorMessage && <div className="banner" role="status">{statusMessage}</div>}

      <main className="workspace">
        <nav className="tool-rail" aria-label="편집 도구">
          <button type="button" onClick={() => fileInputRef.current?.click()}><span aria-hidden="true">▧</span><span>이미지</span></button>
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
          {sidebarTab === "history" && <HistoryPanel timeline={timeline} cursor={cursor} onJump={jumpTo} />}
          {sidebarTab === "text" && <TextPanel onAdd={handleAddTextPreset} onAddPlain={handleAddText} />}
          {sidebarTab === "shapes" && <ShapePanel onAddShape={handleAddShape} onAddOverlay={handleAddOverlay} />}
          {sidebarTab === "gallery" && <GalleryPanel onApply={handleApplyGalleryTemplate} />}
          {sidebarTab === "meme" && <MemePanel onApplyPreset={handleApplyMemePreset} onAddSticker={handleAddSticker} userStickers={userStickers} onUploadSticker={handleUploadSticker} onAddUserSticker={handleAddUserSticker} onDeleteUserSticker={handleDeleteUserSticker} onAddStickerPackItem={handleAddStickerPackItem} />}
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
              onRenameLayer={handleRenameLayer}
              onDistribute={handleDistribute}
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

        <div className="canvas-column">
        <CanvasStage ref={canvasStageRef} project={project} safeZone={igGuide} showEmptyHint={!isEmptyDeck} gridMode={gridMode} selectedLayerId={selectedLayerId} onSelectLayer={setSelectedLayerId} onChangeLayer={updateLayer} onMoveLayers={handleMoveLayers} cropLayerId={cropLayerId} originalViewLayerId={isComparingOriginal ? selectedLayerId : null}
          rulersVisible={rulersVisible} rulerGuides={rulerGuides} onAddGuide={handleAddGuide} onClearGuides={() => setRulerGuides([])} />
        {isEmptyDeck && (
          <WelcomeCard width={project.width} height={project.height} onSize={handleSetCanvasSize} onUpload={() => fileInputRef.current?.click()}
            onAddHeadline={() => handleAddTextPreset("headline")} onStartSet={handleStartSet} onOpenGallery={() => { setSidebarTab("gallery"); setIsMobileSidebarOpen(true); }} onMoreSizes={() => setIsSizeOpen(true)} />
        )}
        <div className="canvas-hint" aria-hidden="true">{canvasHint}</div>
        {cropLayerId && (
          <div className="crop-hint" role="status">
            <span>✂ 자르기 모드 · 이미지를 끌어 위치 조정 · 마우스 휠(또는 속성 슬라이더)로 확대</span>
            <button type="button" onClick={() => setCropTargetId(null)}>완료</button>
          </div>
        )}
        <SlideStrip slides={deck.slides} active={deck.active} onSelect={selectSlide} onAdd={handleAddSlide} onDuplicate={handleDuplicateSlide} onDelete={handleDeleteSlide} onMove={handleMoveSlide} />
        </div>

        <div className={`props-shell ${isStyleSheetOpen ? "mobile-open" : ""}`}>
          <button type="button" className="props-peek" aria-expanded={isStyleSheetOpen} onClick={() => setIsStyleSheetOpen((isOpen) => !isOpen)}>
            <span className="sheet-grabber" aria-hidden="true" />
            <span className="sheet-summary">{selectedLayer ? `속성 · ${selectedLayer.name}` : "레이어를 선택하세요"}</span>
            <span aria-hidden="true">{isStyleSheetOpen ? "⌄" : "⌃"}</span>
          </button>
          <PropertiesPanel layer={selectedLayer} aiBusy={aiStatus} onRemoveBackground={handleRemoveBackground} onImageEffect={handleImageEffect} canPasteStyle={!!styleClipboard} onCopyStyle={handleCopyStyle} onPasteStyle={handlePasteStyle} background={{ color: project.backgroundColor, gradient: project.backgroundGradient }} slideCount={deck.slides.length} onBackgroundChange={handleBackgroundChange} onApplyBackgroundToAll={handleApplyBackgroundToAll} isCropMode={!!cropLayerId} onToggleCropMode={() => setCropTargetId(cropLayerId ? null : selectedLayer?.id ?? null)} onCompareOriginal={setIsComparingOriginal} onAlign={handleAlign} canvasSize={{ width: project.width, height: project.height }} onChange={(changes, key) => { if (selectedLayer) updateLayer(selectedLayer.id, changes, key); }}
            onDuplicate={handleDuplicateLayer} onDelete={() => { if (selectedLayer) handleDeleteLayer(selectedLayer.id); }} />
        </div>
      </main>

      {isExportOpen && (
        <ExportDialog settings={exportSettings} baseSize={{ width: project.width, height: project.height }} slideCount={deck.slides.length} activeIndex={deck.active}
          caption={caption} onCaptionChange={setCaption} canShare={typeof navigator.canShare === "function"} onChange={setExportSettings}
          onClose={() => setIsExportOpen(false)} onRender={renderExportData} onDownload={handleExportDownload} onShare={handleExportShare} />
      )}
      {exportProgress && (
        <div className="modal-backdrop" role="alertdialog" aria-live="polite" aria-label="내보내는 중">
          <div className="modal progress-modal"><strong>슬라이드 내보내는 중…</strong><span>{exportProgress.done + 1} / {exportProgress.total}</span><div className="progress-bar"><div style={{ width: `${((exportProgress.done + 1) / exportProgress.total) * 100}%` }} /></div></div>
        </div>
      )}
      {isAboutOpen && <AboutDialog onClose={() => setIsAboutOpen(false)} onSaveProject={handleSaveProject} onOpenProject={() => projectInputRef.current?.click()} onNewDeck={handleNewDeck} onShowShortcuts={() => setIsHelpOpen(true)} />}
      {isSizeOpen && <SizeDialog width={project.width} height={project.height} onApply={handleSetCanvasSize} onClose={() => setIsSizeOpen(false)} />}
      {isHelpOpen && <ShortcutHelp onClose={() => setIsHelpOpen(false)} />}
      {isPaletteOpen && <CommandPalette commands={buildCommands()} onClose={() => setIsPaletteOpen(false)} />}
    </div>
  );
}

export default App;
