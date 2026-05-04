import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { ConfigNotFoundError, loadConfig } from "../utils/config.js";
import { installManifest } from "../utils/install.js";
import { detectPackageManager, findMissingPeers, installCommand } from "../utils/peers.js";
import { RegistryError, loadManifest } from "../utils/registry.js";

export interface AddCommandOptions {
  metaUrl: string;
  name: string;
  registry?: string;
  force?: boolean;
  yes?: boolean;
}

export async function runAdd(options: AddCommandOptions): Promise<void> {
  const cwd = process.cwd();

  let loaded: Awaited<ReturnType<typeof loadConfig>>;
  try {
    loaded = await loadConfig(cwd);
  } catch (err) {
    if (err instanceof ConfigNotFoundError) {
      p.note(err.message, pc.red("hitl-ui add"));
      process.exitCode = 1;
      return;
    }
    throw err;
  }
  const { config, filepath } = loaded;

  const manifest = await loadManifestSafe(options);
  if (!manifest) return;

  const missing = await findMissingPeers(cwd, manifest.peers);
  if (missing.length > 0) {
    const pm = detectPackageManager(cwd);
    const cmd = installCommand(
      pm,
      missing.map((m) => `${m.name}@${m.version}`),
    );
    const peerList = missing.map((m) => `  • ${pc.cyan(m.name)} ${pc.dim(m.version)}`).join("\n");
    p.note(
      `${pc.yellow("Heads up:")} this component declares peer dependencies you don't have.\n\n${peerList}\n\nRun:  ${pc.bold(cmd)}`,
      "Missing peers",
    );
  }

  const result = await installManifest(cwd, config, manifest, { force: options.force });

  const summary = [
    pc.green(`Installed ${pc.bold(manifest.name)}.`),
    `Config: ${pc.dim(path.relative(cwd, filepath))}`,
    "",
    pc.bold("Files written:"),
    ...result.written.map((f) => `  ${pc.green("+")} ${path.relative(cwd, f)}`),
    ...(result.skipped.length > 0
      ? [
          "",
          pc.bold(pc.yellow("Skipped (already exist; pass --force to overwrite):")),
          ...result.skipped.map((f) => `  ${pc.yellow("·")} ${path.relative(cwd, f)}`),
        ]
      : []),
    "",
    pc.bold("Next:"),
    `  • Import the component:  ${pc.cyan(`import { ${pascal(manifest.name)} } from "@/${posix(config.componentsDir)}/${manifest.name}";`)}`,
    `  • Register the tool definition (${pc.cyan(`${posix(config.toolsDir)}/${manifest.name}.tool.json`)}) with your agent.`,
    `  • Read the agent instructions (${pc.cyan(`${posix(config.instructionsDir)}/${manifest.name}.instructions.md`)}).`,
  ].join("\n");

  p.note(summary, "hitl-ui add");
}

async function loadManifestSafe(options: AddCommandOptions) {
  try {
    return await loadManifest(options.metaUrl, options.name, {
      registryUrl: options.registry,
    });
  } catch (err) {
    if (err instanceof RegistryError) {
      p.note(err.message, pc.red("hitl-ui add"));
      process.exitCode = 1;
      return null;
    }
    throw err;
  }
}

function pascal(name: string): string {
  return name
    .split(/[-_]/)
    .map((s) => {
      if (!s) return "";
      const first = s.charAt(0);
      return first.toUpperCase() + s.slice(1);
    })
    .join("");
}

function posix(p: string): string {
  return p.replaceAll("\\", "/").replace(/^\.\//, "");
}
