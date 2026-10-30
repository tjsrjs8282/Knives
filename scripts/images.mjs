// Turns the 2020 image folder (61 files, 41 MB, names like "11.png" and
// "5zMiji6nLQPW0N6rocXYVbQuJXo.jpg") into named, trimmed source assets.
// Astro's <Picture> then emits AVIF/WebP at the sizes each section needs.
//   npm run assets        (then `npm run assets:upscale` — it upgrades some of these files)
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const L = "legacy/images";
const A = "src/assets";

async function save(pipeline, file, kind = "jpg") {
  mkdirSync(dirname(file), { recursive: true });
  const out =
    kind === "png"
      ? pipeline.png({ compressionLevel: 9, effort: 10 })
      : pipeline.flatten({ background: "#000" }).jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: "4:4:4" });
  const info = await out.toFile(file);
  console.log(`  ✓ ${file.padEnd(44)} ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
  return info;
}

const trimmed = (file) => sharp(join(L, file)).trim({ threshold: 1 });

// ── brand & props (transparent) ──────────────────────────────────────────────
await save(sharp(join(L, "mainLogoLeft.png")), `${A}/brand/logo-knives.png`, "png");
await save(sharp(join(L, "mainLogoRight.png")), `${A}/brand/logo-out.png`, "png");
await save(trimmed("topLogo.png"), `${A}/brand/logo-stacked.png`, "png");
await save(trimmed("knife1.png"), `${A}/brand/knife-wheel.png`, "png");
await save(trimmed("knife.png"), `${A}/props/slash.png`, "png");
await save(trimmed("blood.png"), `${A}/props/blood.png`, "png");
await save(sharp(join(L, "magnifying.png")), `${A}/props/magnifier.png`, "png");
await save(sharp(join(L, "trailer_donut.png")), `${A}/props/donut.png`, "png");
await save(trimmed("leftBtn.png"), `${A}/props/knife-left.png`, "png");
await save(trimmed("rightBtn.png"), `${A}/props/knife-right.png`, "png");

// ── backdrops ────────────────────────────────────────────────────────────────
await save(sharp(join(L, "main.jpg")), `${A}/bg/family-poster.jpg`);
await save(sharp(join(L, "house.jpg")), `${A}/house/house-clear.jpg`);
await save(sharp(join(L, "cast_start.jpg")), `${A}/house/house-mystery.jpg`);

// ── the ten portrait windows of the house poster ─────────────────────────────
// Same rectangles on the painted poster (house.jpg) and the 2020 photo poster
// (cast_twoClick.jpg). The photo crops still carry burned-in captions; the AI
// pass in scripts/upscale.mjs removes them and the text lives on as real HTML.
export const WINDOWS = {
  joni: [532, 325, 206, 245],
  linda: [830, 325, 206, 245],
  blanc: [1122, 320, 206, 248],
  walt: [1405, 325, 206, 245],
  richard: [128, 700, 207, 240],
  meg: [428, 698, 205, 242],
  ransom: [717, 685, 205, 245],
  harlan: [1000, 695, 205, 245],
  elliott: [1275, 690, 205, 245],
  marta: [1560, 698, 205, 242],
};
for (const [id, [left, top, width, height]] of Object.entries(WINDOWS)) {
  const inset = { left: left + 4, top: top + 4, width: width - 8, height: height - 8 };
  await save(sharp(join(L, "house.jpg")).extract(inset), `${A}/suspects/painted/${id}.jpg`);
  await save(sharp(join(L, "cast_twoClick.jpg")).extract(inset), `${A}/suspects/photo/${id}.jpg`);
}
// % of the 1920×1080 poster: "hit" is padded to cover the gold frame (the button),
// "face" is the crop itself (where the restored portrait is laid back in).
const pct = (v, total) => +((v / total) * 100).toFixed(3);
writeFileSync(
  "src/data/windows.json",
  JSON.stringify(
    Object.fromEntries(
      Object.entries(WINDOWS).map(([id, [x, y, w, h]]) => [
        id,
        {
          hit: { x: pct(x - 14, 1920), y: pct(y - 14, 1080), w: pct(w + 28, 1920), h: pct(h + 28, 1080) },
          face: { x: pct(x + 4, 1920), y: pct(y + 4, 1080), w: pct(w - 8, 1920), h: pct(h - 8, 1080) },
        },
      ]),
    ),
    null,
    2,
  ) + "\n",
);

// ── evidence photos: film stills only (the poster, red carpet and press-day
// photos are dropped; 3.png is a smaller copy of the drawing-room still) ──────
const STILLS = {
  "2.jpg": "family-portrait",
  "106264764-1574709248191knivesout3cropped.jpg": "drawing-room",
  "6.jpg": "front-lawn",
  "9.jpg": "birthday-cake",
  "11.png": "go-board",
  "7.jpg": "foyer",
  "10.jpg": "interview",
  "15.jpg": "piano",
  "8.jpeg": "library",
  "12.jpg": "woods",
  "13.png": "ransom-study",
  "14.jpg": "ransom-sweater",
  "16.jpg": "blanc-marta",
  "17.png": "throne-blanc",
  "18.png": "throne-linda",
  "19.png": "throne-richard",
  "20.png": "throne-marta",
};
for (const [file, name] of Object.entries(STILLS)) {
  await save(sharp(join(L, file)), `${A}/stills/${name}.jpg`);
}
