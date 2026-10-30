// Social card + app icons, composed from the project's own art (sharp).
// Run once: `npm run assets:og`.
import sharp from "sharp";
import { readFileSync } from "node:fs";

const W = 1200;
const H = 630;

const shade = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="v" cx="50%" cy="50%" r="72%">
      <stop offset="0%" stop-color="#0b0907" stop-opacity="0.45"/>
      <stop offset="60%" stop-color="#0b0907" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="#0b0907" stop-opacity="0.97"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#v)"/>
</svg>`);

// The knife wheel at 45 % — the "throne of knives" behind the title.
const wheel = await sharp("src/assets/brand/knife-wheel.png")
  .resize({ width: 900 })
  .ensureAlpha()
  .composite([{ input: Buffer.from([255, 255, 255, 115]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: "dest-in" }])
  .png()
  .toBuffer()
  .then((buf) => sharp(buf).extract({ left: 0, top: (900 - H) / 2, width: 900, height: H }).png().toBuffer());

// "Knives" + "Out", bottom-aligned exactly as on the page (65.67 % / 34.33 %).
const total = 820;
const knives = await sharp("src/assets/brand/logo-knives.png").resize({ width: Math.round(total * 0.6567) }).toBuffer();
const out = await sharp("src/assets/brand/logo-out.png").resize({ width: Math.round(total * 0.3433) }).toBuffer();
const kh = (await sharp(knives).metadata()).height;
const oh = (await sharp(out).metadata()).height;
const baseY = Math.round(H / 2 + kh / 2) - 6;

await sharp("src/assets/bg/family-poster.jpg")
  .resize(W, H, { fit: "cover", position: "top" })
  .modulate({ saturation: 0.8, brightness: 0.75 })
  .composite([
    { input: wheel, left: Math.round((W - 900) / 2), top: 0 },
    { input: shade },
    { input: knives, left: Math.round((W - total) / 2), top: baseY - kh },
    { input: out, left: Math.round((W - total) / 2 + total * 0.6567), top: baseY - oh },
  ])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile("public/og.jpg");
console.log("  ✓ public/og.jpg");

// Icons from the SVG dagger (it carries its own dark tile).
const svg = readFileSync("public/favicon.svg");
const icon = async (size, out) => {
  await sharp(svg, { density: Math.max(72, Math.round((size / 64) * 72)) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`  ✓ ${out}`);
};
await icon(32, "public/favicon-32.png");
await icon(180, "public/apple-touch-icon.png");
await icon(512, "public/icon-512.png");
