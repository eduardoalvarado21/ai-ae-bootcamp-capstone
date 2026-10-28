"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { computeBadges, type BadgeTone } from "@/lib/badges";
import type { AgentEvent, AgentMode, AgentTask, CheckStatus, PullRequest } from "@/lib/types";
import AgentStream from "./AgentStream";
import StatusBadge from "./StatusBadge";

const BADGE_TONE: Record<BadgeTone, string> = {
  green: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  red: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

export default function Dashboard() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [demoMode, setDemoMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{ pr: PullRequest; task: AgentTask } | null>(
    null
  );
  const esRef = useRef<EventSource | null>(null);
  const streamEndRef = useRef<HTMLDivElement | null>(null);

  const loadPrs = useCallback(async () => {
    const res = await fetch("/api/prs");
    const json = await res.json();
    setPrs(json.prs ?? []);
    setDemoMode(Boolean(json.demoMode));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPrs();
    return () => esRef.current?.close();
  }, [loadPrs]);

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const runAgent = useCallback(
    (pr: PullRequest, task: AgentTask, mode: AgentMode, append = false) => {
      esRef.current?.close();
      setActiveId(pr.id);
      if (!append) setEvents([]);
      setPendingApproval(null);
      setRunning(true);

      const es = new EventSource(`/api/agents/${task}?prId=${pr.id}&mode=${mode}`);
      esRef.current = es;

      es.onmessage = (ev) => {
        const evt = JSON.parse(ev.data) as AgentEvent;
        setEvents((prev) => [...prev, evt]);
        if (evt.type === "await-approval") setPendingApproval({ pr, task });
        const newStatus = evt.data?.status as CheckStatus | undefined;
        if (evt.type === "status" && newStatus) {
          setPrs((prev) =>
            prev.map((p) =>
              p.id === pr.id
                ? { ...p, status: newStatus, kind: newStatus === "success" ? "clean" : p.kind }
                : p
            )
          );
        }
      };
      es.addEventListener("end", () => {
        setRunning(false);
        es.close();
        loadPrs();
      });
      es.onerror = () => {
        setRunning(false);
        es.close();
      };
    },
    [loadPrs]
  );

  const activePr = prs.find((p) => p.id === activeId) ?? null;

  const stats = {
    open: prs.length,
    attention: prs.filter((p) => p.status === "failure").length,
    safe: prs.filter((p) => computeBadges(p).some((b) => b.label === "Safe to merge")).length,
    conflicts: prs.filter((p) => p.mergeable === false).length,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">PR Dashboard</h1>
            <p className="text-sm text-slate-400">
              Keep every PR merge-ready — agents auto-fix nits &amp; pipelines, QE-gated.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/deck"
              className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/15 hover:bg-white/10"
            >
              View deck →
            </Link>
            {demoMode && (
              <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300 ring-1 ring-inset ring-sky-500/30">
                DEMO MODE — seeded data
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Open PRs", value: stats.open, tone: "text-slate-100" },
            { label: "Need attention", value: stats.attention, tone: "text-rose-300" },
            { label: "Safe to merge", value: stats.safe, tone: "text-emerald-300" },
            { label: "Merge conflicts", value: stats.conflicts, tone: "text-amber-300" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
              <p className={`text-2xl font-semibold tabular-nums ${s.tone}`}>{s.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Open pull requests</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {prs.map((pr) => (
                <li
                  key={pr.id}
                  className={`rounded-xl bg-white/5 p-4 ring-1 transition ${
                    activeId === pr.id ? "ring-sky-500/50" : "ring-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">
                        <span className="text-slate-500">#{pr.number}</span> {pr.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {pr.author} · {pr.branch}
                      </p>
                    </div>
                    <StatusBadge status={pr.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {computeBadges(pr).map((b) => (
                      <span
                        key={b.label}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${BADGE_TONE[b.tone]}`}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {pr.checks.map((c) => (
                      <span
                        key={c.name}
                        className={`rounded px-1.5 py-0.5 text-[11px] ring-1 ring-inset ${
                          c.status === "failure"
                            ? "bg-rose-500/10 text-rose-300 ring-rose-500/20"
                            : c.status === "pending"
                              ? "bg-amber-500/10 text-amber-300 ring-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                        }`}
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      disabled={running || pr.kind !== "nits"}
                      onClick={() => runAgent(pr, "fix-nits", "preview")}
                      className="rounded-md bg-violet-500/90 px-3 py-1.5 text-xs font-semibold text-white enabled:hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Fix nits{pr.nits.length ? ` (${pr.nits.length})` : ""}
                    </button>
                    <button
                      disabled={running || pr.kind !== "pipeline"}
                      onClick={() => runAgent(pr, "fix-pipeline", "preview")}
                      className="rounded-md bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-black enabled:hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Fix pipeline
                    </button>
                    <span className="mx-1 h-4 w-px bg-white/10" />
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-inset ring-white/10 hover:bg-white/5 hover:text-slate-100"
                    >
                      View PR <span aria-hidden>↗</span>
                    </a>
                    <a
                      href={`${pr.url}/checks`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-inset ring-white/10 hover:bg-white/5 hover:text-slate-100"
                    >
                      View Actions <span aria-hidden>↗</span>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-2">
          <div className="sticky top-8 flex h-[32rem] flex-col rounded-xl bg-black/30 ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-slate-300">
                Agent activity{activePr ? ` · #${activePr.number}` : ""}
              </h2>
              {running && <span className="text-xs text-amber-300">running</span>}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <AgentStream events={events} running={running} />
              <div ref={streamEndRef} />
            </div>
            {pendingApproval && !running && (
              <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-amber-500/5 px-4 py-3">
                <span className="text-xs text-amber-200">Review the proposed fix, then push.</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPendingApproval(null)}
                    className="rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/10 hover:bg-white/10"
                  >
                    Discard
                  </button>
                  <button
                    onClick={() =>
                      runAgent(pendingApproval.pr, pendingApproval.task, "apply", true)
                    }
                    className="rounded-md bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Approve &amp; push
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
