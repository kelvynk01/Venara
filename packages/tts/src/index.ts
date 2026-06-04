/**
 * @venara/tts — voiceover adapter (ElevenLabs by default), behind `TtsProvider` (Brief §4/§14).
 *
 * Narration generation applies each app's pronunciation lexicon so the voiceover says
 * the product name correctly (Brief §9/§14).
 *
 * Phase 1: contract only. The ElevenLabs implementation lands in the render phase.
 */

export interface TtsSynthesizeOptions {
  /** Provider voice id. */
  voiceId?: string;
  /** Pronunciation overrides: spoken form for written terms (Brief §9). */
  lexicon?: { term: string; say: string }[];
  /** Output format hint, e.g. 'mp3_44100_128'. */
  format?: string;
}

export interface TtsResult {
  audio: Uint8Array;
  durationMs: number;
  mimeType: string;
}

/** Text-to-speech contract; the ElevenLabs adapter implements this (Brief §4). */
export interface TtsProvider {
  synthesize(text: string, options?: TtsSynthesizeOptions): Promise<TtsResult>;
}
