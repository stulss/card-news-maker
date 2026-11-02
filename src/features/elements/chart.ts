export type ChartKind = "bar" | "hbar" | "donut" | "pie";
export const CHART_KINDS: Array<{ kind: ChartKind; label: string }> = [
  { kind: "bar", label: "막대" }, { kind: "hbar", label: "가로 막대" }, { kind: "donut", label: "도넛" }, { kind: "pie", label: "원형" },
];
export interface ChartRow { label: string; value: number }
export const MAX_CHART_ROWS = 12;
export const DEFAULT_CHART_PALETTE = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#38bdf8", "#f97316", "#6366f1", "#14b8a6"];

/** "라벨, 값" 줄 목록 → 행. 쉼표·탭·콜론 구분, 값은 숫자만(%·콤마 허용). 잘못된 줄은 오류로 알려 준다. */
export function parseChartData(input: string): ChartRow[] {
  const rows: ChartRow[] = [];
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const [index, line] of lines.entries()) {
    const match = /^(.*?)\s*[,\t:：]\s*(-?[\d,]*\.?\d+)\s*%?$/.exec(line);
    if (!match || !match[1]) throw new Error(`${index + 1}번째 줄을 읽지 못했어요. “라벨, 숫자” 형식으로 적어 주세요. (${line.slice(0, 20)})`);
    const value = Number(match[2].replace(/,/g, ""));
    if (!Number.isFinite(value) || value < 0) throw new Error(`${index + 1}번째 줄의 숫자는 0 이상이어야 해요.`);
    rows.push({ label: match[1].trim(), value });
  }
  if (rows.length === 0) throw new Error("데이터를 한 줄 이상 입력해 주세요.");
  if (rows.length > MAX_CHART_ROWS) throw new Error(`항목은 ${MAX_CHART_ROWS}개까지 넣을 수 있어요.`);
  if (rows.every((row) => row.value === 0)) throw new Error("모든 값이 0이에요.");
  return rows;
}

/** 원형·도넛용 각도 계산(라디안, 12시 방향에서 시계 방향). */
export function pieSlices(rows: ChartRow[]) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  let start = -Math.PI / 2;
  return rows.map((row) => {
    const share = total === 0 ? 0 : row.value / total;
    const slice = { start, end: start + share * Math.PI * 2, share };
    start = slice.end;
    return slice;
  });
}

export interface ChartStyle { width?: number; height?: number; palette?: string[]; textColor?: string; fontFamily?: string; showValues?: boolean }

const formatValue = (n: number) => (Number.isInteger(n) ? n.toLocaleString("ko-KR") : String(Math.round(n * 10) / 10));

/** 차트를 투명 배경 PNG data URL로 그린다(이미지 레이어로 추가). */
export function renderChart(kind: ChartKind, rows: ChartRow[], style: ChartStyle = {}): string {
  const { width = 900, height = 700, palette = DEFAULT_CHART_PALETTE, textColor = "#111827", fontFamily = "IBM Plex Sans KR", showValues = true } = style;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 차트를 그릴 수 없습니다.");
  const color = (i: number) => palette[i % palette.length];
  const font = (px: number, weight = 700) => `${weight} ${px}px "${fontFamily}", sans-serif`;
  ctx.textBaseline = "middle";

  if (kind === "pie" || kind === "donut") {
    const legendW = Math.min(360, width * 0.4);
    const radius = Math.min(height / 2 - 20, (width - legendW) / 2 - 20);
    const cx = radius + 20, cy = height / 2;
    pieSlices(rows).forEach((slice, i) => {
      if (slice.share <= 0) return;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, radius, slice.start, slice.end); ctx.closePath();
      ctx.fillStyle = color(i); ctx.fill();
    });
    if (kind === "donut") { ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(cx, cy, radius * 0.56, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = "source-over"; }
    const rowH = Math.min(64, (height - 40) / rows.length);
    const top = cy - (rowH * rows.length) / 2;
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    rows.forEach((row, i) => {
      const y = top + rowH * i + rowH / 2;
      ctx.fillStyle = color(i); ctx.beginPath(); ctx.roundRect(cx + radius + 40, y - 14, 28, 28, 6); ctx.fill();
      ctx.fillStyle = textColor; ctx.font = font(Math.min(34, rowH * 0.55)); ctx.textAlign = "left";
      ctx.fillText(`${row.label}${showValues ? ` ${Math.round((row.value / total) * 100)}%` : ""}`, cx + radius + 80, y, width - (cx + radius + 80) - 10);
    });
    return canvas.toDataURL("image/png");
  }

  const max = Math.max(...rows.map((row) => row.value));
  const pad = 30;
  if (kind === "bar") {
    const labelH = 70, valueH = showValues ? 46 : 10;
    const plotH = height - labelH - valueH - pad;
    const slot = (width - pad * 2) / rows.length, barW = Math.min(slot * 0.62, 150);
    ctx.strokeStyle = textColor; ctx.globalAlpha = 0.25; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pad, valueH + plotH); ctx.lineTo(width - pad, valueH + plotH); ctx.stroke(); ctx.globalAlpha = 1;
    rows.forEach((row, i) => {
      const h = max === 0 ? 0 : (row.value / max) * plotH, x = pad + slot * i + (slot - barW) / 2, y = valueH + plotH - h;
      ctx.fillStyle = color(i); ctx.beginPath(); ctx.roundRect(x, y, barW, Math.max(h, 2), [10, 10, 0, 0]); ctx.fill();
      ctx.fillStyle = textColor; ctx.textAlign = "center";
      if (showValues) { ctx.font = font(32); ctx.fillText(formatValue(row.value), x + barW / 2, y - 22); }
      ctx.font = font(Math.min(30, slot * 0.28), 500); ctx.fillText(row.label, x + barW / 2, valueH + plotH + 38, slot - 8);
    });
  } else {
    const labelW = Math.min(240, width * 0.28), valueW = showValues ? 140 : 10;
    const rowH = (height - pad * 2) / rows.length, barH = Math.min(rowH * 0.6, 70);
    const plotW = width - pad * 2 - labelW - valueW;
    rows.forEach((row, i) => {
      const y = pad + rowH * i + rowH / 2, w = max === 0 ? 0 : (row.value / max) * plotW;
      ctx.fillStyle = textColor; ctx.font = font(Math.min(32, rowH * 0.5), 500); ctx.textAlign = "right";
      ctx.fillText(row.label, pad + labelW - 16, y, labelW - 20);
      ctx.fillStyle = color(i); ctx.beginPath(); ctx.roundRect(pad + labelW, y - barH / 2, Math.max(w, 2), barH, [0, 10, 10, 0]); ctx.fill();
      if (showValues) { ctx.fillStyle = textColor; ctx.font = font(32); ctx.textAlign = "left"; ctx.fillText(formatValue(row.value), pad + labelW + w + 14, y); }
    });
  }
  return canvas.toDataURL("image/png");
}
