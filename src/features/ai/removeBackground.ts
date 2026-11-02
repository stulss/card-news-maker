// 브라우저 안에서 사진의 피사체(사람)를 찾아 배경을 지우거나 흐리게 한다(AI). 사진은 서버로 전송되지 않는다.
// Transformers.js(Apache-2.0)와 MODNet 모델(Apache-2.0)을 처음 쓸 때만 외부(huggingface.co·jsDelivr)에서 모델 파일을 내려받는다.

import { blurCanvas, loadImageElement } from "../design/imageEffects";

const MODEL = "Xenova/modnet";
const MAX_SIDE = 1536; // 처리 시간·메모리를 위해 긴 변을 줄여서 처리한다

export const AI_MODEL_NOTICE =
  "AI 기능은 처음 한 번 모델 파일(약 25MB)을 huggingface.co 에서 내려받습니다. 사진은 서버로 전송되지 않고 이 브라우저 안에서만 처리됩니다. 진행할까요?";

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

/** 피사체를 찾아 `original`(처리 크기로 줄인 원본)과 `cutout`(배경이 투명한 피사체)을 돌려준다. */
export async function segmentSubject(src: string, report: Progress): Promise<{ original: HTMLCanvasElement; cutout: HTMLCanvasElement }> {
  const segmenter = await loadSegmenter(report);
  report("피사체를 분석하는 중…");

  const source = await loadImageElement(src);
  const ratio = Math.min(1, MAX_SIDE / Math.max(source.naturalWidth, source.naturalHeight));
  const width = Math.max(1, Math.round(source.naturalWidth * ratio));
  const height = Math.max(1, Math.round(source.naturalHeight * ratio));
  const original = document.createElement("canvas");
  original.width = width;
  original.height = height;
  const originalContext = original.getContext("2d");
  if (!originalContext) throw new Error("캔버스를 만들 수 없습니다.");
  originalContext.drawImage(source, 0, 0, width, height);

  const output = await segmenter(original.toDataURL("image/png"));
  const result = Array.isArray(output) ? output[0] : output;
  if (!result?.data) throw new Error("AI가 결과를 돌려주지 않았습니다.");

  // 결과는 RGBA(배경 제거됨) 또는 1채널 마스크일 수 있다.
  const cutout = document.createElement("canvas");
  cutout.width = result.width;
  cutout.height = result.height;
  const cutoutContext = cutout.getContext("2d");
  if (!cutoutContext) throw new Error("캔버스를 만들 수 없습니다.");
  if (result.channels === 4) {
    cutoutContext.putImageData(new ImageData(new Uint8ClampedArray(result.data), result.width, result.height), 0, 0);
  } else {
    cutoutContext.drawImage(original, 0, 0, result.width, result.height);
    const pixels = cutoutContext.getImageData(0, 0, result.width, result.height);
    for (let i = 0; i < result.width * result.height; i++) pixels.data[i * 4 + 3] = result.data[i * result.channels];
    cutoutContext.putImageData(pixels, 0, 0);
  }
  return { original, cutout };
}

/** 이미지 주소(blob/data URL)를 받아 배경이 투명해진 PNG data URL을 돌려준다. */
export async function removeBackground(src: string, report: Progress): Promise<string> {
  const { cutout } = await segmentSubject(src, report);
  return cutout.toDataURL("image/png");
}

/** 피사체는 또렷하게 두고 배경만 흐리게 한다(인물 사진 모드). `strength`는 긴 변 대비 블러 반경 비율. */
export async function blurBackground(src: string, report: Progress, strength = 0.012): Promise<string> {
  const { original, cutout } = await segmentSubject(src, report);
  report("배경을 흐리게 하는 중…");
  const blurred = blurCanvas(original, Math.max(2, Math.round(Math.max(original.width, original.height) * strength)));
  const context = blurred.getContext("2d");
  if (!context) throw new Error("캔버스를 만들 수 없습니다.");
  context.drawImage(cutout, 0, 0, blurred.width, blurred.height);
  return blurred.toDataURL("image/png");
}
