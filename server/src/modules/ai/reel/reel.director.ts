import { openaiChat, type OpenAiMessage } from '@services/openai/openai.client';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { logs } from '@observability/log';
import { driveThumbnail } from './reel.drive';
import type { ReelAsset, ReelMessage } from './reel.model';
import { sanitizeSpec, type ReelSpec } from './reel.edit';

/**
 * One turn of the Reel Studio editor.
 *
 * The model is asked for the WHOLE edit every time, never a patch: a patch has
 * to be applied by code that understands every way a model can describe a
 * change, while a full spec only has to be sanitized. The cost is tokens, and
 * a reel's edit is small.
 *
 * It is shown the footage as well as told about it. A file name says nothing
 * about what is in a clip, so each asset's preview frame travels with the
 * request, labelled with the id the model must use to place it. One frame per
 * clip is what Drive offers; the operator's words carry the rest.
 */

export interface DirectorTurn {
  /** What the editor says back. */
  reply: string;
  /** The new edit, or null when the reply changed nothing. */
  spec: ReelSpec | null;
  /** False when the model could not be reached or could not be read. */
  ok: boolean;
}

export interface DirectorInput {
  projectId: string;
  assets: readonly ReelAsset[];
  spec: ReelSpec;
  /** The conversation before this request, oldest first. */
  history: readonly ReelMessage[];
  request: string;
  userId: string;
}

/** How much of the conversation the model re-reads. The edit itself carries the rest. */
const HISTORY_TURNS = 8;
/** Preview frames per request — the newest assets first, since those are what a request is usually about. */
const MAX_PICTURES = 16;
/**
 * The whole edit comes back every turn, so the ceiling has to fit the longest
 * reel the sanitizer allows — forty scenes with their texts — not a typical
 * one. A reply cut off mid-JSON cannot be read, and the same reel would then
 * fail on every later turn too.
 */
const MAX_TOKENS = 12_000;

const UNREADABLE = 'The editor answered in a form the studio could not read. Nothing was changed — try again.';

const seconds = (ms: number): string => (ms > 0 ? `${(ms / 1000).toFixed(1)}s` : 'length unknown');

function assetLine(asset: ReelAsset): string {
  const size = asset.width > 0 && asset.height > 0 ? ` | ${asset.width}x${asset.height}` : '';
  const length = asset.kind === 'IMAGE' ? '' : ` | ${seconds(asset.duration_ms)}`;
  return `- id: ${asset.id} | ${asset.kind} | ${JSON.stringify(asset.name)}${length}${size}`;
}

function historyText(history: readonly ReelMessage[]): string {
  const recent = history.filter((message) => !message.failed).slice(-HISTORY_TURNS);
  if (recent.length === 0) return '(nothing yet)';
  return recent.map((message) => `${message.role === 'USER' ? 'OPERATOR' : 'EDITOR'}: ${message.text}`).join('\n');
}

/** A Drive preview frame as a data URL — the model cannot fetch from Drive itself. */
async function driveFrame(fileId: string): Promise<string> {
  const res = await driveThumbnail(fileId);
  if (!res) return '';
  const type = res.headers.get('content-type') ?? 'image/jpeg';
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
}

/** Where the model can look at this asset, or '' when there is nothing to show. */
async function pictureOf(asset: ReelAsset): Promise<string> {
  if (asset.kind === 'AUDIO') return '';
  if (asset.source === 'UPLOAD') return asset.kind === 'IMAGE' ? asset.url : '';
  // A frame that cannot be fetched costs the model a picture, not the operator a turn.
  return driveFrame(asset.drive_file_id).catch((error) => {
    logs.server.warn('reel', 'frame', { error, asset_id: asset.id });
    return '';
  });
}

/** The labelled pictures that follow the request. */
async function pictureParts(assets: readonly ReelAsset[]): Promise<Array<Record<string, unknown>>> {
  // A copy sorted as a statement (S4043) — the server's lib is ES2022, which has no `toSorted`.
  const newestFirst = [...assets];
  newestFirst.sort((a, b) => b.added_at.getTime() - a.added_at.getTime());
  const shown = newestFirst.slice(0, MAX_PICTURES);
  const urls = await Promise.all(shown.map(pictureOf));
  return shown.flatMap((asset, index) =>
    urls[index]
      ? [
          { type: 'text', text: `Asset ${asset.id} (${asset.name}):` },
          { type: 'image_url', image_url: { url: urls[index], detail: 'low' } },
        ]
      : []
  );
}

/** The model's answer as an object, or null when it is not one. */
function parseAnswer(content: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(content);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function directReel(input: DirectorInput): Promise<DirectorTurn> {
  const [system, user, pictures] = await Promise.all([
    resolvePrompt('reels.director'),
    resolvePrompt('reels.director.user', {
      assets: input.assets.map(assetLine).join('\n') || '(no footage added yet)',
      spec: JSON.stringify(input.spec),
      history: historyText(input.history),
      request: input.request,
    }),
    pictureParts(input.assets),
  ]);
  const messages: OpenAiMessage[] = [
    { role: 'system', content: system.content },
    { role: 'user', content: [{ type: 'text', text: user.content }, ...pictures] },
  ];
  const res = await openaiChat({
    task: 'reels.director',
    detail: `reel:${input.projectId}`,
    model: system.model || undefined,
    temperature: 0.4,
    max_tokens: MAX_TOKENS,
    json: true,
    messages,
    user_id: input.userId,
  });
  if (!res.ok) return { ok: false, reply: res.message, spec: null };
  const answer = parseAnswer(res.content);
  if (!answer) return { ok: false, reply: UNREADABLE, spec: null };
  const reply = typeof answer.reply === 'string' ? answer.reply.trim() : '';
  const changed = typeof answer.spec === 'object' && answer.spec !== null;
  return {
    ok: true,
    reply: reply || (changed ? 'Updated the reel.' : 'Nothing to change.'),
    spec: changed ? sanitizeSpec(answer.spec, input.assets) : null,
  };
}
