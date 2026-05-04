import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupTmpDir, makeTmpDir, runCli } from "./helpers.js";

describe("hitl-ui list", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await makeTmpDir();
  });
  afterEach(async () => {
    await cleanupTmpDir(tmp);
  });

  it("lists the assess component from the bundled registry", async () => {
    const result = await runCli(["list"], tmp);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("assess");
  });
});
