// PRD.md F-01 이미지 업로드
// 오류 상황: 미지원 형식, 용량 초과, 손상된 파일 (31장 오류 메시지 표 그대로 사용)

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB — 27장 "대용량 이미지 처리" 기준 검증 필요, 임시값

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export interface LoadedImage {
  src: string; // object URL
  naturalWidth: number;
  naturalHeight: number;
}

export function validateImageFile(file: File): void {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageUploadError("지원하지 않는 파일 형식입니다. JPG, PNG, WebP 파일을 사용해 주세요.");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ImageUploadError("이미지 용량이 너무 큽니다. 더 작은 파일을 사용해 주세요.");
  }
}

export function loadImageFile(file: File): Promise<LoadedImage> {
  validateImageFile(file);

  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({ src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new ImageUploadError("이미지 파일이 손상되어 열 수 없습니다."));
    };

    img.src = src;
  });
}
