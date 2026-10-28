import { describe, expect, it } from "vitest";
import { runTask } from "@/lib/agents/orchestrator";
import type { AgentEvent } from "@/lib/types";

async function collect(gen: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const out: AgentEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

describe("orchestrator (demo mode)", () => {
  it("routes fix-nits to the reviewer and ends clean", async () => {
    const events = await collect(runTask("fix-nits", 101));
    expect(events.some((e) => e.role === "reviewer")).toBe(true);
    expect(events.some((e) => e.type === "commit")).toBe(true);
    expect(events.some((e) => e.type === "status" && e.data?.status === "success")).toBe(true);
    expect(events.at(-1)?.type).toBe("done");
  });

  it("routes fix-pipeline through the QE gate before committing", async () => {
    const events = await collect(runTask("fix-pipeline", 102));
    const qeDone = events.findIndex((e) => e.role === "qe" && e.type === "done");
    const commit = events.findIndex((e) => e.role === "pipeline-fixer" && e.type === "commit");
    expect(qeDone).toBeGreaterThan(-1);
    expect(commit).toBeGreaterThan(-1);
    // QE must pass before the fix is committed.
    expect(qeDone).toBeLessThan(commit);
    expect(events.some((e) => e.type === "status" && e.data?.status === "success")).toBe(true);
  });

  it("errors on an unknown PR", async () => {
    const events = await collect(runTask("fix-nits", 999));
    expect(events[0].type).toBe("error");
  });
});
