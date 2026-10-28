import { Octokit } from "@octokit/rest";
import { getConfig } from "./config";
import { getDemoPullRequests } from "./demoData";
import type { CheckRun, CheckStatus, PullRequest } from "./types";

let octokit: Octokit | null = null;

export function getOctokit(): Octokit {
  const { githubToken } = getConfig();
  if (!githubToken) throw new Error("GITHUB_TOKEN is not configured");
  if (!octokit) octokit = new Octokit({ auth: githubToken });
  return octokit;
}

function mapCheckConclusion(conclusion: string | null, status: string | null): CheckStatus {
  if (status !== "completed") return "pending";
  if (conclusion === "success") return "success";
  if (conclusion === "neutral" || conclusion === "skipped") return "success";
  return "failure";
}

function rollUp(checks: CheckRun[]): CheckStatus {
  if (checks.some((c) => c.status === "failure")) return "failure";
  if (checks.some((c) => c.status === "pending")) return "pending";
  return "success";
}

/** GraphQL reflects conflict state faster than REST's `mergeable`. UNKNOWN maps to null. */
async function getMergeableMap(
  gh: Octokit,
  owner: string,
  repo: string
): Promise<Map<number, boolean | null>> {
  const map = new Map<number, boolean | null>();
  try {
    const res = await gh.graphql<{
      repository: { pullRequests: { nodes: { number: number; mergeable: string }[] } };
    }>(
      `query($owner:String!,$repo:String!){
        repository(owner:$owner,name:$repo){
          pullRequests(states:OPEN,first:50){ nodes { number mergeable } }
        }
      }`,
      { owner, repo }
    );
    for (const n of res.repository.pullRequests.nodes) {
      map.set(n.number, n.mergeable === "MERGEABLE" ? true : n.mergeable === "CONFLICTING" ? false : null);
    }
  } catch {
    // fall back to REST mergeable per PR
  }
  return map;
}

export async function listPullRequests(): Promise<PullRequest[]> {
  const cfg = getConfig();
  if (cfg.demoMode) return getDemoPullRequests();

  const gh = getOctokit();
  const owner = cfg.owner!;
  const repo = cfg.repo!;

  const { data: prs } = await gh.pulls.list({ owner, repo, state: "open", per_page: 20 });

  // REST `mergeable` lags behind GitHub's recompute; GraphQL reports it accurately.
  const mergeableMap = await getMergeableMap(gh, owner, repo);

  return Promise.all(
    prs.map(async (pr) => {
      const { data: runs } = await gh.checks.listForRef({ owner, repo, ref: pr.head.sha });
      const checks: CheckRun[] = runs.check_runs.map((r) => ({
        name: r.name,
        status: mapCheckConclusion(r.conclusion, r.status),
      }));
      const status = rollUp(checks);
      const lintFailed = checks.some(
        (c) => c.status === "failure" && /lint|style|format/i.test(c.name)
      );
      const kind = status !== "failure" ? "clean" : lintFailed ? "nits" : "pipeline";

      const { data: full } = await gh.pulls.get({ owner, repo, pull_number: pr.number });
      const { data: files } = await gh.pulls.listFiles({
        owner,
        repo,
        pull_number: pr.number,
        per_page: 100,
      });
      const isTest = (name: string) => /\.(test|spec)\.|(^|\/)(__tests__|tests?)\//i.test(name);
      const nonTestAdditions = files
        .filter((f) => !isTest(f.filename)).reduce((sum, f) => sum + (f.additions ?? 0), 0);

      return {
        id: pr.number,
        number: pr.number,
        title: pr.title,
        author: pr.user?.login ?? "unknown",
        branch: pr.head.ref,
        url: pr.html_url,
        status,
        kind,
        checks,
        nits: [],
        filesChanged: files.map((f) => f.filename),
        mergeable: mergeableMap.get(pr.number) ?? full.mergeable,
        changedFiles: full.changed_files ?? files.length,
        additions: full.additions ?? 0,
        nonTestAdditions,
      } satisfies PullRequest;
    })
  );
}

export async function getPullRequest(id: number): Promise<PullRequest | undefined> {
  const prs = await listPullRequests();
  return prs.find((p) => p.id === id);
}

function ctx() {
  const { owner, repo } = getConfig();
  if (!owner || !repo) throw new Error("GITHUB_OWNER/GITHUB_REPO not configured");
  return { gh: getOctokit(), owner, repo };
}

export async function listPrFiles(prNumber: number): Promise<string[]> {
  const { gh, owner, repo } = ctx();
  const { data } = await gh.pulls.listFiles({ owner, repo, pull_number: prNumber, per_page: 100 });
  return data.map((f) => f.filename);
}

export async function getFileOnBranch(
  branch: string,
  path: string
): Promise<{ text: string; sha: string }> {
  const { gh, owner, repo } = ctx();
  const { data } = await gh.repos.getContent({ owner, repo, path, ref: branch });
  if (Array.isArray(data) || data.type !== "file") throw new Error(`not a file: ${path}`);
  return { text: Buffer.from(data.content, "base64").toString("utf8"), sha: data.sha };
}

/** Commit a single file update to a branch via the Contents API. Returns the new commit sha. */
export async function putFileOnBranch(
  branch: string,
  path: string,
  text: string,
  message: string,
  sha: string
): Promise<string> {
  const { gh, owner, repo } = ctx();
  const { data } = await gh.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch,
    sha,
    message,
    content: Buffer.from(text, "utf8").toString("base64"),
  });
  return data.commit.sha ?? "";
}

export async function fetchChecksForSha(
  sha: string
): Promise<{ status: CheckStatus; checks: CheckRun[] }> {
  const { gh, owner, repo } = ctx();
  const { data } = await gh.checks.listForRef({ owner, repo, ref: sha });
  const checks: CheckRun[] = data.check_runs.map((r) => ({
    name: r.name,
    status: mapCheckConclusion(r.conclusion, r.status),
  }));
  const status = checks.length === 0 ? "pending" : rollUp(checks);
  return { status, checks };
}
