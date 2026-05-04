import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupTmpDir, makeTmpDir, runCli } from "./helpers.js";

const PLAIN_CONFIG = `export default {
  componentsDir: "components/hitl-ui",
  toolsDir: "tools/hitl-ui",
  instructionsDir: "instructions/hitl-ui",
  renderMode: "tool-call",
};
`;

const FAKE_PKG_JSON = JSON.stringify(
  {
    name: "tmp-app",
    version: "0.0.0",
    private: true,
    dependencies: {
      react: "^19.0.0",
      "react-dom": "^19.0.0",
      "@radix-ui/react-checkbox": "^1.1.3",
      "@radix-ui/react-select": "^2.1.4",
      "@radix-ui/react-switch": "^1.1.2",
      clsx: "^2.1.1",
      zod: "^3.23.8",
    },
  },
  null,
  2,
);

async function bootstrap(tmp: string) {
  await writeFile(path.join(tmp, "package.json"), FAKE_PKG_JSON, "utf8");
  await writeFile(path.join(tmp, "hitl-ui.config.ts"), PLAIN_CONFIG, "utf8");
}

describe("hitl-ui add", () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await makeTmpDir();
    await bootstrap(tmp);
  });
  afterEach(async () => {
    await cleanupTmpDir(tmp);
  });

  it("installs the assess triad to the configured target dirs", async () => {
    const result = await runCli(["add", "assess"], tmp);
    expect(result.exitCode).toBe(0);

    expect(existsSync(path.join(tmp, "components/hitl-ui/assess/assess.tsx"))).toBe(true);
    expect(existsSync(path.join(tmp, "components/hitl-ui/assess/assess.types.ts"))).toBe(true);
    expect(existsSync(path.join(tmp, "components/hitl-ui/assess/index.ts"))).toBe(true);
    expect(existsSync(path.join(tmp, "tools/hitl-ui/assess.tool.json"))).toBe(true);
    expect(existsSync(path.join(tmp, "instructions/hitl-ui/assess.instructions.md"))).toBe(true);

    const tsx = await readFile(path.join(tmp, "components/hitl-ui/assess/assess.tsx"), "utf8");
    expect(tsx).toContain('"use client"');
    expect(tsx).toContain("export function Assess");

    const tool = JSON.parse(
      await readFile(path.join(tmp, "tools/hitl-ui/assess.tool.json"), "utf8"),
    ) as { name: string };
    expect(tool.name).toBe("assess");
  });

  it("skips existing files without --force, overwrites with --force", async () => {
    await runCli(["add", "assess"], tmp);
    const dest = path.join(tmp, "components/hitl-ui/assess/assess.tsx");
    await writeFile(dest, "// modified", "utf8");

    const noForce = await runCli(["add", "assess"], tmp);
    expect(noForce.exitCode).toBe(0);
    expect(noForce.stdout).toMatch(/Skipped/);
    expect(await readFile(dest, "utf8")).toBe("// modified");

    const withForce = await runCli(["add", "assess", "--force"], tmp);
    expect(withForce.exitCode).toBe(0);
    expect(await readFile(dest, "utf8")).toContain("export function Assess");
  });

  it("warns about missing peer deps but still installs", async () => {
    await writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "tmp", version: "0.0.0" }, null, 2),
      "utf8",
    );
    const result = await runCli(["add", "assess"], tmp);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Missing peers|peer dependencies/i);
    expect(existsSync(path.join(tmp, "components/hitl-ui/assess/assess.tsx"))).toBe(true);
  });

  it("exits non-zero when component is unknown", async () => {
    const result = await runCli(["add", "does-not-exist"], tmp);
    expect(result.exitCode).toBe(1);
    const output = `${String(result.stdout ?? "")}${String(result.stderr ?? "")}`;
    expect(output).toMatch(/not found|Available components/i);
  });
});
