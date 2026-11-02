import { defineConfig } from "@playwright/test";

// 운영 빌드(dist)를 vercel.json의 보안 헤더(CSP 포함)와 함께 띄워 검사한다. 먼저 npm run build 필요.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:4173", channel: process.env.CI ? undefined : "chrome" },
  webServer: { command: "node scripts/serve-dist.mjs 4173", url: "http://localhost:4173", reuseExistingServer: true },
});
