import { readFile } from "node:fs/promises";
import { Command } from "commander";
import pc from "picocolors";
import { runAdd } from "./commands/add.js";
import { runInit } from "./commands/init.js";
import { runList } from "./commands/list.js";
import { resolveCliRelative } from "./utils/paths.js";

const META_URL = import.meta.url;

async function readVersion(): Promise<string> {
  try {
    const pkgPath = resolveCliRelative(META_URL, "../package.json");
    const raw = JSON.parse(await readFile(pkgPath, "utf8")) as { version?: string };
    return raw.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function main() {
  const program = new Command();
  const version = await readVersion();

  program
    .name("hitl-ui")
    .description(
      "Install human-in-the-loop UI component triads (React + tool def + agent instructions) into your project.",
    )
    .version(version);

  program
    .command("init")
    .description("Scaffold hitl-ui.config.ts in the current project")
    .option("-y, --yes", "Skip prompts and use defaults")
    .option("-f, --force", "Overwrite existing config")
    .action(async (opts: { yes?: boolean; force?: boolean }) => {
      await runInit({ metaUrl: META_URL, yes: opts.yes, force: opts.force });
    });

  program
    .command("add <name>")
    .description("Install a component triad into the current project")
    .option("-r, --registry <url>", "Use a remote registry URL instead of the bundled one")
    .option("-f, --force", "Overwrite files that already exist")
    .option("-y, --yes", "Skip prompts and use defaults")
    .action(async (name: string, opts: { registry?: string; force?: boolean; yes?: boolean }) => {
      await runAdd({
        metaUrl: META_URL,
        name,
        registry: opts.registry,
        force: opts.force,
        yes: opts.yes,
      });
    });

  program
    .command("list")
    .description("Show all components available in the bundled registry")
    .action(async () => {
      await runList({ metaUrl: META_URL });
    });

  await program.parseAsync(process.argv);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(pc.red(`Error: ${message}`));
  if (process.env.AGENT_UI_DEBUG && err instanceof Error && err.stack) {
    console.error(pc.dim(err.stack));
  }
  process.exit(1);
});
