import { audio } from "./audio";
import { bindDialog } from "./dialogs";

/** Exhibit C lightbox: knife arrows (from 2020), ←/→ keys and swipes. */
export function initEvidence() {
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
  };
  const step = (d: number) => {
    audio.play("page");
    show(current + d);
  };

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
