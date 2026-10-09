import mongoose, { Types } from 'mongoose';
import { folderSegment, entityFolder } from './mediaFolders';
import { imagekitPathsIn } from './mediaUrl';
import { MEDIA_OWNERS, type MediaOwner } from './mediaOrganizer.registry';
import { MediaRelocationModel } from './mediaRelocation.model';

/**
 * The scan half of the media organizer: walk every owner collection, find each
 * ImageKit file its documents reference, and record who owns it.
 *
 * Reads go through the raw collection, not the model — no getters, virtuals
 * or defaults between the stored value and the one recorded, because the
 * rewrite later only lands while the stored value is still exactly this.
 */

export const SCAN_BATCH = 200;
/** Deep enough for every schema here; a cycle-proof floor for Mixed fields. */
const MAX_DEPTH = 10;

interface Found {
  path: string;
  value: string;
}

/** Every string in a document, with its dotted path. ObjectIds, dates and binaries are not text. */
function collectStrings(value: unknown, path: string, depth: number, out: Found[]): void {
  if (typeof value === 'string') {
    if (path) out.push({ path, value });
    return;
  }
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return;
  if (value instanceof Types.ObjectId || value instanceof Date || Buffer.isBuffer(value)) return;
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value);
  for (const [key, child] of entries) {
    if (!path && key === '_id') continue;
    collectStrings(child, path ? `${path}.${key}` : key, depth + 1, out);
  }
}

/** Read a dotted field off a raw document. */
function readField(doc: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), doc);
}

export function ownerIdOf(doc: Record<string, unknown>, owner: MediaOwner): string | null {
  const raw = readField(doc, owner.owner);
  return folderSegment(raw instanceof Types.ObjectId ? raw.toHexString() : raw);
}

interface Sighting {
  owners: Set<string>;
  target_folder: string;
  refs: Array<{ model: string; doc_id: string; path: string; value: string; new_value: string; rewritten: boolean }>;
}

/** Every file one batch of documents references, grouped by file. */
function sightingsIn(docs: Array<Record<string, unknown>>, owner: MediaOwner, endpoint: string): Map<string, Sighting> {
  const files = new Map<string, Sighting>();
  for (const doc of docs) {
    const ownerId = ownerIdOf(doc, owner);
    if (!ownerId) continue;
    const strings: Found[] = [];
    collectStrings(doc, '', 0, strings);
    for (const found of strings) {
      for (const filePath of imagekitPathsIn(found.value, endpoint)) {
        const sighting = files.get(filePath) ?? { owners: new Set<string>(), target_folder: entityFolder(owner.bucket, ownerId, owner.kind), refs: [] };
        sighting.owners.add(`${owner.bucket}/${ownerId}`);
        sighting.refs.push({ model: owner.model, doc_id: String(doc._id), path: found.path, value: found.value, new_value: '', rewritten: false });
        files.set(filePath, sighting);
      }
    }
  }
  return files;
}

/**
 * Record one batch's sightings. A file seen under a second owner becomes
 * SHARED and drops its references — it will not be moved, so they are not
 * needed, and a stock photo used by thousands of pods would otherwise grow one
 * row past what a document can hold.
 */
async function record(runId: string, files: Map<string, Sighting>): Promise<void> {
  if (files.size === 0) return;
  await MediaRelocationModel.bulkWrite(
    [...files].map(([filePath, sighting]) => ({
      updateOne: {
        filter: { run_id: runId, file_path: filePath },
        update: {
          $addToSet: { owners: { $each: [...sighting.owners] } },
          $push: { refs: { $each: sighting.refs } },
          $setOnInsert: { target_folder: sighting.target_folder, status: 'PENDING' },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  await MediaRelocationModel.updateMany(
    { run_id: runId, file_path: { $in: [...files.keys()] }, 'owners.1': { $exists: true } },
    { $set: { status: 'SHARED', refs: [] } }
  );
}

export function ownerFilter(owner: MediaOwner, cursor: unknown): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (cursor) filter._id = { $gt: cursor };
  if (owner.skipWhen) filter.$nor = [owner.skipWhen];
  return filter;
}

/** Documents this owner collection holds in scope — for the progress total. */
export async function countOwnerDocs(): Promise<number> {
  const counts = await Promise.all(
    MEDIA_OWNERS.map((owner) => mongoose.models[owner.model]?.collection.countDocuments(ownerFilter(owner, null)) ?? 0)
  );
  return counts.reduce((sum, count) => sum + count, 0);
}

/**
 * Scan the next batch of one owner collection. Returns how many documents it
 * read and the cursor to continue from (null when that collection is done).
 */
export async function scanBatch(runId: string, endpoint: string, ownerIndex: number, cursor: unknown): Promise<{ read: number; cursor: unknown }> {
  const owner = MEDIA_OWNERS[ownerIndex];
  const model = mongoose.models[owner.model];
  if (!model) return { read: 0, cursor: null };
  const docs = (await model.collection.find(ownerFilter(owner, cursor)).sort({ _id: 1 }).limit(SCAN_BATCH).toArray()) as Array<Record<string, unknown>>;
  await record(runId, sightingsIn(docs, owner, endpoint));
  const last = docs.at(-1);
  return { read: docs.length, cursor: docs.length === SCAN_BATCH && last ? last._id : null };
}
