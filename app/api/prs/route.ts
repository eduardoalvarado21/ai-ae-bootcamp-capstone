import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { listPullRequests } from "@/lib/github";

export async function GET() {
  const cfg = getConfig();
  try {
    const prs = await listPullRequests();
    return NextResponse.json({ demoMode: cfg.demoMode, prs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load PRs" },
      { status: 500 }
    );
  }
}
