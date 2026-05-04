import { assessParamsSchema } from "@/components/hitl-ui/assess";
import { decideParamsSchema } from "@/components/hitl-ui/decide";
import { selectModel } from "@/lib/provider";
import { type UIMessage, convertToModelMessages, stepCountIs, streamText, tool } from "ai";

// Allow streaming responses up to 60s for slower local Ollama models.
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a helpful assistant working with a developer. \
Whenever you need structured input from the user, prefer calling the \`assess\` \
or \`decide\` tools instead of asking in plain chat — they render rich UIs \
that the user finds easier to fill in than free-form replies.

Tool selection rules:
- assess: when you need 1-8 typed answers (text/select/multi_select/scale/boolean/number/email/url/date) before proceeding.
- decide: when the user must pick between 2-5 options. Use mode "select" for a simple pick, "score" when per-criterion weighting matters and you'll use the breakdown.
- For binary yes/no, just ask in chat.
- For long open-ended discussion, just ask in chat.
- Always include a 'description' field with the user-facing context for why you're asking.
- Never chain assess→assess. If you need >8 answers, redesign the flow across multiple turns.

After a tool result comes back, briefly acknowledge it and proceed; don't repeat the user's answers verbatim.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: selectModel(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(8),
    tools: {
      assess: tool({
        description:
          "Present a structured assessment with 1-8 mixed-type questions. Returns typed answers keyed by question id.",
        inputSchema: assessParamsSchema,
        // No execute — resolved client-side by the user filling in the form.
      }),
      decide: tool({
        description:
          "Present 2-5 options for the user to pick between. Use mode 'select' for a simple pick or 'score' for per-criterion weighting. Returns { winner } or { winner, scores }.",
        inputSchema: decideParamsSchema,
        // No execute — resolved client-side by the user picking / scoring.
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
