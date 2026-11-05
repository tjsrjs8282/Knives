import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { audio } from "./audio";
import { coarsePointer } from "./prefs";

gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

/**
 * Stage the hero in the same frame the folder starts to open (nothing paints
 * behind the gate), and hand back the intro. 2020's opening was a knife wheel
 * scaled 6× collapsing into the logo; this is that, choreographed.
 */
export function prepareHeroIntro() {
  const wheel = $("[data-wheel]");
  const knives = $("[data-hero-logo] .logo-knives img");
  const out = $("[data-hero-logo] .logo-out img");
  const kicker = $("[data-hero-kicker]");
  const lines = $$("[data-hero-line]");
  const cue = $("[data-hero-cue]");
  const video = $("[data-hero-video]");

  gsap.set(wheel, { scale: 2.8, rotation: -110, opacity: 0 });
  gsap.set(knives, { xPercent: -14, opacity: 0, filter: "blur(10px)" });
  gsap.set(out, { yPercent: -70, rotation: -24, opacity: 0 });
  gsap.set(kicker, { opacity: 0, letterSpacing: "0.9em" });
  gsap.set(lines, { opacity: 0, y: 18 });
  gsap.set([cue, video], { opacity: 0 });

  return () => {
    audio.play("shing");
    gsap
      .timeline({ defaults: { ease: "expo.out" } })
      .to(video, { opacity: 0.9, duration: 2.4, ease: "power2.out" }, 0)
      .to(wheel, { scale: 1, rotation: 0, opacity: 0.38, duration: 2.4 }, 0)
      .to(knives, { xPercent: 0, opacity: 1, filter: "blur(0px)", duration: 1.3 }, 0.45)
      .to(out, { yPercent: 0, rotation: 0, opacity: 1, duration: 1.1, ease: "back.out(2.2)" }, 0.85)
      .to(kicker, { opacity: 1, letterSpacing: "0.42em", duration: 1.6 }, 0.7)
      .to(lines, { opacity: 1, y: 0, duration: 1.1, stagger: 0.12 }, 1.2)
      .to(cue, { opacity: 1, duration: 1 }, 2)
      .add(() => gsap.set([knives, out], { clearProps: "filter" }));
  };
}

let ctx: gsap.Context | null = null;

/** Everything scroll-driven lives in one context, so the motion switch can undo it all. */
export function initMotion() {
  ctx?.revert();
  ctx = gsap.context(() => {
    heroScroll();
    const unCase = caseFile();
    evidenceTrack();
    return () => unCase?.();
  });
  reveals();
  ScrollTrigger.refresh();
}

export function revertMotion() {
  ctx?.revert();
  ctx = null;
  document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in"));
}

/** The wheel keeps turning; scrolling turns it further and lets the title drift away. */
function heroScroll() {
  const hero = $("#top");
  const wheel = $("[data-wheel]");
  const wheelImg = $("[data-wheel] img");
  if (!hero || !wheel) return;
  gsap.to(wheelImg, { rotation: 360, duration: 140, ease: "none", repeat: -1 });
  gsap
    .timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 } })
    .to(wheel, { rotation: 100, scale: 1.25, ease: "none" }, 0)
    .to(".hero__content", { y: -90, opacity: 0, ease: "power1.in" }, 0)
    .to("[data-hero-video]", { scale: 1.08, ease: "none" }, 0);
}

/**
 * Synopsis, 2020: a knife slid across the poster and blood faded in. Now the knife
 * slashes the poster, the two halves part along the tear, and the report behind
 * it reads itself out word by word.
 */
function caseFile() {
  const stage = $("[data-case-stage]");
  const slash = $("[data-slash]");
  const text = $("[data-case-text]");
  if (!stage || !slash || !text) return;
  const top = $(".case__poster--top", stage);
  const bottom = $(".case__poster--bottom", stage);

  // Keep the clip line on the tear in the art: y = 60.4 + 0.0981·x (px of the 1920×239 slash).
  const layout = () => {
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const slashH = (W * 1.12 * 239) / 1920;
    const t = H * 0.5 - slashH * 0.62;
    stage.style.setProperty("--slash-top", `${t}px`);
    stage.style.setProperty("--y0", `${((t + slashH * 0.295) / H) * 100}%`);
    stage.style.setProperty("--y1", `${((t + slashH) / H) * 100}%`);
  };
  layout();
  ScrollTrigger.addEventListener("refreshInit", layout);
  const off = () => ScrollTrigger.removeEventListener("refreshInit", layout);

  const split = SplitText.create(text, { type: "words", wordsClass: "word", aria: "hidden" });
  gsap.set(split.words, { opacity: 0.14 });

  let last = 0;
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: stage,
      start: "top top",
      end: "+=240%",
      pin: true,
      scrub: 0.6,
      onUpdate: (self) => {
        // the knife lands: once per pass, going down
        if (last < 0.3 && self.progress >= 0.3 && self.direction === 1) audio.play("thunk");
        last = self.progress;
      },
    },
  });
  tl.to(".case__hint", { opacity: 0, duration: 0.04 }, 0)
    .fromTo(slash, { xPercent: -104 }, { xPercent: 0, duration: 0.28, ease: "power2.in" }, 0.02)
    .to(slash, { opacity: 0, duration: 0.08 }, 0.4)
    .to(top, { yPercent: -62, rotation: -3, transformOrigin: "0% 100%", duration: 0.32, ease: "power2.inOut" }, 0.36)
    .to(bottom, { yPercent: 64, rotation: 2.5, transformOrigin: "100% 0%", duration: 0.32, ease: "power2.inOut" }, 0.36)
    .from(".case__report .heading", { opacity: 0, y: 30, duration: 0.16 }, 0.46)
    .to(split.words, { opacity: 1, stagger: { amount: 0.3 }, duration: 0.05 }, 0.54)
    .from(".case__blood", { opacity: 0, scale: 0.7, duration: 0.12, ease: "back.out(2)" }, 0.62)
    .to({}, { duration: 0.14 }); // hold the finished report before the pin lets go
  return off;
}

/**
 * The strip travels this many times faster than the page scrolls: one wheel notch
 * moves it about a third of a photo, and the whole file passes in ~2.5 screens
 * instead of the ten it took when the pin was as long as the strip.
 */
const EVIDENCE_SPEED = 1.8;

/** Desktop: the page scroll pans the evidence strip. Touch keeps native swiping. */
function evidenceTrack() {
  const pin = $("[data-evidence-pin]");
  const viewport = $("[data-evidence-viewport]");
  const track = $("[data-evidence-track]");
  if (!pin || !viewport || !track || coarsePointer()) return;
  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", () => {
    viewport.classList.add("is-driven");
    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
    // the counter under the strip follows the strip itself (scrub included), not the scrollbar
    const report = function (this: gsap.core.Tween) {
      viewport.dispatchEvent(new CustomEvent("exhibit:progress", { detail: this.progress() }));
    };
    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      onUpdate: report,
      scrollTrigger: {
        trigger: pin,
        start: "top top",
        end: () => `+=${Math.round(distance() / EVIDENCE_SPEED)}`,
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
    return () => {
      viewport.classList.remove("is-driven");
      viewport.dispatchEvent(new CustomEvent("exhibit:progress", { detail: null }));
    };
  });
}

/** Section headings and cards rise in once, as they come on screen. */
function reveals() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  $$("[data-reveal]").forEach((el) => io.observe(el));
}
