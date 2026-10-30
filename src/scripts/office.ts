import { audio } from "./audio";
import { reducedMotion } from "./prefs";

type Report = {
  title: string;
  suspects: { name: string; note: string }[];
  clue: string;
  deduction: string;
  verdict: string;
  refused: boolean;
};

const ERRORS: Record<string, string> = {
  not_configured: "블랑 탐정은 지금 다른 사건으로 출장 중입니다. (이 사본에는 AI 키가 설정되어 있지 않아요.)",
  rate_limited: "블랑이 잠시 피아노 앞에서 쉬고 있습니다. 몇 분 뒤에 다시 의뢰해 주세요.",
  busy: "의뢰가 밀려 있습니다. 잠시 뒤에 다시 시도해 주세요.",
  bad_request: "의뢰 내용은 4자 이상, 200자 이하로 적어 주세요.",
  default: "의뢰서가 바람에 날아갔습니다. 다시 시도해 주세요.",
};

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = "", cls = "") => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};

/** Exhibit F: Blanc (Gemini, via /api/blanc) answers with a typed case report and a stamp. */
export function initOffice() {
  const form = document.querySelector<HTMLFormElement>("[data-office-form]");
  const report = document.querySelector<HTMLElement>("[data-report]");
  if (!form || !report) return;
  const input = form.querySelector<HTMLTextAreaElement>("textarea")!;
  const submit = form.querySelector<HTMLButtonElement>("[data-office-submit]")!;
  const count = form.querySelector("[data-office-count]");
  const title = report.querySelector<HTMLElement>("[data-report-title]")!;
  const body = report.querySelector<HTMLElement>("[data-report-body]")!;
  const no = report.querySelector<HTMLElement>("[data-report-no]")!;
  const stamp = report.querySelector<HTMLElement>("[data-report-stamp]")!;
  const instant = reducedMotion();
  let busy = false;

  const updateCount = () => {
    if (count) count.textContent = String(input.value.length);
  };
  input.addEventListener("input", updateCount);
  form.querySelectorAll<HTMLButtonElement>("[data-office-example]").forEach((chip) =>
    chip.addEventListener("click", () => {
      input.value = chip.textContent?.trim() ?? "";
      updateCount();
      input.focus();
    }),
  );
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) form.requestSubmit();
  });

  /** Type text into a node; resolves when done. */
  const type = (node: HTMLElement, text: string, cps = 90) =>
    new Promise<void>((resolve) => {
      if (instant) {
        node.textContent = text;
        return resolve();
      }
      node.classList.add("caret");
      let i = 0;
      const step = () => {
        i = Math.min(text.length, i + Math.max(1, Math.round(cps / 30)));
        node.textContent = text.slice(0, i);
        if (i < text.length) window.setTimeout(step, 1000 / 30);
        else {
          node.classList.remove("caret");
          resolve();
        }
      };
      step();
    });

  const section = (heading: string) => {
    const wrap = el("div");
    wrap.append(el("h4", heading));
    body.append(wrap);
    return wrap;
  };

  const renderReport = async (r: Report) => {
    no.textContent = `No. ${String(Math.floor(1000 + Math.random() * 9000))}`;
    body.replaceChildren();
    audio.play("typing");
    await type(title, r.title, 60);
    if (r.suspects.length) {
      const list = el("ol");
      section("용의자").append(list);
      for (const s of r.suspects) {
        const li = el("li");
        const name = el("strong");
        li.append(name, document.createTextNode(" — "), el("span"));
        list.append(li);
        await type(name, s.name, 120);
        await type(li.lastElementChild as HTMLElement, s.note, 160);
      }
    }
    if (r.clue) await type(section("결정적 단서").appendChild(el("p")), r.clue, 160);
    if (r.deduction) await type(section("블랑의 추리").appendChild(el("p")), r.deduction, 220);
    if (r.verdict) {
      const v = section(r.refused ? "블랑의 답신" : "결론");
      await type(v.appendChild(el("p", "", "report__verdict")), r.verdict, 140);
    }
    stamp.textContent = r.refused ? "Returned" : "Solved";
    stamp.hidden = false;
    stamp.classList.remove("is-slam");
    void stamp.offsetWidth;
    stamp.classList.add("is-slam");
    audio.play("stamp");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const text = input.value.trim();
    if (text.length < 4) {
      input.focus();
      body.replaceChildren(el("p", ERRORS.bad_request, "report__error"));
      return;
    }
    busy = true;
    submit.disabled = true;
    submit.textContent = "추리 중…";
    stamp.hidden = true;
    report.setAttribute("aria-busy", "true");
    title.textContent = "블랑이 단서를 살피는 중";
    body.replaceChildren(el("p", "띵. 피아노 건반 하나가 울립니다…", "report__empty caret"));
    try {
      const res = await fetch("/api/blanc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case: text }),
        signal: AbortSignal.timeout(22_000),
      });
      const data = await res.json().catch(() => ({ error: res.status === 404 ? "not_configured" : "default" }));
      if (!res.ok || data.error) throw new Error(data.error ?? "default");
      await renderReport(data as Report);
    } catch (err) {
      const code = err instanceof Error ? err.message : "default";
      title.textContent = "의뢰 접수 실패";
      body.replaceChildren(el("p", ERRORS[code] ?? ERRORS.default, "report__error"));
    } finally {
      busy = false;
      submit.disabled = false;
      submit.textContent = "사건 의뢰하기";
      report.setAttribute("aria-busy", "false");
    }
  });
}
