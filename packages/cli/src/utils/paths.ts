import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve a path relative to the user's current working directory. */
export function resolveCwd(...segments: string[]): string {
  return path.resolve(process.cwd(), ...segments);
}

/** Ensure a directory exists (recursive). */
export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

/** Resolve a path relative to this CLI's installed location (i.e., next to dist/index.js). */
export function resolveCliRelative(metaUrl: string, ...segments: string[]): string {
  const here = path.dirname(fileURLToPath(metaUrl));
  return path.resolve(here, ...segments);
}
