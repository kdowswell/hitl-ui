/**
 * Public runtime export for `hitl-ui`. Imported by users from their
 * `hitl-ui.config.ts` for type-safe configuration. Zero runtime cost —
 * `defineConfig` is a typed identity function.
 */

export type RenderMode = "tool-call" | "message-embed";

export interface HitlUiConfig {
  /** Where component .tsx files (and their colocated types) are installed. */
  componentsDir: string;
  /** Where tool definition (.tool.json) files are copied for agent consumption. */
  toolsDir: string;
  /** Where instruction (.instructions.md) files are copied. */
  instructionsDir: string;
  /** Path to the project's Tailwind config, if any. Reserved for future style injection. */
  tailwindConfig?: string;
  /** How the chat framework dispatches the component. Defaults to "tool-call". */
  renderMode?: RenderMode;
}

export function defineConfig(config: HitlUiConfig): HitlUiConfig {
  return config;
}
