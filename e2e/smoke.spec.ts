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

test("요소 탭: QR 코드를 추가하고 브랜드 색이 새로고침 뒤에도 남는다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "요소" }).first().click();
  await page.getByLabel("QR 주소 또는 문구").fill("https://example.com");
  await page.getByRole("button", { name: "QR 코드 추가" }).click();
  await expect(page.getByRole("status").filter({ hasText: "QR 코드" })).toBeVisible();

  await page.getByRole("button", { name: "브랜드" }).first().click();
  await page.getByRole("button", { name: "색 추가" }).click();
  await page.reload();
  await page.getByRole("button", { name: "브랜드" }).first().click();
  await expect(page.getByRole("button", { name: /^#[0-9a-f]{6} 적용$/ })).toHaveCount(1);
});
