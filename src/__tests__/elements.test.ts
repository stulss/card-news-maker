import { describe, expect, it } from "vitest";
import { extractPalette, normalizeHex } from "../features/brand/brandStore";
import { MAX_CHART_ROWS, parseChartData, pieSlices } from "../features/elements/chart";
import { qrMatrix } from "../features/elements/qr";
import { createGalleryTemplates } from "../features/template/galleryTemplates";
import { PATH_SHAPES, SHAPE_LABELS } from "../features/design/shapes";

describe("QR", () => {
  it("정사각 행렬을 만들고 위치 표식(좌상단 7×7 테두리)이 있다", () => {
    const m = qrMatrix("https://example.com");
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect(m.every((row) => row.length === m.length)).toBe(true);
    expect(m[0].slice(0, 7).every(Boolean)).toBe(true);
    expect(m[6].slice(0, 7).every(Boolean)).toBe(true);
  });
  it("한글도 만들 수 있고 빈 문구·너무 긴 문구는 거부한다", () => {
    expect(qrMatrix("카드툰 안녕하세요").length).toBeGreaterThan(20);
    expect(() => qrMatrix("   ")).toThrow();
    expect(() => qrMatrix("a".repeat(1001))).toThrow();
  });
});

describe("차트 데이터", () => {
  it("라벨, 값 줄을 읽는다(쉼표·콜론·퍼센트·천 단위)", () => {
    expect(parseChartData("1월, 32\n2월: 1,200\n3월\t45%")).toEqual([
      { label: "1월", value: 32 }, { label: "2월", value: 1200 }, { label: "3월", value: 45 },
    ]);
  });
  it("잘못된 줄은 몇 번째 줄인지 알려 준다", () => {
    expect(() => parseChartData("1월, 32\n숫자없음")).toThrow(/2번째/);
    expect(() => parseChartData("a, -3")).toThrow();
    expect(() => parseChartData("")).toThrow();
    expect(() => parseChartData("a, 0\nb, 0")).toThrow();
    expect(() => parseChartData(Array.from({ length: MAX_CHART_ROWS + 1 }, (_, i) => `r${i}, 1`).join("\n"))).toThrow();
  });
  it("원형 비율의 합은 한 바퀴", () => {
    const slices = pieSlices([{ label: "a", value: 1 }, { label: "b", value: 3 }]);
    expect(slices[0].share).toBeCloseTo(0.25);
    expect(slices[1].end - slices[0].start).toBeCloseTo(Math.PI * 2);
  });
});

describe("브랜드 키트", () => {
  it("normalizeHex", () => {
    expect(normalizeHex("ABC")).toBe("#aabbcc");
    expect(normalizeHex("#8B5CF6")).toBe("#8b5cf6");
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
  });
  it("extractPalette: 많은 색 순서, 비슷한 색 합치기, 투명 제외", () => {
    const px: number[] = [];
    const push = (r: number, g: number, b: number, a: number, n: number) => { for (let i = 0; i < n; i++) px.push(r, g, b, a); };
    push(255, 0, 0, 255, 50); push(250, 5, 5, 255, 20); push(0, 0, 255, 255, 30); push(0, 255, 0, 0, 100);
    const palette = extractPalette(px, 4);
    expect(palette).toHaveLength(2);
    expect(palette[0].startsWith("#f")).toBe(true); // 붉은 계열이 가장 많음
    expect(palette[1]).toBe("#0000ff");
  });
});

describe("도형·갤러리", () => {
  it("새 도형 5종에 경로와 이름이 있다", () => {
    for (const kind of ["diamond", "cloud", "check", "plus", "ribbon"]) {
      expect(PATH_SHAPES[kind as keyof typeof PATH_SHAPES]).toMatch(/^M/);
      expect(SHAPE_LABELS[kind]).toBeTruthy();
    }
  });
  it("모든 갤러리 템플릿은 id가 유일하고 레이어 id도 겹치지 않는다", () => {
    const templates = createGalleryTemplates();
    expect(new Set(templates.map((t) => t.id)).size).toBe(templates.length);
    for (const t of templates) {
      const all = (t.slides ?? [t.canvas]).flatMap((c) => c.layers.map((l) => l.id));
      expect(new Set(all).size, t.id).toBe(all.length);
      for (const canvas of t.slides ?? [t.canvas]) for (const l of canvas.layers) {
        expect(l.x + l.width > 0 && l.y + l.height > 0 && l.x < canvas.width && l.y < canvas.height, `${t.id}/${l.name} 화면 밖`).toBe(true);
      }
    }
  });
});
