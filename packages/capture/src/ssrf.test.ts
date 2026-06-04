import { describe, expect, it } from 'vitest';
import { navigateBlockedReason } from './tools';

const APP = 'app.acme.com';

describe('navigate SSRF guard (navigateBlockedReason)', () => {
  it('allows the app origin and its subdomains', () => {
    expect(navigateBlockedReason('https://app.acme.com/settings', APP)).toBeNull();
    expect(navigateBlockedReason('https://eu.app.acme.com/x', APP)).toBeNull();
  });

  it('blocks non-http(s) schemes', () => {
    expect(navigateBlockedReason('file:///etc/passwd', APP)).toMatch(/scheme/);
    expect(navigateBlockedReason('ftp://app.acme.com', APP)).toMatch(/scheme/);
  });

  it('blocks cloud metadata, loopback, and private ranges', () => {
    for (const u of [
      'http://169.254.169.254/latest/meta-data',
      'http://localhost:8080/',
      'http://127.0.0.1/',
      'http://10.0.0.5/',
      'http://192.168.1.1/',
      'http://172.16.0.1/',
      'http://db.internal/',
    ]) {
      expect(navigateBlockedReason(u, APP)).toMatch(/private|link-local/);
    }
  });

  it('blocks off-origin public hosts when an app host is set', () => {
    expect(navigateBlockedReason('https://evil.example.com/', APP)).toMatch(/not in the connected app origin/);
  });

  it('rejects malformed URLs', () => {
    expect(navigateBlockedReason('not a url', APP)).toMatch(/invalid URL/);
  });
});
