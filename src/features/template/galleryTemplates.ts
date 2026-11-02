import type { CanvasProject, GradientFill, Layer, ShapeLayer, TextLayer } from "../../types/canvas";
import { GRADIENT_PRESETS } from "../design/gradients";

export const GALLERY_CATEGORIES = ["전체", "카드뉴스", "밈", "공지", "SNS"] as const;
export type GalleryCategory = Exclude<(typeof GALLERY_CATEGORIES)[number], "전체">;

export type GalleryCanvas = Pick<CanvasProject, "width" | "height" | "backgroundColor" | "backgroundGradient" | "layers">;

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

function shape(name: string, shapeType: ShapeLayer["shapeType"], rect: Rect, fillColor: string, style: Partial<ShapeLayer> = {}): ShapeLayer {
  return { id: crypto.randomUUID(), type: "shape", shapeType, name, ...rect, rotation: 0, zIndex: 0, visible: true, locked: false, fillColor, ...style };
}

const preset = (name: string): GradientFill => (GRADIENT_PRESETS.find((candidate) => candidate.name === name) ?? GRADIENT_PRESETS[0]).value;

function make(id: string, name: string, category: GalleryCategory, width: number, height: number, backgroundColor: string, layers: Layer[], backgroundGradient?: GradientFill): GalleryTemplate {
  return { id, name, category, canvas: { width, height, backgroundColor, ...(backgroundGradient ? { backgroundGradient } : {}), layers: layers.map((layer, index) => ({ ...layer, zIndex: index })) } };
}

function canvasOf(width: number, height: number, backgroundColor: string, layers: Layer[], backgroundGradient?: GradientFill): GalleryCanvas {
  return { width, height, backgroundColor, ...(backgroundGradient ? { backgroundGradient } : {}), layers: layers.map((layer, index) => ({ ...layer, zIndex: index })) };
}

interface SetTheme { bg: string; ink: string; sub: string; accent: string; gradient?: GradientFill }

/** 인스타 캐러셀용 여러 장 세트: 표지 → 본문 N장 → 마무리. 4:5(1080×1350) 기준. 페이지 번호는 내보내기 옵션으로 넣는다. */
function makeSlideSet(id: string, name: string, theme: SetTheme, bodyCount: number, topic: string): GalleryTemplate {
  const W = 1080;
  const H = 1350;
  const cover = canvasOf(W, H, theme.bg, [
    box("포인트 바", { x: 80, y: 300, width: 140, height: 14 }, theme.accent),
    text("제목", `${topic}\n핵심만 정리`, { x: 80, y: 350, width: 920, height: 420 }, { fontSize: 124, color: theme.ink, align: "left" }),
    text("부제", "한 줄 소개를 입력하세요", { x: 80, y: 800, width: 920, height: 120 }, { fontSize: 46, bold: false, color: theme.sub, align: "left" }),
    text("안내", "옆으로 넘겨서 확인하세요 →", { x: 80, y: 1100, width: 920, height: 70 }, { fontSize: 38, color: theme.accent, align: "left" }),
    shape("장식 원", "circle", { x: 640, y: -160, width: 640, height: 640 }, theme.accent, { opacity: 0.18 }),
    shape("장식 원 2", "circle", { x: -220, y: 960, width: 520, height: 520 }, theme.accent, { opacity: 0.12 }),
  ], theme.gradient);
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
    shape("하트", "heart", { x: 440, y: 150, width: 200, height: 184 }, theme.accent, { opacity: 0.9 }),
  ], theme.gradient);
  const slides = [cover, ...bodies, outro];
  return { id, name, category: "카드뉴스", canvas: cover, slides };
}

function createDesignTemplates(): GalleryTemplate[] {
  return [
    make("design-aurora-quote", "오로라 인용구", "SNS", 1080, 1350, "#8b5cf6", [
      text("따옴표", "“", { x: 70, y: 120, width: 300, height: 360 }, { fontSize: 420, align: "left", opacity: 0.35 }),
      text("인용문", "오늘 하루도\n충분히 잘했어요", { x: 90, y: 480, width: 900, height: 360 }, { fontSize: 104, lineHeight: 1.3, shadow: { offsetX: 0, offsetY: 8, blur: 24, color: "rgba(0, 0, 0, 0.25)" } }),
      shape("구분선", "rectangle", { x: 490, y: 900, width: 100, height: 8 }, "#ffffff", { opacity: 0.8 }),
      text("계정", "@my_account", { x: 90, y: 960, width: 900, height: 80 }, { fontSize: 40, bold: false, opacity: 0.85 }),
    ], preset("오로라")),
    make("design-glass-headline", "글래스 헤드라인", "카드뉴스", 1080, 1350, "#0f172a", [
      shape("글로우", "circle", { x: 560, y: 40, width: 620, height: 620 }, "#ec4899", { opacity: 0.35 }),
      shape("글래스 카드", "rectangle", { x: 70, y: 330, width: 940, height: 760 }, "#ffffff", { opacity: 0.12, cornerRadius: 56, strokeColor: "#ffffff", strokeWidth: 2, shadow: { offsetX: 0, offsetY: 24, blur: 60, color: "rgba(0, 0, 0, 0.35)" } }),
      shape("태그", "rectangle", { x: 130, y: 400, width: 220, height: 70 }, "#a78bfa", { cornerRadius: 35 }),
      text("태그 글자", "TREND", { x: 130, y: 413, width: 220, height: 50 }, { fontSize: 34, align: "center", letterSpacing: 3 }),
      text("제목", "지금 가장 뜨거운\n한 가지 이야기", { x: 130, y: 530, width: 820, height: 330 }, { fontSize: 92, lineHeight: 1.2 }),
      text("부제", "핵심만 짧게 정리했어요", { x: 130, y: 920, width: 820, height: 80 }, { fontSize: 44, bold: false, color: "#cbd5e1" }),
    ], preset("미드나잇")),
    make("design-sale", "SALE 배너", "공지", 1080, 1080, "#f97316", [
      shape("별", "star", { x: 640, y: 70, width: 340, height: 340 }, "#fde047", { rotation: 14, shadow: { offsetX: 0, offsetY: 14, blur: 30, color: "rgba(0, 0, 0, 0.25)" } }),
      text("SALE", "SALE", { x: 70, y: 260, width: 940, height: 300 }, { fontSize: 320, align: "left", letterSpacing: -6, shadow: { offsetX: 0, offsetY: 14, blur: 30, color: "rgba(0, 0, 0, 0.25)" } }),
      text("혜택", "최대 50% 할인", { x: 70, y: 610, width: 940, height: 110 }, { fontSize: 88, align: "left" }),
      shape("버튼", "rectangle", { x: 70, y: 800, width: 440, height: 130 }, "#ffffff", { cornerRadius: 65, shadow: { offsetX: 0, offsetY: 12, blur: 24, color: "rgba(0, 0, 0, 0.25)" } }),
      text("버튼 글자", "지금 확인하기", { x: 70, y: 832, width: 440, height: 70 }, { fontSize: 48, color: "#ea580c", align: "center" }),
    ], preset("선셋")),
    make("design-review", "후기 말풍선", "SNS", 1080, 1080, "#fbcfe8", [
      shape("말풍선", "bubble", { x: 90, y: 110, width: 900, height: 700 }, "#ffffff", { shadow: { offsetX: 0, offsetY: 20, blur: 50, color: "rgba(80, 40, 120, 0.25)" } }),
      text("별점", "★★★★★", { x: 160, y: 200, width: 760, height: 100 }, { fontSize: 84, color: "#f59e0b", align: "left", letterSpacing: 6 }),
      text("후기", "정말 만족스러워요!\n다음에도 꼭 다시 쓸게요.", { x: 160, y: 340, width: 760, height: 280 }, { fontSize: 66, color: "#1f2937", align: "left", lineHeight: 1.4 }),
      text("작성자", "— 김OO 님", { x: 90, y: 880, width: 900, height: 70 }, { fontSize: 44, color: "#831843", align: "left" }),
    ], preset("코튼캔디")),
    make("design-dday", "D-DAY 카운트", "공지", 1080, 1080, "#111827", [
      shape("링", "circle", { x: 180, y: 130, width: 720, height: 720 }, "rgba(0,0,0,0)", { strokeColor: "#a78bfa", strokeWidth: 18 }),
      shape("링 안쪽", "circle", { x: 230, y: 180, width: 620, height: 620 }, "#ffffff", { opacity: 0.06 }),
      text("D-DAY", "D-7", { x: 180, y: 360, width: 720, height: 260 }, { fontSize: 250, letterSpacing: -4 }),
      text("라벨", "오픈까지", { x: 180, y: 250, width: 720, height: 80 }, { fontSize: 52, bold: false, color: "#c4b5fd" }),
      text("날짜", "00월 00일 오픈", { x: 180, y: 640, width: 720, height: 80 }, { fontSize: 48, bold: false, color: "#e5e7eb" }),
    ], preset("차콜")),
    make("design-heart", "하트 감성", "SNS", 1080, 1350, "#ddd6fe", [
      shape("하트", "heart", { x: 290, y: 190, width: 500, height: 460 }, "#ec4899", { shadow: { offsetX: 0, offsetY: 30, blur: 60, color: "rgba(236, 72, 153, 0.45)" } }),
      shape("하트 작은", "heart", { x: 130, y: 120, width: 130, height: 120 }, "#f9a8d4", { rotation: -18 }),
      shape("하트 작은 2", "heart", { x: 830, y: 560, width: 110, height: 100 }, "#f9a8d4", { rotation: 16 }),
      text("문구", "고마워요,\n늘 곁에 있어줘서", { x: 90, y: 760, width: 900, height: 300 }, { fontSize: 92, color: "#4c1d95", lineHeight: 1.3 }),
    ], preset("라벤더")),
    make("design-swipe", "스와이프 안내", "카드뉴스", 1080, 1350, "#06b6d4", [
      text("제목", "다음 장에서\n이어집니다", { x: 80, y: 360, width: 920, height: 380 }, { fontSize: 124, align: "left", lineHeight: 1.2 }),
      shape("화살표", "arrow", { x: 640, y: 860, width: 340, height: 220 }, "#ffffff", { shadow: { offsetX: 0, offsetY: 16, blur: 36, color: "rgba(0, 0, 0, 0.25)" } }),
      text("안내", "옆으로 넘겨 보세요", { x: 80, y: 900, width: 520, height: 80 }, { fontSize: 48, bold: false, align: "left" }),
    ], preset("오션")),
    make("design-tip", "번개 팁", "카드뉴스", 1080, 1350, "#fef3c7", [
      shape("번개", "bolt", { x: 90, y: 150, width: 260, height: 380 }, "#f59e0b", { shadow: { offsetX: 8, offsetY: 14, blur: 0, color: "rgba(180, 83, 9, 0.35)" } }),
      text("TIP", "TIP", { x: 400, y: 190, width: 580, height: 240 }, { fontSize: 230, align: "left", color: "#92400e", letterSpacing: -3 }),
      shape("카드", "rectangle", { x: 80, y: 600, width: 920, height: 560 }, "#ffffff", { cornerRadius: 48, shadow: { offsetX: 0, offsetY: 18, blur: 44, color: "rgba(146, 64, 14, 0.2)" } }),
      text("내용", "핵심 팁을 한두 문장으로\n쉽게 풀어서 적어 주세요.", { x: 140, y: 680, width: 800, height: 380 }, { fontSize: 62, color: "#451a03", align: "left", lineHeight: 1.45, bold: false }),
    ], preset("골드")),
  ];
}

function createSlideSets(): GalleryTemplate[] {
  return [
    makeSlideSet("set-news-5", "캐러셀 5장 세트 · 다크", { bg: "#101828", ink: "#ffffff", sub: "#a5b4fc", accent: "#a78bfa", gradient: preset("미드나잇") }, 3, "오늘의 이슈"),
    makeSlideSet("set-tips-6", "캐러셀 6장 세트 · 라이트", { bg: "#f7f3ea", ink: "#24211d", sub: "#8a8478", accent: "#e8590c", gradient: { from: "#fff7ed", to: "#fde68a", angle: 150 } }, 4, "꿀팁 모음"),
    makeSlideSet("set-pastel-5", "캐러셀 5장 세트 · 파스텔", { bg: "#fdf2f8", ink: "#4a044e", sub: "#a855f7", accent: "#ec4899", gradient: preset("코튼캔디") }, 3, "오늘의 정보"),
  ];
}

/** 카드뉴스·공지·SNS·밈에서 자주 쓰는 구성(비교·단계·Q&A·체크·일정·가격표·티어표)을 더한 템플릿. 모두 직접 만든 도형·문구로 구성했다. */
function createExtraTemplates(): GalleryTemplate[] {
  const shadow = { offsetX: 0, offsetY: 14, blur: 34, color: "rgba(0, 0, 0, 0.18)" };
  const steps = ["첫 번째 할 일을 적어 주세요", "두 번째 할 일을 적어 주세요", "세 번째 할 일을 적어 주세요"];
  const checks = ["확인할 내용 하나", "확인할 내용 둘", "확인할 내용 셋", "확인할 내용 넷"];
  const events = [["00.00", "첫 번째 일정"], ["00.00", "두 번째 일정"], ["00.00", "세 번째 일정"]];
  const prices = [["대표 메뉴", "00,000원"], ["인기 메뉴", "00,000원"], ["시즌 메뉴", "00,000원"], ["사이드", "0,000원"]];
  const tiers: Array<[string, string]> = [["S", "#ef4444"], ["A", "#f59e0b"], ["B", "#eab308"], ["C", "#22c55e"]];

  return [
    make("news-compare", "비교 카드 A vs B", "카드뉴스", 1080, 1350, "#f1f5f9", [
      text("제목", "무엇이 더 나을까?", { x: 80, y: 90, width: 920, height: 130 }, { fontSize: 88, color: "#0f172a" }),
      box("A 카드", { x: 70, y: 280, width: 440, height: 860 }, "#ffffff", { cornerRadius: 40, shadow }),
      box("B 카드", { x: 570, y: 280, width: 440, height: 860 }, "#0f172a", { cornerRadius: 40, shadow }),
      text("A 이름", "A", { x: 70, y: 330, width: 440, height: 160 }, { fontSize: 150, color: "#7c3aed" }),
      text("A 설명", "장점과 특징을\n짧게 적어 주세요", { x: 110, y: 560, width: 360, height: 360 }, { fontSize: 46, bold: false, color: "#334155", lineHeight: 1.5 }),
      text("B 이름", "B", { x: 570, y: 330, width: 440, height: 160 }, { fontSize: 150, color: "#f472b6" }),
      text("B 설명", "장점과 특징을\n짧게 적어 주세요", { x: 610, y: 560, width: 360, height: 360 }, { fontSize: 46, bold: false, color: "#e2e8f0", lineHeight: 1.5 }),
      shape("VS", "circle", { x: 470, y: 600, width: 140, height: 140 }, "#f59e0b", { shadow }),
      text("VS 글자", "VS", { x: 470, y: 640, width: 140, height: 70 }, { fontSize: 56, color: "#ffffff" }),
      text("결론", "결론: 상황에 따라 골라요", { x: 80, y: 1190, width: 920, height: 80 }, { fontSize: 46, bold: false, color: "#475569" }),
    ]),
    make("news-steps", "3단계 방법", "카드뉴스", 1080, 1350, "#fff7ed", [
      text("제목", "이렇게 해보세요", { x: 80, y: 100, width: 920, height: 130 }, { fontSize: 96, align: "left", color: "#7c2d12" }),
      box("연결선", { x: 156, y: 390, width: 8, height: 640 }, "#fdba74"),
      ...steps.flatMap((step, i) => [
        shape(`단계 ${i + 1} 원`, "circle", { x: 100, y: 330 + i * 300, width: 120, height: 120 }, "#ea580c", { shadow }),
        text(`단계 ${i + 1} 번호`, String(i + 1), { x: 100, y: 352 + i * 300, width: 120, height: 80 }, { fontSize: 72 }),
        text(`단계 ${i + 1} 내용`, step, { x: 270, y: 330 + i * 300, width: 710, height: 140 }, { fontSize: 54, align: "left", bold: false, color: "#431407", lineHeight: 1.35 }),
      ]),
    ]),
    make("news-qna", "Q&A 카드", "카드뉴스", 1080, 1350, "#eef2ff", [
      shape("Q 말풍선", "bubble", { x: 70, y: 120, width: 760, height: 460 }, "#4f46e5", { shadow }),
      text("Q", "Q.", { x: 120, y: 160, width: 200, height: 120 }, { fontSize: 100, align: "left" }),
      text("질문", "궁금한 질문을\n여기에 적어 주세요", { x: 120, y: 290, width: 660, height: 220 }, { fontSize: 58, align: "left", lineHeight: 1.3 }),
      box("A 카드", { x: 190, y: 700, width: 820, height: 520 }, "#ffffff", { cornerRadius: 44, shadow }),
      text("A", "A.", { x: 240, y: 740, width: 200, height: 120 }, { fontSize: 100, align: "left", color: "#ec4899" }),
      text("답변", "답변을 두세 줄로\n쉽게 풀어 주세요.", { x: 240, y: 880, width: 720, height: 280 }, { fontSize: 54, align: "left", bold: false, color: "#1e1b4b", lineHeight: 1.45 }),
    ]),
    make("news-checkpoints", "체크 포인트", "카드뉴스", 1080, 1350, "#0f172a", [
      text("제목", "이것만 확인하세요", { x: 80, y: 110, width: 920, height: 130 }, { fontSize: 92, align: "left" }),
      box("구분선", { x: 80, y: 270, width: 140, height: 12 }, "#34d399"),
      ...checks.flatMap((item, i) => [
        shape(`체크 ${i + 1}`, "check", { x: 80, y: 360 + i * 210, width: 90, height: 90 }, "#34d399"),
        text(`항목 ${i + 1}`, item, { x: 210, y: 372 + i * 210, width: 770, height: 80 }, { fontSize: 56, align: "left", bold: false, color: "#e2e8f0" }),
      ]),
    ]),
    make("news-timeline", "타임라인", "카드뉴스", 1080, 1350, "#fdf4ff", [
      text("제목", "한눈에 보는 흐름", { x: 80, y: 100, width: 920, height: 130 }, { fontSize: 92, align: "left", color: "#581c87" }),
      box("세로선", { x: 236, y: 330, width: 8, height: 740 }, "#d8b4fe"),
      ...events.flatMap(([date, label], i) => [
        shape(`점 ${i + 1}`, "circle", { x: 210, y: 330 + i * 300, width: 60, height: 60 }, "#a855f7"),
        text(`날짜 ${i + 1}`, date, { x: 330, y: 316 + i * 300, width: 600, height: 80 }, { fontSize: 60, align: "left", color: "#7e22ce" }),
        text(`내용 ${i + 1}`, label, { x: 330, y: 406 + i * 300, width: 650, height: 90 }, { fontSize: 50, align: "left", bold: false, color: "#3b0764" }),
      ]),
    ]),
    make("notice-schedule", "일정 안내", "공지", 1080, 1350, "#ecfeff", [
      shape("리본", "ribbon", { x: 60, y: 120, width: 960, height: 200 }, "#0891b2", { shadow }),
      text("제목", "일정 안내", { x: 60, y: 168, width: 960, height: 110 }, { fontSize: 100 }),
      ...events.flatMap(([date, label], i) => [
        box(`카드 ${i + 1}`, { x: 80, y: 420 + i * 240, width: 920, height: 190 }, "#ffffff", { cornerRadius: 36, shadow }),
        text(`날짜 ${i + 1}`, date, { x: 120, y: 470 + i * 240, width: 300, height: 90 }, { fontSize: 72, align: "left", color: "#0e7490" }),
        text(`일정 ${i + 1}`, label, { x: 440, y: 480 + i * 240, width: 520, height: 80 }, { fontSize: 52, align: "left", bold: false, color: "#164e63" }),
      ]),
      text("문의", "문의: @my_account", { x: 80, y: 1200, width: 920, height: 70 }, { fontSize: 42, bold: false, color: "#155e75" }),
    ]),
    make("notice-price", "가격표", "공지", 1080, 1350, "#fffbeb", [
      text("제목", "MENU", { x: 80, y: 100, width: 920, height: 190 }, { fontSize: 170, color: "#78350f", letterSpacing: 6 }),
      box("구분선", { x: 440, y: 310, width: 200, height: 8 }, "#d97706"),
      ...prices.flatMap(([name, price], i) => [
        text(`메뉴 ${i + 1}`, name, { x: 110, y: 400 + i * 190, width: 480, height: 90 }, { fontSize: 62, align: "left", color: "#451a03" }),
        text(`가격 ${i + 1}`, price, { x: 600, y: 400 + i * 190, width: 370, height: 90 }, { fontSize: 62, align: "right", color: "#b45309" }),
        box(`점선 ${i + 1}`, { x: 110, y: 510 + i * 190, width: 860, height: 4 }, "#fcd34d"),
      ]),
    ]),
    make("sns-cloud", "구름 한마디", "SNS", 1080, 1350, "#bae6fd", [
      shape("구름 1", "cloud", { x: 60, y: 130, width: 420, height: 290 }, "#ffffff", { opacity: 0.9 }),
      shape("구름 2", "cloud", { x: 640, y: 330, width: 360, height: 250 }, "#ffffff", { opacity: 0.8 }),
      shape("구름 3", "cloud", { x: 160, y: 1000, width: 520, height: 350 }, "#ffffff", { opacity: 0.85 }),
      text("문구", "천천히 가도\n괜찮아요", { x: 90, y: 560, width: 900, height: 360 }, { fontSize: 120, color: "#0c4a6e", lineHeight: 1.25 }),
    ], preset("스카이")),
    make("sns-intro", "자기소개 카드", "SNS", 1080, 1350, "#fdf2f8", [
      shape("프로필 원", "circle", { x: 340, y: 110, width: 400, height: 400 }, "#f9a8d4", { strokeColor: "#ffffff", strokeWidth: 14, shadow }),
      text("프로필 안내", "사진을 올려\n이 원 위에 놓아 보세요", { x: 340, y: 250, width: 400, height: 140 }, { fontSize: 32, bold: false, color: "#9d174d" }),
      text("이름", "안녕하세요,\n저는 OOO입니다", { x: 80, y: 570, width: 920, height: 260 }, { fontSize: 96, color: "#831843", lineHeight: 1.25 }),
      ...["하는 일", "좋아하는 것", "요즘 관심사"].flatMap((tag, i) => [
        shape(`태그 ${i + 1}`, "rectangle", { x: 80 + i * 310, y: 900, width: 290, height: 90 }, "#ec4899", { cornerRadius: 45 }),
        text(`태그 글자 ${i + 1}`, tag, { x: 80 + i * 310, y: 918, width: 290, height: 56 }, { fontSize: 38 }),
      ]),
      text("한줄", "한 줄로 나를 소개해 보세요", { x: 80, y: 1060, width: 920, height: 90 }, { fontSize: 46, bold: false, color: "#9d174d" }),
    ]),
    make("sns-link", "링크 안내 (QR 자리)", "SNS", 1080, 1350, "#1e1b4b", [
      text("제목", "지금 바로\n확인하세요", { x: 80, y: 130, width: 920, height: 330 }, { fontSize: 120, lineHeight: 1.2 }),
      box("QR 자리", { x: 320, y: 560, width: 440, height: 440 }, "#ffffff", { cornerRadius: 36, shadow }),
      text("QR 안내", "‘요소’ 탭에서 만든\nQR 코드를 이 위에 놓으세요", { x: 320, y: 730, width: 440, height: 110 }, { fontSize: 30, bold: false, color: "#4338ca" }),
      text("스캔", "카메라로 스캔해 주세요", { x: 80, y: 1080, width: 920, height: 80 }, { fontSize: 48, bold: false, color: "#c7d2fe" }),
    ], preset("미드나잇")),
    make("meme-tier", "티어표 밈", "밈", 1080, 1080, "#111827", [
      text("제목", "내 맘대로 티어표", { x: 40, y: 30, width: 1000, height: 110 }, { fontSize: 84 }),
      ...tiers.flatMap(([tier, color], i) => [
        box(`${tier} 줄`, { x: 40, y: 170 + i * 220, width: 1000, height: 200 }, "#1f2937", { cornerRadius: 16 }),
        box(`${tier} 라벨`, { x: 40, y: 170 + i * 220, width: 200, height: 200 }, color, { cornerRadius: 16 }),
        text(`${tier} 글자`, tier, { x: 40, y: 215 + i * 220, width: 200, height: 120 }, { fontSize: 120, color: "#111827" }),
      ]),
    ]),
  ];
}

/** 갤러리 템플릿은 코드에서 매번 새 id로 만들어 적용 시 원본이 오염되지 않게 한다. */
export function createGalleryTemplates(): GalleryTemplate[] {
  return [...createSlideSets(), ...createDesignTemplates(), ...createSingleTemplates(), ...createExtraTemplates()];
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
      text("이모지", "😂", { x: 340, y: 160, width: 400, height: 400 }, { fontFamily: '"Noto Color Emoji", "Segoe UI Emoji", "Apple Color Emoji", sans-serif', fontSize: 320, bold: false }),
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
      text("싫어", "🙅", { x: 40, y: 150, width: 380, height: 260 }, { fontFamily: '"Noto Color Emoji", "Segoe UI Emoji", "Apple Color Emoji", sans-serif', fontSize: 200, bold: false }),
      text("좋아", "🙆", { x: 40, y: 690, width: 380, height: 260 }, { fontFamily: '"Noto Color Emoji", "Segoe UI Emoji", "Apple Color Emoji", sans-serif', fontSize: 200, bold: false }),
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
      text("이모지", "🎂", { x: 340, y: 90, width: 400, height: 380 }, { fontFamily: '"Noto Color Emoji", "Segoe UI Emoji", "Apple Color Emoji", sans-serif', fontSize: 300, bold: false }),
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
