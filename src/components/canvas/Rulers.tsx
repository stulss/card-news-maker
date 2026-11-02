import { useEffect, useRef } from "react";

export const RULER_SIZE = 22;

export interface RulerGuide {
  id: string;
  axis: "x" | "y";
  position: number;
}

interface Props {
  origin: { x: number; y: number; width: number; height: number }; // 캔버스 (0,0)이 영역 안에서 놓인 화면 위치와 영역 크기
  scale: number;
  projectWidth: number;
  projectHeight: number;
  guides: RulerGuide[];
  onAddGuide: (axis: "x" | "y", position: number) => void;
  onClearGuides: () => void;
}

const NICE_STEPS = [10, 20, 50, 100, 200, 250, 500, 1000, 2000];

function drawRuler(canvas: HTMLCanvasElement, axis: "x" | "y", props: Props) {
  const { origin, scale, projectWidth, projectHeight, guides } = props;
  const length = axis === "x" ? origin.width : origin.height;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = (axis === "x" ? length : RULER_SIZE) * ratio;
  canvas.height = (axis === "x" ? RULER_SIZE : length) * ratio;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(ratio, ratio);
  const style = getComputedStyle(canvas);
  const background = style.getPropertyValue("--ruler-bg").trim() || "#222";
  const tick = style.getPropertyValue("--ruler-tick").trim() || "#888";
  context.fillStyle = background;
  context.fillRect(0, 0, axis === "x" ? length : RULER_SIZE, axis === "x" ? RULER_SIZE : length);

  const start = axis === "x" ? origin.x : origin.y;
  const span = axis === "x" ? projectWidth : projectHeight;
  const major = NICE_STEPS.find((step) => step * scale >= 70) ?? NICE_STEPS[NICE_STEPS.length - 1];
  const minor = major / 5;
  context.strokeStyle = tick;
  context.fillStyle = tick;
  context.font = "10px sans-serif";
  context.lineWidth = 1;

  for (let value = 0; value <= span; value += minor) {
    const position = Math.round(start + value * scale) + 0.5;
    if (position < 0 || position > length) continue;
    const isMajor = Math.abs(value % major) < 0.001;
    const size = isMajor ? RULER_SIZE : minor * scale >= 6 ? RULER_SIZE * 0.35 : 0;
    if (size === 0) continue;
    context.beginPath();
    if (axis === "x") { context.moveTo(position, RULER_SIZE); context.lineTo(position, RULER_SIZE - size); }
    else { context.moveTo(RULER_SIZE, position); context.lineTo(RULER_SIZE - size, position); }
    context.stroke();
    if (isMajor) {
      if (axis === "x") context.fillText(String(Math.round(value)), position + 3, 10);
      else { context.save(); context.translate(10, position + 3); context.rotate(-Math.PI / 2); context.textAlign = "right"; context.fillText(String(Math.round(value)), 0, 0); context.restore(); }
    }
  }

  context.fillStyle = "#22d3ee";
  for (const guide of guides.filter((candidate) => candidate.axis === axis)) {
    const position = Math.round(start + guide.position * scale);
    if (axis === "x") context.fillRect(position - 1, 0, 2, RULER_SIZE);
    else context.fillRect(0, position - 1, RULER_SIZE, 2);
  }
}

/** 캔버스 위·왼쪽 눈금자(캔버스 px 단위). 눈금자를 클릭하면 그 위치에 가이드선이 생긴다. */
export function Rulers(props: Props) {
  const topRef = useRef<HTMLCanvasElement>(null);
  const leftRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (topRef.current) drawRuler(topRef.current, "x", props);
    if (leftRef.current) drawRuler(leftRef.current, "y", props);
  });

  const addGuide = (axis: "x" | "y") => (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const local = axis === "x" ? event.clientX - rect.left - props.origin.x : event.clientY - rect.top - props.origin.y;
    const limit = axis === "x" ? props.projectWidth : props.projectHeight;
    const position = Math.round(local / props.scale);
    if (position >= 0 && position <= limit) props.onAddGuide(axis, position);
  };

  return (
    <>
      <canvas ref={topRef} className="ruler ruler-top" style={{ width: props.origin.width, height: RULER_SIZE }} onClick={addGuide("x")} aria-label="가로 눈금자 — 클릭해 세로 가이드 추가" />
      <canvas ref={leftRef} className="ruler ruler-left" style={{ width: RULER_SIZE, height: props.origin.height }} onClick={addGuide("y")} aria-label="세로 눈금자 — 클릭해 가로 가이드 추가" />
      <button type="button" className="ruler-corner" onClick={props.onClearGuides} disabled={props.guides.length === 0} title="가이드선 모두 지우기" aria-label="가이드선 모두 지우기">✕</button>
    </>
  );
}
