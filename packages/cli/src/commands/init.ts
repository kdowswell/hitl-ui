import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { findConfigFile } from "../utils/config.js";
import { ensureDir, resolveCliRelative, resolveCwd } from "../utils/paths.js";

const DEFAULTS = {
  componentsDir: "components/hitl-ui",
  toolsDir: "tools/hitl-ui",
  instructionsDir: "instructions/hitl-ui",
};

export interface InitCommandOptions {
  metaUrl: string;
  yes?: boolean;
  force?: boolean;
}

export async function runInit(options: InitCommandOptions): Promise<void> {
  const cwd = process.cwd();
  const existing = findConfigFile(cwd);
  if (existing && !options.force) {
    p.note(
      `Found existing config at ${pc.cyan(path.relative(cwd, existing))}.\n` +
        `Re-run with ${pc.bold("--force")} to overwrite.`,
      "hitl-ui init",
    );
    return;
  }

  let answers = DEFAULTS;
  if (!options.yes) {
    p.intro(pc.bgCyan(pc.black(" hitl-ui init ")));
    const result = await p.group(
      {
        componentsDir: () =>
          p.text({
            message: "Where should component .tsx files be installed?",
            placeholder: DEFAULTS.componentsDir,
            initialValue: DEFAULTS.componentsDir,
          }),
        toolsDir: () =>
          p.text({
            message: "Where should tool definition (.tool.json) files be copied?",
            placeholder: DEFAULTS.toolsDir,
            initialValue: DEFAULTS.toolsDir,
          }),
        instructionsDir: () =>
          p.text({
            message: "Where should agent instruction (.instructions.md) files be copied?",
            placeholder: DEFAULTS.instructionsDir,
            initialValue: DEFAULTS.instructionsDir,
          }),
      },
      {
        onCancel: () => {
          p.cancel("Init cancelled.");
          process.exit(0);
        },
      },
    );
    answers = {
      componentsDir: nonEmpty(result.componentsDir, DEFAULTS.componentsDir),
      toolsDir: nonEmpty(result.toolsDir, DEFAULTS.toolsDir),
      instructionsDir: nonEmpty(result.instructionsDir, DEFAULTS.instructionsDir),
    };
  }

  const tmplPath = resolveCliRelative(options.metaUrl, "templates/hitl-ui.config.ts.tmpl");
  const fallbackTmpl = resolveCliRelative(
    options.metaUrl,
    "../src/templates/hitl-ui.config.ts.tmpl",
  );
  const tmpl = await readTemplate(tmplPath, fallbackTmpl);
  const rendered = tmpl
    .replaceAll("{{componentsDir}}", answers.componentsDir)
    .replaceAll("{{toolsDir}}", answers.toolsDir)
    .replaceAll("{{instructionsDir}}", answers.instructionsDir);

  const dest = resolveCwd("hitl-ui.config.ts");
  await ensureDir(path.dirname(dest));
  await writeFile(dest, rendered, "utf8");

  if (!options.yes) {
    p.outro(
      pc.green(`Wrote ${pc.cyan("hitl-ui.config.ts")}. Next: ${pc.bold("hitl-ui add assess")}`),
    );
  } else {
    console.log(`Wrote ${dest}`);
  }
}

async function readTemplate(primary: string, fallback: string): Promise<string> {
  if (existsSync(primary)) return readFile(primary, "utf8");
  if (existsSync(fallback)) return readFile(fallback, "utf8");
  throw new Error(`Could not find init template at ${primary} or ${fallback}`);
}

function nonEmpty(input: unknown, fallback: string): string {
  if (typeof input === "string" && input.trim().length > 0) return input.trim();
  return fallback;
}
