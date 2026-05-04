import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { createOllama } from "ollama-ai-provider-v2";

/**
 * Provider selection for the demo.
 *
 * Resolution order:
 *   1. AI_PROVIDER=openai      → OpenAI (requires OPENAI_API_KEY)
 *   2. AI_PROVIDER=ollama      → Ollama (defaults to http://localhost:11434)
 *   3. AI_PROVIDER unset:
 *        - OPENAI_API_KEY set  → OpenAI
 *        - otherwise           → Ollama (the OSS-aligned default)
 *
 * The Ollama path needs no API key; just install Ollama, pull a model, and run.
 * See README.md for full setup.
 */
export function selectModel(): LanguageModel {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  const wantsOpenAI = explicit === "openai" || (!explicit && Boolean(process.env.OPENAI_API_KEY));

  if (wantsOpenAI) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "AI_PROVIDER=openai requires OPENAI_API_KEY. Set it in .env.local or unset AI_PROVIDER to fall back to Ollama.",
      );
    }
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const modelId = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    return openai(modelId);
  }

  // Ollama (local, free, OSS-aligned default)
  const baseURL = process.env.OLLAMA_HOST
    ? `${process.env.OLLAMA_HOST.replace(/\/$/, "")}/api`
    : "http://localhost:11434/api";
  const ollama = createOllama({ baseURL });
  const modelId = process.env.OLLAMA_MODEL ?? "llama3.2";
  return ollama(modelId);
}

export function describeProvider(): string {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  const wantsOpenAI = explicit === "openai" || (!explicit && Boolean(process.env.OPENAI_API_KEY));
  if (wantsOpenAI) {
    return `OpenAI · ${process.env.OPENAI_MODEL ?? "gpt-4o-mini"}`;
  }
  return `Ollama · ${process.env.OLLAMA_MODEL ?? "llama3.2"} (${
    process.env.OLLAMA_HOST ?? "http://localhost:11434"
  })`;
}
