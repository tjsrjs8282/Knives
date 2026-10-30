// Video pipeline (ffmpeg). Run once: `npm run assets`.
// The 2020 site committed four trailers (82 MB) and streamed one straight into a
// <video> tag. Here the official trailers are YouTube embeds that only load on
// click; the local copies are cut into short, silent, scope-ratio loops — the
// burned-in Korean subtitles fall outside the 2.39:1 crop.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = "legacy/images";
const OUT = "public/media";
mkdirSync(OUT, { recursive: true });
mkdirSync(".cache", { recursive: true });

function ff(args, label) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${label}`);
  const file = args.at(-1);
  console.log(`  ✓ ${label.padEnd(30)} ${(statSync(file).size / 1024).toFixed(0).padStart(6)} KB  ${file}`);
}

// Constant-rate, all-keyframe-ish intermediates so every cut below is frame-accurate.
const T1 = ".cache/trailer1_cfr.mp4"; // 1차 예고편 (WWKsAqGvWCk)
const T2 = ".cache/trailer2_cfr.mp4"; // 메인 예고편 (gBiE4_kFNuw)
for (const [src, dst] of [[`${SRC}/knivesOut_trailer1.mp4`, T1], [`${SRC}/knivesOut_trailer2.mp4`, T2]]) {
  if (!existsSync(dst))
    ff(["-i", src, "-map", "0:v:0", "-vf", "fps=24000/1001", "-c:v", "libx264", "-preset", "veryfast", "-crf", "12", "-g", "12", "-an", dst], `${src.split("/").pop()} → CFR`);
}

/** 2.39:1 band ending at y=556 of the 1280×720 frame — two-line subtitles start at y≈572. */
const SCOPE = "crop=1248:522:16:34";
const GRADE = "eq=saturation=0.86:contrast=1.06:brightness=-0.02";

/**
 * Montage of [input, start, end] segments joined with crossfades, faded in and out
 * of black so the loop point is a breath rather than a jump cut.
 */
function montageGraph(segments, { w, h, xf = 0.6, grade = GRADE }) {
  const parts = [];
  segments.forEach(([input, s, e], i) => {
    parts.push(`[${input}:v]trim=${s}:${e},setpts=PTS-STARTPTS,fps=24000/1001,${SCOPE},scale=${w}:${h}:flags=lanczos,setsar=1,${grade}[s${i}]`);
  });
  let acc = "s0";
  let len = segments[0][2] - segments[0][1];
  for (let i = 1; i < segments.length; i++) {
    const out = i === segments.length - 1 ? "mx" : `x${i}`;
    parts.push(`[${acc}][s${i}]xfade=transition=fade:duration=${xf}:offset=${(len - xf).toFixed(3)}[${out}]`);
    len += segments[i][2] - segments[i][1] - xf;
    acc = out;
  }
  if (segments.length === 1) parts.push(`[s0]null[mx]`);
  parts.push(`[mx]fade=t=in:st=0:d=0.5,fade=t=out:st=${(len - 0.5).toFixed(3)}:d=0.5,format=yuv420p[v]`);
  return { graph: parts.join(";"), duration: len };
}

function encode(name, segments, { w, h, crf = 27, vp9crf = 40, xf } = {}) {
  const { graph, duration } = montageGraph(segments, { w, h, xf });
  console.log(`\n▸ ${name} (${duration.toFixed(1)}s, ${w}×${h})`);
  const common = ["-i", T1, "-i", T2, "-filter_complex", graph, "-map", "[v]", "-an"];
  ff([...common, "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-profile:v", "high", "-tune", "film",
    "-movflags", "+faststart", join(OUT, `${name}.mp4`)], `${name}.mp4 (H.264)`);
  ff([...common, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(vp9crf), "-row-mt", "1", "-deadline", "good",
    "-cpu-used", "2", join(OUT, `${name}.webm`)], `${name}.webm (VP9)`);
  return duration;
}

function poster(name, at) {
  ff(["-ss", String(at), "-i", join(OUT, `${name}.mp4`), "-frames:v", "1", "-c:v", "libwebp", "-quality", "78", join(OUT, `${name}.webp`)], `${name}.webp (poster)`);
}

// ── 1. Hero: the house, the dark halls and the detective — no title cards, no faces in
//       close-up until the end, so the gold logo has the frame to itself.
const HERO = [
  [1, 1.0, 3.0], //   the Thrombey house at dusk (after the MRC card)
  [0, 11.05, 12.25], // a figure crossing the dark foyer
  [1, 3.3, 4.7], //   Harlan in a doorway
  [0, 93.3, 95.5], // Blanc by the fireplace
  [1, 20.8, 22.7], // Blanc, feet up
  [0, 115.1, 118.6], // the family meets the police in the hall
  [1, 99.05, 100.2], // the house through bare trees
  [1, 139.55, 141.95], // Blanc in shadow
];
encode("hero", HERO, { w: 1280, h: 536, crf: 27, vp9crf: 40 });
encode("hero-sm", HERO, { w: 854, h: 358, crf: 29, vp9crf: 42 });
poster("hero", 1.4);

// ── 2. Trailer cards: a few silent seconds of each trailer as a hover preview.
const PREVIEWS = {
  "preview-teaser": [[0, 42.0, 44.25], [0, 26.75, 28.0]], // 1차 예고편
  "preview-main": [[1, 97.0, 98.75], [1, 57.25, 58.75]], // 메인 예고편
  "preview-blanc": [[0, 56.5, 57.75], [1, 37.0, 38.25]], // 브누아 블랑 특별 예고편
  "preview-lionsgate": [[0, 110.75, 114.75]], // Lionsgate official trailer
};
for (const [name, segs] of Object.entries(PREVIEWS)) {
  encode(name, segs, { w: 640, h: 268, crf: 28, vp9crf: 40, xf: 0.4 });
  poster(name, 0.9);
}
console.log("\nDone.");
