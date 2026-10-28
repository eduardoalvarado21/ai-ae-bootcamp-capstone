export type CheckStatus = "success" | "failure" | "pending";

export type PullRequestKind = "nits" | "pipeline" | "clean";

export interface CheckRun {
  name: string;
  status: CheckStatus;
  /** Raw log excerpt, used by the pipeline fixer. */
  log?: string;
}

export interface Nit {
  path: string;
  line: number;
  rule: string;
  message: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  author: string;
  branch: string;
  url: string;
  status: CheckStatus;
  kind: PullRequestKind;
  checks: CheckRun[];
  nits: Nit[];
  /** Short diff summary shown in the UI. */
  filesChanged: string[];
  /** null when GitHub has not computed mergeability yet. */
  mergeable: boolean | null;
  changedFiles: number;
  additions: number;
  /** Added lines outside test files — used to flag large changes for manual review. */
  nonTestAdditions: number;
}

export type AgentTask = "fix-nits" | "fix-pipeline";

export type AgentMode = "preview" | "apply";

export type AgentRole = "orchestrator" | "reviewer" | "pipeline-fixer" | "qe";

export type AgentEventType =
  | "start"
  | "thinking"
  | "tool"
  | "diff"
  | "test"
  | "commit"
  | "status"
  | "await-approval"
  | "done"
  | "error";

export interface AgentEvent {
  type: AgentEventType;
  role: AgentRole;
  message: string;
  /** Optional structured payload (diff text, test output, new status). */
  data?: Record<string, unknown>;
  at: number;
}
