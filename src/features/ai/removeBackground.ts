// 브라우저 안에서 사진의 배경을 지운다(AI). 사진은 서버로 전송되지 않는다.
// Transformers.js(Apache-2.0)와 MODNet 모델(Apache-2.0)을 처음 쓸 때만 외부(huggingface.co·jsDelivr)에서 모델 파일을 내려받는다.

const MODEL = "Xenova/modnet";
const MAX_SIDE = 1536; // 처리 시간·메모리를 위해 긴 변을 줄여서 처리한다

export const AI_MODEL_NOTICE =
  "AI 배경 제거는 처음 한 번 모델 파일(약 25MB)을 huggingface.co 에서 내려받습니다. 사진은 서버로 전송되지 않고 이 브라우저 안에서만 처리됩니다. 진행할까요?";

type Progress = (message: string) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let segmenterPromise: Promise<any> | null = null;

async function loadSegmenter(report: Progress) {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      report("AI 라이브러리를 불러오는 중…");
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      let lastPercent = -1;
      return pipeline("background-removal", MODEL, {
        progress_callback: (info: { status?: string; progress?: number; file?: string }) => {
          if (info.status === "progress" && typeof info.progress === "number") {
            const percent = Math.floor(info.progress);
            if (percent !== lastPercent) { lastPercent = percent; report(`AI 모델 내려받는 중… ${percent}%`); }
          }
        },
      });
    })().catch((error) => { segmenterPromise = null; throw error; });
  }
  return segmenterPromise;
}

function loadHtmlImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    image.src = src;
  });
}

/** 이미지 주소(blob/data URL)를 받아 배경이 투명해진 PNG data URL을 돌려준다. */
export async function removeBackground(src: string, report: Progress): Promise<string> {
  const segmenter = await loadSegmenter(report);
  report("배경을 분석하는 중…");

  // 긴 변을 MAX_SIDE 이하로 줄인 입력 캔버스를 만든다.
  const original = await loadHtmlImage(src);
  const ratio = Math.min(1, MAX_SIDE / Math.max(original.naturalWidth, original.naturalHeight));
  const width = Math.max(1, Math.round(original.naturalWidth * ratio));
  const height = Math.max(1, Math.round(original.naturalHeight * ratio));
  const input = document.createElement("canvas");
  input.width = width;
  input.height = height;
  const inputContext = input.getContext("2d");
  if (!inputContext) throw new Error("캔버스를 만들 수 없습니다.");
  inputContext.drawImage(original, 0, 0, width, height);
  const inputUrl = input.toDataURL("image/png");

  const output = await segmenter(inputUrl);
  const result = Array.isArray(output) ? output[0] : output;
  if (!result?.data) throw new Error("AI가 결과를 돌려주지 않았습니다.");

  // 결과는 RGBA(배경 제거됨) 또는 1채널 마스크일 수 있다.
  const out = document.createElement("canvas");
  out.width = result.width;
  out.height = result.height;
  const outContext = out.getContext("2d");
  if (!outContext) throw new Error("캔버스를 만들 수 없습니다.");
  if (result.channels === 4) {
    outContext.putImageData(new ImageData(new Uint8ClampedArray(result.data), result.width, result.height), 0, 0);
  } else {
    outContext.drawImage(input, 0, 0, result.width, result.height);
    const pixels = outContext.getImageData(0, 0, result.width, result.height);
    for (let i = 0; i < result.width * result.height; i++) pixels.data[i * 4 + 3] = result.data[i * result.channels];
    outContext.putImageData(pixels, 0, 0);
  }
  return out.toDataURL("image/png");
}
