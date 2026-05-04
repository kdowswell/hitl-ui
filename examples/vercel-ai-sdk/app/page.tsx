"use client";

import { Assess } from "@/components/hitl-ui/assess";
import { Decide } from "@/components/hitl-ui/decide";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { type FormEvent, useState } from "react";

export default function Page() {
  const { messages, sendMessage, addToolResult, status } = useChat();
  const [input, setInput] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming" || status === "submitted") return;
    const text = input;
    setInput("");
    await sendMessage({ text });
  };

  const isWorking = status === "streaming" || status === "submitted";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <header className="mb-6 space-y-1">
        <p className="text-xs uppercase tracking-widest text-zinc-500">hitl-ui · live demo</p>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Agent → tool call → component → result
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          A real LLM agent (Vercel AI SDK v6) drives this chat. Try prompts like{" "}
          <em className="font-mono not-italic">
            "I want to ship a new feature flag — what do you need from me?"
          </em>{" "}
          or <em className="font-mono not-italic">"help me pick a database"</em>. The agent will
          invoke the <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">assess</code> or{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">decide</code> tool; the
          rendered hitl-ui component lives inline in this conversation.
        </p>
      </header>

      <section className="flex flex-col gap-4 pb-32" aria-live="polite">
        {messages.length === 0 ? <EmptyState /> : null}
        {messages.map((m) => (
          <Message key={m.id} message={m} addToolResult={addToolResult} />
        ))}
        {isWorking ? <p className="text-sm italic text-zinc-500">Agent is thinking…</p> : null}
      </section>

      <form
        onSubmit={handleSubmit}
        className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/90 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90"
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the agent…"
            disabled={isWorking}
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <button
            type="submit"
            disabled={isWorking || !input.trim()}
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Send
          </button>
        </div>
      </form>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
      <p className="mb-3 font-medium text-zinc-900 dark:text-zinc-100">Try one of these prompts:</p>
      <ul className="space-y-1 font-mono text-xs">
        <li>"I want to set up a new feature flag — what do you need to know?"</li>
        <li>"Help me pick a database for an events pipeline."</li>
        <li>"Score Postgres vs ClickHouse vs DynamoDB for our analytics workload."</li>
      </ul>
    </div>
  );
}

interface MessageProps {
  message: UIMessage;
  addToolResult: (params: { tool: string; toolCallId: string; output: unknown }) => void;
}

function Message({ message, addToolResult }: MessageProps) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex flex-col gap-2"}>
      {message.parts.map((part, i) => {
        // Plain text
        if (part.type === "text") {
          return (
            <div
              key={`${message.id}-${i}`}
              className={
                isUser
                  ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-zinc-950 px-4 py-2 text-sm text-white dark:bg-zinc-50 dark:text-zinc-950"
                  : "max-w-[90%] rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-2 text-sm text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
              }
            >
              {part.text}
            </div>
          );
        }

        // Tool invocations — typed-tool variants have type "tool-<name>"
        if (part.type === "tool-assess") {
          return (
            <ToolFrame key={part.toolCallId} state={part.state} name="assess">
              {part.state === "input-available" ? (
                <Assess
                  // biome-ignore lint/suspicious/noExplicitAny: agent-supplied input matches AssessParams via Zod schema
                  {...(part.input as any)}
                  onSubmit={(result) =>
                    addToolResult({
                      tool: "assess",
                      toolCallId: part.toolCallId,
                      output: result,
                    })
                  }
                />
              ) : null}
            </ToolFrame>
          );
        }

        if (part.type === "tool-decide") {
          return (
            <ToolFrame key={part.toolCallId} state={part.state} name="decide">
              {part.state === "input-available" ? (
                <Decide
                  // biome-ignore lint/suspicious/noExplicitAny: agent-supplied input matches DecideParams via Zod schema
                  {...(part.input as any)}
                  onSubmit={(result) =>
                    addToolResult({
                      tool: "decide",
                      toolCallId: part.toolCallId,
                      output: result,
                    })
                  }
                />
              ) : null}
            </ToolFrame>
          );
        }

        return null;
      })}
    </div>
  );
}

function ToolFrame({
  name,
  state,
  children,
}: {
  name: string;
  state: string;
  children: React.ReactNode;
}) {
  if (state === "input-streaming") {
    return (
      <p className="text-xs italic text-zinc-500">
        Agent is preparing the <code>{name}</code> tool…
      </p>
    );
  }
  if (state === "input-available") return <>{children}</>;
  if (state === "output-available") {
    return (
      <p className="text-xs text-zinc-500">
        ✓ <code>{name}</code> submitted
      </p>
    );
  }
  if (state === "output-error" || state === "output-denied") {
    return <p className="text-xs text-red-600">✗ {name} errored</p>;
  }
  // Approval states + unknown — render nothing so the chat keeps flowing.
  return null;
}
