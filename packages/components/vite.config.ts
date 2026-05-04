import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Used by Storybook (and any future Vite-based tooling). Vitest still uses
// its own vitest.config.ts for test runs.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
