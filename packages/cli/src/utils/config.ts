import { existsSync } from "node:fs";
import path from "node:path";
import { createJiti } from "jiti";
import { z } from "zod";
import type { HitlUiConfig } from "../runtime.js";

const CONFIG_FILENAMES = [
  "hitl-ui.config.ts",
  "hitl-ui.config.mts",
  "hitl-ui.config.js",
  "hitl-ui.config.mjs",
];

export const hitlUiConfigSchema = z.object({
  componentsDir: z.string().min(1),
  toolsDir: z.string().min(1),
  instructionsDir: z.string().min(1),
  tailwindConfig: z.string().optional(),
  renderMode: z.enum(["tool-call", "message-embed"]).optional(),
}) satisfies z.ZodType<HitlUiConfig>;

export interface LoadedConfig {
  config: HitlUiConfig;
  filepath: string;
}

/** Search upward from `cwd` for a config file. Returns the absolute path or null. */
export function findConfigFile(cwd = process.cwd()): string | null {
  let dir = cwd;
  for (let depth = 0; depth < 6; depth++) {
    for (const name of CONFIG_FILENAMES) {
      const candidate = path.join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function configExists(cwd = process.cwd()): boolean {
  return findConfigFile(cwd) !== null;
}

/** Load and validate the user's hitl-ui.config.* via jiti. Throws if missing or invalid. */
export async function loadConfig(cwd = process.cwd()): Promise<LoadedConfig> {
  const filepath = findConfigFile(cwd);
  if (!filepath) {
    throw new ConfigNotFoundError(
      `Could not find hitl-ui.config.{ts,js,mjs} in ${cwd} or any parent directory.\nRun \`hitl-ui init\` to create one.`,
    );
  }
  const jiti = createJiti(filepath, { interopDefault: true });
  const loaded = (await jiti.import(filepath, { default: true })) as unknown;
  const result = hitlUiConfigSchema.safeParse(loaded);
  if (!result.success) {
    throw new ConfigInvalidError(`Invalid config at ${filepath}:\n${formatZodError(result.error)}`);
  }
  return { config: result.data, filepath };
}

export class ConfigNotFoundError extends Error {
  override name = "ConfigNotFoundError";
}
export class ConfigInvalidError extends Error {
  override name = "ConfigInvalidError";
}

function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `  • ${e.path.join(".") || "(root)"}: ${e.message}`).join("\n");
}
