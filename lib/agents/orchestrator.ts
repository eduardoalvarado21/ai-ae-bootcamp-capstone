import { getPullRequest } from "../github";
import type { AgentEvent, AgentMode, AgentTask } from "../types";
import { runPipelineFixer } from "./pipelineFixer";
import { runReviewer } from "./reviewer";
import { event } from "./util";

/** Entry point: loads the PR, picks the right subagent, and streams the whole run. */
export async function* runTask(
  task: AgentTask,
  prId: number,
  mode: AgentMode = "apply"
): AsyncGenerator<AgentEvent> {
  const pr = await getPullRequest(prId);
  if (!pr) {
    yield event("orchestrator", "error", `PR ${prId} not found`);
    return;
  }

  yield event("orchestrator", "start", `Dispatching "${task}" for PR #${pr.number} (${mode})`);

  if (task === "fix-nits") {
    yield event("orchestrator", "thinking", "Routing to Reviewer subagent");
    yield* runReviewer(pr, mode);
  } else {
    yield event("orchestrator", "thinking", "Routing to Pipeline Fixer subagent (QE-gated)");
    yield* runPipelineFixer(pr, mode);
  }

  if (mode === "apply") {
    yield event("orchestrator", "done", `Task "${task}" complete for PR #${pr.number}`);
  }
}
