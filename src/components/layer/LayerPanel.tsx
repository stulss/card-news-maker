import { useState } from "react";
import type { Layer, TextLayer } from "../../types/canvas";

interface Props {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onToggleVisible: (layerId: string) => void;
  onToggleLocked: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: "up" | "down") => void;
  onDeleteLayer: (layerId: string) => void;
  onReorderLayer: (fromId: string, toId: string) => void;
  onGroupLayers: (layerIds: string[]) => void;
  onUngroupLayers: (groupIds: string[]) => void;
}

const GROUP_COLORS = ["#f59e0b", "#10b981", "#38bdf8", "#f472b6", "#a78bfa", "#f87171"];

export function LayerPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisible,
  onToggleLocked,
  onMoveLayer,
  onDeleteLayer,
  onReorderLayer,
  onGroupLayers,
  onUngroupLayers,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [multiMode, setMultiMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  // Z-Index 역순(맨 앞 레이어가 목록 맨 위)으로 정렬
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  const groupIds = [...new Set(layers.flatMap((layer) => layer.groupId ? [layer.groupId] : []))];
  const checked = checkedIds.filter((id) => layers.some((layer) => layer.id === id));
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
  const ungroupTargets = [...new Set([...checked.map((id) => layers.find((layer) => layer.id === id)?.groupId), selectedLayer?.groupId].filter((id): id is string => !!id))];

  const toggleChecked = (layerId: string) =>
    setCheckedIds((current) => current.includes(layerId) ? current.filter((id) => id !== layerId) : [...current, layerId]);

  return (
    <aside className="layer-panel" aria-label="레이어 목록">
      <div className="layer-panel-header">
        <h2>레이어</h2>
        <span className="layer-count">{layers.length}개</span>
      </div>

      <div className="group-toolbar">
        <button type="button" className={multiMode ? "active" : ""} aria-pressed={multiMode} onClick={() => { setMultiMode((on) => !on); setCheckedIds([]); }} title="여러 레이어를 골라 그룹으로 묶습니다 (Ctrl+클릭으로도 선택)">다중 선택</button>
        <button type="button" disabled={checked.length < 2} onClick={() => { onGroupLayers(checked); setCheckedIds([]); setMultiMode(false); }}>그룹 만들기</button>
        <button type="button" disabled={ungroupTargets.length === 0} onClick={() => { onUngroupLayers(ungroupTargets); setCheckedIds([]); }}>그룹 해제</button>
      </div>

      <div className="layer-list">
        {sortedLayers.length === 0 ? (
          <p className="panel-placeholder">추가된 레이어가 없습니다.</p>
        ) : (
          sortedLayers.map((layer, index) => {
            const isSelected = layer.id === selectedLayerId;
            const isChecked = checked.includes(layer.id);
            const isTop = index === 0;
            const isBottom = index === sortedLayers.length - 1;
            const groupIndex = layer.groupId ? groupIds.indexOf(layer.groupId) : -1;

            return (
              <div
                key={layer.id}
                className={`layer-item ${isSelected ? "selected" : ""} ${isChecked ? "checked" : ""} ${dragId === layer.id ? "dragging" : ""} ${overId === layer.id && dragId !== layer.id ? "drop-target" : ""}`}
                onClick={(event) => { if (multiMode || event.ctrlKey || event.metaKey) toggleChecked(layer.id); else onSelectLayer(layer.id); }}
                data-layer-id={layer.id}
              >
                <span
                  className="layer-grip"
                  role="button"
                  aria-label="끌어서 순서 변경"
                  title="끌어서 순서 변경"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragId(layer.id); }}
                  onPointerMove={(event) => {
                    if (!dragId) return;
                    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-layer-id]");
                    setOverId(row?.getAttribute("data-layer-id") ?? null);
                  }}
                  onPointerUp={() => { if (dragId && overId && overId !== dragId) onReorderLayer(dragId, overId); setDragId(null); setOverId(null); }}
                  onPointerCancel={() => { setDragId(null); setOverId(null); }}
                >⋮⋮</span>

                <div className="layer-icon">
                  {isChecked ? "✓" : layer.type === "text" ? "T" : "IMG"}
                </div>

                <div className="layer-info">
                  <div className="layer-name" title={layer.name}>
                    {groupIndex >= 0 && <span className="group-dot" style={{ background: GROUP_COLORS[groupIndex % GROUP_COLORS.length] }} title={`그룹 ${groupIndex + 1}`} />}
                    {layer.name}
                  </div>
                  <div className="layer-sub">
                    {layer.type === "text"
                      ? `${(layer as TextLayer).fontSize}px`
                      : `${Math.round(layer.width)} × ${Math.round(layer.height)}`}
                    {groupIndex >= 0 && ` · 그룹 ${groupIndex + 1}`}
                  </div>
                </div>

                <div className="layer-controls" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`icon-btn ${!layer.visible ? "dimmed" : ""}`}
                    onClick={() => onToggleVisible(layer.id)}
                    title={layer.visible ? "숨기기" : "보이기"}
                    aria-label={layer.visible ? "숨기기" : "보이기"}
                  >
                    {layer.visible ? "👁" : "🚫"}
                  </button>

                  <button
                    type="button"
                    className={`icon-btn ${layer.locked ? "active" : "dimmed"}`}
                    onClick={() => onToggleLocked(layer.id)}
                    title={layer.locked ? "잠금 해제" : "잠금"}
                    aria-label={layer.locked ? "잠금 해제" : "잠금"}
                  >
                    {layer.locked ? "🔒" : "🔓"}
                  </button>

                  <button
                    type="button"
                    className="icon-btn"
                    disabled={isTop}
                    onClick={() => onMoveLayer(layer.id, "up")}
                    title="위로 이동"
                    aria-label="위로 이동"
                  >
                    ▲
                  </button>

                  <button
                    type="button"
                    className="icon-btn"
                    disabled={isBottom}
                    onClick={() => onMoveLayer(layer.id, "down")}
                    title="아래로 이동"
                    aria-label="아래로 이동"
                  >
                    ▼
                  </button>

                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => onDeleteLayer(layer.id)}
                    title="삭제"
                    aria-label="삭제"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="layer-panel-footer">
        ⋮⋮ 손잡이를 끌어(터치 가능) 순서를 바꿀 수 있어요. 같은 색 점의 레이어는 한 그룹이라 이동·숨김·잠금이 함께 적용됩니다.
      </div>
    </aside>
  );
}
