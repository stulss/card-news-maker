import type { Layer, TextLayer } from "../../types/canvas";

interface Props {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onToggleVisible: (layerId: string) => void;
  onToggleLocked: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: "up" | "down") => void;
  onDeleteLayer: (layerId: string) => void;
}

export function LayerPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisible,
  onToggleLocked,
  onMoveLayer,
  onDeleteLayer,
}: Props) {
  // Z-Index 역순(맨 앞 레이어가 목록 맨 위)으로 정렬
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <aside className="layer-panel" aria-label="레이어 목록">
      <div className="layer-panel-header">
        <h2>레이어</h2>
        <span className="layer-count">{layers.length}개</span>
      </div>

      <div className="layer-list">
        {sortedLayers.length === 0 ? (
          <p className="panel-placeholder">추가된 레이어가 없습니다.</p>
        ) : (
          sortedLayers.map((layer, index) => {
            const isSelected = layer.id === selectedLayerId;
            const isTop = index === 0;
            const isBottom = index === sortedLayers.length - 1;

            return (
              <div
                key={layer.id}
                className={`layer-item ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectLayer(layer.id)}
              >
                <div className="layer-icon">
                  {layer.type === "text" ? "T" : "IMG"}
                </div>

                <div className="layer-info">
                  <div className="layer-name" title={layer.name}>
                    {layer.name}
                  </div>
                  <div className="layer-sub">
                    {layer.type === "text"
                      ? `${(layer as TextLayer).fontSize}px`
                      : `${Math.round(layer.width)} × ${Math.round(layer.height)}`}
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
        맨 위 레이어가 가장 앞에 그려집니다.
      </div>
    </aside>
  );
}
