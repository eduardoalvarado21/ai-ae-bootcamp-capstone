import { runTask } from "@/lib/agents/orchestrator";
import type { AgentMode, AgentTask } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID: AgentTask[] = ["fix-nits", "fix-pipeline"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ task: string }> }
) {
  const { task } = await params;
  const url = new URL(req.url);
  const prId = Number(url.searchParams.get("prId"));
  const mode: AgentMode = url.searchParams.get("mode") === "apply" ? "apply" : "preview";

  if (!VALID.includes(task as AgentTask) || Number.isNaN(prId)) {
    return new Response("invalid task or prId", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const evt of runTask(task as AgentTask, prId, mode)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "agent run failed";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", role: "orchestrator", message, at: Date.now() })}\n\n`)
        );
      } finally {
        controller.enqueue(encoder.encode("event: end\ndata: {}\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
