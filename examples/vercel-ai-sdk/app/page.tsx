"use client";

import { Assess } from "@/components/hitl-ui/assess";
import { Decide } from "@/components/hitl-ui/decide";
import { useChat } from "@ai-sdk/react";
import { type UIMessage, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { type FormEvent, useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  {
    label: "Feature flag setup",
    prompt: "I want to set up a new feature flag — what do you need to know?",
    tool: "assess",
  },
  {
    label: "Pick a database",
    prompt: "Help me pick a database for an events pipeline.",
    tool: "decide",
  },
  {
    label: "Score databases on cost / speed / ops",
    prompt:
      "Score Postgres vs ClickHouse vs DynamoDB across cost, query speed, and ops burden — use the score-mode matrix.",
    tool: "decide",
  },
];

export default function Page() {
  const { messages, sendMessage, addToolResult, status, error, setMessages } = useChat({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<string | null>(null);
  const tailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/provider")
      .then((r) => r.json() as Promise<{ provider: string }>)
      .then((d) => setProvider(d.provider))
      .catch(() => setProvider(null));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages/status are scroll triggers, not reads
  useEffect(() => {
    tailRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const isWorking = status === "streaming" || status === "submitted";

  const send = (text: string) => {
    if (!text.trim() || isWorking) return;
    setInput("");
    sendMessage({ text });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        onClear={messages.length > 0 ? () => setMessages([]) : undefined}
        provider={provider}
      />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 pb-40 pt-10">
        {messages.length === 0 ? (
          <EmptyState onSelect={send} />
        ) : (
          messages.map((m) => <MessageRow key={m.id} message={m} addToolResult={addToolResult} />)
        )}

        {isWorking ? <ThinkingRow /> : null}
        {error ? <ErrorRow message={error.message} /> : null}

        <div ref={tailRef} aria-hidden="true" />
      </main>

      <Composer
        value={input}
        onChange={setInput}
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          send(input);
        }}
        disabled={isWorking}
      />
    </div>
  );
}

/* ============================================================================
 * Header
 * ========================================================================== */

function Header({ onClear, provider }: { onClear?: () => void; provider: string | null }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            hitl-ui
          </span>
          <span className="truncate text-sm font-medium text-foreground">Live agent demo</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {provider ? (
            <span
              title="Active LLM provider · configured via env"
              className="hidden truncate font-mono sm:inline"
            >
              {provider}
            </span>
          ) : null}
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md border border-border bg-card px-2 py-1 transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/* ============================================================================
 * Empty state — clickable suggestion cards
 * ========================================================================== */

function EmptyState({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          What can I help you with?
        </h1>
        <p className="text-sm text-muted-foreground">
          A real LLM agent runs in this chat. When it needs structured input, it calls the{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">assess</code> or{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">decide</code> tool — and
          the matching <span className="font-mono text-xs">hitl-ui</span> component renders inline
          below.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onSelect(s.prompt)}
            className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-foreground/30 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-card-foreground">{s.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
                {s.tool}
              </span>
            </div>
            <span className="text-xs leading-relaxed text-muted-foreground">{s.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
 * Message — assistant or user, with text + tool parts
 * ========================================================================== */

interface MessageRowProps {
  message: UIMessage;
  addToolResult: (params: { tool: string; toolCallId: string; output: unknown }) => void;
}

function MessageRow({ message, addToolResult }: MessageRowProps) {
  const isUser = message.role === "user";
  return (
    <article className="flex flex-col gap-2.5">
      <RoleLabel sender={isUser ? "you" : "agent"} />
      <div className="flex flex-col gap-3">
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <p
                key={`${message.id}-${i}`}
                className="text-sm leading-relaxed text-foreground whitespace-pre-wrap"
              >
                {part.text}
              </p>
            );
          }

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
    </article>
  );
}

function RoleLabel({ sender }: { sender: "you" | "agent" }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={
          sender === "agent"
            ? "size-1.5 rounded-full bg-primary"
            : "size-1.5 rounded-full bg-muted-foreground/60"
        }
      />
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {sender}
      </span>
    </div>
  );
}

/* ============================================================================
 * Tool frame — labels the agent's tool call and wraps the rendered component
 * ========================================================================== */

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
      <ToolStatus name={name}>
        <span className="italic">preparing…</span>
      </ToolStatus>
    );
  }

  if (state === "input-available") {
    return (
      <div className="space-y-2">
        <ToolStatus name={name} status="ready" />
        {children}
      </div>
    );
  }

  if (state === "output-available") {
    return <ToolStatus name={name} status="submitted" />;
  }

  if (state === "output-error" || state === "output-denied") {
    return <ToolStatus name={name} status="error" />;
  }

  return null;
}

function ToolStatus({
  name,
  status = "active",
  children,
}: {
  name: string;
  status?: "active" | "ready" | "submitted" | "error";
  children?: React.ReactNode;
}) {
  const dot =
    status === "submitted"
      ? "bg-primary"
      : status === "error"
        ? "bg-destructive"
        : "bg-muted-foreground/60 animate-pulse";

  const label =
    status === "submitted"
      ? "submitted"
      : status === "error"
        ? "errored"
        : status === "ready"
          ? "awaiting input"
          : "active";

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />
      <span className="inline-flex items-center rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">
        tool · {name}
      </span>
      <span>{label}</span>
      {children}
    </div>
  );
}

/* ============================================================================
 * Thinking + error rows
 * ========================================================================== */

function ThinkingRow() {
  return (
    <div className="flex flex-col gap-2.5">
      <RoleLabel sender="agent" />
      <div className="flex h-5 items-center gap-1">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
      </div>
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/15 font-mono text-xs font-bold text-destructive"
      >
        !
      </span>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">Agent error</p>
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/* ============================================================================
 * Composer
 * ========================================================================== */

function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  disabled: boolean;
}) {
  const canSend = !disabled && value.trim().length > 0;
  return (
    <form
      onSubmit={onSubmit}
      className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      <div className="mx-auto flex max-w-3xl items-end gap-2 px-6 py-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ask the agent…"
            disabled={disabled}
            className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!canSend}
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </form>
  );
}
