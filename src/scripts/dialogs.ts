import { audio } from "./audio";
import { lockScroll } from "./scroll";

/**
 * Native <dialog> with the house rules: scroll lock, a sound, focus back to the
 * opener, click-outside to close. Returns open/close for the caller.
 */
export function bindDialog(dialog: HTMLDialogElement, opts: { onClose?: () => void; sound?: boolean } = {}) {
  let opener: HTMLElement | null = null;
  const sound = opts.sound ?? true;

  dialog.addEventListener("close", () => {
    lockScroll(false);
    if (sound) audio.play("close");
    opts.onClose?.();
    opener?.focus({ preventScroll: true });
  });
  // A click on the backdrop lands on the <dialog> itself.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  return {
    open(from?: HTMLElement | null) {
      opener = from ?? (document.activeElement as HTMLElement | null);
      if (!dialog.open) {
        dialog.showModal();
        lockScroll(true);
        if (sound) audio.play("open");
      }
    },
    close() {
      if (dialog.open) dialog.close();
    },
  };
}

/** One trailer player; the YouTube iframe exists only while the dialog is open. */
export function initVideoDialog() {
  const dialog = document.querySelector<HTMLDialogElement>("[data-video-dialog]");
  if (!dialog) return;
  const frame = dialog.querySelector<HTMLElement>("[data-video-frame]")!;
  const title = dialog.querySelector<HTMLElement>("[data-video-dialog-title]")!;
  const ctl = bindDialog(dialog, {
    onClose: () => {
      frame.replaceChildren();
      audio.duck(false);
    },
  });
  dialog.querySelector("[data-video-close]")?.addEventListener("click", () => ctl.close());

  document.addEventListener("click", (e) => {
    const btn = (e.target as Element).closest<HTMLElement>("[data-video-open]");
    if (!btn) return;
    const id = btn.dataset.videoOpen!;
    const name = btn.dataset.videoTitle ?? "예고편";
    title.textContent = name;
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`;
    iframe.title = name;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    frame.replaceChildren(iframe);
    audio.duck(true);
    ctl.open(btn);
  });
}
