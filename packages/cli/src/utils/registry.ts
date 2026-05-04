import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { resolveCliRelative } from "./paths.js";

export const targetSchema = z.enum(["components", "tools", "instructions"]);
export type Target = z.infer<typeof targetSchema>;

export const manifestFileSchema = z.object({
  target: targetSchema,
  path: z.string().min(1),
  content: z.string(),
});
export type ManifestFile = z.infer<typeof manifestFileSchema>;

export const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1),
  description: z.string(),
  peers: z.record(z.string(), z.string()).default({}),
  files: z.array(manifestFileSchema).min(1),
});
export type Manifest = z.infer<typeof manifestSchema>;

export const manifestSummarySchema = z.object({
  name: z.string(),
  description: z.string(),
});
export type ManifestSummary = z.infer<typeof manifestSummarySchema>;

export interface RegistrySource {
  /** If set, fetches manifests over HTTPS instead of using the bundled registry. */
  registryUrl?: string;
}

const REGISTRY_DIRNAME = "registry";

function bundledRegistryDir(metaUrl: string): string {
  return resolveCliRelative(metaUrl, REGISTRY_DIRNAME);
}

/** Load a single manifest by name. */
export async function loadManifest(
  metaUrl: string,
  name: string,
  source: RegistrySource = {},
): Promise<Manifest> {
  const raw = await readManifestRaw(metaUrl, name, source);
  const result = manifestSchema.safeParse(raw);
  if (!result.success) {
    throw new RegistryError(`Manifest \`${name}\` is malformed: ${result.error.message}`);
  }
  return result.data;
}

async function readManifestRaw(
  metaUrl: string,
  name: string,
  source: RegistrySource,
): Promise<unknown> {
  if (source.registryUrl) {
    const url = joinUrl(source.registryUrl, `${name}.json`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new RegistryError(
        `Could not fetch manifest \`${name}\` from ${url} (status ${res.status}).`,
      );
    }
    return (await res.json()) as unknown;
  }
  const file = path.join(bundledRegistryDir(metaUrl), `${name}.json`);
  try {
    const text = await readFile(file, "utf8");
    return JSON.parse(text) as unknown;
  } catch (err) {
    throw new RegistryError(
      `Component \`${name}\` not found in bundled registry. ` +
        `Available components: run \`hitl-ui list\`. (${(err as Error).message})`,
    );
  }
}

/** List every component in the bundled registry. Remote registries should expose an index.json — not implemented for v0. */
export async function listManifests(metaUrl: string): Promise<ManifestSummary[]> {
  const dir = bundledRegistryDir(metaUrl);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const summaries: ManifestSummary[] = [];
  for (const file of entries) {
    if (!file.endsWith(".json")) continue;
    try {
      const text = await readFile(path.join(dir, file), "utf8");
      const parsed = JSON.parse(text) as unknown;
      const summary = manifestSummarySchema.safeParse(parsed);
      if (summary.success) summaries.push(summary.data);
    } catch {
      // skip malformed
    }
  }
  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}

function joinUrl(base: string, rel: string): string {
  return base.endsWith("/") ? `${base}${rel}` : `${base}/${rel}`;
}

export class RegistryError extends Error {
  override name = "RegistryError";
}
