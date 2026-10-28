import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../config";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  const { anthropicApiKey } = getConfig();
  if (!anthropicApiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  if (!client) client = new Anthropic({ apiKey: anthropicApiKey });
  return client;
}

/** Single-shot reasoning call used by the subagents. Returns the assistant text. */
export async function ask(system: string, user: string): Promise<string> {
  const { model } = getConfig();
  const res = await getAnthropic().messages.create({
    model,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
