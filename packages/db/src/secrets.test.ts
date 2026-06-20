import { describe, expect, it } from 'vitest';
import { parseSessionState, serializeSessionState } from './secrets';

describe('session state serialization (ADR-001)', () => {
  it('round-trips a storageState object', () => {
    const state = {
      cookies: [{ name: 'sid', value: 'abc', domain: 'app.acme.com', path: '/' }],
      origins: [{ origin: 'https://app.acme.com', localStorage: [{ name: 'k', value: 'v' }] }],
    };
    expect(parseSessionState(serializeSessionState(state))).toEqual(state);
  });

  it('throws a safe error on corrupt input without echoing the value', () => {
    const bad = 'not-json-«garbage»';
    expect(() => parseSessionState(bad)).toThrow(/possible key mismatch or corruption/);
    try {
      parseSessionState(bad);
    } catch (e) {
      expect((e as Error).message).not.toContain(bad);
    }
  });

  it('rejects JSON that is not a storageState shape', () => {
    expect(() => parseSessionState(JSON.stringify({ username: 'u', password: 'p' }))).toThrow(
      /possible key mismatch or corruption/,
    );
  });
});
