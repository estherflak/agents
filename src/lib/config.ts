// Central runtime configuration for the PMM agent app.

/** Anthropic model used for every agent run. */
export const MODEL = "claude-sonnet-5";

/**
 * Max output tokens per run. 2000 truncates long outputs like battlecards
 * and content calendars, so we keep headroom at 4000.
 */
export const MAX_TOKENS = 4000;

/** Per-user daily cap on agent runs. */
export const MAX_RUNS_PER_DAY = 40;

/** Bounds per-call input cost by capping the characters we send to the model. */
export const MAX_INPUT_CHARS = 50000;
