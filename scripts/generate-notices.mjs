// 운영(production) 의존성의 라이선스 고지 페이지(public/legal/notices.html)를 만들고, 허용되지 않는 라이선스가 섞이면 실패한다.
// npm run build 전에 자동 실행된다(prebuild). 단독 실행: node scripts/generate-notices.mjs [--check]
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
const rootPkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

// 허용 라이선스(SPDX 식에 나온 항목 중 하나라도 허용 목록이면 통과 — OR 식은 선택 가능하므로)
const ALLOWED = ["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "0BSD", "CC0-1.0", "BlueOak-1.0.0", "OFL-1.1", "Unlicense", "Python-2.0"];
// 브라우저 번들에 들어가지 않는 Node 전용(서버 측) 의존성. 배포물(dist)에 포함되지 않음을 아래에서 확인한다.
const NODE_ONLY = [/^node_modules\/sharp$/, /^node_modules\/@img\//, /^node_modules\/onnxruntime-node$/];

function licenseOf(pkg) {
  if (typeof pkg.license === "string") return pkg.license;
  if (pkg.license && pkg.license.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type).join(" OR ");
  return "UNKNOWN";
}

function isAllowed(expression) {
  const parts = expression.replace(/[()]/g, "").split(/\s+(?:OR|AND)\s+/);
  const hasAnd = /\sAND\s/.test(expression);
  return hasAnd ? parts.every((p) => ALLOWED.includes(p)) : parts.some((p) => ALLOWED.includes(p));
}

function readLicenseText(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (/^(licen[sc]e|copying|notice)(\..*)?$/i.test(name)) {
      const file = path.join(dir, name);
      if (fs.statSync(file).isFile()) return fs.readFileSync(file, "utf8").slice(0, 12000);
    }
  }
  return "";
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rows = [];
const violations = [];
const nodeOnly = [];

for (const [key, info] of Object.entries(lock.packages)) {
  if (!key || info.dev) continue;
  const dir = path.join(root, key);
  const manifest = path.join(dir, "package.json");
  if (!fs.existsSync(manifest)) continue; // 이 플랫폼에 설치되지 않은 선택 의존성
  const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
  const license = licenseOf(pkg);
  const entry = { name: pkg.name, version: pkg.version, license, homepage: (typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url || pkg.homepage || "").replace(/^git\+/, "").replace(/\.git$/, ""), text: readLicenseText(dir) };
  if (NODE_ONLY.some((re) => re.test(key))) { nodeOnly.push(entry); continue; }
  if (!isAllowed(license)) violations.push(`${pkg.name}@${pkg.version} → ${license}`);
  rows.push(entry);
}
rows.sort((a, b) => a.name.localeCompare(b.name));

if (process.argv.includes("--check")) {
  if (violations.length) { console.error("허용되지 않는 라이선스:\n  " + violations.join("\n  ")); process.exit(1); }
  console.log(`라이선스 검사 통과 — 번들 대상 ${rows.length}개, Node 전용(제외) ${nodeOnly.length}개`);
  process.exit(0);
}
if (violations.length) { console.error("허용되지 않는 라이선스가 포함되어 있습니다:\n  " + violations.join("\n  ")); process.exit(1); }

const fonts = [
  ["IBM Plex Sans KR", "IBM Corp.", "https://github.com/IBM/plex"],
  ["Noto Sans KR · Noto Serif KR · Noto Color Emoji", "Google / Noto Project Authors", "https://github.com/notofonts"],
  ["Gowun Batang", "Yanghee Ryu", "https://github.com/yangheeryu/Gowun-Batang"],
  ["Black Han Sans", "Zess Type", "https://fonts.google.com/specimen/Black+Han+Sans"],
  ["Jua · Do Hyeon", "Woowahan Brothers", "https://fonts.google.com/specimen/Jua"],
  ["Gaegu", "Jiyoung Kim", "https://fonts.google.com/specimen/Gaegu"],
  ["Nanum Pen Script", "Sandoll Communications / NAVER", "https://hangeul.naver.com/font"],
];

const html = `<!doctype html>
<html lang="ko"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="robots" content="noindex" />
<title>오픈소스 라이선스 고지 — 카드툰</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#1d1b26;--muted:#5d5a6b;--line:#e5e3ee;--accent:#6d28d9}
@media(prefers-color-scheme:dark){:root{--bg:#14121c;--fg:#ece9f6;--muted:#a29fb3;--line:#2c2938;--accent:#a78bfa}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 "IBM Plex Sans KR","Noto Sans KR","Malgun Gothic",system-ui,sans-serif}
main{max-width:860px;margin:0 auto;padding:40px 20px 80px}h1{font-size:28px;margin:0 0 8px}h2{font-size:19px;margin:34px 0 8px;padding-top:18px;border-top:1px solid var(--line)}
a{color:var(--accent)}.muted{color:var(--muted);font-size:14px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:7px 9px;border:1px solid var(--line);text-align:left;vertical-align:top}
details{margin:6px 0}summary{cursor:pointer}pre{white-space:pre-wrap;font-size:12px;background:rgba(127,127,127,.12);padding:10px;border-radius:8px;overflow:auto}
</style></head><body><main>
<p class="muted"><a href="/">← 카드툰로 돌아가기</a></p>
<h1>오픈소스 라이선스 고지</h1>
<p class="muted">카드툰 v${esc(rootPkg.version)} · 이 페이지는 빌드할 때 자동으로 만들어집니다(scripts/generate-notices.mjs).</p>
<p>이 서비스는 아래 소프트웨어·글꼴·AI 모델을 사용합니다. 각 라이선스의 조건에 따라 저작권 고지와 라이선스 전문을 제공합니다.</p>

<h2>글꼴 (SIL Open Font License 1.1)</h2>
<p>모든 글꼴은 SIL OFL 1.1로 제공되며 상업적 이용·결과물에 포함해 배포하는 것이 허용됩니다. 글꼴 파일 자체를 단독으로 판매할 수는 없습니다. 라이선스: <a href="https://openfontlicense.org" rel="noopener">openfontlicense.org</a></p>
<table><tr><th>글꼴</th><th>저작권자</th><th>출처</th></tr>${fonts.map(([n, a, u]) => `<tr><td>${esc(n)}</td><td>${esc(a)}</td><td><a href="${u}" rel="noopener">${esc(u)}</a></td></tr>`).join("")}</table>

<h2>AI 모델</h2>
<p><strong>MODNet</strong> (Xenova/modnet ONNX 변환본) — Apache License 2.0. 배경 제거·배경 흐리게 기능이 처음 사용될 때 사용자의 동의 후 huggingface.co에서 내려받아 브라우저 안에서 실행합니다.</p>

<h2>상표</h2>
<p>Instagram, Facebook은 Meta Platforms, Inc.의 상표입니다. 이 서비스는 Meta와 제휴·후원·보증 관계가 없습니다.</p>

<h2>소프트웨어 패키지 (${rows.length}개)</h2>
<table><tr><th>패키지</th><th>버전</th><th>라이선스</th></tr>
${rows.map((r) => `<tr><td>${r.homepage ? `<a href="${esc(r.homepage)}" rel="noopener">${esc(r.name)}</a>` : esc(r.name)}</td><td>${esc(r.version)}</td><td>${esc(r.license)}</td></tr>`).join("\n")}
</table>

<h2>라이선스 전문</h2>
${rows.filter((r) => r.text).map((r) => `<details><summary>${esc(r.name)} ${esc(r.version)} — ${esc(r.license)}</summary><pre>${esc(r.text)}</pre></details>`).join("\n")}

<h2>Node 전용 패키지에 대한 안내</h2>
<p class="muted">개발·서버 측 환경에서만 쓰이는 ${nodeOnly.length}개 패키지(sharp·onnxruntime-node 등)는 브라우저로 제공되는 이 서비스의 번들에 포함되지 않습니다.</p>
</main></body></html>
`;
fs.mkdirSync(path.join(root, "public", "legal"), { recursive: true });
fs.writeFileSync(path.join(root, "public", "legal", "notices.html"), html);
console.log(`notices.html 생성 — 패키지 ${rows.length}개, Node 전용 제외 ${nodeOnly.length}개`);
