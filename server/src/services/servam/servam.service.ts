import { getRuntimeEnvValue } from '../../config/runtimeEnv';

export interface ServamTranscriptResult {
  ok: boolean;
  message: string;
  transcript?: string;
  recording_url?: string;
}

const PROVIDER = 'servam';

async function loadConfig() {
  const [baseUrl, apiKey] = await Promise.all([
    getRuntimeEnvValue('SERVAM_AI_BASE_URL'),
    getRuntimeEnvValue('SERVAM_AI_API_KEY'),
  ]);
  return {
    baseUrl: (baseUrl || 'https://api.sarvam.ai').replace(/\/$/, ''),
    apiKey,
  };
}

/**
 * Wrapper around the Servam (Sarvam) AI speech-to-text API used to fetch
 * call transcripts. Vobiz hands us a recording URL when a call completes;
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
};
