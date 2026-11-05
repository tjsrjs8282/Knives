import { audio } from "./audio";
import { bindDialog } from "./dialogs";

/** Lazy pictures inside closed dialogs only load when shown; this fetches them ahead. */
const preload = (el: Element | undefined) => el?.querySelectorAll("img").forEach((img) => (img.loading = "eager"));

/**
 * Under the strip: "03 / 10" and a hairline of how much of the file is left. On a
 * desktop the page scroll drives the strip and motion.ts reports the strip's own
 * (scrubbed) progress; everywhere else the strip is swiped natively.
 */
function initMeter() {
  const viewport = document.querySelector<HTMLElement>("[data-evidence-viewport]");
  const index = document.querySelector("[data-evidence-index]");
  const bar = document.querySelector<HTMLElement>("[data-evidence-bar]");
  const count = document.querySelectorAll("[data-exhibit]").length;
  if (!viewport || count < 2) return;
  let shown = 0;
  const native = () => viewport.scrollLeft / Math.max(1, viewport.scrollWidth - viewport.clientWidth);
  const paint = (p: number) => {
    const c = Math.min(1, Math.max(0, p));
    bar?.style.setProperty("--p", c.toFixed(4));
    const i = Math.round(c * (count - 1));
    if (i !== shown && index) {
      shown = i;
      index.textContent = String(i + 1).padStart(2, "0");
    }
  };
  // null: the scroll-driven strip was taken down (motion switched off)
  viewport.addEventListener("exhibit:progress", (e) => paint((e as CustomEvent<number | null>).detail ?? native()));
  viewport.addEventListener("scroll", () => paint(native()), { passive: true });
}

/** Exhibit C lightbox: knife arrows (from 2020), ←/→ keys and swipes. */
export function initEvidence() {
  initMeter();
  const dialog = document.querySelector<HTMLDialogElement>("[data-lightbox]");
  if (!dialog) return;
  const items = [...dialog.querySelectorAll<HTMLElement>("[data-lightbox-item]")];
  const index = dialog.querySelector("[data-lightbox-index]");
  let current = 0;
  const ctl = bindDialog(dialog, { sound: false });

  const show = (i: number) => {
    current = (i + items.length) % items.length;
    items.forEach((el, n) => (el.hidden = n !== current));
    if (index) index.textContent = String(current + 1);
    // the neighbours load while this one is looked at, so a step never lands on a blank
    preload(items[(current + 1) % items.length]);
    preload(items[(current - 1 + items.length) % items.length]);
  };
  const step = (d: number) => {
    audio.play("page");
    show(current + d);
  };

  // A hand on a photo is a good sign it is about to be opened.
  document.addEventListener("pointerover", (e) => {
    const btn = (e.target as Element).closest<HTMLElement>("[data-exhibit]");
    if (btn) preload(items[Number(btn.dataset.exhibit)]);
  });
  document.addEventListener("click", (e) => {
    const btn = (e.target as Element).closest<HTMLElement>("[data-exhibit]");
    if (!btn) return;
    show(Number(btn.dataset.exhibit));
    audio.play("shutter");
    ctl.open(btn);
  });
  dialog.querySelectorAll<HTMLButtonElement>("[data-lightbox-step]").forEach((b) => b.addEventListener("click", () => step(Number(b.dataset.lightboxStep))));
  dialog.querySelector("[data-lightbox-close]")?.addEventListener("click", () => ctl.close());
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  let startX = 0;
  dialog.addEventListener("pointerdown", (e) => (startX = e.clientX), { passive: true });
  dialog.addEventListener(
    "pointerup",
    (e) => {
      const dx = e.clientX - startX;
      if (e.pointerType !== "mouse" && Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    },
    { passive: true },
  );
}
