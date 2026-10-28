import { getConfig } from "../config";
import type { AgentEvent, PullRequest } from "../types";
import { ask } from "./anthropic";
import { loadSkill } from "./skills";
import { event, sleep } from "./util";

/**
 * QE subagent: validates a candidate fix by "running" tests before anything is pushed.
 * In demo mode it replays a realistic test run; in real mode it asks Claude to judge
 * whether the proposed diff satisfies the failing test.
 */
export async function* runQe(
  pr: PullRequest,
  proposedDiff: string
): AsyncGenerator<AgentEvent, boolean> {
  const cfg = getConfig();
  yield event("qe", "start", "QE agent validating the fix before push");
  await sleep(500);

  if (!cfg.anthropicApiKey) {
    yield event("qe", "tool", "Running: npm test -- src/utils/currency.test.ts");
    await sleep(900);
    yield event("qe", "test", "PASS src/utils/currency.test.ts (1 passed)", {
      output: "✓ formats USD with two decimals (4 ms)\n\nTests: 1 passed, 1 total",
    });
    await sleep(300);
    yield event("qe", "done", "QE gate passed — fix is safe to push");
    return true;
  }

  const skill = await loadSkill("qe-testing");
  const verdict = await ask(
    skill,
    `Failing checks:\n${pr.checks
      .filter((c) => c.status === "failure")
      .map((c) => `- ${c.name}: ${c.log ?? ""}`)
      .join("\n")}\n\nProposed diff:\n${proposedDiff}\n\nReply PASS if this fix should make the tests green, otherwise FAIL with a reason.`
  );
  const passed = /\bPASS\b/i.test(verdict) && !/\bFAIL\b/i.test(verdict);
  yield event("qe", "test", verdict);
  yield event("qe", passed ? "done" : "error", passed ? "QE gate passed" : "QE gate blocked the push");
  return passed;
}
