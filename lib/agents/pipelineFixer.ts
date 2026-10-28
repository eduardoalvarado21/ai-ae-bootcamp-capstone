import { getConfig } from "../config";
import type { AgentEvent, AgentMode, PullRequest } from "../types";
import { waitForCi } from "./ci";
import { commitProposed, computePipelineFix, miniDiff } from "./fixes";
import { runQe } from "./qe";
import { event, sleep } from "./util";

/** Pipeline fixer subagent: reads failing CI logs, patches code, and gates on QE before pushing. */
export async function* runPipelineFixer(
  pr: PullRequest,
  mode: AgentMode = "apply"
): AsyncGenerator<AgentEvent> {
  const cfg = getConfig();
  const failing = pr.checks.filter((c) => c.status === "failure");
  yield event("pipeline-fixer", "start", `Diagnosing failing pipeline on PR #${pr.number}`);
  await sleep(400);

  if (cfg.demoMode) {
    yield event("pipeline-fixer", "tool", `Fetching logs for: ${failing.map((c) => c.name).join(", ")}`);
    await sleep(800);
    yield event("pipeline-fixer", "thinking", "Root cause: formatCurrency ignores locale + minimumFractionDigits", {
      log: failing[0]?.log,
    });
    await sleep(700);
    const proposedDiff = [
      "--- a/src/utils/currency.ts",
      "+++ b/src/utils/currency.ts",
      "-  return `$${amount}`;",
      "+  return new Intl.NumberFormat('en-US', {",
      "+    style: 'currency', currency: 'USD', minimumFractionDigits: 2,",
      "+  }).format(amount);",
    ].join("\n");
    yield event("pipeline-fixer", "diff", "Proposed fix for src/utils/currency.ts", { diff: proposedDiff });
    await sleep(500);

    const qePassed = yield* runQe(pr, proposedDiff);
    if (!qePassed) {
      yield event("pipeline-fixer", "error", "Aborting push — QE gate failed");
      return;
    }

    if (mode === "preview") {
      yield event("pipeline-fixer", "await-approval", "QE passed — approve to push");
      return;
    }

    yield event("pipeline-fixer", "commit", "Committed: fix: format currency with Intl.NumberFormat", {
      sha: "f9e8d7c",
      files: ["src/utils/currency.ts"],
    });
    await sleep(600);
    yield event("pipeline-fixer", "status", "unit-tests re-run: success", { status: "success" });
    yield event("pipeline-fixer", "done", "Pipeline is green");
    return;
  }

  // Live mode: diagnose, propose the patch, gate on QE, and push only when approved.
  yield event(
    "pipeline-fixer",
    "tool",
    `Reading failing checks: ${failing.map((c) => c.name).join(", ") || "none"}`
  );
  await sleep(500);
  const { fixes, rootCause } = await computePipelineFix(pr.number, pr.branch);
  if (fixes.length === 0) {
    yield event("pipeline-fixer", "error", "No known fix for this pipeline failure");
    return;
  }
  const fix = fixes[0];
  yield event("pipeline-fixer", "thinking", `Root cause: ${rootCause}`);
  yield event("pipeline-fixer", "diff", `Proposed fix for ${fix.path}`, {
    diff: miniDiff(fix.before, fix.after),
  });

  const qePassed = yield* runQe(pr, fix.after);
  if (!qePassed) {
    yield event("pipeline-fixer", "error", "QE gate blocked the push");
    return;
  }

  if (mode === "preview") {
    yield event("pipeline-fixer", "await-approval", "QE passed — approve to push to the PR branch");
    return;
  }

  const head = await commitProposed(pr.branch, fixes, "fix: resolve failing pipeline in {path}");
  yield event("pipeline-fixer", "commit", `Pushed fix to ${pr.branch}`, {
    sha: head,
    files: fixes.map((f) => f.path),
  });
  yield* waitForCi("pipeline-fixer", head);
}
