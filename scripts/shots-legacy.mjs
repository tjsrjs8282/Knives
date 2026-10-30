// "Before" screenshots + page weight of the 2020 original, for the README.
//   npx serve legacy -l 5500     then     node scripts/shots-legacy.mjs
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const URL = process.env.LEGACY_URL ?? "http://localhost:5500/";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function capture(page, name, width) {
  const png = await page.screenshot({ type: "png" });
  await sharp(png).resize({ width }).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/${name}.jpg`);
  console.log(`  ✓ ${OUT}/${name}.jpg`);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars"] });
try {
  const page = await browser.newPage();
  const client = await page.createCDPSession();
  await client.send("Network.enable");
  let bytes = 0;
  let requests = 0;
  const errors = [];
  client.on("Network.loadingFinished", (e) => {
    bytes += e.encodedDataLength;
    requests++;
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 120_000 });
  await sleep(6500); // intro keyframes run ~5 s
  await capture(page, "before-main", 1440);
  const loadWeight = { bytes, requests };

  await page.click(".synopsisBtn");
  await sleep(3500);
  await capture(page, "before-synopsis", 1440);
  await page.click(".castBtn");
  await sleep(2500);
  await capture(page, "before-cast", 1440);
  await page.click(".castInvestigate");
  await sleep(4000);
  await page.click(".castInvestigate2");
  await sleep(4000);
  await capture(page, "before-cast-detail", 1440);
  await page.click(".galleryBtn");
  await sleep(2600);
  await page.click(".thumb:nth-child(3)"); // throws "num is not defined"
  await sleep(1200);
  await capture(page, "before-gallery", 1440);
  await page.click(".trailerBtn");
  await sleep(3000);
  await capture(page, "before-trailer", 1440);

  const phone = await browser.newPage();
  await phone.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await phone.goto(URL, { waitUntil: "networkidle0", timeout: 120_000 });
  await sleep(5000);
  await capture(phone, "before-mobile", 390);
  await phone.tap(".toggleMenu"); // the hamburger animates, but no menu ever opens
  await sleep(1200);
  await capture(phone, "before-mobile-menu", 390);

  const report = { ...loadWeight, mb: +(loadWeight.bytes / 1048576).toFixed(1), errors };
  writeFileSync(`${OUT}/legacy-report.json`, JSON.stringify(report, null, 2));
  console.log(report);
} finally {
  await browser.close();
}
