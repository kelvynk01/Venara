/**
 * @venara/render — the FFmpeg how-to render pipeline (Brief §10).
 *
 * Input: a local capture file path + marked beats + narration script.
 * Output: rendered MP4 + thumbnail + captions SRT in a temp dir.
 *
 * How-to pipeline: scale/pad → subtitles (captions) → drawtext callouts → VO audio mix.
 * Uses execFile with an args array — NEVER a shell string (Brief §10/security).
 *
 * Phase 3: how-to pipeline. Marketing pipeline is Phase 5.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { RenderAspect, VideoType } from '@venara/shared';

const execFileAsync = promisify(execFile);

// ─── Public types ─────────────────────────────────────────────────────────────

export interface RenderRequest {
  type: VideoType;
  rawVideoKey: string;
  aspect: RenderAspect;
  /** Marked beats (from `markBeat`) used for callouts + caption timing (Brief §8/§10). */
  beats?: { label: string; atMs: number }[];
  /** Narration (how-to) or hook+CTA copy (marketing). */
  scriptJson?: unknown;
}

export interface RenderResult {
  mp4Key: string;
  thumbKey: string;
  captionsKey: string;
  durationMs: number;
}

// ─── How-to render input/output ───────────────────────────────────────────────

export interface Beat {
  label: string;
  atMs: number;
}

/** SRT caption entry. */
export interface SrtEntry {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

export interface HowToRenderInput {
  /** Absolute path to the raw capture MP4 on disk. */
  captureFilePath: string;
  /** Marked beats (step labels + timestamps). */
  beats: Beat[];
  /** Narration text already prepared by the caller (lexicon applied). */
  narrationText: string;
  /** Audio VO bytes (mp3). */
  voiceoverBytes: Uint8Array;
  /** Duration of the voiceover in ms (from TTS). */
  voiceDurationMs: number;
  /** Captions as SRT string. */
  captionsSrt: string;
  /** Target aspect ratio. */
  aspect: RenderAspect;
}

export interface HowToRenderOutput {
  /** Absolute path to the rendered MP4. Caller is responsible for uploading + cleanup. */
  mp4Path: string;
  /** Absolute path to the JPEG thumbnail. */
  thumbPath: string;
  /** Absolute path to the SRT captions file (same content passed in). */
  captionsPath: string;
  /** Duration of the rendered video in ms (= voiceover duration). */
  durationMs: number;
  /** The temp dir — caller must rm -rf this in their finally block. */
  tmpDir: string;
}

// ─── Resolution map ───────────────────────────────────────────────────────────

const ASPECT_RESOLUTION: Record<RenderAspect, { w: number; h: number }> = {
  '16:9': { w: 1920, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
  '1:1': { w: 1080, h: 1080 },
};

// ─── Narration builder ────────────────────────────────────────────────────────

/**
 * Build a simple templated narration string from beats/step labels.
 *
 * v1 is intentionally deterministic and template-based — no LLM involved here.
 * Full LLM-driven narration is a Phase 4 enhancement (Brief §14).
 *
 * The resulting text is passed to TTS after lexicon substitution is applied by
 * the TTS provider (or by the caller before invoking TTS).
 */
export function buildNarration(beats: Beat[]): string {
  if (beats.length === 0) {
    return 'This how-to video shows you the key steps in the workflow.';
  }

  const stepLines = beats.map((beat, i) => {
    const stepNum = i + 1;
    return `Step ${stepNum}: ${beat.label}.`;
  });

  return [
    `This how-to video walks you through ${beats.length} step${beats.length === 1 ? '' : 's'}.`,
    ...stepLines,
    "Let's get started.",
  ].join(' ');
}

// ─── SRT builder ──────────────────────────────────────────────────────────────

/**
 * Format milliseconds as SRT timestamp: HH:MM:SS,mmm
 */
function msToSrtTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

/**
 * Build an SRT captions string from:
 * - character-level alignment (from ElevenLabs with-timestamps), or
 * - beat timestamps as fallback sentence timing.
 *
 * Groups characters into word-level sentences to produce readable caption chunks.
 */
export function buildSrt(
  alignmentOrSentences:
    | {
        characters: string[];
        character_start_times_seconds: number[];
        character_end_times_seconds: number[];
      }
    | { text: string; startMs: number; endMs: number }[],
): string {
  if (Array.isArray(alignmentOrSentences)) {
    // Sentence-level fallback.
    return alignmentOrSentences
      .map((s, i) => {
        return [
          String(i + 1),
          `${msToSrtTime(s.startMs)} --> ${msToSrtTime(s.endMs)}`,
          s.text,
          '',
        ].join('\n');
      })
      .join('\n');
  }

  // Character-level alignment → group into ~8-word caption chunks.
  const { characters, character_start_times_seconds, character_end_times_seconds } =
    alignmentOrSentences;

  const entries: SrtEntry[] = [];
  let currentWords: string[] = [];
  let chunkStartMs = 0;
  let chunkEndMs = 0;
  let index = 1;
  let wordBuffer = '';
  let wordStartMs = 0;

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i] ?? '';
    const startS = character_start_times_seconds[i] ?? 0;
    const endS = character_end_times_seconds[i] ?? 0;

    if (wordBuffer.length === 0) {
      wordStartMs = Math.round(startS * 1000);
    }
    wordBuffer += ch;
    chunkEndMs = Math.round(endS * 1000);

    if (ch === ' ' || i === characters.length - 1) {
      const word = wordBuffer.trim();
      if (word) {
        if (currentWords.length === 0) {
          chunkStartMs = wordStartMs;
        }
        currentWords.push(word);
      }
      wordBuffer = '';

      // Flush chunk every ~8 words or at sentence end.
      if (
        currentWords.length >= 8 ||
        (currentWords.length > 0 && /[.?!]$/.test(word)) ||
        i === characters.length - 1
      ) {
        if (currentWords.length > 0) {
          entries.push({
            index,
            startMs: chunkStartMs,
            endMs: chunkEndMs,
            text: currentWords.join(' '),
          });
          index++;
          currentWords = [];
        }
      }
    }
  }

  return entries
    .map((e) => {
      return [
        String(e.index),
        `${msToSrtTime(e.startMs)} --> ${msToSrtTime(e.endMs)}`,
        e.text,
        '',
      ].join('\n');
    })
    .join('\n');
}

// ─── FFmpeg drawtext filter builder ───────────────────────────────────────────

/**
 * Build the drawtext filter fragment for a single beat callout.
 *
 * Each callout appears at the beat's timestamp and stays on screen for 2.5 s.
 * Text is layered with a semi-transparent box for legibility.
 *
 * NOTE: FFmpeg drawtext font path is for the Debian/Ubuntu DejaVu package
 * (`fonts-dejavu-core` must be installed in the Docker image).
 */
function buildDrawtextFragment(beat: Beat, index: number, inputRef: string): string {
  const startS = beat.atMs / 1000;
  const endS = startS + 2.5;
  // Escape every char meaningful to FFmpeg's drawtext/lavfi parser. Order matters:
  // backslash first, then quotes (double + single), colon, and percent (%{...} expansion).
  const safeLabel = beat.label
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%');
  // Use the actual middle-dot glyph (U+00B7), not a literal "·" string.
  const stepLabel = `${index + 1} · ${safeLabel}`;

  return (
    `[${inputRef}]drawtext=` +
    `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:` +
    `text='${stepLabel}':` +
    `x=60:y=60:fontsize=36:fontcolor=white:` +
    `box=1:boxcolor=black@0.6:boxborderw=12:` +
    `enable='between(t,${startS.toFixed(2)},${endS.toFixed(2)})'`
  );
}

/**
 * Build all drawtext callout filter fragments, chained together.
 * Returns the full filter_complex string segment for the callout layer chain.
 *
 * @param beats - the beat list
 * @param srtPath - POSIX path to the SRT file (colons escaped for FFmpeg)
 * @param res - output resolution
 * @returns { filterComplex, mapLabel } to be spliced into the FFmpeg args
 */
function buildFilterComplex(
  beats: Beat[],
  srtPath: string,
  res: { w: number; h: number },
): string {
  // FFmpeg subtitles filter path must escape every lavfi-grammar metacharacter, not just
  // colons: ':', '[', ']', ',', ';', and the single-quote. The worker runs in Docker (Linux).
  const escapedSrtPath = srtPath
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

  // Scale + pad to target resolution.
  const scaleFilter =
    `[0:v]scale=${res.w}:${res.h}:force_original_aspect_ratio=decrease,` +
    `pad=${res.w}:${res.h}:(ow-iw)/2:(oh-ih)/2[s]`;

  // Subtitle (captions) overlay.
  const subsFilter =
    `[s]subtitles=${escapedSrtPath}:` +
    `force_style='FontName=DejaVu Sans,FontSize=20,PrimaryColour=&H00FFFFFF,` +
    `BackColour=&H80000000,BorderStyle=4,MarginV=40'[sv]`;

  if (beats.length === 0) {
    // No callouts — map [sv] directly to output.
    return `${scaleFilter};${subsFilter};[sv]null[out]`;
  }

  // Chain drawtext filters for each beat.
  let prevRef = 'sv';
  const drawtextFilters: string[] = [];

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    if (!beat) continue;
    const outRef = i === beats.length - 1 ? 'out' : `dt${i}`;
    const fragment = buildDrawtextFragment(beat, i, prevRef);
    drawtextFilters.push(`${fragment}[${outRef}]`);
    prevRef = outRef;
  }

  return [scaleFilter, subsFilter, ...drawtextFilters].join(';');
}

// ─── Main render function ─────────────────────────────────────────────────────

const FFMPEG_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Render a how-to video from a captured MP4 + VO audio + captions.
 *
 * Creates a temp dir, writes VO + SRT to disk, runs FFmpeg, takes a thumbnail.
 * The caller MUST clean up `output.tmpDir` in their finally block.
 *
 * NOTE: The worker runs inside a Docker container (Linux) where FFmpeg + DejaVu
 * fonts are installed. Running locally on Windows will fail unless FFmpeg is on PATH.
 */
/**
 * Convert SRT to WebVTT for browser <track> delivery. FFmpeg burns the SRT into the
 * video; this VTT copy is what we store + serve to the player (an SRT body in a .vtt
 * file is rejected by every compliant browser).
 */
export function srtToVtt(srt: string): string {
  const body = srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return `WEBVTT\n\n${body}`;
}

export async function renderHowTo(input: HowToRenderInput): Promise<HowToRenderOutput> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'venara-render-'));

  try {
    const voPath = join(tmpDir, 'vo.mp3');
    const srtPath = join(tmpDir, 'captions.srt');
    // VTT is what we return/store for the player; SRT is what FFmpeg burns in.
    const vttPath = join(tmpDir, 'captions.vtt');
    const mp4Path = join(tmpDir, 'out.mp4');
    const thumbPath = join(tmpDir, 'thumb.jpg');

    await writeFile(voPath, input.voiceoverBytes);
    await writeFile(srtPath, input.captionsSrt, 'utf-8');
    await writeFile(vttPath, srtToVtt(input.captionsSrt), 'utf-8');

    const res = ASPECT_RESOLUTION[input.aspect];
    const filterComplex = buildFilterComplex(input.beats, srtPath, res);

    // Single-pass FFmpeg encode (Brief §10).
    const ffmpegArgs = [
      '-i', input.captureFilePath,
      '-i', voPath,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-map', '1:a',
      '-c:v', 'libx264',
      '-crf', '18',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      '-y',
      mp4Path,
    ];

    await execFileAsync('ffmpeg', ffmpegArgs, { timeout: FFMPEG_TIMEOUT_MS });

    // Thumbnail: seek to 2 s (or 0 if video < 2 s), grab one frame.
    const thumbArgs = ['-ss', '2', '-i', mp4Path, '-frames:v', '1', '-q:v', '2', '-y', thumbPath];
    await execFileAsync('ffmpeg', thumbArgs, { timeout: 30_000 });

    const durationMs = input.voiceDurationMs;
    return { mp4Path, thumbPath, captionsPath: vttPath, durationMs, tmpDir };
  } catch (err) {
    // Never leave a multi-hundred-MB temp dir behind on a mid-render failure.
    await cleanupRenderDir(tmpDir);
    throw err;
  }
}

// ─── Cleanup helper ───────────────────────────────────────────────────────────

/** Delete the render temp dir. Call in a finally block after uploading outputs. */
export async function cleanupRenderDir(tmpDir: string): Promise<void> {
  await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
}
