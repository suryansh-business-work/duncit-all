import { getRuntimeEnvValue } from '../../config/runtimeEnv';
import { outboundFetch } from '../../utils/outboundFetch';
import { isTrustedMediaUrl } from '../../utils/url';

export interface ServamTranscriptResult {
  ok: boolean;
  message: string;
  transcript?: string;
  recording_url?: string;
}

export interface ServamTtsResult {
  ok: boolean;
  message: string;
  /** Raw audio bytes (WAV) to hand to Twilio `<Play>`. */
  audio?: Buffer;
  contentType?: string;
}

/** One timed line of a transcript. Sarvam's "words" are phrases, not single words. */
export interface ServamCue {
  start_ms: number;
  end_ms: number;
  text: string;
}

export interface ServamTranscribeResult {
  ok: boolean;
  message: string;
  transcript?: string;
  /** Empty when timestamps were not asked for, or the provider sent none. */
  cues?: ServamCue[];
  language_code?: string;
}

export interface ServamTranscribeInput {
  /** The sound file's bytes — a voiceover made here, a clip's audio. */
  bytes?: Buffer;
  /** Or where to fetch them from: an https address on a trusted media host. */
  audioUrl?: string;
  fileName?: string;
  contentType?: string;
  /** BCP-47 ("hi-IN", "en-IN"); empty or "auto" lets Sarvam detect it. */
  language?: string | null;
  withTimestamps?: boolean;
}

const PROVIDER = 'servam';
const DEFAULT_TTS_MODEL = 'bulbul:v2';
const DEFAULT_STT_MODEL = 'saaras:v4';
const DEFAULT_VOICE = 'anushka';
/** Telephone quality — what the call flows were written against. */
const DEFAULT_TTS_SAMPLE_RATE = 8000;
/** Sarvam's own ceiling for one synchronous transcription request. */
export const MAX_TRANSCRIBE_BYTES = 25 * 1024 * 1024;

async function loadConfig() {
  const [baseUrl, apiKey, ttsModel, defaultVoice, sttModel] = await Promise.all([
    getRuntimeEnvValue('SERVAM_AI_BASE_URL'),
    getRuntimeEnvValue('SERVAM_AI_API_KEY'),
    getRuntimeEnvValue('SERVAM_AI_TTS_MODEL'),
    getRuntimeEnvValue('SERVAM_AI_VOICE'),
    getRuntimeEnvValue('SERVAM_AI_STT_MODEL'),
  ]);
  return {
    baseUrl: (baseUrl || 'https://api.sarvam.ai').replace(/\/$/, ''),
    apiKey,
    ttsModel: ttsModel || DEFAULT_TTS_MODEL,
    defaultVoice: defaultVoice || DEFAULT_VOICE,
    sttModel: sttModel || DEFAULT_STT_MODEL,
  };
}

interface TimestampsPayload {
  words?: unknown;
  start_time_seconds?: unknown;
  end_time_seconds?: unknown;
}

interface TranscribePayload {
  transcript?: unknown;
  language_code?: unknown;
  timestamps?: TimestampsPayload | null;
}

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Sarvam's three parallel lists as cues. A row whose times are missing, not
 * numbers, or run backwards is dropped rather than guessed; what remains is
 * in time order. Seconds become whole milliseconds.
 */
export function cuesFromTimestamps(raw: TimestampsPayload | null | undefined): ServamCue[] {
  const words = asList(raw?.words);
  const starts = asList(raw?.start_time_seconds);
  const ends = asList(raw?.end_time_seconds);
  const cues: ServamCue[] = [];
  for (const [index, word] of words.entries()) {
    const text = typeof word === 'string' ? word.trim() : '';
    const start = Number(starts[index]);
    const end = Number(ends[index]);
    if (!text || !Number.isFinite(start) || !Number.isFinite(end) || end < start || start < 0) continue;
    cues.push({ start_ms: Math.round(start * 1000), end_ms: Math.round(end * 1000), text });
  }
  cues.sort((a, b) => a.start_ms - b.start_ms);
  return cues;
}

/** The file to transcribe, fetched when only its address was given. */
async function audioBytes(input: ServamTranscribeInput): Promise<{ bytes: Buffer; contentType: string } | string> {
  if (input.bytes) {
    if (input.bytes.length > MAX_TRANSCRIBE_BYTES) return 'That sound file is too large to transcribe (25 MB at most).';
    return { bytes: input.bytes, contentType: input.contentType || 'audio/wav' };
  }
  const url = (input.audioUrl ?? '').trim();
  if (!url) return 'Nothing to transcribe.';
  // Only our CDN or a stock library: an arbitrary address here is one the server could be pointed at its own network with.
  if (!isTrustedMediaUrl(url)) return 'Only a file from the media store or the stock library can be transcribed.';
  const res = await outboundFetch('The media store', url);
  if (!res.ok) return `The media store could not send that file (HTTP ${res.status}).`;
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > MAX_TRANSCRIBE_BYTES) return 'That sound file is too large to transcribe (25 MB at most).';
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_TRANSCRIBE_BYTES) return 'That sound file is too large to transcribe (25 MB at most).';
  return { bytes, contentType: input.contentType || res.headers.get('content-type') || 'application/octet-stream' };
}

const ttsLanguage = (language?: string | null) => {
  const lang = (language || '').toLowerCase();
  if (!lang || lang === 'auto') return 'hi-IN';
  return language as string;
};

/**
 * Wrapper around the Servam (Sarvam) AI speech-to-text API used to fetch
 * call transcripts. Twilio hands us a recording URL when a call completes;
 * we POST it to Servam and store the resulting transcript on the
 * CommunicationLog so the CRM timeline can render it.
 *
 * The exact request shape is configurable so this stays usable even if
 * Servam tweaks its API: we send `{ recording_url, language }` to the
 * configured endpoint (`/v1/transcribe` by default) and read the
 * resulting `{ transcript }` field.
 */
export const servamService = {
  async fetchTranscript(input: {
    recording_url: string;
    language?: string;
  }): Promise<ServamTranscriptResult> {
    const cfg = await loadConfig();
    if (!cfg.apiKey) {
      return {
        ok: false,
        message: 'Servam AI is not configured. Set SERVAM_AI_API_KEY in the Tech portal.',
      };
    }
    if (!input.recording_url) {
      return { ok: false, message: 'No recording URL available yet for transcription.' };
    }
    try {
      const res = await fetch(`${cfg.baseUrl}/v1/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          recording_url: input.recording_url,
          language: input.language ?? 'auto',
          provider: PROVIDER,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return {
          ok: false,
          message: `Servam transcription failed (HTTP ${res.status}): ${txt.slice(0, 200)}`,
        };
      }
      const json: any = await res.json();
      const transcript = String(json?.transcript ?? json?.text ?? '').trim();
      const recordingUrl = String(json?.recording_url ?? input.recording_url);
      if (!transcript) {
        return { ok: false, message: 'Servam returned an empty transcript' };
      }
      return { ok: true, message: 'Transcript ready', transcript, recording_url: recordingUrl };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.message || 'Servam transcription request failed',
      };
    }
  },

  /**
   * Synthesize speech with a selected Servam (Sarvam Bulbul) voice. Returns WAV
   * bytes at 8 kHz so Twilio can `<Play>` them on a phone call. The voice is the
   * Bulbul speaker name (e.g. anushka, manisha, karun); falls back to the
   * configured default voice when none is given.
   */
  async tts(input: {
    text: string;
    voice?: string | null;
    language?: string | null;
    /** Hz; the telephone rate when not given. A reel's voiceover asks for 22050. */
    sample_rate?: number | null;
  }): Promise<ServamTtsResult> {
    const cfg = await loadConfig();
    if (!cfg.apiKey) {
      return { ok: false, message: 'Servam AI is not configured. Set SERVAM_AI_API_KEY in the Tech portal.' };
    }
    if (!input.text?.trim()) return { ok: false, message: 'No text to synthesize' };
    try {
      const res = await fetch(`${cfg.baseUrl}/text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
          'api-subscription-key': cfg.apiKey,
        },
        body: JSON.stringify({
          inputs: [input.text.slice(0, 1500)],
          target_language_code: ttsLanguage(input.language),
          speaker: input.voice || cfg.defaultVoice,
          model: cfg.ttsModel,
          speech_sample_rate: input.sample_rate || DEFAULT_TTS_SAMPLE_RATE,
          provider: PROVIDER,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return { ok: false, message: `Servam TTS failed (HTTP ${res.status}): ${txt.slice(0, 200)}` };
      }
      const json: any = await res.json();
      const b64 = Array.isArray(json?.audios) ? json.audios[0] : json?.audio;
      if (!b64) return { ok: false, message: 'Servam returned no audio' };
      return { ok: true, message: 'ok', audio: Buffer.from(String(b64), 'base64'), contentType: 'audio/wav' };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Servam TTS request failed' };
    }
  },

  /**
   * Speech to text with timing, for subtitles. The file goes to Sarvam's
   * synchronous `speech-to-text` as multipart (`file`, `model`,
   * `language_code`, `with_timestamps`); the answer's `timestamps` holds three
   * parallel lists — phrases and their start and end in seconds — which come
   * back here as cues in milliseconds. `fetchTranscript` above is the call
   * flows' transcript and stays as it is.
   */
  async transcribe(input: ServamTranscribeInput): Promise<ServamTranscribeResult> {
    const cfg = await loadConfig();
    if (!cfg.apiKey) {
      return { ok: false, message: 'Servam AI is not configured. Set SERVAM_AI_API_KEY in the Tech portal.' };
    }
    let audio: Awaited<ReturnType<typeof audioBytes>>;
    try {
      audio = await audioBytes(input);
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'The sound file could not be fetched' };
    }
    if (typeof audio === 'string') return { ok: false, message: audio };
    const lang = (input.language ?? '').trim();
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(audio.bytes)], { type: audio.contentType }), input.fileName || 'audio.wav');
    form.append('model', cfg.sttModel);
    form.append('language_code', !lang || lang.toLowerCase() === 'auto' ? 'unknown' : lang);
    form.append('with_timestamps', input.withTimestamps === false ? 'false' : 'true');
    try {
      const res = await fetch(`${cfg.baseUrl}/speech-to-text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.apiKey}`, 'api-subscription-key': cfg.apiKey },
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return { ok: false, message: `Servam transcription failed (HTTP ${res.status}): ${txt.slice(0, 200)}` };
      }
      const json = (await res.json().catch(() => ({}))) as TranscribePayload;
      const transcript = typeof json.transcript === 'string' ? json.transcript.trim() : '';
      if (!transcript) return { ok: false, message: 'Servam returned an empty transcript' };
      return {
        ok: true,
        message: 'Transcript ready',
        transcript,
        cues: cuesFromTimestamps(json.timestamps),
        language_code: typeof json.language_code === 'string' ? json.language_code : '',
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Servam transcription request failed' };
    }
  },
};
