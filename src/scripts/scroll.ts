import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { reducedMotion } from "./prefs";

export let lenis: Lenis | null = null;
const drive = (time: number) => lenis?.raf(time * 1000);

/** Lenis drives the scroll; GSAP's ticker drives Lenis, so both share one frame. */
export function initSmoothScroll() {
  if (reducedMotion()) return;
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95, autoRaf: false });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(drive);
  gsap.ticker.lagSmoothing(0);
  if (document.documentElement.classList.contains("is-gated")) lenis.stop();
}

export function destroySmoothScroll() {
  gsap.ticker.remove(drive);
  lenis?.destroy();
  lenis = null;
}

/** Dialogs and the gate freeze the page behind them. */
export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.classList.toggle("is-locked", locked);
}

export function scrollToTarget(target: string | HTMLElement, immediate = false) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, {
      duration: immediate ? 0 : 1.6,
      immediate,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      // sections rendered on the way (content-visibility) can move the target: land exactly
      onComplete: () => {
        const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        if (Math.abs(el.getBoundingClientRect().top - pad) > 4) lenis?.scrollTo(el, { immediate: true, force: true });
      },
    });
  } else {
    el.scrollIntoView({ behavior: immediate || reducedMotion() ? "auto" : "smooth" });
  }
}

/** In-page anchors glide instead of jumping, and move focus for keyboard users. */
export function initAnchors(beforeJump?: () => void) {
  document.addEventListener("click", (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = a.getAttribute("href")!.slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    e.preventDefault();
    beforeJump?.();
    scrollToTarget(el);
    history.replaceState(null, "", id === "top" ? location.pathname : `#${id}`);
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  });
}
