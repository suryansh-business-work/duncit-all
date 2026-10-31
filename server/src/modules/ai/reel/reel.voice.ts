import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { servamService, type ServamCue } from '@services/servam/servam.service';
import { uploadToImagekit } from '@modules/platform/upload/upload.service';
import { driveContent } from './reel.drive';
import { REEL_LIMITS, sanitizeSpec, type ReelScene, type ReelSpec, type ReelText } from './reel.edit';
import { ReelProjectModel, type ReelAsset } from './reel.model';
import { assertRoom, assetOf, badInput, load, notFound, reelRun, shortId, str, toPub, type ReelActor } from './reel.shared';

/**
 * Sound made and read by machine: a voiceover spoken by Sarvam and kept in
 * the media store as a GENERATED asset, and subtitles cut from a transcript
 * with timing onto the scenes that play the sound. Both are REEL runs — the
 * provider call is a recorded step with its API entry, the spec write another.
 */

/** Where a reel's spoken tracks are filed in the media store. */
export const VOICE_FOLDER = '/marketing/reels/voice';
/** Sarvam's cap on one synthesis request. */
const MAX_VOICE_TEXT = 1500;
/** Bulbul speaks at 22050 Hz cleanly; the telephone rate the call flows use is too thin for a reel. */
const VOICE_SAMPLE_RATE = 22_050;
/** A Drive clip is downloaded whole to be transcribed; past this it is a shoot, not a voice track. */
const MAX_DRIVE_TRANSCRIBE_BYTES = 25 * 1024 * 1024;
const WHITE = '#FFFFFF';

const upstream = (message: string) => new GraphQLError(message, { extensions: { code: 'UPSTREAM_ERROR' } });

/* ---------------------------------- WAV --------------------------------- */

/**
 * How long a WAV plays, read off its header: the `fmt ` chunk's byte rate and
 * the `data` chunk's size. 0 for anything that is not a RIFF/WAVE file or
 * whose header is cut short — a length the player then measures itself.
 */
export function wavDurationMs(bytes: Buffer): number {
  if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') return 0;
  let byteRate = 0;
  let dataSize = 0;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (id === 'fmt ' && offset + 16 <= bytes.length) byteRate = bytes.readUInt32LE(offset + 16);
    if (id === 'data') {
      // A streamed WAV may declare more data than it carries; the bytes present are what plays.
      dataSize = Math.min(size, bytes.length - offset - 8);
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (byteRate === 0 || dataSize === 0) return 0;
  return Math.round((dataSize / byteRate) * 1000);
}

/* -------------------------------- voiceover ----------------------------- */

const voiceName = (text: string): string => `Voiceover — ${text.replaceAll(/\s+/g, ' ').slice(0, 48)}`;

export async function generateReelVoiceover(projectId: string, textInput: string, voice: string | null | undefined, language: string | null | undefined, actor: ReelActor) {
  const text = str(textInput);
  if (!text) throw badInput('Write what the voice should say.');
  if (text.length > MAX_VOICE_TEXT) throw badInput(`A voiceover is at most ${MAX_VOICE_TEXT} characters at a time.`);
  const doc = await load(projectId);
  assertRoom(doc, 1);
  const { asset, spec } = await reelRun(doc, `Voiceover for "${doc.name}"`, actor, async (run) => {
    const audio = await run.step(
      'tts',
      'Speak the text with Sarvam',
      async () => {
        const started = Date.now();
        const result = await servamService.tts({ text, voice: str(voice) || null, language: str(language) || null, sample_rate: VOICE_SAMPLE_RATE });
        await run.api({ service: 'Sarvam', method: 'POST', url: 'text-to-speech', status: result.ok ? 200 : 0, ms: Date.now() - started, summary: result.ok ? `${result.audio?.length ?? 0} bytes` : result.message });
        if (!result.ok || !result.audio) throw upstream(result.message);
        return result.audio;
      },
      { tool: 'sarvam.tts', input_summary: text.slice(0, 200), summarize: (bytes) => `${bytes.length} bytes, ${wavDurationMs(bytes)} ms` }
    );
    const uploaded = await run.step(
      'upload',
      'Keep the sound in the media store',
      () => uploadToImagekit({ fileBytes: audio, fileName: `voice-${String(doc._id)}-${Date.now()}.wav`, folder: VOICE_FOLDER, tags: ['reel', 'voiceover'] }),
      { tool: 'imagekit.upload', summarize: (result) => result.url }
    );
    const made: ReelAsset = {
      id: shortId(),
      kind: 'AUDIO',
      source: 'GENERATED',
      name: voiceName(text),
      mime_type: 'audio/wav',
      drive_file_id: '',
      url: uploaded.url,
      duration_ms: wavDurationMs(audio),
      width: 0,
      height: 0,
      size_bytes: audio.length,
      licence: '',
      attribution: '',
      provider_id: '',
      added_at: new Date(),
    };
    const written = await run.step('spec', 'Play it under the reel', async () => {
      const current = sanitizeSpec(doc.spec, doc.assets);
      return sanitizeSpec({ ...current, voiceover: { asset_id: made.id, volume: 1 } }, [...doc.assets, made]);
    });
    return { asset: made, spec: written };
  });
  const updated = await ReelProjectModel.findByIdAndUpdate(doc._id, { $push: { assets: asset }, $set: { spec, updated_by: actor.email } }, { new: true });
  if (!updated) throw notFound();
  return toPub(updated);
}

/* -------------------------------- subtitles ----------------------------- */

/** The sound to transcribe: a Drive file's bytes, or the address of anything else. */
async function transcribeSource(asset: ReelAsset): Promise<{ bytes?: Buffer; audioUrl?: string }> {
  if (asset.source !== 'DRIVE') return { audioUrl: asset.url };
  const res = await driveContent(asset.drive_file_id, '', AbortSignal.timeout(120_000));
  if (!res.ok) {
    await res.body?.cancel();
    throw upstream(`Google Drive could not send that file (HTTP ${res.status}).`);
  }
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > MAX_DRIVE_TRANSCRIBE_BYTES) {
    await res.body?.cancel();
    throw badInput('That Drive file is too large to transcribe (25 MB at most) — add its sound as a separate file.');
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_DRIVE_TRANSCRIBE_BYTES) throw badInput('That Drive file is too large to transcribe (25 MB at most) — add its sound as a separate file.');
  return { bytes };
}

/** A window of the asset's time that one scene plays, and where that scene starts on the reel. */
interface Window {
  scene: ReelScene;
  /** Asset time the scene starts at. */
  from_ms: number;
  /** Asset time the scene ends at. */
  to_ms: number;
  /** How asset time maps onto scene time (a clip at double speed shows two seconds per second). */
  rate: number;
}

/** Where on the asset's own clock each scene that plays it begins and ends. */
function windowsOf(spec: ReelSpec, assetId: string): Window[] {
  const underWhole = spec.voiceover?.asset_id === assetId || spec.music?.asset_id === assetId;
  if (underWhole) {
    // Played under the whole reel from its start: the asset's clock is the reel's.
    const offset = spec.music?.asset_id === assetId && spec.voiceover?.asset_id !== assetId ? spec.music.trim_start_ms : 0;
    let at = offset;
    return spec.scenes.map((scene) => {
      const window = { scene, from_ms: at, to_ms: at + scene.duration_ms, rate: 1 };
      at += scene.duration_ms - scene.transition_ms;
      return window;
    });
  }
  return spec.scenes
    .filter((scene) => scene.asset_id === assetId)
    .map((scene) => ({ scene, from_ms: scene.trim_start_ms, to_ms: scene.trim_start_ms + scene.duration_ms * scene.playback_rate, rate: scene.playback_rate }));
}

/** Consecutive cues merged into at most `limit` lines, each spanning its first cue's start to its last cue's end. */
export function mergeCues(cues: readonly ServamCue[], limit: number): ServamCue[] {
  if (cues.length <= limit) return [...cues];
  const per = Math.ceil(cues.length / limit);
  const merged: ServamCue[] = [];
  for (let index = 0; index < cues.length; index += per) {
    const group = cues.slice(index, index + per);
    merged.push({ start_ms: group[0].start_ms, end_ms: group.at(-1)?.end_ms ?? group[0].end_ms, text: group.map((cue) => cue.text).join(' ') });
  }
  return merged;
}

const caption = (cue: ServamCue, window: Window): ReelText => {
  const start_ms = Math.max(0, Math.round((cue.start_ms - window.from_ms) / window.rate));
  const end_ms = Math.min(window.scene.duration_ms, Math.round((cue.end_ms - window.from_ms) / window.rate));
  return { id: shortId(), text: cue.text, style: 'CAPTION', position: 'BOTTOM', animation: 'FADE', start_ms, duration_ms: Math.max(1, end_ms - start_ms), color: WHITE, background: '' };
};

/**
 * The scenes with their captions replaced by the cues that fall inside each
 * one. Titles and subtitles stay; the room left under the per-scene ceiling
 * is what the captions get, merged down to fit.
 */
export function captionedScenes(spec: ReelSpec, assetId: string, cues: readonly ServamCue[]): ReelScene[] {
  const windows = new Map(windowsOf(spec, assetId).map((window) => [window.scene.id, window]));
  return spec.scenes.map((scene) => {
    const window = windows.get(scene.id);
    if (!window) return scene;
    const kept = scene.texts.filter((text) => text.style !== 'CAPTION');
    const inside = cues.filter((cue) => cue.end_ms > window.from_ms && cue.start_ms < window.to_ms);
    const room = Math.max(1, REEL_LIMITS.maxTexts - kept.length);
    const captions = mergeCues(inside, room).map((cue) => caption(cue, window));
    return { ...scene, texts: [...kept, ...captions] };
  });
}

export async function generateReelSubtitles(projectId: string, assetId: string, language: string | null | undefined, actor: ReelActor) {
  const doc = await load(projectId);
  const asset = assetOf(doc, assetId);
  if (asset.kind === 'IMAGE') throw badInput('A picture has no sound to transcribe.');
  const current = sanitizeSpec(doc.spec, doc.assets);
  if (windowsOf(current, asset.id).length === 0) throw badInput('No scene plays that sound yet — place it first, or set it as the voiceover.');
  const spec = await reelRun(doc, `Subtitles for "${doc.name}" from ${asset.name}`, actor, async (run) => {
    const cues = await run.step(
      'transcribe',
      'Transcribe with Sarvam',
      async () => {
        const source = await transcribeSource(asset);
        const started = Date.now();
        const result = await servamService.transcribe({ ...source, fileName: asset.name, contentType: asset.mime_type || undefined, language: str(language) || null, withTimestamps: true });
        await run.api({ service: 'Sarvam', method: 'POST', url: 'speech-to-text', status: result.ok ? 200 : 0, ms: Date.now() - started, summary: result.ok ? `${result.cues?.length ?? 0} cues` : result.message });
        if (!result.ok) throw upstream(result.message);
        if (!result.cues || result.cues.length === 0) throw upstream('Sarvam sent the words but no timing, so nothing could be placed.');
        return result.cues;
      },
      { tool: 'sarvam.transcribe', input_summary: asset.name, summarize: (found) => `${found.length} cues` }
    );
    return run.step('spec', 'Lay the captions on the scenes', async () => sanitizeSpec({ ...current, scenes: captionedScenes(current, asset.id, cues) }, doc.assets), {
      summarize: (result) => `${result.scenes.flatMap((scene) => scene.texts).filter((text) => text.style === 'CAPTION').length} captions`,
    });
  });
  const updated = await ReelProjectModel.findByIdAndUpdate(doc._id, { $set: { spec, updated_by: actor.email } }, { new: true });
  if (!updated) {
    logs.server.warn('reel', 'subtitles', { project_id: projectId, msg: 'the reel was deleted while its subtitles were made' });
    throw notFound();
  }
  return toPub(updated);
}
