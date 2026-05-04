import * as p from "@clack/prompts";
import pc from "picocolors";
import { listManifests } from "../utils/registry.js";

export interface ListCommandOptions {
  metaUrl: string;
}

export async function runList(options: ListCommandOptions): Promise<void> {
  const summaries = await listManifests(options.metaUrl);
  if (summaries.length === 0) {
    p.note("No components found in the bundled registry. Did the build step run?", "hitl-ui list");
    return;
  }

  const longestName = summaries.reduce((max, s) => Math.max(max, s.name.length), 0);
  const rows = summaries
    .map((s) => `  ${pc.cyan(s.name.padEnd(longestName))}  ${pc.dim(s.description)}`)
    .join("\n");

  p.note(rows, `Available components (${summaries.length})`);
  console.log();
  console.log(pc.dim(`Install with: ${pc.bold("hitl-ui add <name>")}`));
}
