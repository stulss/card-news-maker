import type { CanvasProject, Layer, ShapeLayer, TextLayer } from "../../types/canvas";

export const GALLERY_CATEGORIES = ["전체", "카드뉴스", "밈", "공지", "SNS"] as const;
export type GalleryCategory = Exclude<(typeof GALLERY_CATEGORIES)[number], "전체">;

export type GalleryCanvas = Pick<CanvasProject, "width" | "height" | "backgroundColor" | "layers">;

export interface GalleryTemplate {
  id: string;
  name: string;
  category: GalleryCategory;
  canvas: GalleryCanvas; // 한 장짜리면 이 캔버스, 세트면 첫 장(썸네일)
  slides?: GalleryCanvas[]; // 있으면 여러 장짜리 캐러셀 세트
}

type Rect = { x: number; y: number; width: number; height: number };

function text(name: string, content: string, rect: Rect, style: Partial<TextLayer> = {}): TextLayer {
  return {
    id: crypto.randomUUID(), type: "text", name, text: content, ...rect, rotation: 0, zIndex: 0, visible: true, locked: false,
    fontFamily: "IBM Plex Sans KR", fontSize: 64, color: "#ffffff", bold: true, italic: false, align: "center",
    lineHeight: 1.25, letterSpacing: 0, strokeColor: "#000000", strokeWidth: 0, ...style,
  };
}

function box(name: string, rect: Rect, fillColor: string, style: Partial<ShapeLayer> = {}): ShapeLayer {
  return { id: crypto.randomUUID(), type: "shape", shapeType: "rectangle", name, ...rect, rotation: 0, zIndex: 0, visible: true, locked: false, fillColor, ...style };
}

function make(id: string, name: string, category: GalleryCategory, width: number, height: number, backgroundColor: string, layers: Layer[]): GalleryTemplate {
  return { id, name, category, canvas: { width, height, backgroundColor, layers: layers.map((layer, index) => ({ ...layer, zIndex: index })) } };
}

function canvasOf(width: number, height: number, backgroundColor: string, layers: Layer[]): GalleryCanvas {
  return { width, height, backgroundColor, layers: layers.map((layer, index) => ({ ...layer, zIndex: index })) };
}

interface SetTheme { bg: string; ink: string; sub: string; accent: string }

/** 인스타 캐러셀용 여러 장 세트: 표지 → 본문 N장 → 마무리. 4:5(1080×1350) 기준. 페이지 번호는 내보내기 옵션으로 넣는다. */
function makeSlideSet(id: string, name: string, theme: SetTheme, bodyCount: number, topic: string): GalleryTemplate {
  const W = 1080;
  const H = 1350;
  const cover = canvasOf(W, H, theme.bg, [
    box("포인트 바", { x: 80, y: 300, width: 140, height: 14 }, theme.accent),
    text("제목", `${topic}\n핵심만 정리`, { x: 80, y: 350, width: 920, height: 420 }, { fontSize: 124, color: theme.ink, align: "left" }),
    text("부제", "한 줄 소개를 입력하세요", { x: 80, y: 800, width: 920, height: 120 }, { fontSize: 46, bold: false, color: theme.sub, align: "left" }),
    text("안내", "옆으로 넘겨서 확인하세요 →", { x: 80, y: 1100, width: 920, height: 70 }, { fontSize: 38, color: theme.accent, align: "left" }),
  ]);
  const bodies = Array.from({ length: bodyCount }, (_, i) => canvasOf(W, H, theme.bg, [
    text("번호", String(i + 1).padStart(2, "0"), { x: 80, y: 130, width: 400, height: 200 }, { fontSize: 170, color: theme.accent, align: "left" }),
    box("구분선", { x: 80, y: 360, width: 920, height: 6 }, theme.sub, { opacity: 0.4 }),
    text("소제목", "소제목을 입력하세요", { x: 80, y: 420, width: 920, height: 200 }, { fontSize: 78, color: theme.ink, align: "left" }),
    text("본문", "핵심 내용을 두세 줄로 간결하게 적어 주세요.\n한 장에는 하나의 메시지만 담는 것이 좋습니다.", { x: 80, y: 660, width: 920, height: 420 }, { fontSize: 50, bold: false, color: theme.ink, align: "left", lineHeight: 1.5 }),
  ]));
  const outro = canvasOf(W, H, theme.bg, [
    text("마무리", "도움이 되셨나요?", { x: 80, y: 380, width: 920, height: 160 }, { fontSize: 96, color: theme.ink }),
    text("행동 유도", "저장 · 공유 · 팔로우", { x: 80, y: 600, width: 920, height: 110 }, { fontSize: 62, color: theme.accent }),
    text("계정", "@my_account", { x: 80, y: 780, width: 920, height: 80 }, { fontSize: 44, bold: false, color: theme.sub }),
  ]);
  const slides = [cover, ...bodies, outro];
  return { id, name, category: "카드뉴스", canvas: cover, slides };
}

function createSlideSets(): GalleryTemplate[] {
  return [
    makeSlideSet("set-news-5", "캐러셀 5장 세트 · 다크", { bg: "#101828", ink: "#ffffff", sub: "#98a2b3", accent: "#8b5cf6" }, 3, "오늘의 이슈"),
    makeSlideSet("set-tips-6", "캐러셀 6장 세트 · 라이트", { bg: "#f7f3ea", ink: "#24211d", sub: "#8a8478", accent: "#e8590c" }, 4, "꿀팁 모음"),
  ];
}

/** 갤러리 템플릿은 코드에서 매번 새 id로 만들어 적용 시 원본이 오염되지 않게 한다. */
export function createGalleryTemplates(): GalleryTemplate[] {
  return [...createSlideSets(), ...createSingleTemplates()];
}

function createSingleTemplates(): GalleryTemplate[] {
  return [
    make("news-headline", "헤드라인 카드", "카드뉴스", 1080, 1350, "#101828", [
      box("포인트 바", { x: 80, y: 300, width: 120, height: 12 }, "#8b5cf6"),
      text("제목", "오늘의\n핵심 뉴스", { x: 80, y: 340, width: 920, height: 380 }, { fontSize: 120, align: "left" }),
      text("부제", "한 줄로 요약하는 부제를 입력하세요", { x: 80, y: 760, width: 920, height: 140 }, { fontSize: 44, bold: false, color: "#98a2b3", align: "left" }),
      text("출처", "출처 · 날짜", { x: 80, y: 1200, width: 920, height: 60 }, { fontSize: 32, bold: false, color: "#667085", align: "left" }),
    ]),
    make("news-summary", "3줄 요약", "카드뉴스", 1080, 1350, "#f7f3ea", [
      text("제목", "3줄 요약", { x: 80, y: 110, width: 920, height: 130 }, { fontSize: 88, color: "#24211d", align: "left" }),
      box("구분선", { x: 80, y: 260, width: 920, height: 6 }, "#24211d"),
      text("항목 1", "① 첫 번째 핵심 내용", { x: 80, y: 340, width: 920, height: 200 }, { fontSize: 54, color: "#24211d", align: "left", bold: false }),
      text("항목 2", "② 두 번째 핵심 내용", { x: 80, y: 600, width: 920, height: 200 }, { fontSize: 54, color: "#24211d", align: "left", bold: false }),
      text("항목 3", "③ 세 번째 핵심 내용", { x: 80, y: 860, width: 920, height: 200 }, { fontSize: 54, color: "#24211d", align: "left", bold: false }),
    ]),
    make("news-quote", "인용구 카드", "카드뉴스", 1080, 1080, "#315c78", [
      text("따옴표", "“", { x: 80, y: 80, width: 240, height: 260 }, { fontSize: 300, align: "left", color: "#8fc1de" }),
      text("인용문", "기억에 남는 한 문장을\n여기에 적어 보세요", { x: 100, y: 330, width: 880, height: 400 }, { fontSize: 68 }),
      text("화자", "— 이름", { x: 100, y: 840, width: 880, height: 80 }, { fontSize: 40, bold: false, color: "#cfe5f2", align: "right" }),
    ]),
    make("meme-topbottom", "상·하단 자막 밈", "밈", 1080, 1080, "#2b2b2b", [
      text("상단 자막", "상단 문구", { x: 54, y: 50, width: 972, height: 220 }, { fontSize: 92, strokeWidth: 10 }),
      text("하단 자막", "하단 문구", { x: 54, y: 810, width: 972, height: 220 }, { fontSize: 92, strokeWidth: 10 }),
    ]),
    make("meme-versus", "비교 밈 (VS)", "밈", 1080, 1080, "#ffffff", [
      box("왼쪽", { x: 0, y: 0, width: 540, height: 1080 }, "#ffd166"),
      box("오른쪽", { x: 540, y: 0, width: 540, height: 1080 }, "#ef476f"),
      text("왼쪽 문구", "기대", { x: 40, y: 400, width: 460, height: 200 }, { fontSize: 110, color: "#222222" }),
      text("오른쪽 문구", "현실", { x: 580, y: 400, width: 460, height: 200 }, { fontSize: 110 }),
      text("VS", "VS", { x: 440, y: 70, width: 200, height: 120 }, { fontSize: 80, color: "#111111", strokeColor: "#ffffff", strokeWidth: 8 }),
    ]),
    make("meme-reaction", "리액션 자막", "밈", 1080, 1080, "#111111", [
      text("이모지", "😂", { x: 340, y: 160, width: 400, height: 400 }, { fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif', fontSize: 320, bold: false }),
      text("자막", "나 지금 이 상황", { x: 54, y: 700, width: 972, height: 200 }, { fontSize: 96, strokeWidth: 8 }),
    ]),
    make("notice-urgent", "긴급 공지", "공지", 1080, 1080, "#e11d2e", [
      box("상단 띠", { x: 0, y: 0, width: 1080, height: 150 }, "#7a0f19"),
      text("라벨", "긴급 공지", { x: 60, y: 28, width: 960, height: 100 }, { fontSize: 76, align: "left" }),
      text("본문", "공지 내용을\n간결하게 입력하세요", { x: 80, y: 330, width: 920, height: 400 }, { fontSize: 100 }),
      text("일시", "2026. 00. 00.", { x: 80, y: 900, width: 920, height: 80 }, { fontSize: 44, bold: false }),
    ]),
    make("notice-event", "이벤트 안내", "공지", 1080, 1350, "#20242d", [
      box("카드", { x: 70, y: 120, width: 940, height: 1110 }, "#2b3140", { cornerRadius: 40 }),
      text("제목", "EVENT", { x: 110, y: 200, width: 860, height: 140 }, { fontSize: 120, color: "#f4b43e" }),
      text("내용", "참여 방법과 혜택을\n여기에 적어 주세요", { x: 110, y: 460, width: 860, height: 360 }, { fontSize: 64 }),
      text("기간", "기간 : 00.00 ~ 00.00", { x: 110, y: 1000, width: 860, height: 90 }, { fontSize: 44, bold: false, color: "#b6bdcb" }),
    ]),
    make("sns-oneliner", "오늘의 한마디", "SNS", 1080, 1350, "#f7f3ea", [
      text("문구", "오늘도\n수고했어요", { x: 80, y: 420, width: 920, height: 460 }, { fontSize: 130, color: "#24211d" }),
      text("서명", "@my_account", { x: 80, y: 1180, width: 920, height: 70 }, { fontSize: 36, bold: false, color: "#8a8478" }),
    ]),
    make("sns-story", "스토리 질문", "SNS", 1080, 1920, "#6d28d9", [
      box("질문 박스", { x: 90, y: 640, width: 900, height: 560 }, "#ffffff", { cornerRadius: 56 }),
      text("라벨", "Q.", { x: 90, y: 520, width: 900, height: 140 }, { fontSize: 120, color: "#ffffff" }),
      text("질문", "여러분의 생각을\n들려주세요!", { x: 130, y: 720, width: 820, height: 380 }, { fontSize: 80, color: "#2a1a5e" }),
    ]),
    make("sns-gradient", "감성 문구", "SNS", 1080, 1080, "#1e1b4b", [
      box("글로우", { x: 190, y: 190, width: 700, height: 700 }, "#ec4899", { cornerRadius: 350, opacity: 0.25 }),
      text("문구", "당신의 하루가\n빛나길", { x: 100, y: 380, width: 880, height: 320 }, { fontSize: 100, strokeWidth: 0 }),
    ]),
    make("news-checklist", "체크리스트 카드", "카드뉴스", 1080, 1350, "#ecfdf5", [
      text("제목", "꼭 확인하세요", { x: 80, y: 100, width: 920, height: 130 }, { fontSize: 84, color: "#064e3b", align: "left" }),
      box("체크 1", { x: 80, y: 330, width: 90, height: 90 }, "#10b981", { cornerRadius: 24 }),
      text("항목 1", "첫 번째 확인 사항", { x: 210, y: 335, width: 790, height: 80 }, { fontSize: 52, color: "#064e3b", align: "left", bold: false }),
      box("체크 2", { x: 80, y: 560, width: 90, height: 90 }, "#10b981", { cornerRadius: 24 }),
      text("항목 2", "두 번째 확인 사항", { x: 210, y: 565, width: 790, height: 80 }, { fontSize: 52, color: "#064e3b", align: "left", bold: false }),
      box("체크 3", { x: 80, y: 790, width: 90, height: 90 }, "#10b981", { cornerRadius: 24 }),
      text("항목 3", "세 번째 확인 사항", { x: 210, y: 795, width: 790, height: 80 }, { fontSize: 52, color: "#064e3b", align: "left", bold: false }),
    ]),
    make("news-stat", "숫자 강조 카드", "카드뉴스", 1080, 1080, "#0f172a", [
      text("라벨", "올해 달라진 점", { x: 80, y: 150, width: 920, height: 90 }, { fontSize: 52, bold: false, color: "#94a3b8" }),
      text("숫자", "87%", { x: 80, y: 290, width: 920, height: 380 }, { fontSize: 340, color: "#38bdf8" }),
      text("설명", "수치에 대한 한 줄 설명을 적어 주세요", { x: 80, y: 760, width: 920, height: 140 }, { fontSize: 46, bold: false }),
    ]),
    make("meme-drake", "선택 비교 밈", "밈", 1080, 1080, "#ffffff", [
      box("위 칸", { x: 0, y: 0, width: 1080, height: 540 }, "#f1f5f9"),
      box("아래 칸", { x: 0, y: 540, width: 1080, height: 540 }, "#e2e8f0"),
      text("싫어", "🙅", { x: 40, y: 150, width: 380, height: 260 }, { fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif', fontSize: 200, bold: false }),
      text("좋아", "🙆", { x: 40, y: 690, width: 380, height: 260 }, { fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif', fontSize: 200, bold: false }),
      text("위 문구", "하기 싫은 것", { x: 440, y: 200, width: 600, height: 160 }, { fontSize: 72, color: "#111111", align: "left" }),
      text("아래 문구", "하고 싶은 것", { x: 440, y: 740, width: 600, height: 160 }, { fontSize: 72, color: "#111111", align: "left" }),
    ]),
    make("meme-breaking", "속보 밈", "밈", 1080, 1080, "#1f2937", [
      box("라벨", { x: 0, y: 700, width: 260, height: 80 }, "#e11d2e"),
      text("속보", "속보", { x: 0, y: 706, width: 260, height: 70 }, { fontSize: 54 }),
      box("띠", { x: 0, y: 780, width: 1080, height: 190 }, "#101828"),
      text("헤드라인", "믿기 힘든 사건 발생", { x: 50, y: 810, width: 980, height: 130 }, { fontSize: 74, align: "left" }),
    ]),
    make("notice-closed", "휴무 안내", "공지", 1080, 1350, "#fef3c7", [
      text("제목", "휴무 안내", { x: 80, y: 190, width: 920, height: 170 }, { fontSize: 140, color: "#78350f" }),
      box("구분선", { x: 440, y: 400, width: 200, height: 8 }, "#d97706"),
      text("일정", "00월 00일(요일)\n하루 쉽니다", { x: 80, y: 480, width: 920, height: 380 }, { fontSize: 88, color: "#92400e" }),
      text("인사", "이용에 참고 부탁드립니다", { x: 80, y: 1050, width: 920, height: 90 }, { fontSize: 44, bold: false, color: "#92400e" }),
    ]),
    make("notice-recruit", "모집 공고", "공지", 1080, 1080, "#0b3b2e", [
      text("라벨", "WE ARE HIRING", { x: 80, y: 120, width: 920, height: 90 }, { fontSize: 56, color: "#6ee7b7", align: "left" }),
      text("제목", "함께할 팀원을\n찾습니다", { x: 80, y: 260, width: 920, height: 330 }, { fontSize: 120, align: "left" }),
      box("버튼", { x: 80, y: 760, width: 460, height: 120 }, "#6ee7b7", { cornerRadius: 60 }),
      text("버튼 글자", "지금 지원하기", { x: 80, y: 785, width: 460, height: 70 }, { fontSize: 48, color: "#0b3b2e" }),
    ]),
    make("sns-poll", "O/X 투표", "SNS", 1080, 1350, "#fdf2f8", [
      text("질문", "여러분은\n어느 쪽인가요?", { x: 80, y: 130, width: 920, height: 330 }, { fontSize: 100, color: "#831843" }),
      box("O 박스", { x: 80, y: 600, width: 430, height: 430 }, "#ec4899", { cornerRadius: 48 }),
      box("X 박스", { x: 570, y: 600, width: 430, height: 430 }, "#6366f1", { cornerRadius: 48 }),
      text("O", "O", { x: 80, y: 650, width: 430, height: 330 }, { fontSize: 300 }),
      text("X", "X", { x: 570, y: 650, width: 430, height: 330 }, { fontSize: 300 }),
    ]),
    make("sns-birthday", "생일 축하", "SNS", 1080, 1080, "#fff7ed", [
      text("이모지", "🎂", { x: 340, y: 90, width: 400, height: 380 }, { fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif', fontSize: 300, bold: false }),
      text("문구", "생일 축하해요!", { x: 80, y: 540, width: 920, height: 200 }, { fontSize: 120, color: "#c2410c" }),
      text("메시지", "오늘 하루 가장 행복하길 바라요", { x: 80, y: 780, width: 920, height: 120 }, { fontSize: 48, bold: false, color: "#9a3412" }),
    ]),
    make("sns-book", "책 추천", "SNS", 1080, 1350, "#1c1917", [
      box("표지", { x: 330, y: 150, width: 420, height: 600 }, "#f59e0b", { cornerRadius: 12 }),
      text("책 제목", "책 제목", { x: 350, y: 380, width: 380, height: 140 }, { fontSize: 72, color: "#1c1917" }),
      text("추천 문구", "“인생 책을\n만났습니다”", { x: 80, y: 850, width: 920, height: 260 }, { fontSize: 84 }),
      text("별점", "★★★★★", { x: 80, y: 1150, width: 920, height: 100 }, { fontSize: 72, color: "#f59e0b" }),
    ]),
  ];
}
