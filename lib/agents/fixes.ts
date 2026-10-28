import { getFileOnBranch, listPrFiles, putFileOnBranch } from "../github";

export interface ProposedFix {
  path: string;
  before: string;
  after: string;
  /** Blob sha required to commit the update later. */
  sha: string;
}

/** Minimal line-level diff of changed lines, for display in the activity stream. */
export function miniDiff(before: string, after: string): string {
  const b = before.split("\n");
  const a = after.split("\n");
  const removed = b.filter((l) => !a.includes(l)).map((l) => `- ${l}`);
  const added = a.filter((l) => !b.includes(l)).map((l) => `+ ${l}`);
  return [...removed, ...added].join("\n");
}

/** Deterministic lint-nit fixer: drops unused `const` declarations and enforces strict equality. */
function fixNits(src: string): string {
  let out = src
    .split("\n")
    .filter((line) => {
      const m = line.match(/^\s*const\s+([A-Za-z_$][\w$]*)\s*=.*;\s*$/);
      if (!m) return true;
      const name = m[1];
      const uses = (src.match(new RegExp(`\\b${name}\\b`, "g")) ?? []).length;
      return uses > 1; // keep declarations that are actually referenced
    })
    .join("\n");
  out = out.replace(/ == /g, " === ").replace(/ != /g, " !== ");
  return out;
}

/** The correct currency formatter that makes its failing unit test pass. */
function fixCurrency(): string {
  return [
    "export function formatCurrency(amount) {",
    '  return new Intl.NumberFormat("en-US", {',
    '    style: "currency",',
    '    currency: "USD",',
    "    minimumFractionDigits: 2,",
    "  }).format(amount);",
    "}",
    "",
  ].join("\n");
}

/** The correct slugify that strips non-alphanumerics and trims dashes. */
function fixSlugify(): string {
  return [
    "export function slugify(text) {",
    "  return text",
    "    .toLowerCase()",
    "    .trim()",
    '    .replace(/[^a-z0-9]+/g, "-")',
    '    .replace(/^-+|-+$/g, "");',
    "}",
    "",
  ].join("\n");
}

interface KnownPipelineFix {
  match: RegExp;
  rootCause: string;
  fixed: () => string;
}

const PIPELINE_FIXES: KnownPipelineFix[] = [
  {
    match: /currency\.js$/,
    rootCause: "missing Intl.NumberFormat locale + minimumFractionDigits",
    fixed: fixCurrency,
  },
  {
    match: /slugify\.js$/,
    rootCause: "slug keeps non-alphanumeric characters and trailing dashes",
    fixed: fixSlugify,
  },
];

export async function computeNitsFix(prNumber: number, branch: string): Promise<ProposedFix[]> {
  const files = await listPrFiles(prNumber);
  const proposed: ProposedFix[] = [];
  for (const path of files) {
    if (!/\.(js|jsx|ts|tsx)$/.test(path) || /\.test\./.test(path)) continue;
    const { text, sha } = await getFileOnBranch(branch, path);
    const after = fixNits(text);
    if (after !== text) proposed.push({ path, before: text, after, sha });
  }
  return proposed;
}

export async function computePipelineFix(
  prNumber: number,
  branch: string
): Promise<{ fixes: ProposedFix[]; rootCause: string }> {
  const files = await listPrFiles(prNumber);
  for (const known of PIPELINE_FIXES) {
    const path = files.find((f) => known.match.test(f));
    if (!path) continue;
    const { text, sha } = await getFileOnBranch(branch, path);
    const after = known.fixed();
    if (after !== text) {
      return { fixes: [{ path, before: text, after, sha }], rootCause: known.rootCause };
    }
  }
  return { fixes: [], rootCause: "" };
}

/** Commits each proposed fix to the branch. `message` may contain `{path}`. Returns the last commit sha. */
export async function commitProposed(
  branch: string,
  fixes: ProposedFix[],
  message: string
): Promise<string> {
  let last = "";
  for (const f of fixes) {
    last = await putFileOnBranch(branch, f.path, f.after, message.replace("{path}", f.path), f.sha);
  }
  return last;
}
