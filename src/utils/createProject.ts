import type { CanvasProject } from "../types/canvas";

export function createEmptyProject(width = 1080, height = 1080): CanvasProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    width,
    height,
    backgroundColor: "#ffffff",
    layers: [],
    createdAt: now,
    updatedAt: now,
  };
}
