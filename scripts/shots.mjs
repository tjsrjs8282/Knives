// README screenshots of the built site, driven like a visitor would.
//   npm run build && npx serve .vercel/output/static -l 4401
//   npm run dev -- --port 4331        (only for the AI shot: /api/blanc needs the server)
//   npm run shots                     (CHROME=<path> to override the browser)
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const URL = process.env.SHOTS_URL ?? "http://localhost:4401/";
const DEV = process.env.SHOTS_DEV_URL ?? "http://localhost:4331/";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture(page, name, width) {
  const png = await page.screenshot({ type: "png" });
  await sharp(png).resize({ width }).jpeg({ quality: 84, mozjpeg: true }).toFile(`${OUT}/${name}.jpg`);
  console.log(`  ✓ ${OUT}/${name}.jpg`);
}

/** Absolute page offset of a selector, plus `extra`. */
const offsetOf = (page, selector, extra = 0) =>
  page.evaluate((sel, add) => document.querySelector(sel).getBoundingClientRect().top + window.scrollY + add, selector, extra);

async function scrollTo(page, y, settle = 1600) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await sleep(settle);
}

async function enter(page, url = URL) {
  await page.goto(url, { waitUntil: "networkidle2" });
  // a few files already investigated, so the house shows both states
  await page.evaluate(() => localStorage.setItem("ko:investigated", JSON.stringify(["joni", "walt", "ransom", "marta"])));
  await page.reload({ waitUntil: "networkidle2" });
  await page.click('[data-gate-enter="silent"]');
  await sleep(4600); // folder opens + hero intro
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required", "--hide-scrollbars"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  await page.goto(URL, { waitUntil: "networkidle2" });
  await sleep(2400);
  await capture(page, "after-gate", 1440);

  await enter(page);
  await capture(page, "after-hero", 1440);

  // The case file: the knife mid-slash, then the report the tear reveals.
  const caseTop = await offsetOf(page, "#case");
  await scrollTo(page, caseTop + 900 * 2.4 * 0.27);
  await capture(page, "after-case-slash", 1440);
  await scrollTo(page, caseTop + 900 * 2.4 * 0.8);
  await capture(page, "after-case", 1440);

  // Suspects: the magnifier over Blanc's window.
  await scrollTo(page, await offsetOf(page, "#suspects", 360), 1800);
  const win = await page.$('.window[data-suspect="blanc"]');
  const box = await win.boundingBox();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await sleep(200);
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.42, { steps: 8 });
  await sleep(900);
  await capture(page, "after-suspects", 1440);
  await win.click();
  await sleep(1400);
  await capture(page, "after-dossier", 1440);
  await page.keyboard.press("Escape");
  await sleep(500);

  // Evidence: part-way along the strip.
  const evTop = await offsetOf(page, "#evidence");
  await scrollTo(page, evTop + 1500, 1800);
  await capture(page, "after-evidence", 1440);
  await page.evaluate(() => document.querySelector('[data-exhibit="2"]').click());
  await sleep(1400);
  await capture(page, "after-lightbox", 1440);
  await page.keyboard.press("Escape");
  await sleep(500);

  await scrollTo(page, await offsetOf(page, "#trailers", 40));
  await capture(page, "after-trailers", 1440);
  await scrollTo(page, await offsetOf(page, "#series", 60));
  await capture(page, "after-series", 1440);

  // The office needs /api/blanc, so this one runs on the dev server (if it is up).
  try {
    const dev = await browser.newPage();
    await dev.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await enter(dev, DEV);
    await scrollTo(dev, await offsetOf(dev, "#office", 40), 1500);
    await dev.type("#office-case", "매일 아침 회사 탕비실 믹스커피가 딱 한 봉지씩 비어요. 범인은 누구일까요?");
    await dev.click("[data-office-submit]");
    await dev.waitForFunction(() => document.querySelector("[data-report]")?.getAttribute("aria-busy") === "false" && !document.querySelector("[data-report-stamp]").hidden, { timeout: 40_000 });
    await sleep(900);
    await capture(dev, "after-office", 1440);
    await dev.close();
  } catch (e) {
    console.warn(`  ! office shot skipped (${e.message.split("\n")[0]})`);
  }

  // Phone.
  const phone = await browser.newPage();
  await phone.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await enter(phone);
  await capture(phone, "mobile-hero", 390);
  await scrollTo(phone, await offsetOf(phone, "#suspects", 520));
  await capture(phone, "mobile-suspects", 390);
  await phone.evaluate(() => document.querySelector("[data-menu-open]").click());
  await sleep(900);
  await capture(phone, "mobile-menu", 390);
} finally {
  await browser.close();
}
