// PRD.md 43장 F-32 스코어보드 카드 자동 생성.
// 양 팀 상징색 배경 + 엠블럼 + 팀명 + 점수/취소사유 + 날짜·구장 + 결과 요약 문구를 레이어로 만든다.
// 승패는 점수 비교로 자동 판정한다. 만들어진 레이어는 일반 편집기(App.tsx)가 그대로 다룬다.

import type { ImageLayer, Layer, ShapeLayer, TextLayer } from "../../types/canvas";
import type { KboGame } from "../../types/baseball";
import { teamMeta } from "./teams";

function baseFields(zIndex: number) {
  return { id: crypto.randomUUID(), rotation: 0, zIndex, visible: true, locked: false } as const;
}

function textLayer(partial: Omit<TextLayer, keyof ReturnType<typeof baseFields> | "type"> & { zIndex: number }): TextLayer {
  const { zIndex, ...rest } = partial;
  return { type: "text", ...baseFields(zIndex), ...rest };
}

function shapeLayer(partial: Omit<ShapeLayer, keyof ReturnType<typeof baseFields> | "type"> & { zIndex: number }): ShapeLayer {
  const { zIndex, ...rest } = partial;
  return { type: "shape", ...baseFields(zIndex), ...rest };
}

function imageLayer(partial: Omit<ImageLayer, keyof ReturnType<typeof baseFields> | "type"> & { zIndex: number }): ImageLayer {
  const { zIndex, ...rest } = partial;
  return { type: "image", ...baseFields(zIndex), ...rest };
}

function fitAspectRatio(maxWidth: number, maxHeight: number, aspectRatio: number) {
  const width = Math.min(maxWidth, maxHeight * aspectRatio);
  return { width, height: width / aspectRatio };
}

function formatDate(dateIso: string): string {
  const [y, m, d] = dateIso.split("-");
  return `${y}.${m}.${d}`;
}

function winnerCode(game: KboGame): string | null {
  if (game.status !== "final" || game.home.score === null || game.away.score === null) return null;
  if (game.home.score === game.away.score) return null;
  return game.home.score > game.away.score ? game.home.code : game.away.code;
}

/** KBO 경기 결과로 스코어보드 레이어를 만든다. status가 "scheduled"인 경기는 호출하지 않는다(F-33: 버튼 비활성화). */
export function buildScoreboardLayers(game: KboGame, width: number, height: number): { backgroundColor: string; layers: Layer[] } {
  const away = teamMeta(game.away.code);
  const home = teamMeta(game.home.code);
  const layers: Layer[] = [];

  layers.push(
    shapeLayer({ zIndex: 0, x: 0, y: 0, width: width / 2, height, shapeType: "rectangle", fillColor: away.primaryColor, name: "원정팀 배경" }),
    shapeLayer({ zIndex: 1, x: width / 2, y: 0, width: width / 2, height, shapeType: "rectangle", fillColor: home.primaryColor, name: "홈팀 배경" }),
  );

  // 큰 반투명 로고를 배경 워터마크로 깐다 — 배경(0/1) 바로 위, 그 외 모든 요소 아래.
  // 사용자가 보낸 형식에 맞게 워터마크 크기를 키웁니다.
  const watermarkMaxWidth = width / 2 * 0.95;
  const watermarkMaxHeight = height * 0.5;
  const awayWatermark = fitAspectRatio(watermarkMaxWidth, watermarkMaxHeight, away.logoAspectRatio);
  const homeWatermark = fitAspectRatio(watermarkMaxWidth, watermarkMaxHeight, home.logoAspectRatio);
  if (away.logoSrc) {
    layers.push(imageLayer({ zIndex: 0.5, x: width * 0.25 - awayWatermark.width / 2, y: height / 2 - awayWatermark.height / 2, ...awayWatermark, opacity: 0.3, src: away.logoSrc, name: "원정팀 로고 워터마크" }));
  }
  if (home.logoSrc) {
    layers.push(imageLayer({ zIndex: 0.6, x: width * 0.75 - homeWatermark.width / 2, y: height / 2 - homeWatermark.height / 2, ...homeWatermark, opacity: 0.3, src: home.logoSrc, name: "홈팀 로고 워터마크" }));
  }

  // 사용자가 보낸 형식에 맞게 엠블럼 배지(plate)는 렌더링하지 않고, 팀명 텍스트만 표시합니다.
  const nameY = height * 0.33; 
  const nameFontSize = Math.round(width * 0.055);
  layers.push(
    textLayer({ zIndex: 4, x: 0, y: nameY, width: width / 2, height: nameFontSize * 1.4, text: game.away.name, fontFamily: "IBM Plex Sans KR", fontSize: nameFontSize, color: away.textColor, bold: true, italic: false, align: "center", lineHeight: 1.2, letterSpacing: 0, name: "원정팀 이름" }),
    textLayer({ zIndex: 5, x: width / 2, y: nameY, width: width / 2, height: nameFontSize * 1.4, text: game.home.name, fontFamily: "IBM Plex Sans KR", fontSize: nameFontSize, color: home.textColor, bold: true, italic: false, align: "center", lineHeight: 1.2, letterSpacing: 0, name: "홈팀 이름" }),
  );

  const centerY = height * 0.44;
  if (game.status === "canceled") {
    layers.push(
      textLayer({ zIndex: 6, x: width * 0.1, y: centerY, width: width * 0.8, height: height * 0.14, text: game.cancelReason ?? "경기 취소", fontFamily: "IBM Plex Sans KR", fontSize: Math.round(width * 0.075), color: "#ffffff", bold: true, italic: false, align: "center", lineHeight: 1.2, letterSpacing: 0, strokeColor: "#000000", strokeWidth: Math.round(width * 0.006), name: "취소 안내" }),
    );
  } else {
    const scoreFontSize = Math.round(width * 0.14);
    const winner = winnerCode(game);
    layers.push(
      textLayer({ zIndex: 6, x: 0, y: centerY, width, height: scoreFontSize * 1.3, text: `${game.away.score} : ${game.home.score}`, fontFamily: "IBM Plex Sans KR", fontSize: scoreFontSize, color: "#ffffff", bold: true, italic: false, align: "center", lineHeight: 1, letterSpacing: 0, strokeColor: "#000000", strokeWidth: Math.round(width * 0.006), name: "스코어" }),
    );
    if (winner) {
      const badgeX = winner === game.away.code ? width * 0.25 - width * 0.06 : width * 0.75 - width * 0.06;
      layers.push(
        textLayer({ zIndex: 7, x: badgeX, y: nameY - height * 0.05, width: width * 0.12, height: height * 0.04, text: "WIN", fontFamily: "IBM Plex Sans KR", fontSize: Math.round(width * 0.035), color: "#f4b43e", bold: true, italic: false, align: "center", lineHeight: 1, letterSpacing: 2, name: "승리 배지" }),
      );
    }
  }

  const footerY = height * 0.9;
  layers.push(
    textLayer({ zIndex: 8, x: 0, y: footerY, width, height: height * 0.06, text: `${formatDate(game.date)} · ${game.stadium}`, fontFamily: "IBM Plex Sans KR", fontSize: Math.round(width * 0.028), color: "#ffffff", bold: false, italic: false, align: "center", lineHeight: 1, letterSpacing: 0, name: "날짜·구장" }),
  );

  return { backgroundColor: home.primaryColor, layers };
}
