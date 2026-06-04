/**
 * client.ts — lazy Anthropic client singleton + generic structured-output completion.
 *
 * Brief §14 contract:
 *  - Client is created lazily on first use (importing this module never throws even if
 *    ANTHROPIC_API_KEY is absent — the error surfaces at call time).
 *  - NEVER log the API key or full prompts containing secrets.
 *  - Structured outputs via tool-use with a forced single tool call + Zod parse.
 *    (The `messages.parse` / `zodOutputFormat` API from the brief targets a future SDK
 *    release; the installed SDK v0.55.x uses tool-use for structured JSON — same
 *    semantic guarantee: model-driven JSON → validated by Zod, null on failure.)
 *  - System block passed with cache_control: { type: 'ephemeral' } for prompt caching.
 *  - One retry on null/invalid output or thrown error, then throw a clear error.
 *  - NEVER include the API key or secret prompt content in error messages.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodType } from 'zod';
import { MODELS, type LlmJob } from './index.js';

// ─── Lazy singleton ───────────────────────────────────────────────────────────

let _client: Anthropic | undefined;

/**
 * Return the shared Anthropic client instance, creating it on first call.
 * Reads ANTHROPIC_API_KEY from the environment (never logged, never passed explicitly).
 * Throws at call time — never at import time — so the module is safe to import in
 * environments where the key may not yet be set (e.g. during type-checking).
 */
export function getAnthropic(): Anthropic {
  if (!_client) {
    // new Anthropic() reads process.env.ANTHROPIC_API_KEY automatically.
    // We do NOT pass the key as an argument to avoid any risk of it appearing
    // in stack traces, logs, or error messages.
    _client = new Anthropic();
  }
  return _client;
}

// ─── Structured completion ────────────────────────────────────────────────────

/**
 * Generic structured-output completion with one retry.
 *
 * Implementation: uses a forced tool-use call (tool_choice: { type: 'tool' }) to
 * extract structured JSON guaranteed to match the provided Zod schema.  The tool
 * input is passed as the single `tool_use` content block in the response, then
 * validated through Zod.  On null/invalid/thrown error, retries exactly once.
 *
 * System block is passed with cache_control: { type: 'ephemeral' } so the stable
 * system text is cached across requests (Brief §14 prompt-caching requirement).
 *
 * @param job      The LLM job key — selects the right model from MODELS.
 * @param system   System prompt text (must be byte-stable — no per-request ids or timestamps).
 * @param user     User message text.
 * @param schema   Zod schema for the expected output shape.
 * @returns        Validated, typed output T.
 * @throws         LlmOutputError if the model refuses or returns invalid output after one retry.
 */
export async function completeStructured<T>(
  job: LlmJob,
  system: string,
  user: string,
  schema: ZodType<T>,
): Promise<T> {
  const model = MODELS[job];

  // Brief §14: short structured outputs — 4096 for intent/plan, 2048 for copy.
  const maxTokens: number = job === 'copy' ? 2048 : 4096;

  // Convert the Zod schema to a JSON Schema object the Anthropic tool definition requires.
  // We use target: 'openApi3' for the cleanest output (no $schema root property).
  const inputSchema = zodToJsonSchema(schema, {
    target: 'openApi3',
    // Descriptions from .describe() calls pass through — helps model output quality.
  }) as Record<string, unknown>;

  // Stable tool name for the forced tool call (does not appear in output).
  const TOOL_NAME = 'structured_output';

  const tool: Anthropic.Tool = {
    name: TOOL_NAME,
    description: 'Return the structured output as required by the schema.',
    input_schema: inputSchema as Anthropic.Tool.InputSchema,
  };

  // System block with prompt-cache hint.
  // Brief §14: keep system text byte-stable so the cache prefix holds.
  const systemBlock: Anthropic.TextBlockParam = {
    type: 'text',
    text: system,
    cache_control: { type: 'ephemeral' },
  };

  async function attempt(): Promise<T> {
    const response = await getAnthropic().messages.create({
      model,
      max_tokens: maxTokens,
      system: [systemBlock],
      messages: [{ role: 'user', content: user }],
      tools: [tool],
      // Force the model to call exactly our structured_output tool.
      tool_choice: { type: 'tool', name: TOOL_NAME },
    });

    // Extract the tool_use block from the response.
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (!toolUseBlock) {
      throw new LlmOutputError(
        `Model ${model} did not return a tool_use block for job "${job}".`,
        job,
      );
    }

    // Validate through Zod — this is the "parsed_output === null" equivalent.
    const parseResult = schema.safeParse(toolUseBlock.input);
    if (!parseResult.success) {
      throw new LlmOutputError(
        `Model ${model} returned invalid structured output for job "${job}": ${parseResult.error.message}`,
        job,
      );
    }

    return parseResult.data;
  }

  try {
    return await attempt();
  } catch (firstErr) {
    // One retry as required by Brief §14 — never retry more than once.
    try {
      return await attempt();
    } catch (secondErr) {
      const message =
        secondErr instanceof LlmOutputError
          ? secondErr.message
          : `LLM job "${job}" failed after one retry: ${describeError(secondErr)}`;
      throw new LlmOutputError(message, job);
    }
  }
}

// ─── Error type ───────────────────────────────────────────────────────────────

/**
 * Thrown when a structured LLM completion fails after one retry.
 * Message must NEVER contain the API key or prompt secrets.
 */
export class LlmOutputError extends Error {
  readonly job: LlmJob;

  constructor(message: string, job: LlmJob) {
    super(message);
    this.name = 'LlmOutputError';
    this.job = job;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Produce a short, secret-free description of an unknown thrown value. */
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
