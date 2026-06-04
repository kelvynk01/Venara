import { describe, expect, it } from 'vitest';
import { buildNarration, buildSrt, srtToVtt } from './index';

describe('srtToVtt', () => {
  it('prefixes the WEBVTT header and converts comma to dot in timestamps', () => {
    const srt = '1\n00:00:00,000 --> 00:00:02,340\nStep one.\n';
    const vtt = srtToVtt(srt);
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).toContain('00:00:00.000 --> 00:00:02.340');
    expect(vtt).not.toContain(',000 -->');
  });
});

describe('buildNarration', () => {
  it('returns a fallback line when there are no beats', () => {
    expect(buildNarration([])).toMatch(/how-to video/i);
  });

  it('numbers each beat as a step', () => {
    const out = buildNarration([
      { label: 'Open Settings', atMs: 1000 },
      { label: 'Click Invite', atMs: 4000 },
    ]);
    expect(out).toContain('Step 1: Open Settings.');
    expect(out).toContain('Step 2: Click Invite.');
  });
});

describe('buildSrt', () => {
  it('builds entries from sentence-level input', () => {
    const srt = buildSrt([{ text: 'Hello there.', startMs: 0, endMs: 1500 }]);
    expect(srt).toContain('00:00:00,000 --> 00:00:01,500');
    expect(srt).toContain('Hello there.');
  });

  it('groups character-level alignment into caption chunks', () => {
    // "Hi all" → 6 chars with simple timings.
    const chars = 'Hi all'.split('');
    const starts = chars.map((_, i) => i * 0.1);
    const ends = chars.map((_, i) => i * 0.1 + 0.1);
    const srt = buildSrt({
      characters: chars,
      character_start_times_seconds: starts,
      character_end_times_seconds: ends,
    });
    expect(srt).toContain('Hi all');
    expect(srt).toMatch(/00:00:00,000 -->/);
  });
});
