import { audio } from "./audio";
import { bindDialog } from "./dialogs";
import { reducedMotion } from "./prefs";

const STORE = "ko:investigated";

/**
 * Exhibit B. 2020 had three fixed pictures behind "조사하기 → 자세히 조사하기".
 * Now a magnifier (the 2020 knife-handled one) follows the pointer and shows the
 * painted face behind each "?" — and every file you open stays revealed.
 */
export function initSuspects() {
  const house = document.querySelector<HTMLElement>("[data-house]");
  const dialog = document.querySelector<HTMLDialogElement>("[data-dossier-dialog]");
  if (!house || !dialog) return;

  const ids = [...dialog.querySelectorAll<HTMLElement>("[data-dossier]")].map((el) => el.dataset.dossier!);
  const done = new Set<string>(load());
  const lens = house.querySelector<HTMLElement>("[data-lens]");

  // ── lens ──
  const target = { x: 0, y: 0 };
  const pos = { x: 0, y: 0 };
  let radius = 0;
  let raf = 0;
  let inside = false;
  const smooth = reducedMotion() ? 1 : 0.22;

  const measure = () => {
    radius = (lens?.offsetWidth ?? 200) * 0.42;
  };
  const write = () => {
    house.style.setProperty("--lx", `${pos.x}px`);
    house.style.setProperty("--ly", `${pos.y}px`);
    house.style.setProperty("--lr", `${inside ? radius : 0}px`);
  };
  const tick = () => {
    pos.x += (target.x - pos.x) * smooth;
    pos.y += (target.y - pos.y) * smooth;
    write();
    if (Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.4) raf = requestAnimationFrame(tick);
    else raf = 0;
  };
  const moveTo = (x: number, y: number, jump = false) => {
    target.x = x;
    target.y = y;
    if (jump) {
      pos.x = x;
      pos.y = y;
    }
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const centerOf = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const h = house.getBoundingClientRect();
    return { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height * 0.45 };
  };

  measure();
  addEventListener("resize", measure, { passive: true });

  let lastWindow: HTMLElement | null = null;
  house.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const h = house.getBoundingClientRect();
    if (!inside) {
      inside = true;
      measure(); // the section may have been unrendered (content-visibility) at init
      house.classList.add("has-lens");
      moveTo(e.clientX - h.left, e.clientY - h.top, true);
    } else moveTo(e.clientX - h.left, e.clientY - h.top);
    const over = (e.target as Element).closest<HTMLElement>(".window");
    if (over && over !== lastWindow) audio.play("lens");
    lastWindow = over;
  });
  house.addEventListener("pointerleave", () => {
    inside = false;
    lastWindow = null;
    house.classList.remove("has-lens");
    write();
  });
  // Keyboard: the lens follows focus from window to window.
  house.addEventListener("focusin", (e) => {
    const win = (e.target as Element).closest<HTMLElement>(".window");
    if (!win) return;
    inside = true;
    measure();
    house.classList.add("has-lens");
    const c = centerOf(win);
    moveTo(c.x, c.y);
    audio.play("lens");
  });
  house.addEventListener("focusout", (e) => {
    if (!house.contains(e.relatedTarget as Node)) {
      inside = false;
      house.classList.remove("has-lens");
      write();
    }
  });

  // ── dossiers ──
  let current = 0;
  const ctl = bindDialog(dialog);
  const show = (i: number) => {
    current = (i + ids.length) % ids.length;
    const id = ids[current];
    dialog.querySelectorAll<HTMLElement>("[data-dossier]").forEach((el) => (el.hidden = el.dataset.dossier !== id));
    dialog.setAttribute("aria-labelledby", `dossier-${id}`);
    dialog.scrollTop = 0;
    mark(id);
  };
  const mark = (id: string) => {
    const first = !done.has(id);
    done.add(id);
    save([...done]);
    render();
    if (first) {
      const stamp = dialog.querySelector<HTMLElement>(`[data-dossier="${id}"] .dossier__stamp`);
      stamp?.animate([{ transform: "scale(2.4)", opacity: 0 }, { transform: "scale(1)", opacity: 0.9 }], {
        duration: reducedMotion() ? 0 : 420,
        easing: "cubic-bezier(.2,1.6,.4,1)",
        delay: 260,
        fill: "backwards",
      });
      window.setTimeout(() => audio.play("stamp"), 300);
    }
  };
  const render = () => {
    document.querySelectorAll<HTMLElement>("[data-face]").forEach((el) => el.classList.toggle("is-revealed", done.has(el.dataset.face!)));
    document.querySelectorAll<HTMLElement>("[data-suspect]").forEach((el) => el.classList.toggle("is-done", done.has(el.dataset.suspect!)));
    document.querySelectorAll<HTMLElement>("[data-dot]").forEach((el) => el.classList.toggle("is-done", done.has(el.dataset.dot!)));
    const count = document.querySelector("[data-investigated]");
    if (count) count.textContent = String(done.size);
    const solved = document.querySelector<HTMLElement>("[data-solved]");
    if (solved) solved.hidden = done.size < ids.length;
  };

  document.addEventListener("click", (e) => {
    const btn = (e.target as Element).closest<HTMLElement>("[data-suspect]");
    if (!btn) return;
    show(ids.indexOf(btn.dataset.suspect!));
    ctl.open(btn);
  });
  dialog.querySelectorAll<HTMLButtonElement>("[data-dossier-step]").forEach((b) =>
    b.addEventListener("click", () => {
      audio.play("page");
      show(current + Number(b.dataset.dossierStep));
    }),
  );
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      if ((e.target as Element).closest("input, textarea")) return;
      e.preventDefault();
      audio.play("page");
      show(current + (e.key === "ArrowRight" ? 1 : -1));
    }
  });
  dialog.querySelector("[data-dossier-close]")?.addEventListener("click", () => ctl.close());

  render();
}

function load(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "[]");
  } catch {
    return [];
  }
}
function save(list: string[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(list));
  } catch {
    /* private mode */
  }
}
