"use client";

import { Assess, type AssessParams, type AssessResult } from "@/components/hitl-ui/assess";
import { useState } from "react";

const MOCK_TOOL_CALL: AssessParams = {
  title: "Architecture intake",
  description:
    "I need a few details about your stack before I propose a migration plan. This is what an LLM agent might present mid-workflow.",
  questions: [
    {
      id: "framework",
      type: "select",
      prompt: "Which framework is the app on today?",
      options: ["Next.js", "Remix", "SvelteKit", "Plain Vite + React", "Other"],
    },
    {
      id: "concerns",
      type: "multi_select",
      prompt: "Which concerns should the migration prioritize?",
      options: ["Type safety", "Bundle size", "DX speed", "SEO", "Edge deployment"],
    },
    {
      id: "risk",
      type: "scale",
      prompt: "Risk tolerance for this migration",
      scale_min_label: "Conservative",
      scale_max_label: "Aggressive",
      scale_steps: 5,
    },
    {
      id: "ssr",
      type: "boolean",
      prompt: "Does the app currently rely on SSR for any user-facing routes?",
    },
    {
      id: "team_size",
      type: "number",
      prompt: "How many engineers will be involved?",
      placeholder: "e.g. 4",
      validation: { min: 1, max: 200 },
    },
    {
      id: "target_date",
      type: "date",
      prompt: "Target completion date (optional)",
      required: false,
    },
    {
      id: "notes",
      type: "textarea",
      prompt: "Anything else worth knowing?",
      placeholder: "Constraints, deadlines, sacred cows…",
      required: false,
    },
  ],
};

export default function Page() {
  const [result, setResult] = useState<AssessResult | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-zinc-500">hitl-ui demo</p>
        <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
          Mock tool call → rendered component → tool result
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The form below is what a chat framework would render in response to an agent calling{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
            assess
          </code>
          . On submit, the result object becomes the tool result the agent receives next.
        </p>
      </header>

      <Assess {...MOCK_TOOL_CALL} onSubmit={setResult} />

      <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Tool result (what the agent would see next)
        </h2>
        <pre className="overflow-x-auto text-xs text-zinc-900 dark:text-zinc-100">
          {result
            ? JSON.stringify(result, null, 2)
            : "// Submit the form above to see the structured tool result."}
        </pre>
      </section>
    </main>
  );
}
