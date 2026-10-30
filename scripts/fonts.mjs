// Korean web fonts, sized to this page instead of to the language.
//
// • gate-title.woff2 — the gate's title is the page's LCP; in Noto Serif KR it pulled
//   nine unicode-range slices (~300 KB) before first paint. Nine glyphs, one weight.
// • page-serif.woff2 — every Hangul syllable (plus Latin and punctuation) the page's
//   source actually uses, as one variable-weight (400–900) file. Google's ~120 slices
//   cost the long page ~24 requests and ~800 KB; this is one request, ~140 KB.
//   Anything missing (an AI answer, say) falls back to those slices per character.
//
// Both come from the Google Fonts `text=` subsetter. Run after changing copy:
// `npm run assets:fonts` (it scans src/ for characters).
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" };

async function subset(file, family, axes, chars) {
  const url = `https://fonts.googleapis.com/css2?family=${family}:${axes}&text=${encodeURIComponent(chars)}&display=swap`;
  const css = await (await fetch(url, { headers: UA })).text();
  const src = [...css.matchAll(/src:\s*url\(([^)]+)\)/g)].map((m) => m[1]);
  if (src.length !== 1) throw new Error(`${file}: expected one font file, got ${src.length}: ${css.slice(0, 200)}`);
  const font = Buffer.from(await (await fetch(src[0])).arrayBuffer());
  writeFileSync(join("public/fonts", file), font);
  console.log(`  ✓ public/fonts/${file.padEnd(17)} ${(font.length / 1024).toFixed(1).padStart(6)} KB  (${[...chars].length} characters)`);
}

/** Every character in the page's source text — markup, data, scripts. */
function sourceChars(dir) {
  const set = new Set();
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(astro|ts|json)$/.test(name)) for (const ch of readFileSync(p, "utf8")) set.add(ch);
    }
  };
  walk(dir);
  return set;
}

mkdirSync("public/fonts", { recursive: true });

const TITLE = "할런 트롬비 사망 사건";
await subset("gate-title.woff2", "Noto+Serif+KR", "wght@900", [...new Set(TITLE)].join(""));

// Hangul jamo/syllables, CJK and full-width punctuation, general punctuation (‘’“”…).
const RANGES = [[0x1100, 0x11ff], [0x2010, 0x2027], [0x2030, 0x205e], [0x3000, 0x303f], [0x3130, 0x318f], [0xac00, 0xd7af], [0xff00, 0xffef]];
const isKorean = (ch) => RANGES.some(([a, b]) => ch.codePointAt(0) >= a && ch.codePointAt(0) <= b);
// Hangul and Korean punctuation only — the file declares the same unicode-range, so a
// stray space or a Latin word never pulls 170 KB; those come from the small Latin slice.
const korean = [...sourceChars("src")].filter(isKorean).sort().join("");
await subset("page-serif.woff2", "Noto+Serif+KR", "wght@400..900", "·" + korean);
