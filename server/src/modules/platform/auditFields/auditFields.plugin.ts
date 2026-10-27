import { Document, Schema, Types, isObjectIdOrHexString } from 'mongoose';
import type { AnyBulkWriteOperation, Model, Query } from 'mongoose';

/**
 * Who created a record and who last changed it — `created_by` / `updated_by`
 * — stamped on EVERY model from the signed-in person behind the write.
 *
 * `created_at` / `updated_at` are mongoose's own timestamps, which almost every
 * schema already declares; one that declares no `timestamps` option gets them
 * here, and one that set its own (or opted out) keeps it. The person is the
 * half mongoose cannot know. It comes from the verified token of the request in
 * flight, never from the payload, so a client cannot write a record in someone
 * else's name. A cron sweep, a webhook or a boot task has no person behind it
 * and stamps nothing — nor do the log, counter and session collections the
 * change log already leaves out.
 *
 * A schema that declares either field itself keeps it: several store an email
 * or a name there, and an admin-only "last edited by" would be overwritten by
 * every incidental write. Only the field a schema leaves out is added and
 * filled here, and a value the write sets on purpose — even null — always wins.
 *
 * Stamped: `save()`/`create()`, `insertMany`, `updateOne`, `updateMany`,
 * `findOneAndUpdate`/`findByIdAndUpdate` and `bulkWrite`. A raw driver call
 * (`Model.collection.*`) bypasses mongoose and is not.
 */

type Recorder = typeof import('../tableChangeLog/tableChangeLog.recorder');
let loading: Promise<Recorder> | undefined;
/**
 * The change log's `writeContext` already decides who is behind a write, so
 * both trails name the same person. Loaded on the first write, as the change
 * log loads it: the identity it reads reaches models through `context`, and
 * this plugin is registered before any model compiles.
 */
const recorder = (): Promise<Recorder> => {
  loading ??= import('../tableChangeLog/tableChangeLog.recorder');
  return loading;
};

type AuditField = 'created_by' | 'updated_by';
const AUDIT_FIELDS: readonly AuditField[] = ['created_by', 'updated_by'];

type Fields = readonly AuditField[];
type Plain = Record<string, unknown>;
const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The signed-in person behind a write to `collection`, or null. */
async function actorFor(collection: string): Promise<Types.ObjectId | null> {
  const id = (await recorder()).writeContext(collection)?.identity.user?.id;
  return id && isObjectIdOrHexString(id) ? new Types.ObjectId(id) : null;
}

/** A new record gets each field it was not given; an edited one only `updated_by`. */
function stampDocument(doc: Document<unknown>, fields: Fields, actor: Types.ObjectId): void {
  for (const field of fields) {
    if ((doc.isNew || field === 'updated_by') && !doc.isDirectModified(field)) doc.set(field, actor);
  }
}

/** The same for what `insertMany` or a bulk `insertOne` is handed — a document or a raw object. */
function stampInsert(raw: unknown, fields: Fields, actor: Types.ObjectId): void {
  if (raw instanceof Document) {
    stampDocument(raw, fields, actor);
  } else if (isPlain(raw)) {
    for (const field of fields) if (raw[field] === undefined) raw[field] = actor;
  }
}

/** Whether an update writes `field` itself — at the top level or under any operator. */
const writes = (update: Plain, field: AuditField): boolean =>
  field in update || Object.values(update).some((part) => isPlain(part) && field in part);

/**
 * `updated_by` on every update, and `created_by` when an upsert inserts. An
 * aggregation-pipeline update only gets `updated_by`: a pipeline cannot tell
 * an insert from an edit.
 */
function stampUpdate(update: unknown, fields: Fields, actor: Types.ObjectId, upsert: boolean): void {
  const stampsUpdate = fields.includes('updated_by');
  if (Array.isArray(update)) {
    const written = update.some((stage) => isPlain(stage) && writes(stage, 'updated_by'));
    if (stampsUpdate && !written) update.push({ $set: { updated_by: actor } });
    return;
  }
  if (!isPlain(update)) return;
  if (stampsUpdate && !writes(update, 'updated_by')) {
    update.$set = { ...(isPlain(update.$set) ? update.$set : {}), updated_by: actor };
  }
  if (upsert && fields.includes('created_by') && !writes(update, 'created_by')) {
    update.$setOnInsert = { ...(isPlain(update.$setOnInsert) ? update.$setOnInsert : {}), created_by: actor };
  }
}

function stampBulk(ops: readonly AnyBulkWriteOperation[], fields: Fields, actor: Types.ObjectId): void {
  for (const op of ops) {
    if ('insertOne' in op) stampInsert(op.insertOne.document, fields, actor);
    else if ('updateOne' in op) stampUpdate(op.updateOne.update, fields, actor, op.updateOne.upsert === true);
    else if ('updateMany' in op) stampUpdate(op.updateMany.update, fields, actor, op.updateMany.upsert === true);
  }
}

/** The global plugin — `mongoose.plugin(auditFieldsPlugin)` before any model compiles. */
export function auditFieldsPlugin(schema: Schema): void {
  if (schema.options.timestamps === undefined) {
    schema.set('timestamps', { createdAt: 'created_at', updatedAt: 'updated_at' });
  }
  const fields = AUDIT_FIELDS.filter((field) => !schema.path(field));
  if (fields.length === 0) return;
  schema.add(Object.fromEntries(fields.map((field) => [field, { type: Schema.Types.ObjectId, ref: 'User' }])));

  schema.pre('save', async function stampSave() {
    // An unchanged save writes nothing; a stamp must not turn it into a write.
    if (!this.isNew && !this.isModified()) return;
    const actor = await actorFor(this.collection.collectionName);
    if (actor) stampDocument(this, fields, actor);
  });

  schema.pre('insertMany', async function stampInsertMany(this: Model<unknown>, _next, docs: unknown) {
    const actor = await actorFor(this.collection.collectionName);
    if (!actor) return;
    for (const doc of Array.isArray(docs) ? docs : [docs]) stampInsert(doc, fields, actor);
  });

  schema.pre(
    ['updateOne', 'updateMany', 'findOneAndUpdate'],
    { document: false, query: true },
    async function stampQuery(this: Query<unknown, unknown>) {
      const actor = await actorFor(this.model.collection.collectionName);
      if (actor) stampUpdate(this.getUpdate(), fields, actor, this.getOptions().upsert === true);
    }
  );

  schema.pre('bulkWrite', async function stampBulkWrite(this: Model<unknown>, _next, ops) {
    const actor = await actorFor(this.collection.collectionName);
    if (actor) stampBulk(ops, fields, actor);
  });
}
