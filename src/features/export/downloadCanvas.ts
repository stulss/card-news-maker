export type ExportFormat = "png" | "jpg" | "webp" | "svg";
export type ExportFileExtension = ExportFormat | "zip";

export function createExportFileName(format: ExportFileExtension, now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `card-news-${date}_${time}.${format}`;
}

export function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
