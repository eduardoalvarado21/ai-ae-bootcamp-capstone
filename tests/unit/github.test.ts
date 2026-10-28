import { describe, expect, it } from "vitest";
import { getPullRequest, listPullRequests } from "@/lib/github";

describe("github layer (demo mode)", () => {
  it("lists the seeded open PRs", async () => {
    const prs = await listPullRequests();
    expect(prs).toHaveLength(5);
  });

  it("looks up a PR by id", async () => {
    const pr = await getPullRequest(102);
    expect(pr?.kind).toBe("pipeline");
    expect(pr?.status).toBe("failure");
  });

  it("returns undefined for an unknown PR", async () => {
    expect(await getPullRequest(999)).toBeUndefined();
  });
});
