import type { Layer } from "../../types/canvas";
import type { Deck } from "../deck/deck";

const LAYER_TYPE_LABEL: Record<Layer["type"], string> = { text: "텍스트", image: "이미지", shape: "도형", sticker: "스티커" };

function changedKeys(before: Layer, after: Layer): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify((before as unknown as Record<string, unknown>)[key]) !== JSON.stringify((after as unknown as Record<string, unknown>)[key]));
}

function describeLayerChange(before: Layer, after: Layer): string {
  const keys = changedKeys(before, after);
  const name = after.name;
  const only = (allowed: string[]) => keys.every((key) => allowed.includes(key));
  if (keys.length === 0) return `수정: ${name}`;
  if (only(["x", "y"])) return `이동: ${name}`;
  if (only(["x", "y", "width", "height", "rotation", "fontSize"])) return `크기·회전: ${name}`;
  if (only(["zIndex"])) return `순서 변경: ${name}`;
  if (only(["name"])) return `이름 변경: ${before.name} → ${after.name}`;
  if (only(["visible"])) return `${after.visible ? "보이기" : "숨기기"}: ${name}`;
  if (only(["locked"])) return `${after.locked ? "잠금" : "잠금 해제"}: ${name}`;
  if (only(["text"])) return `문구 수정: ${name}`;
  if (only(["opacity"])) return `투명도: ${name}`;
  if (only(["blendMode"])) return `혼합 모드: ${name}`;
  if (only(["shadow"])) return `그림자: ${name}`;
  if (only(["groupId"])) return `${after.groupId ? "그룹 묶기" : "그룹 해제"}: ${name}`;
  if (only(["filters"])) return `이미지 보정: ${name}`;
  if (only(["cropZoom", "focusX", "focusY"])) return `이미지 자르기: ${name}`;
  if (only(["maskShape", "cornerRadius", "borderColor", "borderWidth"])) return `이미지 모양: ${name}`;
  if (only(["src"])) return `이미지 교체(AI 배경 제거 등): ${name}`;
  if (only(["fillColor", "fillGradient", "color", "strokeColor", "strokeWidth"])) return `색·테두리: ${name}`;
  if (only(["fontFamily", "bold", "italic", "align", "lineHeight", "letterSpacing", "fontSize"])) return `글자 스타일: ${name}`;
  return `수정: ${name}`;
}

/** 두 덱 스냅샷의 차이를 사람이 읽을 한 줄로 요약한다(작업 이력 패널용). 호출 지점마다 이름을 달지 않아도 되도록 비교로 추론한다. */
export function describeChange(before: Deck, after: Deck): string {
  if (after.slides.length > before.slides.length) return "슬라이드 추가";
  if (after.slides.length < before.slides.length) return "슬라이드 삭제";
  const reordered = after.slides.some((slide, index) => slide.id !== before.slides[index].id);
  if (reordered) return "슬라이드 순서 변경";

  const index = after.slides.findIndex((slide, i) => slide !== before.slides[i]);
  if (index < 0) return "변경 없음";
  const prev = before.slides[index];
  const next = after.slides[index];
  const where = after.slides.length > 1 ? ` (${index + 1}번 슬라이드)` : "";

  if (prev.width !== next.width || prev.height !== next.height) return `캔버스 크기 ${next.width}×${next.height}`;

  const prevIds = new Map(prev.layers.map((layer) => [layer.id, layer]));
  const nextIds = new Map(next.layers.map((layer) => [layer.id, layer]));
  const added = next.layers.filter((layer) => !prevIds.has(layer.id));
  const removed = prev.layers.filter((layer) => !nextIds.has(layer.id));
  if (added.length === 1 && removed.length === 0) return `추가: ${LAYER_TYPE_LABEL[added[0].type]} "${added[0].name}"${where}`;
  if (added.length > 1 && removed.length === 0) return `추가: 레이어 ${added.length}개${where}`;
  if (removed.length === 1 && added.length === 0) return `삭제: ${removed[0].name}${where}`;
  if (removed.length > 1 && added.length === 0) return `삭제: 레이어 ${removed.length}개${where}`;
  if (added.length > 0 && removed.length > 0) return `템플릿·레이어 교체${where}`;

  const changed = next.layers.filter((layer) => prevIds.get(layer.id) !== layer && prevIds.has(layer.id));
  if (changed.length === 1) return `${describeLayerChange(prevIds.get(changed[0].id)!, changed[0])}${where}`;
  if (changed.length > 1) {
    const everyMove = changed.every((layer) => changedKeys(prevIds.get(layer.id)!, layer).every((key) => key === "x" || key === "y"));
    return everyMove ? `이동: 레이어 ${changed.length}개${where}` : `수정: 레이어 ${changed.length}개${where}`;
  }
  if (prev.backgroundColor !== next.backgroundColor || JSON.stringify(prev.backgroundGradient) !== JSON.stringify(next.backgroundGradient)) return `배경 변경${where}`;
  return `수정${where}`;
}
