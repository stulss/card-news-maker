import type { Layer } from "../../types/canvas";

/** 멤버가 2개 미만인 그룹은 의미가 없으므로 groupId를 지운다. */
export function normalizeGroups(layers: Layer[]): Layer[] {
  const counts = new Map<string, number>();
  for (const layer of layers) if (layer.groupId) counts.set(layer.groupId, (counts.get(layer.groupId) ?? 0) + 1);
  return layers.map((layer) => {
    if (!layer.groupId || (counts.get(layer.groupId) ?? 0) >= 2) return layer;
    const { groupId: _removed, ...rest } = layer;
    return rest as Layer;
  });
}

/** 레이어가 속한 그룹의 모든 레이어 id(그룹이 없으면 자기 자신만). */
export function groupMemberIds(layers: Layer[], layer: Layer): string[] {
  return layer.groupId ? layers.filter((other) => other.groupId === layer.groupId).map((other) => other.id) : [layer.id];
}
