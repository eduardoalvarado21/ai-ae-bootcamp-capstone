import { getConfig } from "../config";
import type { AgentEvent, AgentMode, PullRequest } from "../types";
import { waitForCi } from "./ci";
import { commitProposed, computeNitsFix, miniDiff } from "./fixes";
import { event, sleep } from "./util";

/** Reviewer / nits subagent: finds small lint-style issues and auto-applies the fixes. */
export async function* runReviewer(
  pr: PullRequest,
  mode: AgentMode = "apply"
): AsyncGenerator<AgentEvent> {
  const cfg = getConfig();
  yield event("reviewer", "start", `Reviewing PR #${pr.number}: ${pr.title}`);
  await sleep(400);

  if (cfg.demoMode) {
    yield event("reviewer", "tool", "Fetching diff and running: eslint --fix");
    await sleep(800);
    yield event("reviewer", "thinking", `Found ${pr.nits.length} nits to auto-fix`);
    for (const nit of pr.nits) {
      await sleep(500);
      yield event("reviewer", "diff", `${nit.path}:${nit.line} — ${nit.rule}`, {
        before: nit.message,
        after: "fixed",
      });
    }
    if (mode === "preview") {
      yield event("reviewer", "await-approval", "Proposed nit fixes ready — approve to push");
      return;
    }
    await sleep(500);
    yield event("reviewer", "commit", "Committed: style: auto-fix lint nits (eslint --fix)", {
      sha: "a1b2c3d",
      files: pr.filesChanged,
    });
    await sleep(400);
    yield event("reviewer", "status", "lint check re-run: success", { status: "success" });
    yield event("reviewer", "done", "All nits resolved — PR is clean");
    return;
  }

  // Live mode: compute the fixes, show them, and only push when approved.
  yield event("reviewer", "tool", "Listing changed files and computing eslint auto-fixes");
  const proposed = await computeNitsFix(pr.number, pr.branch);
  if (proposed.length === 0) {
    yield event("reviewer", "done", "No auto-fixable lint nits found");
    return;
  }
  for (const fix of proposed) {
    yield event("reviewer", "diff", `Proposed fix for ${fix.path}`, {
      diff: miniDiff(fix.before, fix.after),
    });
    await sleep(300);
  }

  if (mode === "preview") {
    yield event("reviewer", "await-approval", "Proposed fix ready — approve to push to the PR branch");
    return;
  }

  const head = await commitProposed(
    pr.branch,
    proposed,
    "style: auto-fix lint nits in {path} (eslint)"
  );
  yield event("reviewer", "commit", `Pushed ${proposed.length} commit(s) to ${pr.branch}`, {
    sha: head,
    files: proposed.map((f) => f.path),
  });
  yield* waitForCi("reviewer", head);
}
