import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type PackageManager = "pnpm" | "yarn" | "bun" | "npm";

export function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(path.join(cwd, "bun.lockb")) || existsSync(path.join(cwd, "bun.lock"))) {
    return "bun";
  }
  if (existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  return "npm";
}

export interface MissingPeer {
  name: string;
  version: string;
}

/** Read the user's `package.json` deps & devDeps and return any peers not yet present. */
export async function findMissingPeers(
  cwd: string,
  peers: Record<string, string>,
): Promise<MissingPeer[]> {
  const pkgPath = path.join(cwd, "package.json");
  let installed: Record<string, string> = {};
  if (existsSync(pkgPath)) {
    try {
      const raw = JSON.parse(await readFile(pkgPath, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      };
      installed = {
        ...(raw.dependencies ?? {}),
        ...(raw.devDependencies ?? {}),
        ...(raw.peerDependencies ?? {}),
      };
    } catch {
      // ignore; treat as no installed deps
    }
  }
  const missing: MissingPeer[] = [];
  for (const [name, version] of Object.entries(peers)) {
    if (!installed[name]) missing.push({ name, version });
  }
  return missing;
}

export function installCommand(pm: PackageManager, packages: string[]): string {
  const list = packages.join(" ");
  switch (pm) {
    case "pnpm":
      return `pnpm add ${list}`;
    case "yarn":
      return `yarn add ${list}`;
    case "bun":
      return `bun add ${list}`;
    case "npm":
      return `npm install ${list}`;
  }
}
