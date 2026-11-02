import { useMemo, useRef, useState } from "react";
import { LayerThumb } from "../common/LayerThumb";
import { STICKER_PACKS } from "../../features/design/stickerPacks";
import { EMOJI_FONT, EMOJI_STICKERS, MEME_PRESETS } from "../../features/meme/memePresets";
import { MAX_STICKERS } from "../../features/sticker/stickerStore";
import type { UserSticker } from "../../features/sticker/stickerStore";

interface Props {
  onApplyPreset: (presetId: string) => void;
  onAddSticker: (emoji: string) => void;
  userStickers: UserSticker[];
  onUploadSticker: (file: File) => void;
  onAddUserSticker: (stickerId: string) => void;
  onDeleteUserSticker: (stickerId: string) => void;
  onAddStickerPackItem: (itemId: string) => void;
}

export function MemePanel({ onApplyPreset, onAddSticker, userStickers, onUploadSticker, onAddUserSticker, onDeleteUserSticker, onAddStickerPackItem }: Props) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [packId, setPackId] = useState(STICKER_PACKS[0].id);
  // 썸네일용 레이어는 한 번만 만든다(렌더마다 새 id가 생기지 않도록).
  const previews = useMemo(() => Object.fromEntries(STICKER_PACKS.flatMap((pack) => pack.items.map((item) => [item.id, item.build()]))), []);
  const pack = STICKER_PACKS.find((candidate) => candidate.id === packId) ?? STICKER_PACKS[0];

  return (
    <aside className="side-panel" aria-label="밈 도구">
      <h2>밈 · 스티커</h2>
      <p className="panel-hint">사진을 올린 뒤 자막 스타일을 눌러 한 번에 얹어 보세요.</p>

      <div className="preset-list">
        {MEME_PRESETS.map((preset) => (
          <button key={preset.id} type="button" className="preset-card" onClick={() => onApplyPreset(preset.id)}>
            <strong>{preset.label}</strong>
            <span>{preset.description}</span>
          </button>
        ))}
      </div>

      <h3 className="side-subtitle">스티커 팩</h3>
      <div className="chip-row" role="group" aria-label="스티커 팩">
        {STICKER_PACKS.map((candidate) => (
          <button key={candidate.id} type="button" className={candidate.id === pack.id ? "active" : ""} aria-pressed={candidate.id === pack.id} onClick={() => setPackId(candidate.id)}>{candidate.title}</button>
        ))}
      </div>
      <div className="pack-grid">
        {pack.items.map((item) => (
          <button key={item.id} type="button" className="pack-item" onClick={() => onAddStickerPackItem(item.id)} aria-label={`${item.label} 스티커 추가`} title={item.label}>
            <span className="pack-thumb"><LayerThumb width={100} height={100} backgroundColor="transparent" layers={previews[item.id]} /></span>
            <span className="pack-name">{item.label}</span>
          </button>
        ))}
      </div>

      <h3 className="side-subtitle">이모지 스티커</h3>
      <div className="emoji-grid">
        {EMOJI_STICKERS.map((emoji) => (
          <button key={emoji} type="button" style={{ fontFamily: EMOJI_FONT }} onClick={() => onAddSticker(emoji)} aria-label={`${emoji} 스티커 추가`}>{emoji}</button>
        ))}
      </div>

      <h3 className="side-subtitle">내 스티커 ({userStickers.length}/{MAX_STICKERS})</h3>
      <p className="panel-hint">PNG·WebP·JPG를 올리면 이 브라우저에 저장되어 계속 쓸 수 있어요. 서버로 전송되지 않습니다.</p>
      <button type="button" className="btn" disabled={userStickers.length >= MAX_STICKERS} onClick={() => uploadRef.current?.click()}>＋ 스티커 업로드</button>
      <input ref={uploadRef} type="file" accept="image/png,image/webp,image/jpeg" hidden
        onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onUploadSticker(file); }} />
      {userStickers.length > 0 && (
        <div className="sticker-grid">
          {userStickers.map((sticker) => (
            <div key={sticker.id} className="sticker-item">
              <button type="button" onClick={() => onAddUserSticker(sticker.id)} aria-label={`${sticker.name} 스티커 추가`} title={sticker.name}>
                <img src={sticker.src} alt="" />
              </button>
              <button type="button" className="sticker-delete" onClick={() => onDeleteUserSticker(sticker.id)} aria-label={`${sticker.name} 삭제`}>✕</button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
