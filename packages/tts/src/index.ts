/**
 * @venara/tts — ElevenLabs voiceover adapter, behind `TtsProvider` (Brief §4/§14).
 *
 * Uses the with-timestamps endpoint so the worker gets per-character timing for
 * caption generation without a second API call.
 *
 * Narration generation applies each app's pronunciation lexicon as simple alias text
 * substitution BEFORE TTS — so the voiceover says the product name correctly (Brief §9/§14).
 * NOTE: the full ElevenLabs Pronunciation Dictionary API is a later enhancement; v1 uses
 * plain string replacement.
 *
 * Raw `fetch` is used against the REST endpoint (more transparent than the SDK whose
 * camelCase field mapping is uncertain without a live key).
 */

export interface TtsSynthesizeOptions {
  /** Provider voice id (falls back to ELEVENLABS_VOICE_ID env var). */
  voiceId?: string;
  /** Pronunciation overrides: spoken form for written terms (Brief §9). */
  lexicon?: { term: string; say: string }[];
  /** Output format hint, e.g. 'mp3_44100_128'. */
  format?: string;
}

/** Per-character alignment from the ElevenLabs with-timestamps endpoint. */
export interface TtsAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface TtsResult {
  audio: Uint8Array;
  durationMs: number;
  mimeType: string;
  /** Raw character-level alignment from ElevenLabs — used to build captions. */
  alignment?: TtsAlignment;
}

/** Text-to-speech contract; the ElevenLabs adapter implements this (Brief §4). */
export interface TtsProvider {
  synthesize(text: string, options?: TtsSynthesizeOptions): Promise<TtsResult>;
}

// ─── Pronunciation alias substitution ────────────────────────────────────────

/**
 * Apply a pronunciation lexicon to a narration string before sending to TTS.
 *
 * Each `term` is replaced with its `say` form (case-insensitive whole-word match).
 * This is intentionally simple for v1; a proper pronunciation-dictionary API
 * integration is deferred to a later phase.
 * NOTE: terms containing regex special characters are escaped automatically.
 */
export function applyLexicon(
  text: string,
  lexicon: { term: string; say: string }[] | undefined,
): string {
  if (!lexicon || lexicon.length === 0) return text;
  let result = text;
  for (const entry of lexicon) {
    // Escape regex special characters in the term so e.g. "C++" works correctly.
    const escaped = entry.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Escape `$` in the replacement so a `say` like "$5" isn't treated as a back-reference.
    const safeReplacement = entry.say.replace(/\$/g, '$$$$');
    result = result.replace(new RegExp(escaped, 'gi'), safeReplacement);
  }
  return result;
}

// ─── ElevenLabs REST adapter ──────────────────────────────────────────────────

/** Shape of the ElevenLabs with-timestamps API response (verified against REST spec). */
interface ElevenLabsTimestampResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

/**
 * Read the ElevenLabs voice id lazily so importing this module never throws.
 * TODO(verify with live key): list the account's available voices via GET /v1/voices
 * to confirm the id is valid before use.
 */
function requireVoiceId(override?: string): string {
  const id = override ?? process.env['ELEVENLABS_VOICE_ID'];
  if (!id) {
    throw new Error(
      'ELEVENLABS_VOICE_ID environment variable is not set. ' +
        'Set it to a valid ElevenLabs voice id. ' +
        // TODO(verify with live key): run GET https://api.elevenlabs.io/v1/voices to list available voices.
        'List your voices at https://api.elevenlabs.io/v1/voices (requires xi-api-key header).',
    );
  }
  return id;
}

function requireApiKey(): string {
  const key = process.env['ELEVENLABS_API_KEY'];
  if (!key) {
    throw new Error(
      'ELEVENLABS_API_KEY environment variable is not set.',
    );
  }
  return key;
}

export class ElevenLabsTtsProvider implements TtsProvider {
  /**
   * Synthesize speech using the ElevenLabs with-timestamps endpoint.
   *
   * POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps
   *
   * TODO(verify with live key): confirm the `alignment` field is always present even
   * for very short texts and that `character_end_times_seconds` is non-empty.
   */
  async synthesize(text: string, options?: TtsSynthesizeOptions): Promise<TtsResult> {
    const voiceId = requireVoiceId(options?.voiceId);
    const apiKey = requireApiKey();

    // Apply pronunciation aliases before sending to TTS (Brief §9/§14).
    const processedText = applyLexicon(text, options?.lexicon);

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`;

    const body = {
      text: processedText,
      model_id: 'eleven_multilingual_v2',
      // TODO(verify with live key): confirm 'mp3_44100_128' is accepted by the account tier.
      output_format: options?.format ?? 'mp3_44100_128',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Never include the API key in error messages (Brief §17).
      const detail = await response.text().catch(() => '');
      throw new Error(
        `ElevenLabs TTS request failed: HTTP ${response.status}. ${detail.slice(0, 200)}`,
      );
    }

    const json = (await response.json()) as ElevenLabsTimestampResponse;

    // Decode base64 audio → Uint8Array.
    const audioBase64 = json.audio_base64;
    const binaryString = Buffer.from(audioBase64, 'base64');
    const audio = new Uint8Array(binaryString);

    // Duration = last character end time (in seconds → milliseconds).
    const endTimes = json.alignment?.character_end_times_seconds ?? [];
    const lastEndTime = endTimes.length > 0 ? (endTimes[endTimes.length - 1] ?? 0) : 0;
    const durationMs = Math.round(lastEndTime * 1000);

    return {
      audio,
      durationMs,
      mimeType: 'audio/mpeg',
      alignment: json.alignment
        ? {
            characters: json.alignment.characters,
            character_start_times_seconds: json.alignment.character_start_times_seconds,
            character_end_times_seconds: json.alignment.character_end_times_seconds,
          }
        : undefined,
    };
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: ElevenLabsTtsProvider | undefined;

/**
 * Lazily-constructed shared ElevenLabs TTS instance.
 * Reading env is deferred to first use so importing never throws.
 */
export function getTts(): TtsProvider {
  if (!_instance) _instance = new ElevenLabsTtsProvider();
  return _instance;
}
