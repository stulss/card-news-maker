import { useState } from "react";
import { MAX_BRAND_COLORS, normalizeHex } from "../../features/brand/brandStore";
import type { BrandKit } from "../../features/brand/brandStore";
import { isEyeDropperSupported, paletteFromImage, pickScreenColor } from "../../features/brand/imagePalette";

interface Props {
  kit: BrandKit;
  fonts: string[];
  selectedKind: "image" | "text" | "sticker" | "shape" | null;
  selectedImageSrc: string | null;
  onChange: (kit: BrandKit) => void;
  onApplyColor: (color: string, target: "layer" | "background") => void;
  onApplyFont: (font: string) => void;
}

/** 브랜드 키트: 자주 쓰는 색·글꼴을 저장해 두고 한 번에 적용한다(이 브라우저에만 저장). */
export function BrandPanel({ kit, fonts, selectedKind, selectedImageSrc, onChange, onApplyColor, onApplyFont }: Props) {
  const [draft, setDraft] = useState("#8b5cf6");
  const [message, setMessage] = useState<string | null>(null);
  const full = kit.colors.length >= MAX_BRAND_COLORS;

  const addColors = (colors: string[]) => {
    const next = [...kit.colors];
    for (const color of colors) {
      const hex = normalizeHex(color);
      if (hex && !next.includes(hex) && next.length < MAX_BRAND_COLORS) next.push(hex);
    }
    onChange({ ...kit, colors: next });
  };

  const extract = async () => {
    if (!selectedImageSrc) return;
    try {
      const colors = await paletteFromImage(selectedImageSrc, 6);
      addColors(colors);
      setMessage(`사진에서 ${colors.length}가지 색을 뽑았어요.`);
    } catch {
      setMessage("이 사진에서 색을 뽑지 못했어요.");
    }
  };

  const pick = async () => {
    const color = await pickScreenColor();
    if (color) { setDraft(color); addColors([color]); setMessage(`${color} 색을 추가했어요.`); }
  };

  const target = selectedKind === "text" ? "글자색" : selectedKind === "shape" ? "도형 색" : null;

  return (
    <aside className="side-panel" aria-label="브랜드 키트">
      <h2>브랜드 키트</h2>
      <p className="panel-hint">자주 쓰는 색과 글꼴을 저장해 두세요. 색을 누르면 {target ? `선택한 ${target}` : "배경"}에 바로 적용돼요. 이 브라우저에만 저장됩니다.</p>

      <h3 className="side-subtitle">내 색상 ({kit.colors.length}/{MAX_BRAND_COLORS})</h3>
      {kit.colors.length === 0 && <p className="panel-hint">아직 색이 없어요. 아래에서 추가해 보세요.</p>}
      <div className="brand-swatches">
        {kit.colors.map((color) => (
          <div key={color} className="brand-swatch">
            <button type="button" style={{ background: color }} title={`${color} — ${target ?? "배경"}에 적용`} aria-label={`${color} 적용`} onClick={() => onApplyColor(color, target ? "layer" : "background")} />
            <button type="button" className="brand-swatch-remove" aria-label={`${color} 삭제`} onClick={() => onChange({ ...kit, colors: kit.colors.filter((c) => c !== color) })}>×</button>
          </div>
        ))}
      </div>

      <div className="brand-add">
        <input type="color" value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="추가할 색" />
        <button type="button" className="btn" disabled={full} onClick={() => { addColors([draft]); setMessage(null); }}>색 추가</button>
        {isEyeDropperSupported() && <button type="button" className="btn" disabled={full} onClick={pick} title="화면에서 색을 찍어 추가(스포이드)">스포이드</button>}
      </div>
      <button type="button" className="btn" disabled={!selectedImageSrc || full} onClick={extract} title={selectedImageSrc ? "선택한 사진의 대표 색을 추가" : "사진을 먼저 선택하세요"}>선택한 사진에서 색 뽑기</button>
      {target && kit.colors.length > 0 && <p className="panel-hint">배경에 적용하려면 레이어 선택을 해제한 뒤 색을 누르세요.</p>}
      {message && <p className="panel-hint" role="status">{message}</p>}

      <h3 className="side-subtitle">브랜드 글꼴</h3>
      <select className="text-input" value={kit.fontFamily ?? ""} aria-label="브랜드 글꼴" onChange={(event) => onChange({ ...kit, fontFamily: event.target.value || undefined })}>
        <option value="">선택 안 함</option>
        {fonts.map((font) => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}
      </select>
      <button type="button" className="btn" disabled={!kit.fontFamily || selectedKind !== "text"} onClick={() => kit.fontFamily && onApplyFont(kit.fontFamily)}>
        {selectedKind === "text" ? "선택한 글자에 글꼴 적용" : "글자를 선택하면 적용할 수 있어요"}
      </button>
    </aside>
  );
}
