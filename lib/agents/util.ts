import type { AgentEvent, AgentEventType, AgentRole } from "../types";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function event(
  role: AgentRole,
  type: AgentEventType,
  message: string,
  data?: Record<string, unknown>
): AgentEvent {
  return { role, type, message, data, at: Date.now() };
}
