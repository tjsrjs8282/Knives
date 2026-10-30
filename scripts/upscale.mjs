// AI restoration for the images the 2020 site could only show small.
//   • photo portraits: the 2020 cast poster burned Korean captions into each
//     photo. fal.ai nano-banana (Gemini image edit) removes the text and redraws
//     what was underneath; the captions now live in HTML (src/data/suspects.ts).
//   • painted portraits: 200 px crops of the house poster → Real-ESRGAN ×4.
//   • transparent logos/props: colour and alpha are upscaled separately (ESRGAN
//     has no alpha channel) and recombined.
// Run once after `npm run assets`: `npm run assets:upscale` (needs FAL_KEY).
// Originals are kept in .cache/upscale so a re-run never upscales an upscale.
import sharp from "sharp";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

process.loadEnvFile(".env.local");
const KEY = process.env.FAL_KEY;
if (!KEY) throw new Error("FAL_KEY missing in .env.local");

const KEEP = ".cache/upscale";
mkdirSync(KEEP, { recursive: true });
const IDS = ["joni", "linda", "blanc", "walt", "richard", "meg", "ransom", "harlan", "elliott", "marta"];
const only = process.argv[2]; // e.g. `node scripts/upscale.mjs photo` or `… ransom`

const CLEAN_PROMPT =
  "Remove all of the white Korean caption text overlaid on the lower part of this portrait photo. " +
  "Reconstruct the clothing, hands and background underneath naturally, matching the original lighting and texture. " +
  "Keep the person's face, hair, expression, colors and framing exactly the same. " +
  "Do not zoom out, extend the canvas or add new objects: the output must have the same crop and scale as the input. " +
  "The result must contain no text, letters or watermarks anywhere.";

async function fal(model, body) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const json = await res.json();
      const image = json.image ?? json.images?.[0];
      return Buffer.from(await (await fetch(image.url)).arrayBuffer());
    }
    const text = (await res.text()).slice(0, 300);
    if (attempt >= 3 || res.status < 500) throw new Error(`${model} ${res.status} ${text}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

const dataUri = (buf, mime) => `data:${mime};base64,${buf.toString("base64")}`;
const esrgan = (buf, mime, scale, model = "RealESRGAN_x4plus_anime_6B") =>
  fal("fal-ai/esrgan", { image_url: dataUri(buf, mime), scale, model, output_format: "png" });

function keepOriginal(file) {
  const original = join(KEEP, file.replaceAll("/", "__"));
  if (!existsSync(original)) copyFileSync(file, original);
  return original;
}

const jpeg = (img) => img.jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" });
const want = (file) => !only || file.includes(only);

const jobs = [];

/**
 * Generations are cached (.cache/upscale/gen) so re-runs are deterministic. When the
 * model zoomed out despite the prompt, the cached result is re-cropped to the
 * original head-and-shoulders framing and its detail restored with ESRGAN.
 * [left, top, width] as fractions of the generated image.
 */
const REFRAME = {
  harlan: [0.272, 0.014, 0.455],
};
mkdirSync(join(KEEP, "gen"), { recursive: true });

for (const id of IDS) {
  const photo = `src/assets/suspects/photo/${id}.jpg`;
  if (want(photo))
    jobs.push(async () => {
      const original = keepOriginal(photo);
      const cached = join(KEEP, "gen", `${id}.png`);
      if (!existsSync(cached)) {
        const png = await fal("fal-ai/nano-banana/edit", {
          prompt: CLEAN_PROMPT,
          image_urls: [dataUri(readFileSync(original), "image/jpeg")],
          num_images: 1,
          output_format: "png",
        });
        await sharp(png).png().toFile(cached);
      }
      let img = sharp(cached);
      let note = "text removed";
      if (REFRAME[id]) {
        const { width: W, height: H } = await img.metadata();
        const [l, t, w] = REFRAME[id];
        const box = { left: Math.round(l * W), top: Math.round(t * H), width: Math.round(w * W), height: Math.round(w * W * 1.2) };
        box.height = Math.min(box.height, H - box.top);
        const crop = await sharp(cached).extract(box).png().toBuffer();
        img = sharp(await esrgan(crop, "image/png", 4, "RealESRGAN_x4plus"));
        note += ", reframed";
      }
      const info = await jpeg(img.resize({ width: 800, height: 960, fit: "cover", position: "top" })).toFile(photo);
      return `${photo.padEnd(38)} ${note} → ${info.width}×${info.height}`;
    });

  const painted = `src/assets/suspects/painted/${id}.jpg`;
  if (want(painted))
    jobs.push(async () => {
      const original = keepOriginal(painted);
      const png = await esrgan(readFileSync(original), "image/jpeg", 4);
      const info = await jpeg(sharp(png).resize({ width: 640 })).toFile(painted);
      return `${painted.padEnd(38)} ×4 → ${info.width}×${info.height}`;
    });
}

/** Transparent art: premultiplied colour (over black) and the alpha mask, upscaled side by side. */
const RGBA = {
  "src/assets/brand/logo-knives.png": 2, // 941×370 → 1882×740
  "src/assets/brand/logo-out.png": 2, // 492×337 → 984×674
  "src/assets/props/donut.png": 2, // 376×773 → 752×1546
};
for (const [file, scale] of Object.entries(RGBA)) {
  if (!want(file)) continue;
  jobs.push(async () => {
    const original = keepOriginal(file);
    const premul = await sharp(original).flatten({ background: "#000" }).png().toBuffer();
    const mask = await sharp(original).extractChannel(3).png().toBuffer();
    const [colorUp, maskUp] = await Promise.all([esrgan(premul, "image/png", scale), esrgan(mask, "image/png", scale)]);
    const c = await sharp(colorUp).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const a = await sharp(maskUp).resize(c.info.width, c.info.height).extractChannel(0).raw().toBuffer();
    const out = Buffer.alloc(c.info.width * c.info.height * 4);
    for (let i = 0, p = 0; i < a.length; i++, p += 3) {
      const alpha = a[i] < 4 ? 0 : a[i];
      const k = alpha ? 255 / alpha : 0;
      out[i * 4] = Math.min(255, c.data[p] * k);
      out[i * 4 + 1] = Math.min(255, c.data[p + 1] * k);
      out[i * 4 + 2] = Math.min(255, c.data[p + 2] * k);
      out[i * 4 + 3] = alpha;
    }
    const info = await sharp(out, { raw: { width: c.info.width, height: c.info.height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(file);
    return `${file.padEnd(38)} ×${scale} → ${info.width}×${info.height} (rgba)`;
  });
}

// Four at a time keeps fal's queue happy.
const queue = [...jobs];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const job = queue.shift();
      try {
        console.log(`  ✓ ${await job()}`);
      } catch (e) {
        console.error(`  ✗ ${e.message}`);
        process.exitCode = 1;
      }
    }
  }),
);
