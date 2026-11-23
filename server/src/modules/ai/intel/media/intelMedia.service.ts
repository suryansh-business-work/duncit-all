import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { escapeRegexLiteral } from '@utils/vet-regex';
import type { IntelActor } from '../access/intel.access';
import { writeAudit } from '../audit/intelAudit.service';
import type { MediaVisibility } from '../intel.constants';
import { scheduleMediaIndex } from '../sync/intelSync.queue';
import { canManageFile, canViewFile, normalizeFolder, viewableFilter } from './intelMedia.access';
import { unindexMedia, updateMediaVisibility } from './intelMedia.indexing';
import { IntelFolderModel, IntelMediaModel, type IIntelMedia } from './intelMedia.model';
import { deleteFile } from './intelMedia.storage';

/** The Media Manager's operations. Every one checks the file permission rules first. */

export type MediaView = 'ALL' | 'RECENT' | 'FAVORITES' | 'ARCHIVED' | 'TRASH';

export interface MediaListArgs {
  view?: MediaView | null;
  folder?: string | null;
  search?: string | null;
  page?: number | null;
  page_size?: number | null;
}

const notFound = () => new GraphQLError('File not found', { extensions: { code: 'NOT_FOUND' } });

export const toMediaDto = (f: IIntelMedia) => ({
  id: String(f._id),
  owner_id: String(f.owner_id),
  name: f.name,
  folder: f.folder,
  mime: f.mime,
  size: f.size,
  visibility: f.visibility,
  favorite: f.favorite,
  archived: f.archived,
  deleted: Boolean(f.deleted_at),
  index_status: f.index_status,
  index_method: f.index_method,
  index_warning: f.index_warning,
  page_count: f.page_count,
  chunk_count: f.chunk_count,
  indexed_at: f.indexed_at,
  created_at: f.created_at,
  updated_at: f.updated_at,
});

function viewFilter(view: MediaView, actor: IntelActor): Record<string, unknown> {
  switch (view) {
    case 'TRASH':
      return { deleted_at: { $ne: null }, owner_id: new Types.ObjectId(actor.user.id) };
    case 'ARCHIVED':
      return { deleted_at: null, archived: true };
    case 'FAVORITES':
      return { deleted_at: null, archived: false, favorite: true, owner_id: new Types.ObjectId(actor.user.id) };
    default:
      return { deleted_at: null, archived: false };
  }
}

async function loadManageable(actor: IntelActor, id: string): Promise<IIntelMedia> {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  const file = await IntelMediaModel.findById(id).lean();
  if (!file || !canViewFile(actor, file)) throw notFound();
  if (!canManageFile(actor, file)) throw new GraphQLError('Only the file owner can change it.', { extensions: { code: 'FORBIDDEN' } });
  return file;
}

const audit = (actor: IntelActor, action: string, file: Pick<IIntelMedia, '_id' | 'name'>, detail = '') =>
  writeAudit({ type: 'MEDIA', action, userId: actor.user.id, level: actor.level, target: `${file.name} (${String(file._id)})`, detail });

export const intelMediaService = {
  async list(actor: IntelActor, args: MediaListArgs) {
    const view = args.view ?? 'ALL';
    const filter: Record<string, unknown> = { ...viewFilter(view, actor), ...viewableFilter(actor) };
    if (args.folder && view === 'ALL') filter.folder = normalizeFolder(args.folder);
    if (args.search?.trim()) filter.name = new RegExp(escapeRegexLiteral(args.search.trim().slice(0, 100)), 'i');
    const pageSize = Math.min(Math.max(args.page_size ?? 30, 1), 100);
    const page = Math.max(args.page ?? 1, 1);
    const sort: Record<string, 1 | -1> = view === 'RECENT' ? { updated_at: -1 } : { created_at: -1 };
    const [rows, total] = await Promise.all([IntelMediaModel.find(filter).sort(sort).skip((page - 1) * pageSize).limit(pageSize).lean(), IntelMediaModel.countDocuments(filter)]);
    return { total, rows: rows.map(toMediaDto) };
  },

  async get(actor: IntelActor, id: string) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const file = await IntelMediaModel.findById(id).lean();
    if (!file || !canViewFile(actor, file)) throw notFound();
    return toMediaDto(file);
  },

  async folders(actor: IntelActor): Promise<string[]> {
    const owner = new Types.ObjectId(actor.user.id);
    const [used, empty] = await Promise.all([IntelMediaModel.distinct('folder', { owner_id: owner, deleted_at: null }), IntelFolderModel.distinct('path', { owner_id: owner })]);
    return [...new Set(['/', ...used.map(String), ...empty.map(String)])].sort((a, b) => a.localeCompare(b));
  },

  async createFolder(actor: IntelActor, path: string): Promise<string> {
    const folder = normalizeFolder(path);
    await IntelFolderModel.updateOne({ owner_id: actor.user.id, path: folder }, { $setOnInsert: { owner_id: actor.user.id, path: folder } }, { upsert: true });
    return folder;
  },

  async update(actor: IntelActor, id: string, patch: { name?: string | null; folder?: string | null; visibility?: MediaVisibility | null; favorite?: boolean | null }) {
    const file = await loadManageable(actor, id);
    const set: Record<string, unknown> = {};
    if (patch.name?.trim()) set.name = patch.name.trim().slice(0, 200);
    if (patch.folder) set.folder = normalizeFolder(patch.folder);
    if (typeof patch.favorite === 'boolean') set.favorite = patch.favorite;
    if (patch.visibility && patch.visibility !== file.visibility) set.visibility = patch.visibility;
    const updated = await IntelMediaModel.findByIdAndUpdate(file._id, { $set: set }, { new: true }).lean();
    if (set.visibility) await updateMediaVisibility(id, String(set.visibility));
    if (set.name && !file.archived && !file.deleted_at) scheduleMediaIndex(id);
    await audit(actor, 'media.update', file, JSON.stringify(set));
    return toMediaDto(updated ?? file);
  },

  async archive(actor: IntelActor, id: string, archived: boolean) {
    const file = await loadManageable(actor, id);
    const updated = await IntelMediaModel.findByIdAndUpdate(file._id, { $set: { archived } }, { new: true }).lean();
    if (archived) await unindexMedia(id);
    else scheduleMediaIndex(id);
    await audit(actor, archived ? 'media.archive' : 'media.unarchive', file);
    return toMediaDto(updated ?? file);
  },

  async trash(actor: IntelActor, id: string) {
    const file = await loadManageable(actor, id);
    const updated = await IntelMediaModel.findByIdAndUpdate(file._id, { $set: { deleted_at: new Date() } }, { new: true }).lean();
    await unindexMedia(id);
    await audit(actor, 'media.trash', file);
    return toMediaDto(updated ?? file);
  },

  async restore(actor: IntelActor, id: string) {
    const file = await loadManageable(actor, id);
    const updated = await IntelMediaModel.findByIdAndUpdate(file._id, { $set: { deleted_at: null } }, { new: true }).lean();
    if (!file.archived) scheduleMediaIndex(id);
    await audit(actor, 'media.restore', file);
    return toMediaDto(updated ?? file);
  },

  /** Permanently deletes a trashed file: its bytes, its row and its index entry. */
  async purge(actor: IntelActor, id: string): Promise<boolean> {
    const file = await loadManageable(actor, id);
    if (!file.deleted_at) throw new GraphQLError('Move the file to Trash before deleting it permanently.', { extensions: { code: 'BAD_USER_INPUT' } });
    await unindexMedia(id);
    await deleteFile(file.file_id);
    await IntelMediaModel.deleteOne({ _id: file._id });
    await audit(actor, 'media.purge', file);
    return true;
  },

  async reindex(actor: IntelActor, id: string) {
    const file = await loadManageable(actor, id);
    scheduleMediaIndex(id);
    await audit(actor, 'media.reindex', file);
    return toMediaDto({ ...file, index_status: 'PENDING' });
  },
};
