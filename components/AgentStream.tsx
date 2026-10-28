"use client";

import type { AgentEvent, AgentRole } from "@/lib/types";

const roleColor: Record<AgentRole, string> = {
  orchestrator: "text-sky-300",
  reviewer: "text-violet-300",
  "pipeline-fixer": "text-amber-300",
  qe: "text-emerald-300",
};

const typeIcon: Record<string, string> = {
  start: "▶",
  thinking: "…",
  tool: "⚙",
  diff: "±",
  test: "✓",
  commit: "⬆",
  status: "◉",
  "await-approval": "⏸",
  done: "✔",
  error: "✖",
};

export default function AgentStream({
  events,
  running,
}: {
  events: AgentEvent[];
  running: boolean;
}) {
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Pick a PR and run an agent to watch it work live.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 font-mono text-xs leading-relaxed">
      {events.map((e, i) => (
        <div key={i} className="flex gap-2">
          <span className="w-4 shrink-0 text-slate-500">{typeIcon[e.type] ?? "•"}</span>
          <span className={`w-28 shrink-0 font-semibold ${roleColor[e.role]}`}>{e.role}</span>
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-wrap break-words text-slate-200">{e.message}</p>
            {renderPayload(e)}
          </div>
        </div>
      ))}
      {running && (
        <div className="flex gap-2 text-slate-500">
          <span className="w-4 shrink-0 animate-pulse">▌</span>
          <span>working…</span>
        </div>
      )}
    </div>
  );
}

function renderPayload(e: AgentEvent) {
  const d = e.data;
  if (!d) return null;
  const text =
    (typeof d.diff === "string" && d.diff) ||
    (typeof d.log === "string" && d.log) ||
    (typeof d.output === "string" && d.output) ||
    null;
  if (!text) return null;
  return (
    <pre className="mt-1 overflow-x-auto rounded-md bg-black/40 p-2 text-[11px] text-slate-300 ring-1 ring-white/5">
      {text}
    </pre>
  );
}
