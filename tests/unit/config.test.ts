import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfig } from "@/lib/config";

describe("getConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is in demo mode when GitHub creds are missing", () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    vi.stubEnv("GITHUB_OWNER", "");
    vi.stubEnv("GITHUB_REPO", "");
    expect(getConfig().demoMode).toBe(true);
  });

  it("is live when token, owner and repo are all set", () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_x");
    vi.stubEnv("GITHUB_OWNER", "acme");
    vi.stubEnv("GITHUB_REPO", "webapp");
    const cfg = getConfig();
    expect(cfg.demoMode).toBe(false);
    expect(cfg.owner).toBe("acme");
    expect(cfg.repo).toBe("webapp");
  });

  it("stays in demo mode if only some creds are set", () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_x");
    vi.stubEnv("GITHUB_OWNER", "");
    vi.stubEnv("GITHUB_REPO", "webapp");
    expect(getConfig().demoMode).toBe(true);
  });

  it("falls back to the default model", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "");
    expect(getConfig().model).toBe("claude-sonnet-4-5");
  });
});
