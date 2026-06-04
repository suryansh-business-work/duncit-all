import { getRuntimeEnvValue } from '../../config/runtimeEnv';

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

const PROVIDER = 'servam';
const DEFAULT_TTS_MODEL = 'bulbul:v2';
const DEFAULT_VOICE = 'anushka';

async function loadConfig() {
  const [baseUrl, apiKey, ttsModel, defaultVoice] = await Promise.all([
    getRuntimeEnvValue('SERVAM_AI_BASE_URL'),
    getRuntimeEnvValue('SERVAM_AI_API_KEY'),
    getRuntimeEnvValue('SERVAM_AI_TTS_MODEL'),
    getRuntimeEnvValue('SERVAM_AI_VOICE'),
  ]);
  return {
    baseUrl: (baseUrl || 'https://api.sarvam.ai').replace(/\/$/, ''),
    apiKey,
    ttsModel: ttsModel || DEFAULT_TTS_MODEL,
    defaultVoice: defaultVoice || DEFAULT_VOICE,
  };
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
  async tts(input: { text: string; voice?: string | null; language?: string | null }): Promise<ServamTtsResult> {
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
          speech_sample_rate: 8000,
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
};
