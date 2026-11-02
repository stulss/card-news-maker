interface Props {
  width: number;
  height: number;
  onSize: (width: number, height: number) => void;
  onUpload: () => void;
  onAddHeadline: () => void;
  onStartSet: () => void;
  onOpenGallery: () => void;
  onMoreSizes: () => void;
}

const SIZES = [
  { label: "인스타 피드", sub: "4:5 · 1080×1350", width: 1080, height: 1350 },
  { label: "정사각형", sub: "1:1 · 1080×1080", width: 1080, height: 1080 },
  { label: "프로필 그리드", sub: "3:4 · 1080×1440", width: 1080, height: 1440 },
  { label: "스토리·릴스", sub: "9:16 · 1080×1920", width: 1080, height: 1920 },
];

/** 빈 작업일 때 캔버스 위에 보이는 시작 카드(VectorCraft의 "새 파일 빠르게 시작" 화면 방식). */
export function WelcomeCard({ width, height, onSize, onUpload, onAddHeadline, onStartSet, onOpenGallery, onMoreSizes }: Props) {
  return (
    <div className="welcome-card" role="region" aria-label="시작하기">
      <h2>무엇을 만들까요?</h2>
      <p className="panel-hint">크기를 고르고 시작하세요. 나중에 상단에서 바꿀 수 있어요.</p>
      <div className="welcome-sizes" role="group" aria-label="캔버스 크기">
        {SIZES.map((size) => {
          const active = size.width === width && size.height === height;
          return (
            <button key={size.label} type="button" className={active ? "active" : ""} aria-pressed={active} onClick={() => onSize(size.width, size.height)}>
              <span className="welcome-size-shape" style={{ aspectRatio: `${size.width} / ${size.height}` }} aria-hidden="true" />
              <strong>{size.label}</strong>
              <small>{size.sub}</small>
            </button>
          );
        })}
      </div>
      <button type="button" className="link-btn" onClick={onMoreSizes}>다른 크기·직접 입력…</button>
      <div className="welcome-actions">
        <button type="button" className="btn primary" onClick={onStartSet}>캐러셀 5장 세트로 시작</button>
        <button type="button" className="btn" onClick={onOpenGallery}>템플릿 갤러리</button>
        <button type="button" className="btn" onClick={onUpload}>이미지 올리기</button>
        <button type="button" className="btn" onClick={onAddHeadline}>제목부터 쓰기</button>
      </div>
      <p className="welcome-keys"><kbd>Ctrl</kbd>+<kbd>K</kbd> 모든 기능 검색 · <kbd>?</kbd> 단축키</p>
    </div>
  );
}
