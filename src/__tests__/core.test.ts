import { describe, expect, it } from "vitest";
import { cssGradient, isLightColor, withOpacity } from "../features/design/gradients";
import { createZip, dataUrlToBytes } from "../features/export/zip";
import { cloneSlide, createDeck } from "../features/deck/deck";
import { describeChange } from "../features/history/describe";
import { PROJECT_FORMAT, ProjectFileError, createProjectFileName, parseProject, serializeProject } from "../features/project/projectFile";
import { createDefaultTemplates, parseTemplateBundle, serializeTemplates } from "../features/template/templateStore";

describe("gradients", () => {
  it("withOpacity: 불투명이면 원래 색, 아니면 rgba", () => {
    expect(withOpacity("#ff0000")).toBe("#ff0000");
    expect(withOpacity("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
  });
  it("cssGradient: 선형·원형", () => {
    expect(cssGradient({ from: "#000000", to: "#ffffff", angle: 90 })).toBe("linear-gradient(90deg, #000000, #ffffff)");
    expect(cssGradient({ type: "radial", from: "#000000", to: "#ffffff", angle: 0 })).toContain("radial-gradient");
  });
  it("isLightColor", () => {
    expect(isLightColor("#ffffff")).toBe(true);
    expect(isLightColor("#000000")).toBe(false);
  });
});

describe("zip", () => {
  it("PK 헤더로 시작하고 항목 수만큼 기록한다", async () => {
    const blob = createZip([{ name: "a.txt", data: new TextEncoder().encode("hello") }, { name: "b.txt", data: new Uint8Array([1, 2, 3]) }]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const view = new DataView(bytes.buffer);
    expect(view.getUint16(bytes.length - 22 + 10, true)).toBe(2); // end of central directory: total entries
  });
  it("dataUrlToBytes", () => {
    expect([...dataUrlToBytes("data:text/plain;base64,aGk=")]).toEqual([104, 105]);
  });
});

describe("deck", () => {
  it("cloneSlide는 슬라이드·레이어 id를 새로 발급한다", () => {
    const deck = createDeck();
    const copy = cloneSlide(deck.slides[0]);
    expect(copy.id).not.toBe(deck.slides[0].id);
  });
  it("describeChange: 슬라이드 추가/삭제/변경없음", () => {
    const deck = createDeck();
    const more = { ...deck, slides: [...deck.slides, cloneSlide(deck.slides[0])] };
    expect(describeChange(deck, more)).toBe("슬라이드 추가");
    expect(describeChange(more, deck)).toBe("슬라이드 삭제");
    expect(describeChange(deck, deck)).toBe("변경 없음");
  });
});

describe("프로젝트 파일", () => {
  it("저장 → 열기 왕복", async () => {
    const deck = createDeck(1080, 1080);
    const opened = parseProject(await serializeProject(deck));
    expect(opened.slides).toHaveLength(1);
    expect(opened.slides[0].width).toBe(1080);
  });
  it("잘못된 파일은 설명이 담긴 오류로 거부한다", () => {
    expect(() => parseProject("not json")).toThrow(ProjectFileError);
    expect(() => parseProject(JSON.stringify({ format: "other" }))).toThrow(ProjectFileError);
    expect(() => parseProject(JSON.stringify({ format: PROJECT_FORMAT, version: 99, deck: {} }))).toThrow(ProjectFileError);
    expect(() => parseProject(JSON.stringify({ format: PROJECT_FORMAT, version: 1, deck: { slides: "x", active: 0 } }))).toThrow(ProjectFileError);
  });
  it("파일 이름 형식", () => {
    expect(createProjectFileName(new Date(2026, 0, 2, 3, 4, 5))).toBe("card-news-20260102_030405.cardnews.json");
  });
});

describe("템플릿 가져오기 검증", () => {
  const bundleWith = (blendMode?: string) => {
    const [template] = structuredClone(createDefaultTemplates());
    if (blendMode) (template.canvas.layers[0] as { blendMode?: string }).blendMode = blendMode;
    return serializeTemplates([template]);
  };
  it("기본 템플릿 묶음은 통과한다", () => {
    expect(parseTemplateBundle(bundleWith())).toHaveLength(1);
  });
  it("허용된 blendMode(multiply)는 통과한다(대조군)", () => {
    expect(() => parseTemplateBundle(bundleWith("multiply"))).not.toThrow();
  });
  it("허용되지 않는 blendMode(destination-out)는 거부한다", () => {
    expect(() => parseTemplateBundle(bundleWith("destination-out"))).toThrow();
  });
  it("JSON이 아니면 거부한다", () => {
    expect(() => parseTemplateBundle("{")).toThrow();
  });
});
