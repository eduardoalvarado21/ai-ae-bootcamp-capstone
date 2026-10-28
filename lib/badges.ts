import type { PullRequest } from "./types";

export type BadgeTone = "green" | "amber" | "red";

export interface Badge {
  label: string;
  tone: BadgeTone;
}

const LARGE_FILES = 10;
const LARGE_ADDITIONS = 300;

/** Derives merge-readiness badges from a PR's checks, mergeability, and change size. */
export function computeBadges(pr: PullRequest): Badge[] {
  const failing = pr.status === "failure";
  const conflicts = pr.mergeable === false;
  const large = pr.changedFiles > LARGE_FILES || pr.nonTestAdditions > LARGE_ADDITIONS;

  const badges: Badge[] = [];
  if (!failing && !conflicts && !large) badges.push({ label: "Safe to merge", tone: "green" });
  if (failing) badges.push({ label: "Needs attention", tone: "red" });
  badges.push(
    conflicts
      ? { label: "Merge conflicts", tone: "red" }
      : { label: "No merge conflicts", tone: "green" }
  );
  if (large) badges.push({ label: "Needs manual review", tone: "amber" });
  return badges;
}
