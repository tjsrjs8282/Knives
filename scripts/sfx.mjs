// Original sound design for the page, generated with ElevenLabs and mastered
// with ffmpeg. The 2020 site looped an MP3 labelled "OST" that was actually
// Radiohead's "Knives Out" (the song the film is named after) — not the score,
// and not ours to ship. Everything here is generated for this project:
//   • UI effects + a mansion ambience bed (sound-generation, eleven_text_to_sound_v2)
//   • a whodunnit chamber theme for the BGM button (music, music_v1)
// Run: `npm run assets:sfx` (needs ELEVENLABS_API_KEY; `--review` asks Gemini to
// listen to the theme and report). Raw takes in .cache/sfx are reused.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

process.loadEnvFile(".env.local");
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY missing in .env.local");

const RAW = ".cache/sfx";
const OUT = "public/audio";
mkdirSync(RAW, { recursive: true });
mkdirSync(join(OUT, "sfx"), { recursive: true });

/** name → prompt, seconds, prompt influence, mastering target (LUFS), channels */
const SOUNDS = {
  hover: {
    text: "A single tiny soft tick of an antique brass pocket watch, very short and quiet, subtle UI hover click, close and dry",
    sec: 0.5, pi: 0.65, lufs: -27, ch: 1,
  },
  select: {
    text: "One crisp vintage typewriter key strike, close microphone, mechanical and satisfying, very short",
    sec: 0.5, pi: 0.65, lufs: -21, ch: 1,
  },
  open: {
    text: "A manila case file folder being flipped open on a wooden desk, paper sliding and a soft cardboard flap, close and short",
    sec: 1.0, pi: 0.55, lufs: -22, ch: 1,
  },
  close: {
    text: "A paper case folder closed with a soft cardboard thud on a desk, short",
    sec: 0.7, pi: 0.55, lufs: -23, ch: 1,
  },
  page: {
    text: "A single page of an old hardback mystery novel being turned, quiet paper rustle, close",
    sec: 0.7, pi: 0.6, lufs: -24, ch: 1,
  },
  thunk: {
    text: "A heavy knife thrown hard and thudding deep into a thick wooden panel, with a short metallic vibrating twang, cinematic, close",
    sec: 1.2, pi: 0.6, lufs: -18, ch: 1,
  },
  shing: {
    text: "A steel knife blade drawn quickly from a leather sheath, bright metallic shing with a short shimmer tail",
    sec: 1.0, pi: 0.6, lufs: -21, ch: 1,
  },
  lens: {
    text: "A soft airy whoosh with a faint crystal glass shimmer, like sweeping a magnifying glass across a page, subtle and short",
    sec: 0.8, pi: 0.5, lufs: -25, ch: 1,
  },
  shutter: {
    text: "A vintage film camera shutter click followed by a soft flashbulb pop, crime scene photograph, short",
    sec: 0.8, pi: 0.6, lufs: -22, ch: 1,
  },
  stamp: {
    text: "A heavy rubber stamp slammed once onto a paper document on a wooden desk, single solid thump",
    sec: 0.7, pi: 0.65, lufs: -19, ch: 1,
  },
  typing: {
    text: "Fast vintage manual typewriter typing a sentence, many quick key strikes, then a carriage return bell ding",
    sec: 2.6, pi: 0.55, lufs: -24, ch: 1,
  },
  enter: {
    text: "A grandfather clock striking a single deep resonant chime in a large wood-panelled hall, long warm reverb tail",
    sec: 4.0, pi: 0.55, lufs: -19, ch: 2,
  },
  ambience: {
    text: "Inside an old New England mansion study at night: a softly crackling fireplace, a slow ticking grandfather clock, gentle rain against tall windows, quiet room tone, calm, no music, no voices",
    sec: 22, pi: 0.4, lufs: -28, ch: 2, loop: true,
  },
};

const THEME = {
  prompt:
    "A playful, sly whodunnit theme for a classic country-house murder mystery: a chamber string ensemble with pizzicato cello and violas, " +
    "staccato violins, a harpsichord counter-melody and a soft clarinet, elegant and mischievous, warm and witty, medium tempo around 100 BPM, " +
    "builds gently then settles back, instrumental only, no vocals",
  ms: 120_000,
  lufs: -20,
};

async function generate(name, s) {
  const raw = join(RAW, `${name}.mp3`);
  if (existsSync(raw)) return raw;
  const body = { text: s.text, duration_seconds: s.sec, prompt_influence: s.pi, model_id: "eleven_text_to_sound_v2" };
  if (s.loop) body.loop = true;
  const url = "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128";
  let res = await fetch(url, { method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok && (res.status === 400 || res.status === 422)) {
    // Older accounts/models reject `loop` or `model_id` — retry with the plain request.
    const { loop, model_id, ...plain } = body;
    res = await fetch(url, { method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" }, body: JSON.stringify(plain) });
  }
  if (!res.ok) throw new Error(`${name}: ElevenLabs ${res.status} ${(await res.text()).slice(0, 200)}`);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  return raw;
}

async function compose() {
  const raw = join(RAW, "theme.mp3");
  if (existsSync(raw)) return raw;
  const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192", {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: THEME.prompt, music_length_ms: THEME.ms, model_id: "music_v1", force_instrumental: true }),
  });
  if (!res.ok) throw new Error(`theme: ElevenLabs ${res.status} ${(await res.text()).slice(0, 200)}`);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  return raw;
}

function ffmpeg(args, label) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${label}`);
}

/** Seamless bed: the last `c` seconds crossfade back into the first `c`. */
const loopFilter = (norm, c) =>
  `[0:a]${norm},asplit[a][b];[a]atrim=${c},asetpts=PTS-STARTPTS[main];[b]atrim=0:${c},asetpts=PTS-STARTPTS[head];[main][head]acrossfade=d=${c}:c1=tri:c2=tri[o]`;

function master(name, s, raw) {
  const out = join(OUT, "sfx", `${name}.mp3`);
  const norm = `loudnorm=I=${s.lufs}:TP=-1.5:LRA=11`;
  if (s.loop) {
    ffmpeg(["-i", raw, "-filter_complex", loopFilter(norm, 2), "-map", "[o]", "-ac", String(s.ch), "-c:a", "libmp3lame", "-b:a", "112k", out], name);
  } else {
    const lead = "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.01";
    ffmpeg(["-i", raw, "-af", `${lead},${norm},afade=t=out:st=${Math.max(0, s.sec - 0.06)}:d=0.06`, "-ac", String(s.ch), "-ar", "44100", "-c:a", "libmp3lame", "-b:a", s.ch === 1 ? "96k" : "128k", out], name);
  }
  return out;
}

const size = (f) => `${(statSync(f).size / 1024).toFixed(0).padStart(5)} KB`;

for (const [name, s] of Object.entries(SOUNDS)) {
  const out = master(name, s, await generate(name, s));
  console.log(`  ✓ ${name.padEnd(9)} ${String(s.sec + "s").padEnd(5)} ${size(out)}  → ${out}`);
}

const themeRaw = await compose();
const theme = join(OUT, "theme.mp3");
ffmpeg(["-i", themeRaw, "-filter_complex", loopFilter(`loudnorm=I=${THEME.lufs}:TP=-1.5:LRA=11`, 3), "-map", "[o]", "-ac", "2", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", theme], "theme");
console.log(`  ✓ theme     ${THEME.ms / 1000}s  ${size(theme)}  → ${theme}`);

if (process.argv.includes("--review")) {
  // A second pair of ears: Gemini listens to the mastered theme and reports.
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [
        { inline_data: { mime_type: "audio/mp3", data: readFileSync(theme).toString("base64") } },
        { text: "You are a music supervisor. In 5 short bullets: instrumentation, mood, tempo/feel, any vocals or artifacts (clicks, abrupt cuts, a jump where the loop restarts), and a 1–10 fit score for a playful, sly whodunnit theme on a mystery-film fan site." },
      ] }],
    }),
  });
  const json = await res.json();
  console.log("\n  Gemini review:\n" + (json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? JSON.stringify(json).slice(0, 300)));
}
