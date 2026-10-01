import { randomUUID } from 'node:crypto';
import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { logs } from '@observability/log';
import { isTrustedMediaUrl } from '@utils/url';
import { directReel, type DirectorTurn } from './reel.director';
import { driveAccountEmail, driveFile, driveFolder, parseDriveFolderId, type DriveEntry } from './reel.drive';
import { reelMediaLinks, type ReelMediaLinks } from './reel.media';
import { ReelProjectModel, type IReelProject, type ReelAsset, type ReelMessage } from './reel.model';
import { emptySpec, sanitizeSpec, specDurationMs } from './reel.spec';

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
const notFound = () => new GraphQLError('That reel no longer exists.', { extensions: { code: 'NOT_FOUND' } });

const str = (value: string | null | undefined): string => (value ?? '').trim();
const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);
const shortId = (): string => randomUUID().slice(0, 8);

/** A reel is a handful of clips; past this the model's context and the picker both stop being useful. */
const MAX_ASSETS = 60;
const MAX_UPLOADS_PER_MESSAGE = 6;
const MAX_MESSAGE_LENGTH = 2000;
/** The transcript kept per reel. Older turns fall off; the edit they produced is already in the spec. */
const MAX_MESSAGES = 200;

export interface ReelProjectInput {
  name: string;
  drive_url?: string | null;
}

export interface ReelUploadInput {
  url: string;
  name: string;
  width?: number | null;
  height?: number | null;
  size_bytes?: number | null;
}

export interface ReelMessageInput {
  project_id: string;
  text: string;
  uploads?: ReelUploadInput[] | null;
}

export interface ReelActor {
  id: string;
  email: string;
}

/* --------------------------------- shaping ------------------------------- */

function pubAsset(asset: ReelAsset, links: ReelMediaLinks) {
  const drive = asset.source === 'DRIVE';
  const thumbnail = drive ? links.thumbnail(asset.drive_file_id) : asset.url;
  return {
    id: asset.id,
    kind: asset.kind,
    source: asset.source,
    name: asset.name,
    mime_type: asset.mime_type,
    drive_file_id: asset.drive_file_id,
    url: drive ? links.media(asset.drive_file_id) : asset.url,
    thumbnail_url: asset.kind === 'AUDIO' ? '' : thumbnail,
    duration_ms: asset.duration_ms,
    width: asset.width,
    height: asset.height,
    size_bytes: asset.size_bytes,
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
async function toPub(doc: IReelProject) {
  const links = await reelMediaLinks();
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
    created_by: doc.created_by,
    created_at: iso(doc.created_at),
    updated_at: iso(doc.updated_at),
  };
}

function toSummary(doc: IReelProject) {
  const spec = sanitizeSpec(doc.spec, doc.assets);
  return {
    id: String(doc._id),
    name: doc.name,
    drive_url: doc.drive_url,
    asset_count: doc.assets.length,
    scene_count: spec.scenes.length,
    duration_ms: specDurationMs(spec),
    created_by: doc.created_by,
    created_at: iso(doc.created_at),
    updated_at: iso(doc.updated_at),
  };
}

/* --------------------------------- helpers ------------------------------- */

async function load(id: string): Promise<IReelProject> {
  if (!mongoose.isValidObjectId(id)) throw notFound();
  const doc = await ReelProjectModel.findById(id);
  if (!doc) throw notFound();
  return doc;
}

/** The name and Drive folder a create or an edit asked for, checked. */
function projectFields(input: ReelProjectInput) {
  const name = str(input.name);
  if (!name) throw badInput('Give the reel a name.');
  if (name.length > 80) throw badInput('A reel name is at most 80 characters.');
  const drive_url = str(input.drive_url);
  const drive_folder_id = drive_url ? parseDriveFolderId(drive_url) : '';
  if (drive_folder_id === null) {
    throw badInput('That is not a Google Drive folder link. Open the folder in Drive and copy its address.');
  }
  return { name, drive_url, drive_folder_id };
}

const fromDrive = (entry: DriveEntry, kind: ReelAsset['kind']): ReelAsset => ({
  id: shortId(),
  kind,
  source: 'DRIVE',
  name: entry.name,
  mime_type: entry.mime_type,
  drive_file_id: entry.id,
  url: '',
  duration_ms: entry.duration_ms,
  width: entry.width,
  height: entry.height,
  size_bytes: entry.size_bytes,
  added_at: new Date(),
});

function fromUpload(upload: ReelUploadInput): ReelAsset {
  const url = str(upload.url);
  // Only what the media store itself served: an arbitrary address here would be
  // one the model, and then every viewer's browser, is told to fetch.
  if (!isTrustedMediaUrl(url)) throw badInput('An attached picture did not come from the media store.');
  return {
    id: shortId(),
    kind: 'IMAGE',
    source: 'UPLOAD',
    name: str(upload.name).slice(0, 120) || 'image',
    mime_type: '',
    drive_file_id: '',
    url,
    duration_ms: 0,
    width: Math.max(0, Math.round(upload.width ?? 0)),
    height: Math.max(0, Math.round(upload.height ?? 0)),
    size_bytes: Math.max(0, Math.round(upload.size_bytes ?? 0)),
    added_at: new Date(),
  };
}

function assertRoom(doc: IReelProject, adding: number): void {
  if (doc.assets.length + adding > MAX_ASSETS) {
    throw badInput(`A reel holds at most ${MAX_ASSETS} clips and pictures. Remove some before adding more.`);
  }
}

/* --------------------------------- service ------------------------------- */

export const reelService = {
  async list() {
    const docs = await ReelProjectModel.find().select('-messages').sort({ updated_at: -1 }).limit(500);
    return docs.map(toSummary);
  },

  async get(id: string) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await ReelProjectModel.findById(id);
    return doc ? toPub(doc) : null;
  },

  async create(input: ReelProjectInput, actor: ReelActor) {
    const doc = await ReelProjectModel.create({
      ...projectFields(input),
      spec: emptySpec(),
      created_by: actor.email,
      updated_by: actor.email,
    });
    return toPub(doc);
  },

  async update(id: string, input: ReelProjectInput, actor: ReelActor) {
    const doc = await load(id);
    doc.set({ ...projectFields(input), updated_by: actor.email });
    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const doc = await load(id);
    await doc.deleteOne();
    return true;
  },

  async driveStatus() {
    const service_account_email = await driveAccountEmail();
    return { configured: service_account_email !== '', service_account_email };
  },

  async driveFolder(folder: string) {
    const folderId = parseDriveFolderId(str(folder));
    if (!folderId) throw badInput('That is not a Google Drive folder link.');
    const [listing, links] = await Promise.all([driveFolder(folderId), reelMediaLinks()]);
    return {
      id: listing.id,
      name: listing.name,
      truncated: listing.truncated,
      entries: listing.entries.map((entry) => ({
        ...entry,
        thumbnail_url: entry.kind === 'VIDEO' || entry.kind === 'IMAGE' ? links.thumbnail(entry.id) : '',
      })),
    };
  },

  async addDriveAssets(projectId: string, fileIds: string[], actor: ReelActor) {
    const doc = await load(projectId);
    const held = new Set(doc.assets.map((asset) => asset.drive_file_id));
    const wanted = [...new Set(fileIds.map(str))].filter((id) => id && !held.has(id));
    assertRoom(doc, wanted.length);
    const entries = await Promise.all(wanted.map((id) => driveFile(id)));
    for (const entry of entries) {
      // A folder, or a file kind the studio cannot play, is skipped rather than refused.
      if (entry && entry.kind !== 'FOLDER') doc.assets.push(fromDrive(entry, entry.kind));
    }
    doc.updated_by = actor.email;
    await doc.save();
    return toPub(doc);
  },

  async removeAsset(projectId: string, assetId: string, actor: ReelActor) {
    const doc = await load(projectId);
    doc.assets = doc.assets.filter((asset) => asset.id !== assetId);
    // Sanitizing against what is left is what drops the scenes that used it.
    doc.spec = sanitizeSpec(doc.spec, doc.assets);
    doc.updated_by = actor.email;
    await doc.save();
    return toPub(doc);
  },

  /**
   * One chat turn. The operator's message and its pictures are saved BEFORE the
   * model is asked, so a failed or slow call never costs them what they wrote
   * or uploaded — the failure is recorded as the reply instead.
   */
  async sendMessage(input: ReelMessageInput, actor: ReelActor) {
    const text = str(input.text);
    if (!text) throw badInput('Write what the reel should do.');
    if (text.length > MAX_MESSAGE_LENGTH) throw badInput(`A message is at most ${MAX_MESSAGE_LENGTH} characters.`);
    const uploads = input.uploads ?? [];
    if (uploads.length > MAX_UPLOADS_PER_MESSAGE) {
      throw badInput(`Attach at most ${MAX_UPLOADS_PER_MESSAGE} pictures to one message.`);
    }
    const doc = await load(input.project_id);
    assertRoom(doc, uploads.length);

    const history = [...doc.messages];
    const attached = uploads.map(fromUpload);
    doc.assets.push(...attached);
    doc.messages.push({
      id: shortId(),
      role: 'USER',
      text,
      asset_ids: attached.map((asset) => asset.id),
      spec: null,
      failed: false,
      at: new Date(),
    });
    doc.updated_by = actor.email;
    await doc.save();

    const turn = await directReel({
      projectId: String(doc._id),
      assets: doc.assets,
      spec: sanitizeSpec(doc.spec, doc.assets),
      history,
      request: text,
      userId: actor.id,
    }).catch((error: unknown): DirectorTurn => {
      // The request is already stored, so a throw here must still leave a reply
      // beside it — otherwise the transcript shows a question nobody answered.
      logs.server.error('reel', 'director', { error, project_id: input.project_id });
      return { ok: false, reply: error instanceof Error ? error.message : 'The editor could not be reached.', spec: null };
    });
    const reply: ReelMessage = {
      id: shortId(),
      role: 'ASSISTANT',
      text: turn.reply,
      asset_ids: [],
      spec: turn.spec,
      failed: !turn.ok,
      at: new Date(),
    };
    // One atomic update rather than a second save of `doc`. The model takes
    // seconds, and the operator can add or remove footage meanwhile: saving the
    // document read before the call would either fail on its version or write
    // its stale footage and transcript back over theirs. The spec is sanitized
    // against the footage again on every read, so a clip removed mid-turn simply
    // drops out of the reel.
    const update: mongoose.UpdateQuery<IReelProject> = {
      $push: { messages: { $each: [reply], $slice: -MAX_MESSAGES } },
    };
    if (turn.spec) update.$set = { spec: turn.spec };
    const updated = await ReelProjectModel.findByIdAndUpdate(doc._id, update, { new: true });
    if (!updated) throw notFound();
    return toPub(updated);
  },

  async restoreVersion(projectId: string, messageId: string, actor: ReelActor) {
    const doc = await load(projectId);
    const message = doc.messages.find((item) => item.id === messageId);
    if (message?.spec == null) throw badInput('That reply has no version of the reel to put back.');
    // Against today's assets: footage removed since then cannot come back with the version.
    doc.spec = sanitizeSpec(message.spec, doc.assets);
    doc.updated_by = actor.email;
    await doc.save();
    return toPub(doc);
  },
};
