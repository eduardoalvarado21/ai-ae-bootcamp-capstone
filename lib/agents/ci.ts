import { fetchChecksForSha } from "../github";
import type { AgentEvent, AgentRole } from "../types";
import { event, sleep } from "./util";

/** Polls the real GitHub checks for a commit and streams progress until they settle. */
export async function* waitForCi(role: AgentRole, sha: string): AsyncGenerator<AgentEvent> {
  yield event(role, "status", "Pushed — waiting for CI to re-run", { status: "pending" });
  await sleep(8000); // give the new run time to register

  for (let i = 0; i < 30; i++) {
    const { status, checks } = await fetchChecksForSha(sha);
    if (status === "success") {
      yield event(role, "status", "CI re-run passed", { status: "success" });
      yield event(role, "done", "Pipeline is green ✓");
      return;
    }
    if (status === "failure") {
      yield event(role, "status", "CI re-run still failing", { status: "failure" });
      yield event(role, "error", "CI did not go green — needs another pass");
      return;
    }
    const summary = checks.length
      ? checks.map((c) => `${c.name}:${c.status}`).join(", ")
      : "queued";
    yield event(role, "thinking", `Waiting for CI… (${summary})`);
    await sleep(6000);
  }

  yield event(role, "status", "CI still running (stopped waiting)", { status: "pending" });
  yield event(role, "done", "Fix pushed; CI will finish shortly — refresh to confirm");
}
