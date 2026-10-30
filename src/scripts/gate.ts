import { gsap } from "gsap";
import { reducedMotion } from "./prefs";

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

/**
 * The case file on the desk: "open with sound / silently" is offered at once —
 * it is the gesture that unlocks audio — while the evidence bar fills as the
 * hero arrives behind it. Nobody waits at the door; the bar tops up in 4 s.
 */
export function initGate(onEnter: (withSound: boolean) => Promise<void> | void) {
  const gate = document.querySelector<HTMLElement>("[data-gate]");
  if (!gate) return;
  if (!document.documentElement.classList.contains("is-gated")) {
    // ?enter: straight in, silently (sound still one tap away in the menu). The hero
    // art is on screen at once, so it is fetched now and first.
    document.querySelectorAll<HTMLImageElement>("img[data-warm]").forEach((img) => {
      img.fetchPriority = "high";
      img.loading = "eager";
    });
    gate.remove();
    void onEnter(false);
    return;
  }
  const bar = gate.querySelector<HTMLElement>("[data-gate-bar]");
  const percent = gate.querySelector<HTMLElement>("[data-gate-percent]");
  const status = gate.querySelector<HTMLElement>("[data-gate-status]");
  const cover = gate.querySelector<HTMLElement>("[data-folder-cover]");
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
      const leave = gsap.timeline({
        onComplete: () => {
          gate.remove();
          document.documentElement.classList.remove("is-gated");
        },
      });
      if (reduce) {
        leave.to(gate, { opacity: 0, duration: 0.3 });
      } else {
        // The cover swings open on its spine, then the desk fades into the house.
        leave
          .to(cover, { rotationY: -158, duration: 1.1, ease: "power3.inOut", transformPerspective: 1600 })
          .to(gate.querySelectorAll(".gate__desc, .gate__actions"), { opacity: 0, y: 10, duration: 0.4 }, 0)
          .to(gate.querySelector(".folder"), { scale: 1.14, opacity: 0, duration: 0.8, ease: "power2.in" }, 0.75)
          .to(gate, { opacity: 0, duration: 0.9, ease: "power2.inOut" }, 0.95);
      }
      await onEnter(withSound);
    }),
  );
}
