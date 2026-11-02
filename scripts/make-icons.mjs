// public/favicon.svg → PWA 아이콘(PNG)을 만든다. 단독 실행: node scripts/make-icons.mjs (sharp는 개발 의존성 안에서만 사용)
import fs from "node:fs";
import sharp from "sharp";

const svg = fs.readFileSync("public/favicon.svg");
for (const size of [192, 512]) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(`public/icon-${size}.png`);
}
// maskable: 안전영역(중앙 80%)에 맞춰 배경 위에 축소 배치
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#7c3aed" } })
  .composite([{ input: await sharp(svg, { density: 384 }).resize(384, 384).png().toBuffer(), gravity: "center" }])
  .png().toFile("public/icon-maskable-512.png");
await sharp(svg, { density: 384 }).resize(180, 180).png().toFile("public/apple-touch-icon.png");
console.log("icons ok");
