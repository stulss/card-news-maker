import { TEXT_PRESETS } from "../../features/design/textPresets";

interface Props {
  onAdd: (presetId: string) => void;
  onAddPlain: () => void;
}

/** 자주 쓰는 글자 스타일을 한 번에 얹는 패널(헤드라인·본문·배지·형광펜 등). */
export function TextPanel({ onAdd, onAddPlain }: Props) {
  return (
    <aside className="side-panel" aria-label="텍스트">
      <h2>텍스트</h2>
      <p className="panel-hint">스타일을 누르면 캔버스에 추가돼요. 배경 밝기에 맞춰 글자색이 정해집니다.</p>
      <button type="button" className="btn" onClick={onAddPlain}>＋ 기본 텍스트 추가</button>
      <div className="text-preset-grid">
        {TEXT_PRESETS.map((preset) => (
          <button key={preset.id} type="button" className="text-preset" onClick={() => onAdd(preset.id)} aria-label={`${preset.label} 추가`}>
            <span className="text-preset-sample" style={{ ...preset.style, fontFamily: '"IBM Plex Sans KR", sans-serif' }}>{preset.sample}</span>
            <span className="text-preset-name">{preset.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
