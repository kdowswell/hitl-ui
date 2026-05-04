import { createGateway } from "@ai-sdk/gateway";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { createOllama } from "ollama-ai-provider-v2";

/**
 * Provider selection for the demo.
 *
 * Defaults are tuned for "best fit for AI SDK users" first, then "OSS-aligned
 * local fallback" second.
 *
 * Resolution order:
 *   1. AI_PROVIDER=gateway     → Vercel AI Gateway (requires AI_GATEWAY_API_KEY)
 *   2. AI_PROVIDER=openai      → OpenAI direct    (requires OPENAI_API_KEY)
 *   3. AI_PROVIDER=ollama      → Ollama local     (defaults to http://localhost:11434)
 *   4. AI_PROVIDER unset, auto-detect:
 *        - AI_GATEWAY_API_KEY set → Gateway (RECOMMENDED for any AI SDK app)
 *        - OPENAI_API_KEY set     → OpenAI direct
 *        - otherwise              → Ollama localhost (the OSS-aligned default)
 *
 * The Vercel AI Gateway is the recommended path: one API key, swap any
 * provider/model with a string change, free tier, native to the AI SDK.
 * See README.md for setup paths for all three providers.
 */
export function selectModel(): LanguageModel {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  const path = resolvePath(explicit);

  switch (path) {
    case "gateway": {
      // The Gateway picks up AI_GATEWAY_API_KEY automatically when present.
      const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });
      const modelId = process.env.AI_GATEWAY_MODEL ?? "anthropic/claude-haiku-4-5";
      return gateway(modelId);
    }
    case "openai": {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error(
          "OpenAI direct path requires OPENAI_API_KEY. Either set the key or unset AI_PROVIDER to fall back.",
        );
      }
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const modelId = process.env.OPENAI_MODEL ?? "gpt-5-mini";
      return openai(modelId);
    }
    case "ollama": {
      const baseURL = process.env.OLLAMA_HOST
        ? `${process.env.OLLAMA_HOST.replace(/\/$/, "")}/api`
        : "http://localhost:11434/api";
      const ollama = createOllama({ baseURL });
      const modelId = process.env.OLLAMA_MODEL ?? "qwen3:8b";
      return ollama(modelId);
    }
  }
}

type ProviderPath = "gateway" | "openai" | "ollama";

function resolvePath(explicit: string | undefined): ProviderPath {
  if (explicit === "gateway") return "gateway";
  if (explicit === "openai") return "openai";
  if (explicit === "ollama") return "ollama";
  if (process.env.AI_GATEWAY_API_KEY) return "gateway";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "ollama";
}

export function describeProvider(): string {
  const path = resolvePath(process.env.AI_PROVIDER?.toLowerCase());
  switch (path) {
    case "gateway":
      return `Vercel AI Gateway · ${process.env.AI_GATEWAY_MODEL ?? "anthropic/claude-haiku-4-5"}`;
    case "openai":
      return `OpenAI direct · ${process.env.OPENAI_MODEL ?? "gpt-5-mini"}`;
    case "ollama":
      return `Ollama · ${process.env.OLLAMA_MODEL ?? "qwen3:8b"} (${
        process.env.OLLAMA_HOST ?? "http://localhost:11434"
      })`;
  }
}
