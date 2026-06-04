/**
 * prompts.ts — ALL LLM prompt builder functions for @venara/llm.
 *
 * Brief §14 contract:
 *  - Prompts are NEVER authored inline in services — always call a builder here.
 *  - System prompts must be byte-stable (no timestamps, no per-request ids) so the
 *    Anthropic prompt-cache prefix holds across requests.
 *  - The pronunciation lexicon is applied in narration + marketing copy by transforming
 *    each `term` → `say` form in the user message, not the system prompt (keeps system
 *    block stable).
 *
 * Each builder returns `{ system: string; user: string }`.
 */
import type { AgentIntentOutput } from './schemas.js';
import type { CaptureBeat } from '@venara/capture';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromptPair {
  system: string;
  user: string;
}

/** Pronunciation lexicon entry (mirrors pronunciationSchema in @venara/shared). */
export interface LexiconEntry {
  term: string;
  say: string;
}

/**
 * App context passed to the planner — at minimum the base URL.
 * An optional route map (path → description) improves step-script quality.
 */
export interface AppContext {
  baseUrl: string;
  /** Optional map of route paths to human descriptions, e.g. { '/settings': 'Account settings page' }. */
  routeMap?: Record<string, string>;
  /** Optional app name for contextual narration. */
  appName?: string;
}

// ─── Allowed capture tools (mirrors CaptureToolName + Brief §8) ──────────────

const ALLOWED_TOOLS = [
  'navigate  — go to a URL; args: { url: string, timeout?: number }',
  'click     — click a target; args: { target: string, timeout?: number }',
  'type      — fill a field; args: { target: string, text: string, timeout?: number }',
  'press     — press a keyboard key; args: { key: string } (Playwright key strings, e.g. "Enter")',
  'scroll    — scroll the viewport; args: { direction: "up"|"down"|"left"|"right", amount?: number }',
  'wait      — wait for a condition or ms; args: { condition: string|number, timeout?: number }',
  'hover     — hover over a target; args: { target: string, timeout?: number }',
  'screenshot— take a full-page screenshot; args: {} (no args required)',
  'assert    — assert a condition is visible; args: { condition: string, timeout?: number }',
  'markBeat  — mark a named beat for narration alignment; args: { label: string }',
].join('\n');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Apply a pronunciation lexicon to a block of copy text.
 * Each `term` (case-insensitive whole-word match) is replaced by its `say` form.
 * Applied in the user message only — never mutates stable system blocks.
 */
function applyLexicon(text: string, lexicon: LexiconEntry[]): string {
  let result = text;
  for (const { term, say } of lexicon) {
    // Whole-word, case-insensitive replacement.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), say);
  }
  return result;
}

// ─── parseIntentPrompt ────────────────────────────────────────────────────────

/**
 * Build the system + user messages for turning a raw user prompt into an AgentIntent.
 *
 * Job: parseIntent → claude-haiku-4-5 (cheap, structured extraction).
 */
export function parseIntentPrompt(userPrompt: string): PromptPair {
  const system = `\
You are the intent parser for Venara, an AI product-video platform.

Your sole task is to parse a user's request and extract a structured AgentIntent JSON object.

Rules:
- "outputType" is "howto" for instructional/tutorial/walkthrough requests, "marketing" for promotional/demo/ad requests. Default to "howto" when unclear.
- "targetFeature" is the specific feature, page, or workflow mentioned. Be concise (≤ 60 chars).
- "goal" is a plain-language summary of what the video should show (≤ 200 chars).
- "constraints.aspect" defaults to "16:9" for howto and "9:16" for marketing when not specified.
- "needsConfirmation" is true ONLY when the request is genuinely ambiguous (e.g. no feature named), contradictory, or would require a destructive/irreversible action to demonstrate.
- Return valid JSON only — no markdown, no commentary.`;

  const user = `Parse this user request into an AgentIntent:\n\n"${userPrompt}"`;

  return { system, user };
}

// ─── planStepsPrompt ──────────────────────────────────────────────────────────

/**
 * Build the system + user messages for producing an ordered capture-step script.
 *
 * Job: planCapture → claude-sonnet-4-6.
 *
 * The system prompt enumerates the 10 allowed capture verbs and explicitly forbids
 * any other verb — Brief §8 / §14.
 */
export function planStepsPrompt(intent: AgentIntentOutput, appContext: AppContext): PromptPair {
  const system = `\
You are the capture planner for Venara, an AI product-video platform.

Given a user intent and app context, you produce an ordered step script that a browser automation engine will execute to capture a product video.

ALLOWED TOOLS — you must ONLY use these 10 verbs:
${ALLOWED_TOOLS}

FORBIDDEN: Any verb not in the list above. Do not invent tool names.

Step script rules:
1. Start with a navigate step to the relevant URL (use baseUrl + route when known).
2. Use markBeat steps to mark key moments that narration should align to (e.g. "feature loaded", "action completed").
3. Prefer accessible role/label targets over CSS selectors. Use visible text when no role/label is available.
4. Keep the script minimal — every step must serve the goal. Cap at 40 steps.
5. Set needsConfirmation: true if any step is irreversible (deleting data, sending emails, making payments) and include a single confirmationQuestion.
6. Return valid JSON only — no markdown fences, no commentary.`;

  const routeSection =
    appContext.routeMap && Object.keys(appContext.routeMap).length > 0
      ? `\n\nKnown routes:\n${Object.entries(appContext.routeMap)
          .map(([path, desc]) => `  ${path} — ${desc}`)
          .join('\n')}`
      : '';

  const user = `\
App base URL: ${appContext.baseUrl}${appContext.appName ? `\nApp name: ${appContext.appName}` : ''}${routeSection}

Intent:
- Goal: ${intent.goal}
- Output type: ${intent.outputType}
- Target feature: ${intent.targetFeature}
${intent.constraints.lengthSeconds ? `- Requested length: ${intent.constraints.lengthSeconds}s` : ''}
${intent.constraints.aspect ? `- Aspect ratio: ${intent.constraints.aspect}` : ''}
${intent.constraints.tone ? `- Tone: ${intent.constraints.tone}` : ''}

Produce a capture step script for this intent.`;

  return { system, user };
}

// ─── narrationPrompt ──────────────────────────────────────────────────────────

/**
 * Build the system + user messages for generating timed how-to narration.
 *
 * Job: copy → claude-sonnet-4-6.
 *
 * The pronunciation lexicon is applied to the user message only (keeps system stable).
 */
export function narrationPrompt(beats: CaptureBeat[], lexicon: LexiconEntry[]): PromptPair {
  const system = `\
You are the narration writer for Venara, an AI product-video platform.

You write clear, friendly, instructional narration aligned to timed beats from a product screen recording.

Rules:
- Write one narration line per beat, aligned to its atMs timestamp.
- Lines should be concise — suitable for text-to-speech (≤ 20 words each).
- Use an active, instructional voice: "Click Settings to open your account preferences."
- Do NOT use filler words ("basically", "simply", "just").
- Apply any pronunciation overrides provided (terms have been pre-substituted in the beat labels).
- Return valid JSON only — no markdown, no commentary.`;

  // Apply lexicon to beat labels so the model sees corrected pronunciation forms.
  const processedBeats = beats.map((b) => ({
    ...b,
    label: applyLexicon(b.label, lexicon),
  }));

  const beatsText = processedBeats
    .map((b) => `  { "atMs": ${b.atMs}, "label": "${b.label}" }`)
    .join(',\n');

  const user = `Write narration lines for the following beats:\n[\n${beatsText}\n]`;

  return { system, user };
}

// ─── marketingCopyPrompt ──────────────────────────────────────────────────────

/**
 * Build the system + user messages for generating marketing hook + CTA copy.
 *
 * Job: copy → claude-sonnet-4-6.
 *
 * The pronunciation lexicon is applied to the user message only (keeps system stable).
 */
export function marketingCopyPrompt(
  intent: AgentIntentOutput,
  beats: CaptureBeat[],
  lexicon: LexiconEntry[],
): PromptPair {
  const system = `\
You are the marketing copywriter for Venara, an AI product-video platform.

You write punchy, benefit-focused marketing copy for short product demo videos.

Rules:
- "hook": one sentence that grabs attention in the first 3 seconds (≤ 120 chars). Lead with the benefit, not the feature name.
- "bodyLines": 1–5 short lines (≤ 15 words each) that walk through the key moments shown in the video.
- "cta": a single call-to-action closing line (≤ 80 chars). E.g. "Try it free — no credit card required."
- Tone: confident, concise, never hyperbolic. Avoid "revolutionary", "game-changing", "AI-powered".
- Apply any pronunciation overrides provided (terms have been pre-substituted in the context).
- Return valid JSON only — no markdown, no commentary.`;

  const tone = intent.constraints.tone ?? 'professional and approachable';

  // Apply lexicon to goal and feature descriptions in the user message.
  const goal = applyLexicon(intent.goal, lexicon);
  const targetFeature = applyLexicon(intent.targetFeature, lexicon);
  const beatLabels = beats
    .map((b) => `  - ${applyLexicon(b.label, lexicon)} (${b.atMs}ms)`)
    .join('\n');

  const user = `\
Write marketing copy for a product demo video.

Feature: ${targetFeature}
Goal: ${goal}
Tone: ${tone}
${beats.length > 0 ? `\nKey moments shown:\n${beatLabels}` : ''}`;

  return { system, user };
}
