import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Assess } from "./assess";

const meta = {
  title: "Patterns/Assess",
  component: Assess,
  parameters: {
    docs: {
      description: {
        component:
          "Cognitive op: **provide info**. Multi-question structured form (1–8 questions) with mixed field types. The agent calls the `assess` tool; the user answers in one shot; a typed result object goes back to the agent.\n\nAll variants in this file render the same component with different `questions` payloads — change the theme in the toolbar to see the CSS-variable cascade in action.",
      },
    },
  },
  args: {
    onSubmit: fn(),
  },
} satisfies Meta<typeof Assess>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Minimal — single text question. Smallest possible assessment.
 * ------------------------------------------------------------------------- */
export const Minimal: Story = {
  args: {
    title: "What should I name this branch?",
    description: "Use kebab-case. I'll create the branch and switch to it.",
    questions: [
      {
        id: "name",
        type: "text",
        prompt: "Branch name",
        placeholder: "feature-flag-rollout",
      },
    ],
  },
};

/* ---------------------------------------------------------------------------
 * AllFieldTypes — every supported field type in one form. Useful for visual
 * regression and theme testing.
 * ------------------------------------------------------------------------- */
export const AllFieldTypes: Story = {
  args: {
    title: "Field type showcase",
    description: "Every supported assess field type rendered in one form.",
    questions: [
      { id: "text", type: "text", prompt: "Single-line text", placeholder: "short answer" },
      { id: "textarea", type: "textarea", prompt: "Multi-line text", placeholder: "longer prose…" },
      {
        id: "select",
        type: "select",
        prompt: "Dropdown (single)",
        options: ["Apple", "Banana", "Cherry"],
      },
      {
        id: "multi",
        type: "multi_select",
        prompt: "Checkbox group (many)",
        options: ["Read", "Write", "Admin"],
      },
      {
        id: "scale",
        type: "scale",
        prompt: "Confidence",
        scale_min_label: "Low",
        scale_max_label: "High",
        scale_steps: 5,
      },
      { id: "bool", type: "boolean", prompt: "Enable telemetry?" },
      {
        id: "num",
        type: "number",
        prompt: "Concurrency",
        validation: { min: 1, max: 64 },
      },
      { id: "date", type: "date", prompt: "Target date", required: false },
    ],
  },
};

/* ---------------------------------------------------------------------------
 * RequirementsIntake — realistic multi-question flow an agent might use to
 * scope a feature implementation.
 * ------------------------------------------------------------------------- */
export const RequirementsIntake: Story = {
  args: {
    title: "Feature flag setup",
    description: "I need a few details to scaffold the flag correctly.",
    questions: [
      {
        id: "name",
        type: "text",
        prompt: "Flag identifier (kebab-case)",
        placeholder: "new-checkout-flow",
      },
      {
        id: "default",
        type: "boolean",
        prompt: "Default state ON for new users?",
      },
      {
        id: "rollout",
        type: "select",
        prompt: "Rollout strategy",
        options: ["All users", "Internal only", "Percentage"],
      },
      {
        id: "percent",
        type: "number",
        prompt: "Initial rollout percent",
        validation: { min: 0, max: 100 },
      },
      {
        id: "audience",
        type: "multi_select",
        prompt: "Which audiences should see it?",
        options: ["Free", "Pro", "Team", "Enterprise"],
      },
      {
        id: "confidence",
        type: "scale",
        prompt: "Confidence in the default state",
        scale_min_label: "Guessing",
        scale_max_label: "Certain",
        scale_steps: 5,
      },
    ],
  },
};

/* ---------------------------------------------------------------------------
 * Migration intake — same payload as the example app's mock, for parity.
 * ------------------------------------------------------------------------- */
export const ArchitectureIntake: Story = {
  args: {
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
        prompt: "Risk tolerance",
        scale_min_label: "Conservative",
        scale_max_label: "Aggressive",
        scale_steps: 5,
      },
      { id: "ssr", type: "boolean", prompt: "Currently relies on SSR?" },
      {
        id: "team_size",
        type: "number",
        prompt: "How many engineers?",
        validation: { min: 1, max: 200 },
      },
      { id: "target", type: "date", prompt: "Target completion date", required: false },
      {
        id: "notes",
        type: "textarea",
        prompt: "Anything else?",
        placeholder: "Constraints, deadlines, sacred cows…",
        required: false,
      },
    ],
  },
};

/* ---------------------------------------------------------------------------
 * OptionalOnly — every field optional, submit always enabled.
 * ------------------------------------------------------------------------- */
export const OptionalOnly: Story = {
  args: {
    title: "Optional follow-ups",
    description:
      "All questions are optional. Submit is enabled from the start; users can skip everything.",
    questions: [
      { id: "feedback", type: "textarea", prompt: "Any feedback?", required: false },
      {
        id: "rating",
        type: "scale",
        prompt: "Rate this experience",
        scale_steps: 5,
        required: false,
      },
      { id: "follow_up", type: "boolean", prompt: "OK to follow up?" },
    ],
  },
};
