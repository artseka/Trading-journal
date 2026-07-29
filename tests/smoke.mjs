import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
});

const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await page.goto("http://127.0.0.1:3001", { waitUntil: "networkidle" });
await page.getByPlaceholder("กรอก Username").fill(process.env.TEST_USERNAME || "test-user");
await page.getByPlaceholder("กรอก Password").fill(process.env.TEST_PASSWORD || "test-password");
await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
await page.locator(".day-cell.today").waitFor();

const dimensions = await page.evaluate(() => ({
  viewport: document.documentElement.clientWidth,
  document: document.documentElement.scrollWidth,
}));
if (dimensions.document > dimensions.viewport) {
  throw new Error(`Horizontal overflow: ${dimensions.document}px > ${dimensions.viewport}px`);
}

await page.locator(".day-cell.today").click();
await page.getByPlaceholder("เช่น XAU/USD, BTC/USDT").fill("XAU/USD");
await page.locator('input[type="number"][step="0.01"]').fill("125.50");
await page.getByPlaceholder("เช่น 1:2").fill("1:2");
await page.getByRole("button", { name: "บันทึกเทรด" }).click();
await page.getByText("บันทึกการเทรดแล้ว").waitFor();
await page.reload({ waitUntil: "networkidle" });

const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("trading-journal-v1") || "{}"));
if (stored.trades?.length !== 1 || stored.trades[0].pair !== "XAU/USD") {
  throw new Error("Trade did not persist after reload");
}

await page.locator(".day-cell.today").click();
await page.getByRole("button", { name: "แก้ไข" }).click();
await page.locator('input[type="number"][step="0.01"]').fill("150");
await page.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
await page.getByText("แก้ไขรายการเรียบร้อย").waitFor();

console.log(JSON.stringify({ ok: true, dimensions, persistedPair: stored.trades[0].pair }));
await browser.close();
