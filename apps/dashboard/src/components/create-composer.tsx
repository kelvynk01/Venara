'use client';

/**
 * create-composer.tsx — Conversational "Create with AI" surface (Phase 4, Brief §9/§15 screen 6).
 *
 * State machine:
 *   compose     → user types a plain-language request; textarea + send button.
 *   submitting  → POST /v1/apps/:id/agent in flight; skeleton + inline message.
 *   tracking    → polling GET /v1/agent/:id every STATUS_POLL_INTERVAL_MS; progress checklist.
 *                 Sub-states: planning | capturing | rendering | needs_input | done | failed.
 *
 * Design rules (Brief §15/§21):
 *   - Never a bare spinner — always render the progress checklist from the API.
 *   - Light purple aesthetic; reuse existing Button, Skeleton, ErrorState primitives.
 *   - BRAND.name never hardcoded as a string literal.
 */

import { useAuth } from '@clerk/nextjs';
import {
  BRAND,
  STATUS_POLL_INTERVAL_MS,
  type AgentProgressStep,
  type AgentRequestPublic,
  type ConfirmAgentRequestInput,
  type CreateAgentRequestInput,
} from '@venara/shared';
import { ArrowRight, CheckCircle2, Circle, Loader2, Sparkles, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Top-level UI state machine. */
type ComposerState =
  | { phase: 'compose' }
  | { phase: 'submitting' }
  | { phase: 'tracking'; request: AgentRequestPublic }
  | { phase: 'submit_error'; message: string };

// ─── Constants ────────────────────────────────────────────────────────────────

/** Returns true when the given status signals the run has finished (no further polling needed). */
function isTerminalStatus(status: AgentRequestPublic['status']): status is 'done' | 'failed' {
  return status === 'done' || status === 'failed';
}

const PLACEHOLDER_PROMPTS = [
  `Show how to invite a teammate and set their role to admin.`,
  `Walk through creating a new project from the dashboard.`,
  `Demonstrate how to connect an integration and test it.`,
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateComposer({ appId }: { appId: string }): JSX.Element {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [state, setState] = useState<ComposerState>({ phase: 'compose' });
  const [prompt, setPrompt] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Clears the polling interval unconditionally. */
  function clearPoll(): void {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  /** Clears interval on unmount. */
  useEffect(() => {
    return () => {
      clearPoll();
    };
  }, []);

  // ─── Polling ──────────────────────────────────────────────────────────────

  const pollRequest = useCallback(
    async (requestId: string): Promise<void> => {
      try {
        const token = await getToken();
        const request = await apiFetch<AgentRequestPublic>(`/v1/agent/${requestId}`, token);
        setState({ phase: 'tracking', request });

        if (isTerminalStatus(request.status) || request.status === 'needs_input') {
          clearPoll();
        }
      } catch (err) {
        const message =
          err instanceof ApiRequestError ? err.message : `Could not reach the ${BRAND.name} API.`;
        clearPoll();
        // Keep the last known request state but surface the poll error as a failed status.
        // We do this by setting a synthetic failed state rather than blowing away tracking.
        setState((prev) => {
          if (prev.phase === 'tracking') {
            return {
              phase: 'tracking',
              request: { ...prev.request, status: 'failed', error: message },
            };
          }
          return { phase: 'submit_error', message };
        });
      }
    },
    [getToken],
  );

  /** Start or restart polling for a given request id. */
  const startPolling = useCallback(
    (requestId: string): void => {
      clearPoll();
      intervalRef.current = setInterval(() => {
        void pollRequest(requestId);
      }, STATUS_POLL_INTERVAL_MS);
    },
    [pollRequest],
  );

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(): Promise<void> {
    const trimmed = prompt.trim();
    if (!trimmed || !isLoaded || !isSignedIn) return;

    setState({ phase: 'submitting' });

    try {
      const token = await getToken();
      const body: CreateAgentRequestInput = { prompt: trimmed };
      const request = await apiFetch<AgentRequestPublic>(`/v1/apps/${appId}/agent`, token, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setState({ phase: 'tracking', request });

      // Start polling unless the server already returned a terminal state.
      if (!isTerminalStatus(request.status) && request.status !== 'needs_input') {
        startPolling(request.id);
      }
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : `Could not reach the ${BRAND.name} API.`;
      setState({ phase: 'submit_error', message });
    }
  }

  // ─── Confirm (needs_input gate) ───────────────────────────────────────────

  async function handleConfirm(requestId: string, input: ConfirmAgentRequestInput): Promise<void> {
    try {
      const token = await getToken();
      const updated = await apiFetch<AgentRequestPublic>(`/v1/agent/${requestId}/confirm`, token, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setState({ phase: 'tracking', request: updated });

      // Resume polling if the run is still in progress.
      if (!isTerminalStatus(updated.status) && updated.status !== 'needs_input') {
        startPolling(requestId);
      }
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : `Could not reach the ${BRAND.name} API.`;
      setState((prev) => {
        if (prev.phase === 'tracking') {
          return {
            phase: 'tracking',
            request: { ...prev.request, status: 'failed', error: message },
          };
        }
        return { phase: 'submit_error', message };
      });
    }
  }

  /** Reset back to the compose surface, clearing any prior run. */
  function handleReset(): void {
    clearPoll();
    setPrompt('');
    setState({ phase: 'compose' });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (state.phase === 'compose' || state.phase === 'submit_error') {
    return (
      <div className="space-y-4">
        {state.phase === 'submit_error' && (
          <div
            role="alert"
            className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {state.message}
          </div>
        )}

        <ComposerInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={() => void handleSubmit()}
          disabled={!isLoaded || !isSignedIn}
        />
      </div>
    );
  }

  if (state.phase === 'submitting') {
    return <SubmittingSkeleton />;
  }

  // phase === 'tracking'
  const { request } = state;

  if (request.status === 'failed') {
    return (
      <div className="space-y-6">
        <ErrorState
          title="Run failed"
          description={request.error ?? `${BRAND.name} could not complete this request.`}
          onRetry={handleReset}
        />
      </div>
    );
  }

  if (request.status === 'done' && request.resultVideoId !== null) {
    return (
      <DoneState
        resultVideoId={request.resultVideoId}
        prompt={request.prompt}
        onCreateAnother={handleReset}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress checklist — the primary live feedback surface (Brief §9/§15). */}
      <ProgressChecklist steps={request.progress} status={request.status} />

      {/* CONFIRM gate — needs_input (Brief §9). */}
      {request.status === 'needs_input' && request.question !== null && (
        <ConfirmGate
          requestId={request.id}
          question={request.question}
          onConfirm={(input) => void handleConfirm(request.id, input)}
        />
      )}

      {/* Done but resultVideoId still null: show checklist, wait for it to populate. */}
      {request.status === 'done' && request.resultVideoId === null && (
        <div className="rounded-xl border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          Finalising your video — this will update automatically.
        </div>
      )}
    </div>
  );
}

// ─── Composer input ───────────────────────────────────────────────────────────

function ComposerInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}): JSX.Element {
  const placeholder = PLACEHOLDER_PROMPTS[0] ?? 'Describe what you want to show…';

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    // Cmd/Ctrl + Enter submits.
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-venara-sm transition-shadow focus-within:border-brand-300 focus-within:shadow-venara-md">
      <textarea
        className={cn(
          'block w-full resize-none bg-transparent px-5 pt-5 pb-3',
          'text-sm text-neutral-900 placeholder:text-neutral-400',
          'focus:outline-none',
        )}
        rows={4}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label="Describe the video you want to create"
      />

      {/* Footer row: hint + send button */}
      <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
        <p className="text-xs text-neutral-400">
          ⌘ Return to send &nbsp;·&nbsp; plain language, be specific
        </p>
        <Button
          size="sm"
          variant="primary"
          disabled={disabled || value.trim().length === 0}
          onClick={onSubmit}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Create
        </Button>
      </div>
    </div>
  );
}

// ─── Submitting skeleton ──────────────────────────────────────────────────────

function SubmittingSkeleton(): JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-brand-100 bg-brand-50 px-5 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden />
        <span className="text-sm font-medium text-brand-700">
          Starting your {BRAND.name} run…
        </span>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-3/4 bg-brand-100" />
        <Skeleton className="h-3 w-1/2 bg-brand-100" />
        <Skeleton className="h-3 w-2/3 bg-brand-100" />
      </div>
    </div>
  );
}

// ─── Progress checklist ───────────────────────────────────────────────────────

function ProgressChecklist({
  steps,
  status,
}: {
  steps: AgentProgressStep[];
  status: AgentRequestPublic['status'];
}): JSX.Element {
  const isTerminal = isTerminalStatus(status);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-neutral-100 px-5 py-4">
        {isTerminal ? (
          status === 'done' ? (
            <CheckCircle2 className="h-4 w-4 text-live" aria-hidden />
          ) : (
            <XCircle className="h-4 w-4 text-danger" aria-hidden />
          )
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-brand-500" aria-hidden />
        )}
        <span className="text-sm font-medium text-neutral-700">
          {statusLabel(status)}
        </span>
      </div>

      {/* Steps */}
      {steps.length > 0 ? (
        <ol className="divide-y divide-neutral-50 px-5 py-2">
          {steps.map((step, i) => (
            <ProgressStepRow key={i} step={step} />
          ))}
        </ol>
      ) : (
        /* No steps yet — show a skeleton placeholder while planning */
        <div className="space-y-3 px-5 py-4">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      )}
    </div>
  );
}

function ProgressStepRow({ step }: { step: AgentProgressStep }): JSX.Element {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <StepIcon state={step.state} />
      <span
        className={cn('flex-1 text-sm', {
          'font-medium text-neutral-900': step.state === 'active',
          'text-neutral-500': step.state === 'pending',
          'text-neutral-700': step.state === 'done',
        })}
      >
        {step.label}
      </span>
    </li>
  );
}

function StepIcon({ state }: { state: AgentProgressStep['state'] }): JSX.Element {
  if (state === 'done') {
    return (
      <CheckCircle2
        className="h-4 w-4 shrink-0 text-live"
        aria-label="Done"
      />
    );
  }
  if (state === 'active') {
    return (
      // Pulsing circle — "◉ active" (Brief §9)
      <span
        className="relative flex h-4 w-4 shrink-0 items-center justify-center"
        aria-label="In progress"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-600" />
      </span>
    );
  }
  // pending
  return (
    <Circle
      className="h-4 w-4 shrink-0 text-neutral-300"
      aria-label="Pending"
    />
  );
}

// ─── CONFIRM gate (needs_input) ───────────────────────────────────────────────

function ConfirmGate({
  requestId,
  question,
  onConfirm,
}: {
  requestId: string;
  question: string;
  onConfirm: (input: ConfirmAgentRequestInput) => void;
}): JSX.Element {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(confirm: boolean): Promise<void> {
    setSubmitting(true);
    onConfirm({ confirm, note: note.trim() || undefined });
    // Keep submitting=true; the parent will transition the state.
  }

  return (
    <div className="overflow-hidden rounded-xl border border-brand-200 bg-brand-50">
      {/* Question */}
      <div className="px-5 py-5">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-500">
          Confirmation needed
        </p>
        <p className="text-sm font-medium text-neutral-900">{question}</p>
      </div>

      {/* Note input */}
      <div className="border-t border-brand-100 px-5 py-4">
        <label
          htmlFor={`confirm-note-${requestId}`}
          className="mb-1.5 block text-xs text-neutral-500"
        >
          Optional note (e.g. "use a test email address")
        </label>
        <input
          id={`confirm-note-${requestId}`}
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          disabled={submitting}
          className={cn(
            'w-full rounded-md border border-neutral-200 bg-white px-3 py-2',
            'text-sm text-neutral-900 placeholder:text-neutral-400',
            'focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 border-t border-brand-100 px-5 py-4">
        <Button
          variant="secondary"
          size="sm"
          disabled={submitting}
          onClick={() => void submit(false)}
        >
          Skip / use test data
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={submitting}
          onClick={() => void submit(true)}
        >
          {submitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Confirming…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Confirm
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Done state ───────────────────────────────────────────────────────────────

function DoneState({
  resultVideoId,
  prompt,
  onCreateAnother,
}: {
  resultVideoId: string;
  prompt: string;
  onCreateAnother: () => void;
}): JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-live/30 bg-white">
      <div className="flex items-start gap-4 px-6 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-live-surface">
          <CheckCircle2 className="h-5 w-5 text-live" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-900">Your video is ready</h3>
          <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{prompt}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 px-6 py-4">
        <Link
          href={`/videos/${resultVideoId}`}
          className={cn(
            'inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white',
            'transition-colors hover:bg-brand-700',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
          )}
        >
          Watch video
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>

        <Button variant="ghost" size="sm" onClick={onCreateAnother}>
          Create another
        </Button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(status: AgentRequestPublic['status']): string {
  switch (status) {
    case 'planning':
      return `${BRAND.name} is planning your video…`;
    case 'capturing':
      return 'Capturing your app…';
    case 'rendering':
      return 'Rendering your video…';
    case 'needs_input':
      return 'Waiting for your input';
    case 'done':
      return 'Done';
    case 'failed':
      return 'Run failed';
  }
}
