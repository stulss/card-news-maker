import { BLEND_MODES } from "../../types/canvas";
import type { CanvasProject, Layer, TextLayer } from "../../types/canvas";

export const TEMPLATE_STORAGE_KEY = "card-news-templates";
export const TEMPLATE_EXPORT_FILE_NAME = "card-news-templates.json";

export interface SavedTemplate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  canvas: Pick<CanvasProject, "width" | "height" | "backgroundColor" | "backgroundGradient" | "layers">;
}

interface TemplateBundle {
  version: 1;
  templates: SavedTemplate[];
}

export class TemplateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateValidationError";
  }
}

function createTextLayer(id: string, text: string, color: string, y: number, fontSize: number): TextLayer {
  return {
    id, type: "text", text, x: 80, y, width: 920, height: 150, rotation: 0, zIndex: 0,
    visible: true, locked: false, name: text, fontFamily: "IBM Plex Sans KR", fontSize,
    color, bold: true, italic: false, align: "center", lineHeight: 1.3, letterSpacing: 0,
    strokeColor: "#000000", strokeWidth: color === "#ffffff" ? 5 : 0,
  };
}

export function createDefaultTemplates(): SavedTemplate[] {
  const now = new Date().toISOString();
  return [
    { id: "default-clean", name: "깔끔한 한마디", createdAt: now, updatedAt: now, canvas: { width: 1080, height: 1080, backgroundColor: "#f7f3ea", layers: [createTextLayer("default-clean-text", "오늘의 한마디", "#24211d", 450, 76)] } },
    { id: "default-meme", name: "강조 밈", createdAt: now, updatedAt: now, canvas: { width: 1080, height: 1080, backgroundColor: "#315c78", layers: [createTextLayer("default-meme-text", "오늘도 화이팅!", "#ffffff", 790, 86)] } },
    { id: "default-notice", name: "공지 카드", createdAt: now, updatedAt: now, canvas: { width: 1080, height: 1080, backgroundColor: "#20242d", layers: [createTextLayer("default-notice-text", "IMPORTANT\nNOTICE", "#f4b43e", 365, 88)] } },
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// opacity는 선택 필드다. 없으면 통과(기존 템플릿 호환), 있으면 0~1 유한수만 허용한다 —
// 검증을 빼면 가져온 JSON이 opacity: 0으로 레이어를 안 보이게 만들어도 레이어 패널에는
// 여전히 "표시" 상태로 보여 사용자가 원인을 알 수 없다.
function hasValidOptionalOpacity(layer: Record<string, unknown>) {
  if (layer.opacity === undefined) return true;
  return typeof layer.opacity === "number" && Number.isFinite(layer.opacity) &&
    layer.opacity >= 0 && layer.opacity <= 1;
}

function hasBaseLayerFields(layer: Record<string, unknown>) {
  return typeof layer.id === "string" && typeof layer.name === "string" &&
    ["x", "y", "width", "height", "rotation", "zIndex"].every((key) => typeof layer[key] === "number" && Number.isFinite(layer[key])) &&
    typeof layer.visible === "boolean" && typeof layer.locked === "boolean" &&
    hasValidOptionalOpacity(layer) && (layer.groupId === undefined || typeof layer.groupId === "string") &&
    (layer.blendMode === undefined || (BLEND_MODES as readonly unknown[]).includes(layer.blendMode)) &&
    hasValidOptionalShadow(layer.shadow);
}

// 필터 값은 선택 필드. 있으면 허용 범위의 유한수/불리언만 통과시킨다(비정상 값이 Konva 필터에 들어가지 않게).
function hasValidOptionalFilters(filters: unknown) {
  if (filters === undefined) return true;
  if (!isRecord(filters)) return false;
  const inRange = (key: string, min: number, max: number) =>
    filters[key] === undefined || (typeof filters[key] === "number" && Number.isFinite(filters[key]) && filters[key] >= min && filters[key] <= max);
  const isFlag = (key: string) => filters[key] === undefined || typeof filters[key] === "boolean";
  return inRange("brightness", -1, 1) && inRange("contrast", -100, 100) && inRange("blur", 0, 40) && inRange("saturation", -1, 1) && inRange("hue", -180, 180) && inRange("grain", 0, 100) && inRange("mosaic", 0, 40) && inRange("vignette", 0, 100) && isFlag("grayscale") && isFlag("sepia");
}

function hasValidOptionalCrop(layer: Record<string, unknown>) {
  const inRange = (key: string, min: number, max: number) =>
    layer[key] === undefined || (typeof layer[key] === "number" && Number.isFinite(layer[key]) && layer[key] >= min && layer[key] <= max);
  return inRange("cropZoom", 1, 5) && inRange("focusX", 0, 1) && inRange("focusY", 0, 1);
}

function hasValidOptionalGradient(gradient: unknown) {
  if (gradient === undefined) return true;
  return isRecord(gradient) && typeof gradient.from === "string" && typeof gradient.to === "string" &&
    typeof gradient.angle === "number" && Number.isFinite(gradient.angle) &&
    (gradient.type === undefined || gradient.type === "linear" || gradient.type === "radial") &&
    hasValidOptionalNumber(gradient.fromOpacity, 0, 1) && hasValidOptionalNumber(gradient.toOpacity, 0, 1);
}

function hasValidOptionalNumber(value: unknown, min: number, max: number) {
  return value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max);
}

const MASK_TYPES = ["circle", "star", "triangle", "hexagon", "heart", "bubble"];
const SHAPE_TYPES = ["rectangle", "circle", "star", "triangle", "heart", "bubble", "arrow", "bolt", "bookmark", "speechBubble"];

function hasValidOptionalShadow(shadow: unknown) {
  if (shadow === undefined) return true;
  if (!isRecord(shadow)) return false;
  const finite = (key: string) => typeof shadow[key] === "number" && Number.isFinite(shadow[key]);
  return finite("offsetX") && finite("offsetY") && finite("blur") && typeof shadow.color === "string";
}

function isSafeImageSource(value: unknown) {
  return typeof value === "string" && (/^data:image\/(?:jpeg|png|webp);base64,/i.test(value) || value.startsWith("/"));
}

function isValidLayer(value: unknown): value is Layer {
  if (!isRecord(value) || !hasBaseLayerFields(value) || typeof value.type !== "string") return false;
  if (value.type === "image") return isSafeImageSource(value.src) && hasValidOptionalFilters(value.filters) && hasValidOptionalCrop(value) &&
      hasValidOptionalNumber(value.cornerRadius, 0, 5000) && hasValidOptionalNumber(value.borderWidth, 0, 200) &&
      (value.borderColor === undefined || typeof value.borderColor === "string") &&
      (value.maskShape === undefined || MASK_TYPES.includes(value.maskShape as string));
  if (value.type === "text") {
    return typeof value.text === "string" && typeof value.fontFamily === "string" &&
      typeof value.fontSize === "number" && Number.isFinite(value.fontSize) && typeof value.color === "string" &&
      typeof value.bold === "boolean" && typeof value.italic === "boolean" &&
      (value.align === "left" || value.align === "center" || value.align === "right") &&
      typeof value.lineHeight === "number" && Number.isFinite(value.lineHeight) &&
      typeof value.letterSpacing === "number" && Number.isFinite(value.letterSpacing) && hasValidOptionalShadow(value.shadow) && hasValidOptionalGradient(value.fillGradient);
  }
  if (value.type === "sticker") return typeof value.assetId === "string" && isSafeImageSource(value.src);
  if (value.type === "shape") {
    return SHAPE_TYPES.includes(value.shapeType as string) && typeof value.fillColor === "string" && hasValidOptionalGradient(value.fillGradient);
  }
  return false;
}

function isValidTemplate(value: unknown): value is SavedTemplate {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || !value.name.trim() ||
    typeof value.createdAt !== "string" || typeof value.updatedAt !== "string" || !isRecord(value.canvas)) return false;
  const canvas = value.canvas;
  return typeof canvas.width === "number" && Number.isFinite(canvas.width) && canvas.width > 0 &&
    canvas.width <= 10_000 && typeof canvas.height === "number" && Number.isFinite(canvas.height) && canvas.height > 0 &&
    canvas.height <= 10_000 && typeof canvas.backgroundColor === "string" && Array.isArray(canvas.layers) &&
    canvas.layers.length <= 500 && hasValidOptionalGradient(canvas.backgroundGradient) && canvas.layers.every(isValidLayer);
}

export function parseTemplateBundle(json: string): SavedTemplate[] {
  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch {
    throw new TemplateValidationError("JSON 문법이 올바르지 않습니다. 기존 템플릿은 유지됩니다.");
  }
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.templates) || !value.templates.every(isValidTemplate)) {
    throw new TemplateValidationError("필수 템플릿 필드가 없거나 형식이 올바르지 않습니다. 기존 템플릿은 유지됩니다.");
  }
  return structuredClone(value.templates);
}

export function serializeTemplates(templates: SavedTemplate[]) {
  const bundle: TemplateBundle = { version: 1, templates };
  return JSON.stringify(bundle, null, 2);
}

export function loadTemplates(): SavedTemplate[] {
  const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
  if (stored) return parseTemplateBundle(stored);
  const defaults = createDefaultTemplates();
  saveTemplates(defaults);
  return defaults;
}

export function saveTemplates(templates: SavedTemplate[]) {
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, serializeTemplates(templates));
  } catch (error) {
    console.error("Template storage failed", error);
    throw new TemplateValidationError("템플릿을 저장할 공간이 부족합니다. 큰 이미지가 포함된 템플릿을 줄여 주세요.");
  }
}

export function createTemplate(name: string, project: CanvasProject): SavedTemplate {
  const trimmedName = name.trim();
  if (!trimmedName) throw new TemplateValidationError("템플릿 이름을 입력해 주세요.");
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), name: trimmedName, createdAt: now, updatedAt: now, canvas: structuredClone({ width: project.width, height: project.height, backgroundColor: project.backgroundColor, backgroundGradient: project.backgroundGradient, layers: project.layers }) };
}

export function projectFromTemplate(template: SavedTemplate): CanvasProject {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), ...structuredClone(template.canvas), createdAt: now, updatedAt: now };
}
