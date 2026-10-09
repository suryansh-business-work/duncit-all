import mongoose, { Types } from 'mongoose';
import { logs } from '@observability/log';
import { mediaLibraryService } from './mediaLibrary.service';
import { decodePath, encodedBaseName, replaceImagekitPath } from './mediaUrl';
import { MediaRelocationModel, type LeanMediaRelocation, type RelocationRef } from './mediaRelocation.model';

/**
 * The apply half of the media organizer: copy each singly-owned file into its
 * owner's folder, then point the owner's fields at the copy.
 *
 * Copy, never move. The original stays exactly where it was, so a URL that
 * lives anywhere this cannot rewrite — a sent email, a WhatsApp message, a
 * phone's image cache, a page someone bookmarked, a change-log row — keeps
 * loading. That is what "no image breaks" means here.
 *
 * Each field is rewritten only while it still holds the value the scan saw. A
 * person who edited the pod in between wins; their document simply keeps the
 * original URL, which still works.
 */

/** Files copied at once — ImageKit's API is the bottleneck, not us. */
export const APPLY_BATCH = 4;
const ROLLBACK_BATCH = 25;

/** Folders known to exist, so each is created once per process, not once per file. */
const madeFolders = new Set<string>();

async function ensureFolder(folder: string): Promise<void> {
  if (madeFolders.has(folder)) return;
  // Creating a folder that exists is refused by some accounts and accepted by
  // others; either way the copy right after is what decides success.
  await mediaLibraryService.createFolder(folder).catch(() => undefined);
  madeFolders.add(folder);
}

/** An _id stored as an ObjectId or as a string — match whichever it is. */
const idsFor = (docId: string): unknown[] =>
  Types.ObjectId.isValid(docId) && docId.length === 24 ? [new Types.ObjectId(docId), docId] : [docId];

async function setIfUnchanged(ref: RelocationRef, from: string, to: string): Promise<boolean> {
  const model = mongoose.models[ref.model];
  if (!model) return false;
  const filter: Record<string, unknown> = { _id: { $in: idsFor(ref.doc_id) }, [ref.path]: from };
  const res = await model.collection.updateOne(filter, { $set: { [ref.path]: to } });
  return res.modifiedCount === 1;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const parentOf = (path: string): string => path.slice(0, path.lastIndexOf('/'));

/** The library's record of the file at exactly this (decoded) path, if there is one. */
async function fileAt(filePath: string) {
  const name = filePath.slice(filePath.lastIndexOf('/') + 1);
  const items = await mediaLibraryService.list({ path: parentOf(filePath) || '/', search: name, limit: 50 });
  return items.find((item) => item.type === 'file' && item.filePath === filePath) ?? null;
}

/**
 * Whether copying would land on someone else's file.
 *
 * ImageKit does not refuse a copy onto an existing name — it appends the
 * source as a new VERSION of that file, so whatever already sits there would
 * start showing this image instead. A file of the same name and size is this
 * file, copied by an earlier attempt that died before recording it; anything
 * else is a different file, and the copy must not happen.
 */
async function destinationTaken(source: string, destination: string): Promise<boolean> {
  const existing = await fileAt(destination);
  if (!existing) return false;
  const original = await fileAt(source);
  return !original || original.size !== existing.size;
}

/**
 * Destinations being copied to right now. Two files of one name bound for one
 * folder in the same batch would both see it free and both copy — the second
 * becoming a version of the first. The later one waits for the next batch,
 * where the name check sees the earlier copy.
 */
const copying = new Set<string>();

/**
 * Re-home one file. True when it is done (copied, or already in place), false
 * when it failed, null when it has to wait for a destination in use.
 */
async function relocate(row: LeanMediaRelocation, endpoint: string): Promise<boolean | null> {
  const source = decodePath(row.file_path);
  // Any kind inside its owner's folder is already home — a reel in /reels is
  // not moved to /media just because the pod record lists it.
  if (source.startsWith(`${parentOf(row.target_folder)}/`)) {
    await MediaRelocationModel.updateOne({ _id: row._id }, { $set: { status: 'IN_PLACE' } });
    return true;
  }
  const destination = `${row.target_folder}/${source.slice(source.lastIndexOf('/') + 1)}`;
  if (copying.has(destination)) return null;
  copying.add(destination);
  try {
    return await copyAndRewrite(row, endpoint, source, destination);
  } finally {
    copying.delete(destination);
  }
}

async function copyAndRewrite(row: LeanMediaRelocation, endpoint: string, source: string, destination: string): Promise<boolean> {
  try {
    if (await destinationTaken(source, destination)) {
      throw new Error('A different file already has this name in the destination folder; left where it is.');
    }
    await ensureFolder(row.target_folder);
    await mediaLibraryService.copy(source, row.target_folder);
  } catch (error) {
    return markFailed(row, error);
  }
  const newPath = `${row.target_folder}/${encodedBaseName(row.file_path)}`;
  const refs = await Promise.all(row.refs.map((ref) => rewriteRef(ref, endpoint, row.file_path, newPath)));
  await MediaRelocationModel.updateOne({ _id: row._id }, { $set: { status: 'DONE', new_file_path: newPath, refs } });
  return true;
}

async function rewriteRef(ref: RelocationRef, endpoint: string, fromPath: string, toPath: string): Promise<RelocationRef> {
  const next = replaceImagekitPath(ref.value, endpoint, fromPath, toPath);
  const rewritten = next !== ref.value && (await setIfUnchanged(ref, ref.value, next));
  return { ...ref, new_value: next, rewritten };
}

async function markFailed(row: LeanMediaRelocation, error: unknown): Promise<false> {
  logs.server.error('mediaOrganizer', 'relocate', { error, run_id: row.run_id, file_path: row.file_path });
  await MediaRelocationModel.updateOne({ _id: row._id }, { $set: { status: 'FAILED', error: messageOf(error).slice(0, 500) } });
  return false;
}

/** The next batch of PENDING files for this run, copied in parallel. Counts what it did. */
export async function applyBatch(runId: string, endpoint: string): Promise<{ done: number; failed: number; more: boolean }> {
  const rows = await MediaRelocationModel.find({ run_id: runId, status: 'PENDING' }).sort({ _id: 1 }).limit(APPLY_BATCH).lean<LeanMediaRelocation[]>();
  const outcomes = await Promise.all(rows.map((row) => relocate(row, endpoint).catch((error: unknown) => markFailed(row, error))));
  const done = outcomes.filter((outcome) => outcome === true).length;
  const failed = outcomes.filter((outcome) => outcome === false).length;
  // Anything fetched means another look: a full batch may have more behind
  // it, and a file that waited on a busy destination is still PENDING.
  return { done, failed, more: rows.length > 0 };
}

async function rollbackRow(row: LeanMediaRelocation): Promise<void> {
  await Promise.all(row.refs.filter((ref) => ref.rewritten).map((ref) => setIfUnchanged(ref, ref.new_value, ref.value)));
  await MediaRelocationModel.updateOne({ _id: row._id }, { $set: { status: 'ROLLED_BACK' } });
}

/**
 * Point every rewritten field of the next batch of DONE files back at the
 * original. Only fields still holding the organizer's own value are touched,
 * so an edit made after the move is never undone. The copies stay in
 * ImageKit — unused, harmless.
 */
export async function rollbackBatch(runId: string): Promise<{ done: number; more: boolean }> {
  const rows = await MediaRelocationModel.find({ run_id: runId, status: 'DONE' }).sort({ _id: 1 }).limit(ROLLBACK_BATCH).lean<LeanMediaRelocation[]>();
  await Promise.all(rows.map(rollbackRow));
  return { done: rows.length, more: rows.length === ROLLBACK_BATCH };
}
