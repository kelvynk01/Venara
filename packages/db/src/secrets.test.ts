import { describe, expect, it } from 'vitest';
import { parseCredentials, serializeCredentials } from './secrets';

describe('credentials serialization', () => {
  it('round-trips username/password', () => {
    const creds = { username: 'admin@example.com', password: 'p@ss:wo.rd$1' };
    expect(parseCredentials(serializeCredentials(creds))).toEqual(creds);
  });

  it('throws a safe error on corrupt input without echoing the value', () => {
    const bad = 'not-json-«garbage»';
    expect(() => parseCredentials(bad)).toThrow(/possible key mismatch or corruption/);
    try {
      parseCredentials(bad);
    } catch (e) {
      expect((e as Error).message).not.toContain(bad);
    }
  });
});
