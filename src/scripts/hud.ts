import { audio } from "./audio";
import { bindDialog } from "./dialogs";
import { prefs, type PrefKey } from "./prefs";
import { lenis } from "./scroll";

/** Scroll progress line + the current section in the nav (aria-current). */
export function initHud() {
  const bar = document.querySelector<HTMLElement>("[data-progress]");
  const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-nav]")];
  const sections = links.map((a) => document.getElementById(a.dataset.nav!)).filter(Boolean) as HTMLElement[];

  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar?.parentElement?.style.setProperty("--progress", String(max > 0 ? Math.min(1, scrollY / max) : 0));
    let current = "";
    for (const s of sections) {
      // Behind the closed folder the sections are not rendered (all-zero rects): skip them.
      if (!s.getClientRects().length) continue;
      if (s.getBoundingClientRect().top < innerHeight * 0.4) current = s.id;
    }
    for (const a of links) {
      if (a.dataset.nav === current) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  update();
}

/** The BGM button: real analyser levels drive the five bars (the 2020 bars were a CSS loop). */
export function initBgm(onChange?: (on: boolean) => void) {
  const btn = document.querySelector<HTMLButtonElement>("[data-bgm]");
  if (!btn) return { set: async (_on: boolean) => {} };
  const label = btn.querySelector("[data-bgm-label]");
  const bars = [...btn.querySelectorAll<HTMLElement>(".bgm__bars i")];
  let raf = 0;
  const data = new Uint8Array(32);

  const draw = () => {
    const a = audio.analyser;
    if (a && audio.musicOn) {
      a.getByteFrequencyData(data);
      const bands = [1, 3, 6, 10, 16];
      bars.forEach((bar, i) => bar.style.setProperty("--lv", (data[bands[i]] / 255).toFixed(2)));
      raf = requestAnimationFrame(draw);
    } else {
      bars.forEach((bar) => bar.style.setProperty("--lv", "0"));
    }
  };

  const reflect = (on: boolean) => {
    btn.setAttribute("aria-pressed", String(on));
    if (label) label.textContent = on ? "배경음악 끄기" : "배경음악 켜기";
    cancelAnimationFrame(raf);
    if (on) raf = requestAnimationFrame(draw);
    else draw();
  };

  const set = async (on: boolean) => {
    const result = await audio.setMusic(on);
    const playing = on && result !== false;
    reflect(playing);
    onChange?.(playing);
    return playing;
  };

  btn.addEventListener("click", async () => {
    const next = btn.getAttribute("aria-pressed") !== "true";
    prefs.set("music", next);
    await set(next);
  });
  return { set };
}

/** Menu dialog: table of contents + switches (sound, BGM, motion). */
export function initMenu(handlers: Record<PrefKey, (on: boolean) => void>) {
  const dialog = document.querySelector<HTMLDialogElement>("[data-menu]");
  const openBtn = document.querySelector<HTMLButtonElement>("[data-menu-open]");
  if (!dialog || !openBtn) return;
  const ctl = bindDialog(dialog);
  openBtn.addEventListener("click", () => {
    // reflect current state each time the menu opens
    dialog.querySelectorAll<HTMLButtonElement>("[data-pref]").forEach((sw) => {
      const key = sw.dataset.pref as PrefKey;
      const on = key === "music" ? audio.musicOn : key === "sound" ? audio.enabled : prefs.get("motion");
      sw.setAttribute("aria-checked", String(on));
    });
    ctl.open(openBtn);
  });
  dialog.querySelector("[data-menu-close]")?.addEventListener("click", () => ctl.close());
  dialog.querySelectorAll<HTMLAnchorElement>("[data-menu-link]").forEach((a) =>
    a.addEventListener("click", () => {
      ctl.close();
      lenis?.start();
    }),
  );
  dialog.querySelectorAll<HTMLButtonElement>("[data-pref]").forEach((sw) =>
    sw.addEventListener("click", () => {
      const key = sw.dataset.pref as PrefKey;
      const next = sw.getAttribute("aria-checked") !== "true";
      sw.setAttribute("aria-checked", String(next));
      prefs.set(key, next);
      handlers[key](next);
    }),
  );
}
