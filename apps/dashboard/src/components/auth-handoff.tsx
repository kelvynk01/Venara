'use client';

/**
 * auth-handoff.tsx — interactive login handoff (ADR-001).
 *
 * Opens the app's OWN login in a hosted browser (Browserbase Live View) embedded here,
 * the user signs in (SSO / 2FA / passkeys all work), then we harvest the resulting
 * session. Venara never sees the password. Four states: idle · live · completing · error.
 */
import { useAuth } from '@clerk/nextjs';
import { BRAND, type StartAuthResponse } from '@venara/shared';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiRequestError, apiFetch } from '@/lib/api';

type HandoffState =
  | { phase: 'idle' }
  | { phase: 'starting' }
  | { phase: 'live'; session: StartAuthResponse; note?: string }
  | { phase: 'completing'; session: StartAuthResponse }
  | { phase: 'error'; message: string };

export function AuthHandoff({
  appId,
  onComplete,
}: {
  appId: string;
  onComplete: () => void;
}): JSX.Element {
  const { getToken } = useAuth();
  const [state, setState] = useState<HandoffState>({ phase: 'idle' });

  async function start(): Promise<void> {
    setState({ phase: 'starting' });
    try {
      const token = await getToken();
      const session = await apiFetch<StartAuthResponse>(`/v1/apps/${appId}/auth/start`, token, {
        method: 'POST',
      });
      setState({ phase: 'live', session });
    } catch (err) {
      setState({ phase: 'error', message: errMessage(err) });
    }
  }

  async function complete(session: StartAuthResponse): Promise<void> {
    setState({ phase: 'completing', session });
    try {
      const token = await getToken();
      await apiFetch<{ ok: true }>(`/v1/apps/${appId}/auth/complete`, token, {
        method: 'POST',
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
      onComplete();
    } catch (err) {
      // "No login detected" → let the user keep signing in and try again.
      const message = errMessage(err);
      setState({ phase: 'live', session, note: message });
    }
  }

  if (state.phase === 'idle' || state.phase === 'starting') {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900">Sign in to your app</p>
            <p className="mt-1 text-sm text-neutral-600">
              {BRAND.name} will open your app&apos;s real login in a secure browser. Sign in
              normally — {BRAND.name} keeps the session, never your password.
            </p>
            <Button
              className="mt-3"
              size="sm"
              disabled={state.phase === 'starting'}
              onClick={() => void start()}
            >
              {state.phase === 'starting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening…
                </>
              ) : (
                'Open login'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger/5 p-5">
        <p className="text-sm text-danger">{state.message}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => void start()}>
          Try again
        </Button>
      </div>
    );
  }

  // live | completing — show the embedded login browser.
  const { session } = state;
  const completing = state.phase === 'completing';
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-neutral-900">Sign in to your app below</p>
        <Button size="sm" disabled={completing} onClick={() => void complete(session)}>
          {completing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
            </>
          ) : (
            "I've finished signing in"
          )}
        </Button>
      </div>

      {state.phase === 'live' && state.note && (
        <p role="alert" className="mb-3 text-xs text-danger">
          {state.note}
        </p>
      )}

      <iframe
        title="Sign in to your app"
        src={session.liveViewUrl}
        // sandbox lets the embedded login run scripts/forms while isolating it from this app.
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        className="h-[480px] w-full rounded-lg border border-neutral-200 bg-neutral-50"
      />
      <p className="mt-2 text-xs text-neutral-400">
        {BRAND.name} never sees your password — only the resulting session is stored, encrypted.
      </p>
    </div>
  );
}

function errMessage(err: unknown): string {
  return err instanceof ApiRequestError
    ? err.message
    : `Could not reach the ${BRAND.name} API. Please try again.`;
}
