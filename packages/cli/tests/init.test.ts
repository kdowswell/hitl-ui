import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupTmpDir, makeTmpDir, runCli } from "./helpers.js";

describe("hitl-ui init", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await makeTmpDir();
  });
  afterEach(async () => {
    await cleanupTmpDir(tmp);
  });

  it("writes hitl-ui.config.ts with default paths when --yes is passed", async () => {
    const result = await runCli(["init", "--yes"], tmp);
    expect(result.exitCode).toBe(0);

    const configPath = path.join(tmp, "hitl-ui.config.ts");
    expect(existsSync(configPath)).toBe(true);

    const content = await readFile(configPath, "utf8");
    expect(content).toContain('componentsDir: "components/hitl-ui"');
    expect(content).toContain('toolsDir: "tools/hitl-ui"');
    expect(content).toContain('instructionsDir: "instructions/hitl-ui"');
    expect(content).toContain('renderMode: "tool-call"');
    expect(content).toContain('import type { HitlUiConfig } from "hitl-ui"');
  });

  it("refuses to overwrite existing config without --force", async () => {
    await runCli(["init", "--yes"], tmp);
    const result = await runCli(["init", "--yes"], tmp);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Found existing config/);
  });
});
