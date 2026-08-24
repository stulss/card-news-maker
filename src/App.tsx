import { useRef, useState } from "react";
import { CanvasStage } from "./components/canvas/CanvasStage";
import { createEmptyProject } from "./utils/createProject";
import { loadImageFile, ImageUploadError } from "./features/image/loadImageFile";
import type { ImageLayer, TextLayer } from "./types/canvas";

function App() {
  const [project, setProject] = useState(() => createEmptyProject(1080, 1080));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        zIndex: project.layers.length,
        visible: true,
        locked: false,
        name: file.name,
      };

      setProject((p) => ({ ...p, layers: [...p.layers, newLayer], updatedAt: new Date().toISOString() }));
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
    const newLayer: TextLayer = {
      id: crypto.randomUUID(),
      type: "text",
      text: "오늘도 화이팅!",
      x: 80,
      y: project.height - 200,
      width: project.width - 160,
      height: 120,
      rotation: 0,
      zIndex: project.layers.length,
      visible: true,
      locked: false,
      name: `텍스트 ${project.layers.filter((l) => l.type === "text").length + 1}`,
      fontFamily: "IBM Plex Sans KR",
      fontSize: 64,
      color: "#ffffff",
      bold: true,
      italic: false,
      align: "center",
      lineHeight: 1.3,
      letterSpacing: 0,
      strokeColor: "#000000",
      strokeWidth: 6,
    };
    setProject((p) => ({ ...p, layers: [...p.layers, newLayer], updatedAt: new Date().toISOString() }));
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          height: 56,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-panel)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: "var(--color-accent)" }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>카드뉴스 메이커</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={toolbarButtonStyle}
          >
            이미지 추가
          </button>
          <button type="button" onClick={handleAddText} style={toolbarButtonStyle}>
            텍스트 추가
          </button>
          <button type="button" style={{ ...toolbarButtonStyle, background: "var(--color-accent)", color: "var(--color-accent-text)", fontWeight: 600 }}>
            PNG 다운로드
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={handleFileSelected}
        />
      </header>

      {errorMessage && (
        <div
          style={{
            padding: "10px 20px",
            background: "oklch(0.30 0.10 25)",
            color: "oklch(0.92 0.03 25)",
            fontSize: 13,
          }}
        >
          {errorMessage}
        </div>
      )}

      <CanvasStage project={project} />
    </div>
  );
}

const toolbarButtonStyle: React.CSSProperties = {
  height: 34,
  display: "flex",
  alignItems: "center",
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text)",
  fontSize: 13,
  fontFamily: "inherit",
  cursor: "pointer",
};

export default App;
