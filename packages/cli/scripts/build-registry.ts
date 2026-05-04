/**
 * Walks packages/components/*\/meta.json, reads each referenced source file,
 * and emits packages/cli/dist/registry/<name>.json — manifests with file
 * contents inlined as strings (shadcn-shaped).
 *
 * Also copies src/templates/* to dist/templates/ so `init` can find them.
 *
 * Run by `pnpm --filter hitl-ui build` after tsup completes.
 */
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;

interface MetaFile {
  target: "components" | "tools" | "instructions";
  path: string;
  source: string;
}

interface Meta {
  name: string;
  description: string;
  peers: Record<string, string>;
  files: MetaFile[];
}

interface ManifestFile {
  target: MetaFile["target"];
  path: string;
  content: string;
}

interface Manifest {
  schemaVersion: typeof SCHEMA_VERSION;
  name: string;
  description: string;
  peers: Record<string, string>;
  files: ManifestFile[];
}

const here = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(here, "..");
const componentsRoot = path.resolve(cliRoot, "../components");
const distRoot = path.resolve(cliRoot, "dist");
const distRegistry = path.resolve(distRoot, "registry");
const distTemplates = path.resolve(distRoot, "templates");
const srcTemplates = path.resolve(cliRoot, "src/templates");

async function main() {
  if (!existsSync(componentsRoot)) {
    throw new Error(`Components root not found at ${componentsRoot}`);
  }
  if (!existsSync(distRoot)) {
    throw new Error("dist/ not found — run `tsup` first.");
  }

  await mkdir(distRegistry, { recursive: true });
  await mkdir(distTemplates, { recursive: true });

  const componentDirs = await readdir(componentsRoot, { withFileTypes: true });
  let count = 0;
  for (const entry of componentDirs) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(componentsRoot, entry.name);
    const metaPath = path.join(dir, "meta.json");
    if (!existsSync(metaPath)) continue;

    const meta = JSON.parse(await readFile(metaPath, "utf8")) as Meta;
    const files: ManifestFile[] = [];
    for (const file of meta.files) {
      const sourcePath = path.join(dir, file.source);
      if (!existsSync(sourcePath)) {
        throw new Error(`Source file missing: ${sourcePath} (referenced by ${metaPath})`);
      }
      const content = await readFile(sourcePath, "utf8");
      files.push({ target: file.target, path: file.path, content });
    }
    const manifest: Manifest = {
      schemaVersion: SCHEMA_VERSION,
      name: meta.name,
      description: meta.description,
      peers: meta.peers ?? {},
      files,
    };
    const dest = path.join(distRegistry, `${meta.name}.json`);
    await writeFile(dest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    count++;
    console.log(`✓ registry/${meta.name}.json (${files.length} files)`);
  }

  // Copy templates
  if (existsSync(srcTemplates)) {
    const templates = await readdir(srcTemplates);
    for (const file of templates) {
      const src = path.join(srcTemplates, file);
      const dest = path.join(distTemplates, file);
      await copyFile(src, dest);
    }
    console.log(`✓ templates/ (${templates.length} files)`);
  }

  console.log(`\nBuilt registry with ${count} component(s).`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
