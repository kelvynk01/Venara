'use client';

/**
 * connect-form.tsx — the "one magic input" connect form (Brief §15, screen 2 / §18).
 *
 * POST /v1/apps with a ConnectAppInput body. Renders field-level and API errors inline.
 * On success redirects to /apps/[id]. The authorized checkbox is required per §18 —
 * the user attests they own or are authorised to capture the app.
 */
import { useAuth } from '@clerk/nextjs';
import { BRAND, type ConnectedAppPublic } from '@venara/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';

/** Login mode selection. */
type LoginMode = 'none' | 'credentials';

/** Per-field error map returned by the API (422 details). */
type FieldErrors = Partial<Record<string, string>>;

/** Extract hostname from a URL string, falling back to the raw string. */
function urlHost(raw: string): string {
  try {
    return new URL(raw).hostname;
  } catch {
    return raw;
  }
}

/** Simple client-side URL guard. */
function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ConnectForm(): JSX.Element {
  const { getToken } = useAuth();
  const router = useRouter();

  // --- form field state ---
  const [baseUrl, setBaseUrl] = useState('');
  const [name, setName] = useState('');
  const [loginMode, setLoginMode] = useState<LoginMode>('none');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(false);

  // --- submission state ---
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  /** Resolve the display name: user-typed value or auto-derived hostname. */
  const resolvedName = name.trim() !== '' ? name.trim() : urlHost(baseUrl);

  /** Validate fields client-side before hitting the API. */
  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!isValidUrl(baseUrl)) {
      errors['baseUrl'] = 'Enter a valid URL starting with http:// or https://';
    }
    if (loginMode === 'credentials') {
      if (!username.trim()) errors['username'] = 'Username is required';
      if (!password.trim()) errors['password'] = 'Password is required';
    }
    if (!authorized) {
      errors['authorized'] = 'You must confirm you own or are authorised to capture this app';
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setApiError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const token = await getToken();
      const body: Record<string, unknown> = {
        name: resolvedName,
        baseUrl,
        loginMode,
        authorized: true as const,
      };
      if (loginMode === 'credentials') {
        body['credentials'] = { username: username.trim(), password };
      }
      const app = await apiFetch<ConnectedAppPublic>('/v1/apps', token, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      router.push(`/apps/${app.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setApiError(err.message);
      } else {
        setApiError(`Could not reach the ${BRAND.name} API. Please try again.`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-8">
      {/* App URL */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-neutral-900">Your app</legend>

        <div className="space-y-1">
          <label htmlFor="baseUrl" className="block text-sm font-medium text-neutral-700">
            App URL <span aria-hidden className="text-danger">*</span>
          </label>
          <input
            id="baseUrl"
            type="url"
            autoComplete="url"
            placeholder="https://app.yourproduct.com"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setFieldErrors((prev) => ({ ...prev, baseUrl: undefined }));
            }}
            aria-describedby={fieldErrors['baseUrl'] ? 'baseUrl-error' : undefined}
            aria-invalid={fieldErrors['baseUrl'] !== undefined}
            className={cn(inputBase, fieldErrors['baseUrl'] ? inputError : inputDefault)}
          />
          {fieldErrors['baseUrl'] && (
            <p id="baseUrl-error" className={errorText}>
              {fieldErrors['baseUrl']}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
            Display name{' '}
            <span className="font-normal text-neutral-400">(optional — defaults to hostname)</span>
          </label>
          <input
            id="name"
            type="text"
            autoComplete="off"
            placeholder={baseUrl ? urlHost(baseUrl) : 'My App'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(inputBase, inputDefault)}
          />
        </div>
      </fieldset>

      {/* Login section */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-neutral-900">Login</legend>

        <div className="flex flex-col gap-2 sm:flex-row">
          <RadioOption
            id="login-none"
            name="loginMode"
            value="none"
            checked={loginMode === 'none'}
            label="No login needed"
            description="Public app or already signed in"
            onChange={() => setLoginMode('none')}
          />
          <RadioOption
            id="login-credentials"
            name="loginMode"
            value="credentials"
            checked={loginMode === 'credentials'}
            label="Use test credentials"
            description={`${BRAND.name} will log in before recording`}
            onChange={() => setLoginMode('credentials')}
          />
        </div>

        {loginMode === 'credentials' && (
          <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="space-y-1">
              <label htmlFor="username" className="block text-sm font-medium text-neutral-700">
                Username or email <span aria-hidden className="text-danger">*</span>
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }}
                aria-describedby={fieldErrors['username'] ? 'username-error' : undefined}
                aria-invalid={fieldErrors['username'] !== undefined}
                className={cn(inputBase, fieldErrors['username'] ? inputError : inputDefault)}
              />
              {fieldErrors['username'] && (
                <p id="username-error" className={errorText}>
                  {fieldErrors['username']}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                Password <span aria-hidden className="text-danger">*</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                aria-describedby={fieldErrors['password'] ? 'password-error' : undefined}
                aria-invalid={fieldErrors['password'] !== undefined}
                className={cn(inputBase, fieldErrors['password'] ? inputError : inputDefault)}
              />
              {fieldErrors['password'] && (
                <p id="password-error" className={errorText}>
                  {fieldErrors['password']}
                </p>
              )}
            </div>

            <p className="text-xs text-neutral-500">
              Credentials are stored as encrypted references and never returned by the API
              (Brief §17).
            </p>
          </div>
        )}
      </fieldset>

      {/* Authorization checkbox (Brief §18) */}
      <div className="space-y-1">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={authorized}
            onChange={(e) => {
              setAuthorized(e.target.checked);
              setFieldErrors((prev) => ({ ...prev, authorized: undefined }));
            }}
            aria-describedby={fieldErrors['authorized'] ? 'authorized-error' : undefined}
            aria-invalid={fieldErrors['authorized'] !== undefined}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-brand-600"
          />
          <span className="text-sm text-neutral-700">
            I own or am authorised to capture this app{' '}
            <span aria-hidden className="text-danger">
              *
            </span>
          </span>
        </label>
        {fieldErrors['authorized'] && (
          <p id="authorized-error" className={cn(errorText, 'pl-7')}>
            {fieldErrors['authorized']}
          </p>
        )}
      </div>

      {/* API-level error */}
      {apiError && (
        <div
          role="alert"
          className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {apiError}
        </div>
      )}

      {/* Submit */}
      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? 'Connecting…' : 'Connect app'}
      </Button>
    </form>
  );
}

/** Tailwind class atoms */
const inputBase =
  'block w-full rounded-md border px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-offset-1 transition-shadow';
const inputDefault =
  'border-neutral-300 bg-white focus:border-brand-600 focus:ring-brand-600/20';
const inputError =
  'border-danger bg-white focus:border-danger focus:ring-danger/20';
const errorText = 'text-xs text-danger';

/** A radio card option for login mode selection. */
function RadioOption({
  id,
  name,
  value,
  checked,
  label,
  description,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description: string;
  onChange: () => void;
}): JSX.Element {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex flex-1 cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
        checked
          ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
          : 'border-neutral-200 bg-white hover:border-neutral-300',
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 accent-brand-600"
      />
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
      </div>
    </label>
  );
}
