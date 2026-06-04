import { describe, expect, it } from 'vitest';
import { connectAppSchema, createVideoSchema } from './schemas';

describe('connectAppSchema', () => {
  const base = { name: 'Acme', baseUrl: 'https://app.acme.com', authorized: true as const };

  it('accepts a valid no-login app', () => {
    const r = connectAppSchema.safeParse({ ...base, loginMode: 'none' });
    expect(r.success).toBe(true);
  });

  it('defaults loginMode to none', () => {
    const r = connectAppSchema.parse(base);
    expect(r.loginMode).toBe('none');
  });

  it('rejects non-http(s) baseUrl schemes', () => {
    for (const bad of ['file:///etc/passwd', 'javascript:alert(1)', 'ftp://x.com']) {
      expect(connectAppSchema.safeParse({ ...base, baseUrl: bad }).success).toBe(false);
    }
  });

  it('requires authorization attestation', () => {
    const { authorized: _omit, ...noAuth } = base;
    expect(connectAppSchema.safeParse(noAuth).success).toBe(false);
    expect(connectAppSchema.safeParse({ ...base, authorized: false }).success).toBe(false);
  });

  it('requires credentials when loginMode is credentials', () => {
    expect(connectAppSchema.safeParse({ ...base, loginMode: 'credentials' }).success).toBe(false);
    expect(
      connectAppSchema.safeParse({
        ...base,
        loginMode: 'credentials',
        credentials: { username: 'u', password: 'p' },
      }).success,
    ).toBe(true);
  });
});

describe('createVideoSchema', () => {
  it('accepts howto/marketing', () => {
    expect(createVideoSchema.safeParse({ flowId: 'f1', type: 'howto' }).success).toBe(true);
    expect(createVideoSchema.safeParse({ flowId: 'f1', type: 'marketing' }).success).toBe(true);
  });
  it('rejects an unknown type and empty flowId', () => {
    expect(createVideoSchema.safeParse({ flowId: 'f1', type: 'gif' }).success).toBe(false);
    expect(createVideoSchema.safeParse({ flowId: '', type: 'howto' }).success).toBe(false);
  });
});
