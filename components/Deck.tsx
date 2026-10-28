"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Mermaid from "./Mermaid";

interface Slide {
  kicker: string;
  title: string;
  points?: string[];
  columns?: { heading: string; items: string[] }[];
  mermaid?: string;
  footnote?: string;
}

const ARCHITECTURE = `flowchart TD
  U["User"] --> D["Next.js Dashboard"]
  D -->|"SSE stream"| O["Orchestrator Agent"]
  O --> R["Reviewer (nits)"]
  O --> P["Pipeline-Fixer"]
  P --> Q["QE Gate"]
  SK["Agent Skills (SKILL.md)"] -.-> O
  R -->|"commit"| G["GitHub API (Octokit)"]
  Q -->|"commit"| G
  G --> A["GitHub Actions CI"]
  A -->|"check status"| D`;

const SLIDES: Slide[] = [
  {
    kicker: "AI Bootcamp Capstone",
    title: "PR Dashboard — Reviewer & Pipeline Fixer",
    points: [
      "An agentic tool that reviews open PRs, auto-fixes lint nits, and repairs failing pipelines.",
      "Each fix is QE-gated, pushed to the real PR branch, and verified against live GitHub Actions.",
      "Operates on real PRs; streams every agent step to the dashboard in real time.",
    ],
    footnote: "Use ← / → to navigate.",
  },
  {
    kicker: "Architecture",
    title: "How the app is built",
    mermaid: ARCHITECTURE,
  },
  {
    kicker: "Integration",
    title: "How everything ties together",
    points: [
      "Dashboard (Next.js) lists real PRs + CI status and opens an SSE stream per action.",
      "Orchestrator routes to the Reviewer or Pipeline-Fixer subagent; Agent Skills supply the domain rules.",
      "Subagents edit files and commit via the GitHub Contents API — QE gates the pipeline fix first.",
      "The app polls GitHub Actions for the new commit until checks settle, then flips the UI status.",
      "One loop: PR → agent → commit → CI → dashboard — all on real GitHub.",
    ],
  },
  {
    kicker: "AI Learnings",
    title: "What worked well",
    points: [
      "Agent Skills (SKILL.md) cleanly separate domain instructions from code.",
      "An orchestrator + focused subagents is easier to reason about than one mega-prompt.",
      "A QE gate before every push builds trust in autonomous changes.",
      "Streaming agent steps over SSE makes the AI's reasoning observable and demoable.",
      "A demo-mode fallback lets the whole thing run with zero credentials.",
    ],
  },
  {
    kicker: "AI Stack",
    title: "What we used on the AI side",
    columns: [
      {
        heading: "Model & SDK",
        items: ["Anthropic Claude", "@anthropic-ai/sdk", "Agent Skills (SKILL.md)"],
      },
      {
        heading: "Agents",
        items: ["Orchestrator (router)", "Reviewer — nits", "Pipeline-Fixer", "QE gate"],
      },
      {
        heading: "Tooling & loop",
        items: [
          "GitHub API (Octokit) as tools",
          "Contents API commits",
          "SSE step streaming",
          "Deterministic fallback (no-key)",
        ],
      },
    ],
  },
];

export default function Deck() {
  const [i, setI] = useState(0);
  const total = SLIDES.length;

  const go = useCallback(
    (d: number) => setI((p) => Math.min(total - 1, Math.max(0, p + d))),
    [total]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Home") setI(0);
      else if (e.key === "End") setI(total - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  const s = SLIDES[i];

  return (
    <main className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b border-white/10 px-6 py-3 text-sm">
        <Link href="/" className="text-slate-300 hover:text-white">
          ← Dashboard
        </Link>
        <span className="text-slate-500">
          Capstone Deck · {i + 1} / {total}
        </span>
      </nav>

      <section className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-sky-400">
            {s.kicker}
          </p>
          <h2 className="mb-8 text-4xl font-bold tracking-tight text-white">{s.title}</h2>

          {s.mermaid && (
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <Mermaid chart={s.mermaid} />
            </div>
          )}

          {s.points && (
            <ul className="flex flex-col gap-4">
              {s.points.map((p, k) => (
                <li key={k} className="flex gap-3 text-lg text-slate-200">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}

          {s.columns && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {s.columns.map((col) => (
                <div key={col.heading} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="mb-2 text-sm font-semibold text-sky-300">{col.heading}</p>
                  <ul className="flex flex-col gap-1.5 text-sm text-slate-300">
                    {col.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {s.footnote && <p className="mt-8 text-sm text-slate-500">{s.footnote}</p>}
        </div>
      </section>

      <footer className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          className="rounded-md bg-white/5 px-4 py-2 text-sm text-slate-200 ring-1 ring-white/10 enabled:hover:bg-white/10 disabled:opacity-30"
        >
          ← Prev
        </button>
        <div className="flex gap-1.5">
          {SLIDES.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              aria-label={`Go to slide ${k + 1}`}
              className={`h-2 w-2 rounded-full transition ${
                k === i ? "bg-sky-400" : "bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => go(1)}
          disabled={i === total - 1}
          className="rounded-md bg-sky-500/90 px-4 py-2 text-sm font-semibold text-white enabled:hover:bg-sky-500 disabled:opacity-30"
        >
          Next →
        </button>
      </footer>
    </main>
  );
}
