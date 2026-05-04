import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { HitlUiConfig } from "../runtime.js";
import { ensureDir } from "./paths.js";
import type { Manifest, ManifestFile, Target } from "./registry.js";

export interface InstallOptions {
  force?: boolean;
}

export interface InstallResult {
  written: string[];
  skipped: string[];
}

/** Resolve the absolute filesystem path where a manifest file should land. */
export function resolveTargetPath(cwd: string, config: HitlUiConfig, file: ManifestFile): string {
  const targetDir = targetDirForConfig(config, file.target);
  return path.resolve(cwd, targetDir, file.path);
}

function targetDirForConfig(config: HitlUiConfig, target: Target): string {
  switch (target) {
    case "components":
      return config.componentsDir;
    case "tools":
      return config.toolsDir;
    case "instructions":
      return config.instructionsDir;
  }
}

/** Write all manifest files to disk under the configured target directories. */
export async function installManifest(
  cwd: string,
  config: HitlUiConfig,
  manifest: Manifest,
  options: InstallOptions = {},
): Promise<InstallResult> {
  const written: string[] = [];
  const skipped: string[] = [];

  for (const file of manifest.files) {
    const dest = resolveTargetPath(cwd, config, file);
    if (existsSync(dest) && !options.force) {
      skipped.push(dest);
      continue;
    }
    await ensureDir(path.dirname(dest));
    await writeFile(dest, file.content, "utf8");
    written.push(dest);
  }

  return { written, skipped };
}
