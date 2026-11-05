import { gsap } from "gsap";
import { reducedMotion } from "./prefs";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Resolve when an image (by URL or element) has loaded or failed — loading must never stall the gate. */
function imageReady(src: string | HTMLImageElement | null): Promise<void> {
  return new Promise((resolve) => {
    if (!src) return resolve();
    const img = typeof src === "string" ? Object.assign(new Image(), { src }) : src;
    if (img.complete && img.naturalWidth) return resolve();
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
}

/**
 * The hero is not rendered behind the folder, so its fonts are fetched here —
 * after the page has loaded, never ahead of what is actually on screen.
 */
function warmHeroFonts(): Promise<unknown> {
  return new Promise((resolve) => {
    const run = () => {
      // the logo and the knife wheel are lazy (and unrendered) until now
      document.querySelectorAll<HTMLImageElement>("img[data-warm]").forEach((img) => (img.loading = "eager"));
      const css = getComputedStyle(document.documentElement);
      const display = css.getPropertyValue("--font-display").trim();
      const serif = css.getPropertyValue("--font-kr").trim();
      const text = document.querySelector(".hero__content")?.textContent ?? "";
      if (!display || !serif || !document.fonts?.load) return resolve(null);
      Promise.allSettled([
        document.fonts.load(`600 16px ${display}`, "A Rian Johnson Whodunnit"),
        document.fonts.load(`italic 400 16px ${display}`, "Hell, any of them could have done it."),
        document.fonts.load(`400 16px ${serif}`, text),
      ]).then(resolve);
    };
    // A beat after load (well clear of first paint), or as soon as a hand reaches for the folder.
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      run();
    };
    const later = () => setTimeout(start, 1500);
    if (document.readyState === "complete") later();
    else addEventListener("load", later, { once: true });
    document.querySelector("[data-gate]")?.addEventListener("pointerover", start, { once: true });
    // (keydown, not focusin: the gate focuses its own button on load)
    document.querySelector("[data-gate]")?.addEventListener("keydown", start, { once: true });
  });
}

/** What the page does once the visitor chooses: prepare everything, then hand back the reveal. */
export type GateEnter = (withSound: boolean) => Promise<(() => void) | void> | (() => void) | void;

/**
 * The cover swings open on its spine (front, then the inside of the cover with the
 * exhibit index), the open spread slides to the middle of the screen, and the eye
 * dives into the first page as the house fades in behind it.
 */
function openFolder(gate: HTMLElement, reveal: () => void, done: () => void) {
  const folder = gate.querySelector<HTMLElement>("[data-folder]")!;
  const book = gate.querySelector<HTMLElement>("[data-folder-book]")!;
  const cover = gate.querySelector<HTMLElement>("[data-folder-cover]")!;
  const w = folder.offsetWidth;
  // The open spread is two folders wide: centre it where it fits. On a phone the
  // page stays on screen and the cover swings out past the edge instead.
  const shift = Math.max(0, Math.min(w / 2, (innerWidth - w) / 2 - 12));
  // One perspective, scaled to the folder, with its vanishing point held mid-screen
  // while the book slides (perspective-origin travels with the element).
  const origin = (x: number) => `${50 - (x / w) * 100}% 38%`;
  book.style.perspective = `${Math.round(w * 4.5)}px`;
  book.style.perspectiveOrigin = origin(0);

  // Light from the reader's lamp: a face darkens as it turns edge-on.
  const light = () => {
    const c = Math.cos(((gsap.getProperty(cover, "rotationY") as number) * Math.PI) / 180);
    book.style.setProperty("--front-shade", (0.5 * (1 - c)).toFixed(3));
    book.style.setProperty("--inside-shade", (0.5 * (1 + c)).toFixed(3));
    book.style.setProperty("--cast", ((1 + c) / 2).toFixed(3));
  };

  gsap
    .timeline({ onComplete: done })
    .to(cover, { rotationY: -180, duration: 1.3, ease: "power2.inOut", onUpdate: light }, 0)
    .to(book, { x: shift, perspectiveOrigin: origin(shift), duration: 1.3, ease: "power2.inOut" }, 0)
    // a beat on the open spread, then the eye dives into the first page
    .call(reveal, undefined, 1.2)
    .to(book, { x: 0, scale: 1.45, perspectiveOrigin: origin(0), duration: 0.95, ease: "power2.in" }, 1.2)
    .to(folder, { opacity: 0, duration: 0.6, ease: "power1.in" }, 1.55)
    .to(gate, { opacity: 0, duration: 0.75, ease: "power1.inOut" }, 1.4);
}

/**
 * The case file on the desk: "open with sound / silently" is offered at once —
 * it is the gesture that unlocks audio — while the evidence bar fills as the
 * hero arrives behind it. Nobody waits at the door; the bar tops up in 4 s.
 */
export function initGate(onEnter: GateEnter) {
  const gate = document.querySelector<HTMLElement>("[data-gate]");
  if (!gate) return;
  const root = document.documentElement;
  if (!root.classList.contains("is-gated")) {
    // ?enter: straight in, silently (sound still one tap away in the menu). The hero
    // art is on screen at once, so it is fetched now and first.
    document.querySelectorAll<HTMLImageElement>("img[data-warm]").forEach((img) => {
      img.fetchPriority = "high";
      img.loading = "eager";
    });
    gate.remove();
    void Promise.resolve(onEnter(false)).then((reveal) => reveal?.());
    return;
  }
  const bar = gate.querySelector<HTMLElement>("[data-gate-bar]");
  const percent = gate.querySelector<HTMLElement>("[data-gate-percent]");
  const status = gate.querySelector<HTMLElement>("[data-gate-status]");
  const reduce = reducedMotion();

  // Everything behind the folder is out of reach until it opens.
  const behind = [document.querySelector("main"), document.querySelector("[data-hud]"), document.querySelector(".footer")];
  behind.forEach((el) => el?.setAttribute("inert", ""));

  const heroImgs = [...document.querySelectorAll<HTMLImageElement>("[data-hero-logo] img, [data-wheel] img")];
  const tasks: Promise<unknown>[] = [
    warmHeroFonts(),
    ...heroImgs.map((img) => imageReady(img)),
    new Promise((r) => setTimeout(r, reduce ? 0 : 900)),
  ];
  const progress = { value: 0 };
  let done = 0;
  const render = () => {
    if (percent) percent.textContent = String(Math.round(progress.value));
    bar?.style.setProperty("--p", String(progress.value / 100));
  };
  tasks.forEach((t) =>
    t.finally(() => {
      done++;
      gsap.to(progress, { value: (done / tasks.length) * 100, duration: reduce ? 0 : 0.6, ease: "power2.out", onUpdate: render });
    }),
  );
  Promise.race([Promise.allSettled(tasks), new Promise((r) => setTimeout(r, 4000))]).then(() => {
    gsap.to(progress, { value: 100, duration: reduce ? 0 : 0.5, onUpdate: render });
    if (status) status.textContent = "증거 수집 완료";
  });

  gate.querySelector<HTMLButtonElement>("[data-gate-enter]")?.focus({ preventScroll: true });

  let entered = false;
  gate.querySelectorAll<HTMLButtonElement>("[data-gate-enter]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (entered) return;
      entered = true;
      const withSound = btn.dataset.gateEnter === "sound";
      behind.forEach((el) => el?.removeAttribute("inert"));
      gate.classList.add("is-leaving");

      // The house renders and its scroll scenes are built *before* the cover moves,
      // so the swing runs on a free main thread instead of stuttering through that work.
      const ready = Promise.resolve(onEnter(withSound));
      await Promise.race([ready, wait(1500)]);
      await frame();
      await frame();

      const reveal = () => void ready.then((fn) => fn?.());
      const finish = () => {
        gate.remove();
        root.classList.remove("is-gated");
        // focus lands on the page the visitor has just opened, not on <body>
        const title = document.getElementById("hero-title");
        title?.setAttribute("tabindex", "-1");
        title?.focus({ preventScroll: true });
      };
      if (reduce) {
        reveal();
        gsap.to(gate, { opacity: 0, duration: 0.3, onComplete: finish });
      } else openFolder(gate, reveal, finish);
    }),
  );
}
