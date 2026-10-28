export interface AppConfig {
  anthropicApiKey?: string;
  githubToken?: string;
  owner?: string;
  repo?: string;
  model: string;
  /** True when we lack real credentials and should serve seeded data + scripted agents. */
  demoMode: boolean;
}

export function getConfig(): AppConfig {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim() || undefined;
  const githubToken = process.env.GITHUB_TOKEN?.trim() || undefined;
  const owner = process.env.GITHUB_OWNER?.trim() || undefined;
  const repo = process.env.GITHUB_REPO?.trim() || undefined;
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5";

  const demoMode = !(githubToken && owner && repo);

  return { anthropicApiKey, githubToken, owner, repo, model, demoMode };
}
