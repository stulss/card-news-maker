import { expect, test } from "@playwright/test";

test("앱이 열리고 CSP 위반·외부 요청이 없다", async ({ page }) => {
  const violations: string[] = [];
  const external: string[] = [];
  page.on("console", (msg) => { if (/Content Security Policy|violates/i.test(msg.text())) violations.push(msg.text()); });
  page.on("request", (req) => { const u = new URL(req.url()); if (!["localhost", ""].includes(u.hostname) && u.protocol.startsWith("http")) external.push(req.url()); });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "메뉴 및 정보" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(violations).toEqual([]);
  expect(external).toEqual([]);
});

test("메뉴 대화상자: 열기·Esc 닫기·약관 링크", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "메뉴 및 정보" }).click();
  const dialog = page.getByRole("dialog", { name: "메뉴 및 정보" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "개인정보 처리방침" })).toHaveAttribute("href", "/legal/privacy.html");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("보안 헤더와 법적 페이지", async ({ request }) => {
  const res = await request.get("/");
  expect(res.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  for (const path of ["/legal/privacy.html", "/legal/terms.html", "/legal/notices.html", "/manifest.webmanifest", "/robots.txt"]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
});
