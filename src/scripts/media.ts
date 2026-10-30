import { coarsePointer, reducedMotion } from "./prefs";

type NetInfo = { saveData?: boolean; effectiveType?: string };
export const lowData = () => {
  const c = (navigator as Navigator & { connection?: NetInfo }).connection;
  return Boolean(c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? ""));
};

function addSources(video: HTMLVideoElement, list: string) {
  if (video.dataset.attached) return;
  video.dataset.attached = "1";
  for (const src of list.split("|")) {
    const s = document.createElement("source");
    s.src = src;
    s.type = src.endsWith(".webm") ? 'video/webm; codecs="vp9"' : "video/mp4";
    video.append(s);
  }
  video.load();
}

/** Background loops only play while on screen. */
function playWhileVisible(video: HTMLVideoElement) {
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) void video.play().catch(() => {});
    else video.pause();
  }).observe(video);
}

/**
 * The hero loop starts downloading once the page has loaded (or the folder
 * opens, if sooner) so it never competes with fonts and the logo.
 */
export function initHeroVideo() {
  const video = document.querySelector<HTMLVideoElement>("[data-hero-video]");
  if (!video) return { start() {} };
  // The poster is set from script so it never competes with the gate for bandwidth.
  const poster = () => {
    if (video.dataset.poster && !video.poster) video.poster = video.dataset.poster;
  };
  if (reducedMotion() || lowData()) return { start: poster };
  const attach = () => {
    poster();
    addSources(video, (matchMedia("(max-width: 760px)").matches ? video.dataset.srcMobile : video.dataset.srcDesktop) ?? "");
  };
  // Fetched a beat after load (clear of first paint), or right away when the folder opens.
  const later = () => setTimeout(attach, 1600);
  if (document.readyState === "complete") later();
  else addEventListener("load", later, { once: true });
  return {
    start() {
      attach();
      playWhileVisible(video);
    },
  };
}

/**
 * Trailer cards: a few silent seconds play on hover/focus (mouse), or while the
 * card is on screen (touch). Posters only for reduced motion and low data.
 */
export function initPreviews() {
  // Posters arrive after first paint; the cards sit far below the gate anyway.
  document.querySelectorAll<HTMLVideoElement>("video[data-preview][data-poster]").forEach((v) => (v.poster = v.dataset.poster!));
  if (reducedMotion() || lowData()) return;
  const touch = coarsePointer();
  document.querySelectorAll<HTMLVideoElement>("video[data-preview]").forEach((video) => {
    const button = video.closest("button");
    const src = video.dataset.preview!;
    if (touch) {
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            addSources(video, src);
            void video.play().catch(() => {});
          } else video.pause();
        },
        { threshold: 0.6 },
      ).observe(video);
      return;
    }
    const start = () => {
      addSources(video, src);
      void video.play().catch(() => {});
    };
    const stop = () => video.pause();
    button?.addEventListener("pointerenter", start);
    button?.addEventListener("focus", start);
    button?.addEventListener("pointerleave", stop);
    button?.addEventListener("blur", stop);
  });
}
