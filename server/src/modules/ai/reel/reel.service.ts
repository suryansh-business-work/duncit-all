import mongoose from 'mongoose';
import { logs } from '@observability/log';
import { isTrustedMediaUrl } from '@utils/url';
import type { SocialPlatform } from '@modules/crm/marketing/social/social.types';
import { directReel, type DirectorTurn } from './reel.director';
import { driveAccountEmail, driveFile, driveFolder, parseDriveFolderId, type DriveEntry } from './reel.drive';
import { reelMediaLinks } from './reel.media';
import { ReelProjectModel, type IReelProject, type ReelAsset, type ReelMessage } from './reel.model';
import { emptySpec, sanitizeSpec, specDurationMs, type ReelAspect } from './reel.edit';
import { assertRoom, badInput, load, notFound, shortId, str, toPub, toSummary, type ReelActor } from './reel.shared';
import { analyticsOf, listFiguresOf } from './reel.analytics';
import { reelChecks } from './reel.checks';
import { newStockAssets, searchReelMedia, uploadAsset, type ReelStockAssetInput, type ReelUploadInput } from './reel.stock';
import { generateReelIdeas, generateReelScript, generateReelVariants, recommendNextReel, type ReelConceptInput } from './reel.ai';
import { applyReelStoryboard, type ReelScriptInput } from './reel.storyboard';
import { generateReelSubtitles, generateReelVoiceover } from './reel.voice';
import type { ReelAssetKind } from './reel.model';

export type { ReelActor } from './reel.shared';
export type { ReelUploadInput } from './reel.stock';

const MAX_UPLOADS_PER_MESSAGE = 6;
const MAX_MESSAGE_LENGTH = 2000;
/** The transcript kept per reel. Older turns fall off; the edit they produced is already in the spec. */
const MAX_MESSAGES = 200;

export interface ReelProjectInput {
  name: string;
  drive_url?: string | null;
}

export interface ReelMessageInput {
  project_id: string;
  text: string;
  uploads?: ReelUploadInput[] | null;
}

/* --------------------------------- helpers ------------------------------- */

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
  licence: '',
  attribution: '',
  provider_id: '',
  added_at: new Date(),
});

/** A picture attached in the chat — always a picture, whatever its address says. */
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
    licence: '',
    attribution: '',
    provider_id: '',
    added_at: new Date(),
  };
}

/** Add footage the operator picked and hand the reel back. */
async function addAssets(doc: IReelProject, assets: ReelAsset[], actor: ReelActor) {
  assertRoom(doc, assets.length);
  doc.assets.push(...assets);
  doc.updated_by = actor.email;
  await doc.save();
  return toPub(doc);
}

/* --------------------------------- service ------------------------------- */

export const reelService = {
  /** Every reel, newest edit first, with the list's figures read for all of them in one go. */
  async list() {
    const docs = await ReelProjectModel.find().select('-messages').sort({ updated_at: -1 }).limit(500);
    const [links, figures] = await Promise.all([reelMediaLinks(), listFiguresOf(docs.map((doc) => String(doc._id)))]);
    return docs.map((doc) => toSummary(doc, links, figures.get(String(doc._id))));
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
    // A folder, or a file kind the studio cannot play, is skipped rather than refused.
    const assets = entries.flatMap((entry) => (entry && entry.kind !== 'FOLDER' ? [fromDrive(entry, entry.kind)] : []));
    return addAssets(doc, assets, actor);
  },

  /** Stock the operator picked from the media search; items the reel already holds are skipped. */
  async addStockAssets(projectId: string, items: ReelStockAssetInput[], actor: ReelActor) {
    const doc = await load(projectId);
    return addAssets(doc, newStockAssets(doc, items), actor);
  },

  /** Pictures, clips and sound files already in the media store. */
  async addUploadAssets(projectId: string, uploads: ReelUploadInput[], actor: ReelActor) {
    const doc = await load(projectId);
    return addAssets(doc, uploads.map(uploadAsset), actor);
  },

  mediaSearch(input: { query: string; kind: ReelAssetKind; orientation?: ReelAspect | null; page?: number | null }) {
    return searchReelMedia(input);
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

  /**
   * An edit made by hand on the timeline. It is sanitized exactly as the
   * editor's own answers are, and written in one update — not a save of a
   * document read earlier — so it cannot clobber a chat reply landing at the
   * same moment. The edit arrives as JSON text: the same shape the stored spec
   * and the director use, with `sanitizeSpec` as its one validator.
   */
  async saveSpec(projectId: string, specJson: string, actor: ReelActor) {
    let raw: unknown;
    try {
      raw = JSON.parse(specJson);
    } catch {
      throw badInput('The edit could not be read.');
    }
    const doc = await load(projectId);
    const spec = sanitizeSpec(raw, doc.assets);
    const updated = await ReelProjectModel.findByIdAndUpdate(
      doc._id,
      { $set: { spec, updated_by: actor.email } },
      { new: true }
    );
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

  /* ----------------------------- production line ---------------------------- */

  generateIdeas: generateReelIdeas,
  generateScript: generateReelScript,
  applyStoryboard: applyReelStoryboard,
  generateVoiceover: generateReelVoiceover,
  generateSubtitles: generateReelSubtitles,
  generateVariants: generateReelVariants,
  recommendNext: recommendNextReel,

  /** The checks for these networks, kept on the project as its last validation. */
  async validate(projectId: string, platforms: SocialPlatform[]) {
    if (platforms.length === 0) throw badInput('Pick at least one network to check against.');
    const doc = await load(projectId);
    const checks = reelChecks(sanitizeSpec(doc.spec, doc.assets), doc.assets, platforms);
    await ReelProjectModel.updateOne({ _id: doc._id }, { $set: { checks } });
    return checks;
  },

  async analytics(projectId: string) {
    await load(projectId);
    return analyticsOf(projectId);
  },

  /** The frame the cover is taken from, anywhere inside the reel. */
  async setCover(projectId: string, atMs: number, actor: ReelActor) {
    const doc = await load(projectId);
    const total = specDurationMs(sanitizeSpec(doc.spec, doc.assets));
    if (!Number.isFinite(atMs) || atMs < 0 || atMs > total) throw badInput(`Pick a moment between 0 and ${total} ms.`);
    const updated = await ReelProjectModel.findByIdAndUpdate(doc._id, { $set: { cover_at_ms: Math.round(atMs), updated_by: actor.email } }, { new: true });
    if (!updated) throw notFound();
    return toPub(updated);
  },
};

export type { ReelConceptInput, ReelScriptInput, ReelStockAssetInput };
