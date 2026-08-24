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

  const logoWidth = Math.min(110, width * 0.14);
  const logoHeight = logoWidth * (128 / 320); // public/logos/*.png는 320x128 캔버스로 통일 (2026-08-25 교체분)
  const logoY = height * 0.16;
  if (away.logoSrc) {
    layers.push(imageLayer({ zIndex: 2, x: width * 0.25 - logoWidth / 2, y: logoY, width: logoWidth, height: logoHeight, src: away.logoSrc, name: "원정팀 엠블럼" }));
  }
  if (home.logoSrc) {
    layers.push(imageLayer({ zIndex: 3, x: width * 0.75 - logoWidth / 2, y: logoY, width: logoWidth, height: logoHeight, src: home.logoSrc, name: "홈팀 엠블럼" }));
  }

  const nameY = logoY + logoHeight + height * 0.02;
  const nameFontSize = Math.round(width * 0.045);
  layers.push(
    textLayer({ zIndex: 4, x: 0, y: nameY, width: width / 2, height: nameFontSize * 1.4, text: game.away.name, fontFamily: "IBM Plex Sans KR", fontSize: nameFontSize, color: away.textColor, bold: true, italic: false, align: "center", lineHeight: 1.2, letterSpacing: 0, name: "원정팀 이름" }),
    textLayer({ zIndex: 5, x: width / 2, y: nameY, width: width / 2, height: nameFontSize * 1.4, text: game.home.name, fontFamily: "IBM Plex Sans KR", fontSize: nameFontSize, color: home.textColor, bold: true, italic: false, align: "center", lineHeight: 1.2, letterSpacing: 0, name: "홈팀 이름" }),
  );

  const centerY = height * 0.42;
  if (game.status === "canceled") {
    layers.push(
      textLayer({ zIndex: 6, x: width * 0.1, y: centerY, width: width * 0.8, height: height * 0.14, text: game.cancelReason ?? "경기 취소", fontFamily: "IBM Plex Sans KR", fontSize: Math.round(width * 0.075), color: "#ffffff", bold: true, italic: false, align: "center", lineHeight: 1.2, letterSpacing: 0, strokeColor: "#000000", strokeWidth: Math.round(width * 0.006), name: "취소 안내" }),
    );
  } else {
    const scoreFontSize = Math.round(width * 0.11);
    const winner = winnerCode(game);
    layers.push(
      textLayer({ zIndex: 6, x: 0, y: centerY, width, height: scoreFontSize * 1.3, text: `${game.away.score} : ${game.home.score}`, fontFamily: "IBM Plex Sans KR", fontSize: scoreFontSize, color: "#ffffff", bold: true, italic: false, align: "center", lineHeight: 1, letterSpacing: 0, strokeColor: "#000000", strokeWidth: Math.round(width * 0.006), name: "스코어" }),
    );
    if (winner) {
      const badgeX = winner === game.away.code ? width * 0.25 - width * 0.06 : width * 0.75 - width * 0.06;
      layers.push(
        textLayer({ zIndex: 7, x: badgeX, y: nameY - height * 0.045, width: width * 0.12, height: height * 0.04, text: "WIN", fontFamily: "IBM Plex Sans KR", fontSize: Math.round(width * 0.03), color: "#f4b43e", bold: true, italic: false, align: "center", lineHeight: 1, letterSpacing: 2, name: "승리 배지" }),
      );
    }
  }

  const footerY = height * 0.9;
  layers.push(
    textLayer({ zIndex: 8, x: 0, y: footerY, width, height: height * 0.06, text: `${formatDate(game.date)} · ${game.stadium}`, fontFamily: "IBM Plex Sans KR", fontSize: Math.round(width * 0.028), color: "#ffffff", bold: false, italic: false, align: "center", lineHeight: 1, letterSpacing: 0, name: "날짜·구장" }),
  );

  return { backgroundColor: home.primaryColor, layers };
}
