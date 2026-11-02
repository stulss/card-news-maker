import type { Deck } from "../deck/deck";
import { toPersistentDeck, validateDeck } from "../autosave/deckStore";

/** 작업 전체(모든 슬라이드·사진)를 내 컴퓨터의 파일로 저장·복원하는 형식. 브라우저 저장소가 지워져도 작업을 잃지 않게 한다. */
export const PROJECT_FORMAT = "card-news-maker-project";
export const PROJECT_FILE_SUFFIX = ".cardnews.json";
export const MAX_PROJECT_BYTES = 300 * 1024 * 1024;

export class ProjectFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectFileError";
  }
}

export async function serializeProject(deck: Deck): Promise<string> {
  const persistent = await toPersistentDeck(deck); // 사진의 blob: 주소를 파일에 담을 수 있는 data URL로 바꾼다
  return JSON.stringify({
    format: PROJECT_FORMAT,
    version: 1,
    savedAt: new Date().toISOString(),
    deck: { slides: persistent.slides, active: persistent.active },
  });
}

/** 프로젝트 파일 내용을 읽어 덱으로 만든다. 형식·레이어 필드를 템플릿 가져오기와 같은 검증기로 확인하고, 잘못되면 설명이 담긴 오류를 던진다. */
export function parseProject(text: string): Deck {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ProjectFileError("프로젝트 파일이 올바른 JSON이 아닙니다. 현재 작업은 그대로 유지됩니다.");
  }
  const record = value as { format?: unknown; version?: unknown; deck?: unknown } | null;
  if (!record || typeof record !== "object" || record.format !== PROJECT_FORMAT) {
    throw new ProjectFileError("카드툰 프로젝트 파일(.cardnews.json)이 아닙니다. 현재 작업은 그대로 유지됩니다.");
  }
  if (record.version !== 1) throw new ProjectFileError("지원하지 않는 프로젝트 파일 버전입니다. 앱을 최신으로 업데이트해 보세요.");
  try {
    return validateDeck(record.deck);
  } catch {
    throw new ProjectFileError("프로젝트 파일 안의 슬라이드 형식이 올바르지 않습니다. 현재 작업은 그대로 유지됩니다.");
  }
}

export function createProjectFileName(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `card-news-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${PROJECT_FILE_SUFFIX}`;
}
