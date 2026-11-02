import qrcode from "qrcode-generator";

// 한글 주소·문구가 깨지지 않도록 UTF-8로 인코딩한다(기본값은 라틴 문자만 안전).
qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];

export type QrLevel = "L" | "M" | "Q" | "H";
export const MAX_QR_LENGTH = 1000;

/** 문구 → 어둡/밝음 모듈 행렬. 너무 길면 오류를 던진다. */
export function qrMatrix(text: string, level: QrLevel = "M"): boolean[][] {
  if (!text.trim()) throw new Error("QR로 만들 주소나 문구를 입력해 주세요.");
  if (text.length > MAX_QR_LENGTH) throw new Error(`QR 코드로 만들기에 너무 깁니다(${MAX_QR_LENGTH}자 이하).`);
  const qr = qrcode(0, level);
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  return Array.from({ length: count }, (_, row) => Array.from({ length: count }, (_, col) => qr.isDark(row, col)));
}

export interface QrStyle { size?: number; fg?: string; bg?: string; transparent?: boolean; level?: QrLevel }

/** QR 코드를 PNG data URL로 그린다. 스캔이 되도록 사방에 4칸 여백(quiet zone)을 둔다. */
export function renderQr(text: string, style: QrStyle = {}): string {
  const { size = 720, fg = "#111827", bg = "#ffffff", transparent = false, level = "M" } = style;
  const matrix = qrMatrix(text, level);
  const quiet = 4;
  const cells = matrix.length + quiet * 2;
  const cell = Math.max(1, Math.floor(size / cells));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = cell * cells;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 QR 코드를 그릴 수 없습니다.");
  if (!transparent) { ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.fillStyle = fg;
  matrix.forEach((row, r) => row.forEach((dark, c) => { if (dark) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell); }));
  return canvas.toDataURL("image/png");
}
