import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { audio } from "./audio";
import { prefs, reducedMotion } from "./prefs";
import { destroySmoothScroll, initAnchors, initSmoothScroll, lenis, scrollToTarget } from "./scroll";
import { initGate } from "./gate";
import { initBgm, initHud, initMenu } from "./hud";
import { initVideoDialog } from "./dialogs";
import { initHeroVideo, initPreviews } from "./media";

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
root.classList.add("app-ready");
let reduce = reducedMotion();

/** Run when the main thread is free — the gate must stay responsive on slow phones. */
const idle = (fn: () => void) => {
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(fn, { timeout: 1200 });
  else setTimeout(fn, 200);
};

// The choreography is split out and fetched after first paint.
const loadMotion = () => import("./motion");
let motionModule = reduce ? null : loadMotion();

// ── switches ──
const bgm = initBgm();
const applySound = (on: boolean) => {
  void audio.setEnabled(on);
  if (on) audio.play("select");
};
const applyMotion = async (on: boolean) => {
  reduce = !on;
  root.classList.toggle("reduce-motion", !on);
  root.classList.toggle("js-motion", on);
  if (on) {
    motionModule ??= loadMotion();
    if (!lenis) initSmoothScroll();
    lenis?.start();
    (await motionModule).initMotion();
  } else {
    (await motionModule)?.revertMotion();
    destroySmoothScroll();
  }
};

// ── feedback sounds for anything interactive ──
const OWN_SOUND = "[data-gate-enter], [data-video-open], [data-suspect], [data-exhibit], [data-bgm], [data-menu-open], [data-pref], [data-dossier-step], [data-lightbox-step], [data-office-submit], .dialog-close";
document.addEventListener("pointerover", (e) => {
  if (e.pointerType !== "mouse") return;
  const target = (e.target as Element).closest("a, button, summary");
  const from = e.relatedTarget as Element | null;
  if (target && !target.contains(from) && !target.closest(".window")) audio.play("hover");
});
document.addEventListener("click", (e) => {
  const target = (e.target as Element).closest("a, button, summary");
  if (!target || target.closest(OWN_SOUND)) return;
  audio.play("select");
});

initSmoothScroll();
initAnchors();
initVideoDialog();
initMenu({ sound: applySound, music: (on) => void bgm.set(on), motion: (on) => void applyMotion(on) });
const heroVideo = initHeroVideo();

// Everything below the hero wakes up once fonts have settled the layout.
let entered: () => void;
const enteredOnce = new Promise<void>((r) => (entered = r));
document.fonts.ready.then(() =>
  idle(async () => {
    const [{ initSuspects }, { initEvidence }, { initOffice }] = await Promise.all([import("./suspects"), import("./evidence"), import("./office")]);
    initSuspects();
    initEvidence();
    initOffice();
    initPreviews();
    initHud();
  }),
);

// The scroll scenes are built the frame the folder opens (until then nothing below
// the hero is rendered), not after every font has arrived: pins that appear seconds
// later would yank a reader who is already scrolling. Late fonts only re-measure.
const deepLink = () => (location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null);
let readerMoved = false;
for (const type of ["wheel", "touchmove", "keydown"]) addEventListener(type, () => (readerMoved = true), { once: true, passive: true });
enteredOnce.then(() =>
  requestAnimationFrame(async () => {
    (await motionModule)?.initMotion();
    // A shared #anchor link keeps its place while pins, images and type settle — every
    // change in the page's height re-aims it — until the reader takes over.
    const target = deepLink();
    if (target) {
      const follow = new ResizeObserver(() => {
        if (readerMoved) follow.disconnect();
        else scrollToTarget(target, true);
      });
      follow.observe(document.body);
    }
    let timer = 0;
    document.fonts.addEventListener("loadingdone", () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    });
  }),
);

initGate(async (withSound) => {
  const motion = await motionModule;
  const playIntro = motion?.prepareHeroIntro() ?? (() => {});
  root.classList.add("is-entered");
  entered();
  prefs.set("sound", withSound);
  heroVideo.start();
  lenis?.start();
  if (withSound) {
    // Give the buffers a moment so the chime and the blade actually land.
    await Promise.race([audio.setEnabled(true), new Promise((r) => setTimeout(r, 900))]);
    audio.play("enter");
    if (prefs.get("music")) void bgm.set(true);
  }
  window.setTimeout(playIntro, reduce ? 0 : 250);
});
