import { readFile } from "node:fs/promises";
import path from "node:path";

const cache = new Map<string, string>();

/** Load an Agent Skill's SKILL.md so its instructions can be injected into the agent prompt. */
export async function loadSkill(name: string): Promise<string> {
  if (cache.has(name)) return cache.get(name)!;
  const file = path.join(process.cwd(), "skills", name, "SKILL.md");
  const content = await readFile(file, "utf8");
  cache.set(name, content);
  return content;
}
