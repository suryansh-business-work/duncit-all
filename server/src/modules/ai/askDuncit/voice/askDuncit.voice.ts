import { isAiFeatureEnabled } from '@modules/ai/aiFeature/aiFeature.guard';
import { openAiUsageService } from '@modules/ai/openaiUsage/openaiUsage.service';
import { OPENAI_TASKS, type OpenAiTaskKey } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { readError, resolveConfig } from '@services/openai/openai.client';
import { HARD_LIMITS } from '../askDuncit.constants';

/**
 * Voice in and out for Ask Duncit, on the server so mWeb and the native app
 * behave identically (no browser-only speech API, no extra native module), and
 * Hindi/Hinglish transcribe as well as English.
 *
 *  - transcribe: recorded audio → text (OpenAI audio/transcriptions);
 *  - speak: an answer → MP3 (OpenAI audio/speech).
 *
 * Both are counted in OpenAI Logs under their own AI Features switch.
 */

export type VoiceFailure = 'DISABLED' | 'NOT_CONFIGURED' | 'TOO_LARGE' | 'EMPTY' | 'UPSTREAM';

export type VoiceResult<T> = { ok: true; value: T } | { ok: false; code: VoiceFailure; message: string };

const AUDIO_MIME = /^audio\/(webm|ogg|mpeg|mp3|mp4|m4a|x-m4a|aac|wav|x-wav|3gpp)(;.*)?$/i;

export const isAcceptedAudio = (mime: string): boolean => AUDIO_MIME.test(mime.trim());

function extensionOf(mime: string): string {
  const sub = mime.split('/')[1]?.split(';')[0]?.toLowerCase() ?? 'webm';
  if (sub === 'mpeg' || sub === 'mp3') return 'mp3';
  if (sub === 'x-m4a' || sub === 'mp4' || sub === 'aac') return 'm4a';
  if (sub === 'x-wav') return 'wav';
  return sub;
}

async function track(task: OpenAiTaskKey, model: string, status: 'SUCCESS' | 'FAILED' | 'SKIPPED', startedAt: number, detail: string, userId: string, error = '') {
  await openAiUsageService
    .recordUsage({
      task,
      task_label: OPENAI_TASKS[task].label,
      module: OPENAI_TASKS[task].module,
      detail,
      model,
      status,
      http_status: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      duration_ms: Date.now() - startedAt,
      request_preview: detail,
      response_preview: '',
      error_message: error,
      user_id: userId,
    })
    .catch(() => undefined);
}

async function ready(task: OpenAiTaskKey, model: string) {
  if (!(await isAiFeatureEnabled(task))) return { ok: false as const, code: 'DISABLED' as const, message: 'Voice is switched off' };
  const config = await resolveConfig(model);
  if (!config.apiKey || config.provider !== 'OpenAI') {
    return { ok: false as const, code: 'NOT_CONFIGURED' as const, message: 'Voice needs an OpenAI key' };
  }
  return { ok: true as const, config };
}

export async function transcribe(audio: Buffer, mime: string, opts: { model: string; userId: string; language?: string; task?: OpenAiTaskKey }): Promise<VoiceResult<string>> {
  const startedAt = Date.now();
  // Duncit Intel reuses this under its own AI Features switch and usage label.
  const task: OpenAiTaskKey = opts.task ?? 'ask_duncit.transcribe';
  if (audio.byteLength === 0) return { ok: false, code: 'EMPTY', message: 'No audio was recorded' };
  if (audio.byteLength > HARD_LIMITS.maxAudioBytes) return { ok: false, code: 'TOO_LARGE', message: 'The recording is too long' };
  const gate = await ready(task, opts.model);
  if (!gate.ok) {
    await track(task, opts.model, 'SKIPPED', startedAt, 'voice message', opts.userId, gate.message);
    return gate;
  }
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)], { type: mime }), `voice.${extensionOf(mime)}`);
  form.append('model', gate.config.model);
  if (opts.language) form.append('language', opts.language);
  const res = await fetch(`${gate.config.base}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${gate.config.apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const message = await readError(res);
    await track(task, gate.config.model, 'FAILED', startedAt, 'voice message', opts.userId, message);
    return { ok: false, code: 'UPSTREAM', message };
  }
  const body = (await res.json().catch(() => ({}))) as { text?: string };
  const text = String(body.text ?? '').trim();
  await track(task, gate.config.model, text ? 'SUCCESS' : 'FAILED', startedAt, `voice message · ${audio.byteLength} bytes`, opts.userId);
  return text ? { ok: true, value: text } : { ok: false, code: 'EMPTY', message: 'Nothing could be heard' };
}

export async function speak(text: string, opts: { model: string; voice: string; userId: string }): Promise<VoiceResult<Buffer>> {
  const startedAt = Date.now();
  const input = text.replace(/[*_`#>]/g, '').trim().slice(0, HARD_LIMITS.maxSpeechChars);
  if (!input) return { ok: false, code: 'EMPTY', message: 'Nothing to read' };
  const gate = await ready('ask_duncit.speak', opts.model);
  if (!gate.ok) {
    await track('ask_duncit.speak', opts.model, 'SKIPPED', startedAt, 'read aloud', opts.userId, gate.message);
    return gate;
  }
  const res = await fetch(`${gate.config.base}/audio/speech`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${gate.config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: gate.config.model, voice: opts.voice, input, response_format: 'mp3' }),
  });
  if (!res.ok) {
    const message = await readError(res);
    await track('ask_duncit.speak', gate.config.model, 'FAILED', startedAt, 'read aloud', opts.userId, message);
    return { ok: false, code: 'UPSTREAM', message };
  }
  const audio = Buffer.from(await res.arrayBuffer());
  await track('ask_duncit.speak', gate.config.model, 'SUCCESS', startedAt, `read aloud · ${input.length} chars`, opts.userId);
  return { ok: true, value: audio };
}
