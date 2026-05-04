import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Result, execa } from "execa";

const here = path.dirname(fileURLToPath(import.meta.url));
export const cliBin = path.resolve(here, "../dist/index.js");
export const cliRoot = path.resolve(here, "..");

export async function makeTmpDir(prefix = "hitl-ui-test-"): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function cleanupTmpDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

export async function runCli(
  args: string[],
  cwd: string,
  options: { reject?: boolean } = {},
): Promise<Result> {
  return execa("node", [cliBin, ...args], {
    cwd,
    reject: options.reject ?? false,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });
}
