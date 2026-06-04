/**
 * tools.ts — capture tool-set executors (Brief §8).
 *
 * Each executor maps exactly one CaptureToolName to a Playwright action.
 * Target resolution order (Brief §8):
 *   1. Accessible role/label  (getByRole / getByLabel)
 *   2. Visible text           (getByText)
 *   3. CSS selector           (locator)
 *
 * A failed action returns a structured CaptureStepResult (ok: false, error) — it NEVER
 * throws past the runner, so the agent can replan once before failing the capture.
 *
 * Typed values (e.g. passwords) are NEVER included in log output (Brief §17).
 */
import type { Page } from 'playwright-core';
import type {
  AssertArgs,
  CaptureBeat,
  CaptureStep,
  CaptureStepResult,
  ClickArgs,
  HoverArgs,
  MarkBeatArgs,
  NavigateArgs,
  PressArgs,
  ScrollArgs,
  TypeArgs,
  WaitArgs,
} from './index';

const DEFAULT_ACTION_TIMEOUT_MS = 15_000;
const DEFAULT_WAIT_MS = 500;

/** Context passed through the executor to collect beats and the session start time. */
export interface ExecutorContext {
  page: Page;
  /** Epoch ms when the session began (for computing beat.atMs). */
  sessionStartMs: number;
  beats: CaptureBeat[];
}

// ─── Target resolution helpers ───────────────────────────────────────────────

/**
 * Resolve a target string to a Playwright Locator using the priority:
 * accessible-role-label → visible-text → CSS selector.
 *
 * We try getByRole and getByLabel first; if no accessible element is matched within a
 * short probe timeout, we fall back to getByText, then finally to a raw CSS locator.
 *
 * NOTE: We use `.first()` on each attempt to avoid strict-mode errors when multiple
 * elements match a text or selector — the agent should emit precise targets, but we
 * degrade gracefully rather than crashing.
 */
async function resolveTarget(page: Page, target: string) {
  // 1. Try accessible label (works for input[aria-label], label[for], etc.)
  const byLabel = page.getByLabel(target);
  if ((await byLabel.count()) > 0) return byLabel.first();

  // 2. Try getByRole with a name that matches the target string (covers buttons, links, etc.)
  //    We iterate a common set of interactive roles.
  const interactiveRoles = [
    'button',
    'link',
    'menuitem',
    'option',
    'tab',
    'checkbox',
    'radio',
    'textbox',
    'combobox',
    'listbox',
  ] as const;
  for (const role of interactiveRoles) {
    const byRole = page.getByRole(role, { name: target });
    if ((await byRole.count()) > 0) return byRole.first();
  }

  // 3. Visible text
  const byText = page.getByText(target, { exact: false });
  if ((await byText.count()) > 0) return byText.first();

  // 4. CSS selector (last resort)
  return page.locator(target).first();
}

// ─── Individual executors ────────────────────────────────────────────────────

async function execNavigate(ctx: ExecutorContext, args: NavigateArgs): Promise<CaptureStepResult> {
  const timeout = args.timeout ?? DEFAULT_ACTION_TIMEOUT_MS;
  await ctx.page.goto(args.url, { timeout, waitUntil: 'domcontentloaded' });
  return { ok: true };
}

async function execClick(ctx: ExecutorContext, args: ClickArgs): Promise<CaptureStepResult> {
  const timeout = args.timeout ?? DEFAULT_ACTION_TIMEOUT_MS;
  const locator = await resolveTarget(ctx.page, args.target);
  await locator.click({ timeout });
  return { ok: true };
}

async function execType(ctx: ExecutorContext, args: TypeArgs): Promise<CaptureStepResult> {
  const timeout = args.timeout ?? DEFAULT_ACTION_TIMEOUT_MS;
  const locator = await resolveTarget(ctx.page, args.target);
  await locator.fill(args.text, { timeout });
  // NOTE: args.text is intentionally NOT included in any log line (Brief §17).
  return { ok: true };
}

async function execPress(ctx: ExecutorContext, args: PressArgs): Promise<CaptureStepResult> {
  await ctx.page.keyboard.press(args.key);
  return { ok: true };
}

async function execScroll(ctx: ExecutorContext, args: ScrollArgs): Promise<CaptureStepResult> {
  const amount = args.amount ?? 300;
  const deltaX = args.direction === 'left' ? -amount : args.direction === 'right' ? amount : 0;
  const deltaY = args.direction === 'up' ? -amount : args.direction === 'down' ? amount : 0;
  await ctx.page.mouse.wheel(deltaX, deltaY);
  return { ok: true };
}

async function execWait(ctx: ExecutorContext, args: WaitArgs): Promise<CaptureStepResult> {
  if (typeof args.condition === 'number') {
    await ctx.page.waitForTimeout(args.condition > 0 ? args.condition : DEFAULT_WAIT_MS);
    return { ok: true };
  }
  const timeout = args.timeout ?? DEFAULT_ACTION_TIMEOUT_MS;
  // Try as a CSS selector first, then as visible text.
  try {
    await ctx.page.waitForSelector(args.condition, { timeout, state: 'visible' });
    return { ok: true };
  } catch {
    // Selector not found; try as visible text condition.
    await ctx.page.getByText(args.condition).first().waitFor({ timeout, state: 'visible' });
    return { ok: true };
  }
}

async function execHover(ctx: ExecutorContext, args: HoverArgs): Promise<CaptureStepResult> {
  const timeout = args.timeout ?? DEFAULT_ACTION_TIMEOUT_MS;
  const locator = await resolveTarget(ctx.page, args.target);
  await locator.hover({ timeout });
  return { ok: true };
}

async function execScreenshot(ctx: ExecutorContext): Promise<CaptureStepResult> {
  // A mid-session screenshot step stores the image as a beat artifact.
  // The full-page snapshot at session end uses the CDP path in session.ts.
  await ctx.page.screenshot({ type: 'png', fullPage: true });
  return { ok: true };
}

async function execAssert(ctx: ExecutorContext, args: AssertArgs): Promise<CaptureStepResult> {
  const timeout = args.timeout ?? DEFAULT_ACTION_TIMEOUT_MS;
  try {
    await ctx.page.waitForSelector(args.condition, { timeout, state: 'visible' });
    return { ok: true };
  } catch {
    // Try as visible text fallback.
    const byText = ctx.page.getByText(args.condition, { exact: false });
    if ((await byText.count()) > 0) return { ok: true };
    return { ok: false, error: `Assertion failed: "${args.condition}" not found on page` };
  }
}

function execMarkBeat(ctx: ExecutorContext, args: MarkBeatArgs): CaptureStepResult {
  ctx.beats.push({ label: args.label, atMs: Date.now() - ctx.sessionStartMs });
  return { ok: true };
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

/**
 * Execute a single CaptureStep, catching all errors and returning a structured result.
 * Never throws — the worker/runner decides whether to replan (Brief §8).
 */
export async function executeTool(
  ctx: ExecutorContext,
  step: CaptureStep,
): Promise<CaptureStepResult> {
  const start = Date.now();
  try {
    let result: CaptureStepResult;
    switch (step.tool) {
      case 'navigate':
        result = await execNavigate(ctx, (step.args ?? { url: '' }) as NavigateArgs);
        break;
      case 'click':
        result = await execClick(ctx, (step.args ?? { target: '' }) as ClickArgs);
        break;
      case 'type':
        result = await execType(ctx, (step.args ?? { target: '', text: '' }) as TypeArgs);
        break;
      case 'press':
        result = await execPress(ctx, (step.args ?? { key: '' }) as PressArgs);
        break;
      case 'scroll':
        result = await execScroll(ctx, (step.args ?? { direction: 'down' }) as ScrollArgs);
        break;
      case 'wait':
        result = await execWait(ctx, (step.args ?? { condition: DEFAULT_WAIT_MS }) as WaitArgs);
        break;
      case 'hover':
        result = await execHover(ctx, (step.args ?? { target: '' }) as HoverArgs);
        break;
      case 'screenshot':
        result = await execScreenshot(ctx);
        break;
      case 'assert':
        result = await execAssert(ctx, (step.args ?? { condition: '' }) as AssertArgs);
        break;
      case 'markBeat':
        result = execMarkBeat(ctx, (step.args ?? { label: 'beat' }) as MarkBeatArgs);
        break;
      default: {
        // Exhaustiveness: TypeScript will flag unhandled tools.
        const _exhaustive: never = step.tool;
        result = { ok: false, error: `Unknown tool: ${String(_exhaustive)}` };
      }
    }
    return { ...result, durationMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      // Never include typed text or other sensitive args in the error (Brief §17).
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}
