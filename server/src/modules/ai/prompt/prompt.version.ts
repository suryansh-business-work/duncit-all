import type { Schema, Types } from 'mongoose';
import { requestIdentity } from '@observability/requestIdentity';
import { logs } from '@observability/log';
import { auditActorName } from '@utils/audit-actor';
import { AiPromptVersionModel, type PromptChange } from './prompt.version.model';

/**
 * Version capture for the AI Library, as schema middleware rather than calls in
 * the service, so every way a prompt is saved — create, edit, reset to the
 * catalogue default, restore, the boot seed — lands in the history without each
 * path having to remember to write it.
 *
 * Only these fields make a version. `variables`, `tasks` and `usage` are
 * derived from the body or owned by the catalogue, so a change there is either
 * already visible in `content` or not the operator's doing.
 */
export const TRACKED_FIELDS = ['name', 'description', 'content', 'category', 'target_model', 'role', 'is_active'] as const;

type TrackedField = (typeof TRACKED_FIELDS)[number];
type Snapshot = Record<TrackedField, unknown>;

interface PendingVersion {
  change: PromptChange;
  changed: TrackedField[];
  baseline: Snapshot | null;
}

/** The slice of a hydrated prompt document the hooks use. */
interface PromptDoc {
  _id: Types.ObjectId;
  isNew: boolean;
  revision?: number | null;
  $locals: Record<string, unknown>;
  isModified(path: string): boolean;
  get(path: string): unknown;
  collection: {
    findOne(filter: object): Promise<Record<string, unknown> | null>;
    findOneAndUpdate(filter: object, update: object, options: object): Promise<unknown>;
  };
}

const PENDING = 'promptVersion';

const snapshotOf = (read: (field: TrackedField) => unknown): Snapshot =>
  Object.fromEntries(TRACKED_FIELDS.map((field) => [field, read(field)])) as Snapshot;

/** `findOneAndUpdate` answers with the document (driver 6) or `{ value }` (older shapes). */
function revisionFrom(result: unknown): number {
  const doc = result && typeof result === 'object' && 'value' in result ? (result as { value: unknown }).value : result;
  const revision = (doc as { revision?: unknown } | null)?.revision;
  return typeof revision === 'number' ? revision : 0;
}

async function nextVersion(doc: PromptDoc): Promise<number> {
  const result = await doc.collection.findOneAndUpdate(
    { _id: doc._id },
    { $inc: { revision: 1 } },
    { returnDocument: 'after', projection: { revision: 1 } }
  );
  return revisionFrom(result);
}

async function writeVersion(
  doc: PromptDoc,
  change: PromptChange,
  changed: readonly string[],
  snapshot: Snapshot,
  editor: { id: string | null; name: string | null }
): Promise<void> {
  const version = await nextVersion(doc);
  await AiPromptVersionModel.create({
    prompt_id: doc._id,
    version,
    change,
    changed_fields: changed,
    name: snapshot.name ?? '',
    description: snapshot.description ?? '',
    content: snapshot.content ?? '',
    category: snapshot.category ?? '',
    target_model: snapshot.target_model ?? '',
    role: snapshot.role ?? 'SYSTEM',
    is_active: snapshot.is_active !== false,
    edited_by: editor.id,
    edited_by_name: editor.name,
  });
}

async function editor(): Promise<{ id: string | null; name: string | null }> {
  const id = requestIdentity.current()?.user?.id ?? null;
  return { id, name: id ? await auditActorName(id) : null };
}

export function attachPromptVersioning(schema: Schema): void {
  schema.pre('save', async function capture(this: PromptDoc) {
    const changed = this.isNew ? [...TRACKED_FIELDS] : TRACKED_FIELDS.filter((field) => this.isModified(field));
    if (changed.length === 0) return;
    const signedIn = Boolean(requestIdentity.current()?.user?.id);
    let change: PromptChange = signedIn ? 'UPDATE' : 'SEED';
    if (this.isNew) change = 'CREATE';
    // A prompt saved before history existed has no record of what it said. The
    // stored copy is read once, before the first tracked edit overwrites it.
    let baseline: Snapshot | null = null;
    if (!this.isNew && !this.revision) {
      const stored = await this.collection.findOne({ _id: this._id });
      if (stored) baseline = snapshotOf((field) => stored[field]);
    }
    const pending: PendingVersion = { change, changed, baseline };
    this.$locals[PENDING] = pending;
  });

  schema.post('save', async function record(this: PromptDoc) {
    const pending = this.$locals[PENDING] as PendingVersion | undefined;
    if (!pending) return;
    delete this.$locals[PENDING];
    // History is a record of the save, not part of it: a failure here is logged
    // and the operator's edit stands.
    try {
      const by = await editor();
      if (pending.baseline) await writeVersion(this, 'BASELINE', [], pending.baseline, { id: null, name: null });
      await writeVersion(this, pending.change, pending.changed, snapshotOf((field) => this.get(field)), by);
    } catch (error) {
      logs.server.warn('aiPrompt', 'version', { msg: 'could not record prompt version', prompt_id: String(this._id), error });
    }
  });
}
