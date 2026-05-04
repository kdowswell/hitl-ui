import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    clean: true,
    target: "node20",
    sourcemap: false,
    banner: { js: "#!/usr/bin/env node" },
    splitting: false,
    minify: false,
  },
  {
    entry: { runtime: "src/runtime.ts" },
    format: ["esm"],
    dts: true,
    clean: false,
    target: "node20",
    sourcemap: false,
    splitting: false,
    minify: false,
  },
]);
