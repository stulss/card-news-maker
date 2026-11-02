import { useState } from "react";
import { CHART_KINDS, DEFAULT_CHART_PALETTE, parseChartData, renderChart } from "../../features/elements/chart";
import type { ChartKind } from "../../features/elements/chart";
import { MAX_QR_LENGTH, renderQr } from "../../features/elements/qr";
import type { QrLevel } from "../../features/elements/qr";

interface Props {
  brandColors: string[];
  fontFamily: string;
  /** 만든 그림을 이미지 레이어로 캔버스에 추가한다. aspect = 가로/세로 */
  onAddImage: (src: string, name: string, aspect: number) => void;
}

const SAMPLE = "1월, 32\n2월, 48\n3월, 41\n4월, 67";

/** 요소: QR 코드와 차트를 브라우저 안에서 만들어 이미지로 추가한다(서버 전송 없음). */
export function ElementsPanel({ brandColors, fontFamily, onAddImage }: Props) {
  const [qrText, setQrText] = useState("https://");
  const [qrFg, setQrFg] = useState("#111827");
  const [qrBg, setQrBg] = useState("#ffffff");
  const [qrTransparent, setQrTransparent] = useState(false);
  const [qrLevel, setQrLevel] = useState<QrLevel>("M");
  const [qrError, setQrError] = useState<string | null>(null);

  const [kind, setKind] = useState<ChartKind>("bar");
  const [data, setData] = useState(SAMPLE);
  const [showValues, setShowValues] = useState(true);
  const [useBrand, setUseBrand] = useState(false);
  const [chartText, setChartText] = useState("#111827");
  const [chartError, setChartError] = useState<string | null>(null);

  const addQr = () => {
    try {
      const src = renderQr(qrText.trim(), { fg: qrFg, bg: qrBg, transparent: qrTransparent, level: qrLevel });
      onAddImage(src, "QR 코드", 1);
      setQrError(null);
    } catch (error) {
      setQrError(error instanceof Error ? error.message : "QR 코드를 만들지 못했어요.");
    }
  };

  const addChart = async () => {
    try {
      const rows = parseChartData(data);
      // 캔버스에 글자를 그리기 전에 글꼴이 준비돼 있어야 한다(쪼개진 한글 글꼴 포함).
      const sample = rows.map((row) => row.label).join("") + "0123456789%,.";
      await Promise.all([700, 500].map((weight) => document.fonts.load(`${weight} 32px "${fontFamily}"`, sample)));
      const palette = useBrand && brandColors.length > 0 ? brandColors : DEFAULT_CHART_PALETTE;
      const wide = kind === "pie" || kind === "donut" ? 1.45 : 1.3;
      const width = 1000;
      const src = renderChart(kind, rows, { width, height: Math.round(width / wide), palette, textColor: chartText, fontFamily, showValues });
      onAddImage(src, `차트 · ${CHART_KINDS.find((c) => c.kind === kind)?.label}`, wide);
      setChartError(null);
    } catch (error) {
      setChartError(error instanceof Error ? error.message : "차트를 만들지 못했어요.");
    }
  };

  return (
    <aside className="side-panel" aria-label="요소">
      <h2>요소</h2>

      <h3 className="side-subtitle">QR 코드</h3>
      <p className="panel-hint">링크·계정 주소를 QR로 만들어 카드에 넣어요. 어두운 색 위에 밝은 QR은 스캔이 안 될 수 있으니 확인해 주세요.</p>
      <label className="field-label"><span>주소 또는 문구</span>
        <textarea className="text-input" rows={2} value={qrText} maxLength={MAX_QR_LENGTH} onChange={(event) => setQrText(event.target.value)} aria-label="QR 주소 또는 문구" />
      </label>
      <div className="brand-add">
        <label className="mini-field"><span>코드색</span><input type="color" value={qrFg} onChange={(event) => setQrFg(event.target.value)} aria-label="QR 코드색" /></label>
        <label className="mini-field"><span>배경색</span><input type="color" value={qrBg} disabled={qrTransparent} onChange={(event) => setQrBg(event.target.value)} aria-label="QR 배경색" /></label>
        <label className="mini-field"><span>오류 보정</span>
          <select value={qrLevel} onChange={(event) => setQrLevel(event.target.value as QrLevel)} aria-label="QR 오류 보정">
            <option value="L">낮음</option><option value="M">보통</option><option value="Q">높음</option><option value="H">최고</option>
          </select>
        </label>
      </div>
      <label className="toggle-row"><input type="checkbox" checked={qrTransparent} onChange={(event) => setQrTransparent(event.target.checked)} /><span>배경 투명</span></label>
      <button type="button" className="btn primary" onClick={addQr}>QR 코드 추가</button>
      {qrError && <p className="panel-error" role="alert">{qrError}</p>}

      <h3 className="side-subtitle">차트</h3>
      <p className="panel-hint">한 줄에 “라벨, 숫자”로 적으면 투명 배경 그림으로 만들어져요. 수정하려면 다시 만들어 추가하세요.</p>
      <div className="chip-row" role="group" aria-label="차트 종류">
        {CHART_KINDS.map((option) => (
          <button key={option.kind} type="button" className={kind === option.kind ? "active" : ""} aria-pressed={kind === option.kind} onClick={() => setKind(option.kind)}>{option.label}</button>
        ))}
      </div>
      <textarea className="text-input" rows={6} value={data} onChange={(event) => setData(event.target.value)} aria-label="차트 데이터" spellCheck={false} />
      <label className="toggle-row"><input type="checkbox" checked={showValues} onChange={(event) => setShowValues(event.target.checked)} /><span>값 표시</span></label>
      <label className="toggle-row"><input type="checkbox" checked={useBrand} disabled={brandColors.length === 0} onChange={(event) => setUseBrand(event.target.checked)} /><span>{brandColors.length === 0 ? "브랜드 색 사용 (브랜드 탭에서 색을 먼저 추가)" : "브랜드 색 사용"}</span></label>
      <label className="mini-field"><span>글자색</span><input type="color" value={chartText} onChange={(event) => setChartText(event.target.value)} aria-label="차트 글자색" /></label>
      <button type="button" className="btn primary" onClick={addChart}>차트 추가</button>
      {chartError && <p className="panel-error" role="alert">{chartError}</p>}
    </aside>
  );
}
