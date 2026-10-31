import { randomUUID } from 'node:crypto';
import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { userActor, withRun, type RunContext } from '@modules/crm/marketing/runs/marketingRun.service';
import { reelMediaLinks, type ReelMediaLinks } from './reel.media';
import { ReelProjectModel, type IReelProject, type ReelAsset, type ReelMessage } from './reel.model';
import { sanitizeSpec, specDurationMs, type ReelScene, type ReelSpec } from './reel.edit';
import { postLinksOf, type ReelListFigures } from './reel.analytics';

/**
 * What every part of Reel Studio shares: how a project is loaded, how it is
 * shaped for the portal, and the few limits and errors they all use. The
 * service (CRUD, Drive, the chat) and the production line (ideas, storyboard,
 * voice, checks, variants) each import this rather than each other.
 */

export const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
export const notFound = () => new GraphQLError('That reel no longer exists.', { extensions: { code: 'NOT_FOUND' } });

export const str = (value: string | null | undefined): string => (value ?? '').trim();
export const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);
export const shortId = (): string => randomUUID().slice(0, 8);

/** A reel is a handful of clips; past this the model's context and the picker both stop being useful. */
export const MAX_ASSETS = 60;

export interface ReelActor {
  id: string;
  email: string;
}

/* --------------------------------- shaping ------------------------------- */

/** The preview frame of an asset: Drive's, signed, or the file itself; a sound file has none. */
function thumbnailOf(asset: ReelAsset, links: ReelMediaLinks): string {
  if (asset.kind === 'AUDIO') return '';
  return asset.source === 'DRIVE' ? links.thumbnail(asset.drive_file_id) : asset.url;
}

function pubAsset(asset: ReelAsset, links: ReelMediaLinks) {
  const drive = asset.source === 'DRIVE';
  return {
    id: asset.id,
    kind: asset.kind,
    source: asset.source,
    name: asset.name,
    mime_type: asset.mime_type,
    drive_file_id: asset.drive_file_id,
    url: drive ? links.media(asset.drive_file_id) : asset.url,
    thumbnail_url: thumbnailOf(asset, links),
    duration_ms: asset.duration_ms,
    width: asset.width,
    height: asset.height,
    size_bytes: asset.size_bytes,
    licence: asset.licence ?? '',
    attribution: asset.attribution ?? '',
    provider_id: asset.provider_id ?? '',
  };
}

const pubMessage = (message: ReelMessage) => ({
  id: message.id,
  role: message.role,
  text: message.text,
  asset_ids: message.asset_ids,
  restorable: message.role === 'ASSISTANT' && message.spec != null,
  failed: message.failed,
  at: message.at.toISOString(),
});

/** A reel as the studio reads it, every Drive link freshly signed. */
export async function toPub(doc: IReelProject) {
  const [links, posts] = await Promise.all([reelMediaLinks(), postLinksOf(String(doc._id))]);
  const spec = sanitizeSpec(doc.spec, doc.assets);
  return {
    id: String(doc._id),
    name: doc.name,
    drive_url: doc.drive_url,
    drive_folder_id: doc.drive_folder_id,
    assets: doc.assets.map((asset) => pubAsset(asset, links)),
    spec,
    duration_ms: specDurationMs(spec),
    messages: doc.messages.map(pubMessage),
    variants: (doc.variants ?? []).map((variant) => ({
      platform: variant.platform,
      caption: variant.caption,
      hashtags: [...variant.hashtags],
      title: variant.title,
    })),
    cover_at_ms: doc.cover_at_ms ?? null,
    checks: (doc.checks ?? []).map((check) => ({ name: check.name, pass: check.pass, detail: check.detail })),
    posts,
    created_by: doc.created_by,
    created_at: iso(doc.created_at),
    updated_at: iso(doc.updated_at),
  };
}

export type PubReelProject = Awaited<ReturnType<typeof toPub>>;

/** The scene playing at a moment of the reel; each scene arrives early by the overlap of its transition. */
function sceneAt(spec: ReelSpec, atMs: number): ReelScene | undefined {
  let start = 0;
  let playing: ReelScene | undefined;
  for (const [index, scene] of spec.scenes.entries()) {
    if (index > 0) start += spec.scenes[index - 1].duration_ms - scene.transition_ms;
    if (atMs < start) break;
    playing = scene;
  }
  return playing;
}

/**
 * The frame the list shows for a reel: the footage under the chosen cover
 * moment, else the first scene that has footage (a colour card has no frame
 * to show), else nothing.
 */
function coverUrl(doc: IReelProject, spec: ReelSpec, links: ReelMediaLinks): string {
  const byId = new Map(doc.assets.map((asset) => [asset.id, asset]));
  const chosen = doc.cover_at_ms == null ? undefined : sceneAt(spec, doc.cover_at_ms);
  const scene = chosen && byId.has(chosen.asset_id) ? chosen : spec.scenes.find((item) => byId.has(item.asset_id));
  const asset = scene ? byId.get(scene.asset_id) : undefined;
  return asset ? thumbnailOf(asset, links) : '';
}

/** A reel as the list shows it; `figures` is what the posts it went out in add up to, absent when it never went out. */
export function toSummary(doc: IReelProject, links: ReelMediaLinks, figures?: ReelListFigures) {
  const spec = sanitizeSpec(doc.spec, doc.assets);
  const checks = doc.checks ?? [];
  return {
    id: String(doc._id),
    name: doc.name,
    drive_url: doc.drive_url,
    asset_count: doc.assets.length,
    scene_count: spec.scenes.length,
    duration_ms: specDurationMs(spec),
    cover_url: coverUrl(doc, spec, links),
    last_check_pass: checks.length === 0 ? null : checks.every((check) => check.pass),
    posts_count: figures?.posts_count ?? 0,
    views: figures?.views ?? 0,
    created_by: doc.created_by,
    created_at: iso(doc.created_at),
    updated_at: iso(doc.updated_at),
  };
}

/* --------------------------------- helpers ------------------------------- */

export async function load(id: string): Promise<IReelProject> {
  if (!mongoose.isValidObjectId(id)) throw notFound();
  const doc = await ReelProjectModel.findById(id);
  if (!doc) throw notFound();
  return doc;
}

export function assertRoom(doc: IReelProject, adding: number): void {
  if (doc.assets.length + adding > MAX_ASSETS) {
    throw badInput(`A reel holds at most ${MAX_ASSETS} clips and pictures. Remove some before adding more.`);
  }
}

/**
 * A REEL run in the reel's name, by the signed-in operator. Every AI step,
 * provider call and spec write of the production line happens inside one of
 * these, so the Activity timeline shows what was asked and what it cost.
 */
export async function reelRun<T>(doc: IReelProject, name: string, actor: ReelActor, body: (run: RunContext) => Promise<T>): Promise<T> {
  return withRun(
    { workflow: 'REEL', name, trigger: 'USER', actor: await userActor(actor), links: { reel_id: String(doc._id) } },
    body
  );
}

/** The asset of this project with that id, or a readable refusal. */
export function assetOf(doc: IReelProject, assetId: string): ReelAsset {
  const asset = doc.assets.find((item) => item.id === str(assetId));
  if (!asset) throw badInput('That clip is not in this reel.');
  return asset;
}

const MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
};

/** The media type an address names by its extension, or '' when it names none. */
export function mimeFromUrl(url: string): string {
  let pathname = '';
  try {
    pathname = new URL(url).pathname;
  } catch {
    return '';
  }
  const ext = /\.([a-z0-9]+)$/i.exec(pathname)?.[1]?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? '';
}

/** What kind of asset a media type is, or null for one the studio cannot play. */
export function kindOfMime(mime: string): ReelAsset['kind'] | null {
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('audio/')) return 'AUDIO';
  return null;
}
