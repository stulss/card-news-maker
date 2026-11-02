// dist/ 를 vercel.json의 헤더 설정 그대로 적용해 서비스한다(로컬 보안 헤더·CSP 검증, e2e 테스트용).
// 사용: node scripts/serve-dist.mjs [포트=4173]
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve("dist");
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);
const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const rules = (config.headers ?? []).map((rule) => ({ regex: new RegExp(`^${rule.source}$`), headers: rule.headers }));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".wasm": "application/wasm", ".txt": "text/plain; charset=utf-8" };

http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) file = path.join(root, "index.html"); // SPA 대체
  for (const rule of rules) if (rule.regex.test(url.pathname)) for (const header of rule.headers) res.setHeader(header.key, header.value);
  res.setHeader("Content-Type", types[path.extname(file)] ?? "application/octet-stream");
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`dist 서비스 중: http://localhost:${port}`));
