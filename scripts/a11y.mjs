// Full-page accessibility check with axe-core — the part Lighthouse cannot see.
// Lighthouse audits the first screen (the closed case file); this opens it, scrolls
// every section into view so each reveal has run, then audits the page and each
// dialog (menu, suspect file, evidence lightbox) in its open state.
//   npm run build && npx serve .vercel/output/static -l 4401   then   npm run a11y
import puppeteer from "puppeteer-core";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
const URL = process.env.A11Y_URL ?? "http://localhost:4401/";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function audit(page, label, context) {
  await page.addScriptTag({ path: AXE });
  const result = await page.evaluate(
    async (ctx, tags) => {
      const r = await window.axe.run(ctx ?? document, { runOnly: { type: "tag", values: tags } });
      return {
        violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(" ")) })),
        passes: r.passes.length,
        incomplete: r.incomplete.map((i) => i.id),
      };
    },
    context,
    TAGS,
  );
  const status = result.violations.length ? "✗" : "✓";
  console.log(`  ${status} ${label.padEnd(26)} ${result.passes} rules passed, ${result.violations.length} violations`);
  for (const v of result.violations) console.log(`      - [${v.impact}] ${v.id}: ${v.help}\n        ${v.nodes.join("\n        ")}`);
  return result.violations.length;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
let failures = 0;
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 900 }],
    ["mobile", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ]) {
    console.log(`\n▸ ${name}`);
    const page = await browser.newPage();
    await page.setViewport(viewport);
    await page.goto(URL, { waitUntil: "networkidle0" });
    failures += await audit(page, "gate (first screen)");

    await page.click('[data-gate-enter="silent"]');
    await sleep(2500);
    // scroll the whole page so every reveal and lazy image has fired
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 500) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await sleep(120);
    }
    await sleep(1200);
    failures += await audit(page, "page (all sections)");

    await page.evaluate(() => document.querySelector("[data-menu-open]").click());
    await sleep(700);
    failures += await audit(page, "menu dialog", "[data-menu]");
    await page.keyboard.press("Escape");
    await sleep(400);

    await page.evaluate(() => document.querySelector("[data-suspect]").click());
    await sleep(900);
    failures += await audit(page, "suspect file dialog", "[data-dossier-dialog]");
    await page.keyboard.press("Escape");
    await sleep(400);

    await page.evaluate(() => document.querySelector("[data-exhibit]").click());
    await sleep(900);
    failures += await audit(page, "evidence lightbox", "[data-lightbox]");
    await page.keyboard.press("Escape");
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} violation(s)` : "\nNo axe violations.");
process.exitCode = failures ? 1 : 0;
