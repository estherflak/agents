import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { MAX_INPUT_CHARS, MAX_TOKENS, MODEL } from "@/lib/config";

// Server-only Anthropic client. The API key must never reach the browser.
let cached: Anthropic | null = null;

export function getClaude() {
  if (cached) return cached;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY. See .env.local.example.");
  }

  cached = new Anthropic({ apiKey });
  return cached;
}

/**
 * Run a single-turn agent completion. `input` is truncated to MAX_INPUT_CHARS
 * to bound per-call cost. Returns the concatenated text of the response.
 */
export async function runAgent({
  system,
  input,
}: {
  system: string;
  input: string;
}): Promise<string> {
  const client = getClaude();

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: input.slice(0, MAX_INPUT_CHARS) }],
  });

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

// Fixed framing prepended to every step. Keeps the model scoped to the one step
// the PMM authored, rather than free-associating across the whole workflow.
const STEP_SYSTEM_FRAMING =
  "You are executing one step of a multi-step marketing workflow that a product marketer designed. Follow the step instructions exactly. Output only what the step asks for.";

/**
 * Run one step of a PMM workflow. The prompt is composed in three labelled
 * parts (spec §4.2): fixed system framing, then context (source material +
 * prior step outputs), then the PMM's verbatim step instructions. This
 * transparency is the teaching goal — the PMM's own words drive the model and
 * they can see exactly how each step feeds the next.
 */
export async function runStep({
  title,
  instructions,
  inputText,
  priorStepOutputs,
}: {
  title: string;
  instructions: string;
  inputText?: string;
  priorStepOutputs?: string[];
}): Promise<string> {
  const parts: string[] = [];

  if (inputText && inputText.trim()) {
    parts.push(`--- SOURCE MATERIAL ---\n${inputText.trim()}`);
  }

  (priorStepOutputs ?? []).forEach((output, i) => {
    if (output && output.trim()) {
      parts.push(`--- OUTPUT OF STEP ${i + 1} ---\n${output.trim()}`);
    }
  });

  parts.push(`--- STEP INSTRUCTIONS: ${title} ---\n${instructions}`);

  return runAgent({ system: STEP_SYSTEM_FRAMING, input: parts.join("\n\n") });
}
