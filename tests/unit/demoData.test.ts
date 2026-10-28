import { describe, expect, it } from "vitest";
import { getDemoPullRequests } from "@/lib/demoData";

describe("getDemoPullRequests", () => {
  it("returns the seeded PRs", () => {
    const prs = getDemoPullRequests();
    expect(prs).toHaveLength(5);
    expect(prs.map((p) => p.id)).toEqual([101, 102, 103, 104, 105]);
  });

  it("returns an isolated clone each call (mutations don't leak)", () => {
    const first = getDemoPullRequests();
    first[0].status = "success";
    first[0].nits = [];
    const second = getDemoPullRequests();
    expect(second[0].status).toBe("failure");
    expect(second[0].nits.length).toBeGreaterThan(0);
  });

  it("has one nits PR and one failing-pipeline PR", () => {
    const prs = getDemoPullRequests();
    expect(prs.find((p) => p.kind === "nits")?.id).toBe(101);
    const pipeline = prs.find((p) => p.kind === "pipeline");
    expect(pipeline?.id).toBe(102);
    expect(pipeline?.checks.some((c) => c.status === "failure" && c.log)).toBe(true);
  });
});
