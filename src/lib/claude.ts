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
