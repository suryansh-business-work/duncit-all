import type { Model, Query, Schema } from 'mongoose';
import { updatePaths } from '@utils/doc-diff';

/**
 * The change log every portal table shows, captured on EVERY model.
 *
 * A table lists records that are written from many places — an editor, a
 * status switch, an approve button, a bulk action. Asking each of them to log
 * is how a trail ends up with holes, so the seam is one global mongoose plugin:
 * a `save()`, a `findOneAndUpdate`/`updateOne` or a delete is diffed against
 * what was stored a moment earlier, field by field.
 *
 * Only a signed-in person's writes are logged — the question a table's history
 * answers is "who changed this". A cron sweep, a webhook or a boot task has no
 * person behind it and costs one skipped check. The recorder (identity lookup,
 * diff, the log model) loads on the first write, so registering this plugin
 * never compiles a model before its own plugins are in place.
 */

type Recorder = typeof import('./tableChangeLog.recorder');
let loading: Promise<Recorder> | undefined;
const recorder = (): Promise<Recorder> => {
  loading ??= import('./tableChangeLog.recorder');
  return loading;
};

/** Stashed between the pre- and post- halves of one write. */
interface ChangeLocals {
  changeLog?: {
    context: NonNullable<ReturnType<Recorder['writeContext']>>;
    paths: string[];
    before: { _id?: unknown } | null;
  };
}

type LoggedQuery = Query<unknown, unknown> & ChangeLocals;

interface LoggedDocument {
  isNew: boolean;
  _id: unknown;
  collection: { collectionName: string };
  directModifiedPaths: () => string[];
  constructor: Model<unknown>;
  $locals: ChangeLocals & { changeLogCreate?: boolean };
}

const collectionOf = (query: LoggedQuery) => query.model.collection.collectionName;

function attachDocumentHooks(schema: Schema): void {
  schema.pre('save', async function captureBefore() {
    const doc = this as unknown as LoggedDocument;
    doc.$locals.changeLog = undefined;
    const r = await recorder();
    const context = r.writeContext(doc.collection.collectionName);
    if (!context) return;
    if (doc.isNew) {
      doc.$locals.changeLog = { context, paths: [], before: null };
      return;
    }
    const paths = r.loggablePaths(doc.directModifiedPaths());
    if (paths.length === 0) return;
    const before = await doc.constructor.findById(doc._id).select(r.projectionOf(paths)).lean();
    doc.$locals.changeLog = { context, paths, before: before as { _id?: unknown } | null };
  });

  schema.post('save', async function writeAfter(saved: unknown) {
    const doc = saved as LoggedDocument;
    const pending = doc.$locals.changeLog;
    if (!pending) return;
    doc.$locals.changeLog = undefined;
    const r = await recorder();
    const action = pending.before ? 'UPDATE' : 'CREATE';
    r.record({
      collection: doc.collection.collectionName,
      docId: doc._id,
      action,
      changes: action === 'UPDATE' ? r.fieldChanges(pending.paths, pending.before, doc) : [],
      context: pending.context,
    });
  });
}

function attachUpdateHooks(schema: Schema): void {
  for (const op of ['findOneAndUpdate', 'updateOne'] as const) {
    schema.pre(op, async function captureBefore(this: LoggedQuery) {
      this.changeLog = undefined;
      const r = await recorder();
      const context = r.writeContext(collectionOf(this));
      if (!context) return;
      const paths = r.loggablePaths(updatePaths(this.getUpdate()));
      if (paths.length === 0) return;
      const before = await this.model.findOne(this.getFilter()).select(r.projectionOf(paths)).lean();
      this.changeLog = { context, paths, before: before as { _id?: unknown } | null };
    });

    schema.post(op, async function writeAfter(this: LoggedQuery) {
      const pending = this.changeLog;
      if (!pending?.before?._id) return;
      const r = await recorder();
      const after = await this.model.findById(pending.before._id).select(r.projectionOf(pending.paths)).lean();
      r.record({
        collection: collectionOf(this),
        docId: pending.before._id,
        action: 'UPDATE',
        changes: r.fieldChanges(pending.paths, pending.before, after),
        context: pending.context,
      });
    });
  }
}

function attachDeleteHooks(schema: Schema): void {
  for (const op of ['findOneAndDelete', 'deleteOne'] as const) {
    schema.pre(op, async function captureBefore(this: LoggedQuery) {
      this.changeLog = undefined;
      const r = await recorder();
      const context = r.writeContext(collectionOf(this));
      if (!context) return;
      const before = await this.model.findOne(this.getFilter()).select('_id').lean();
      this.changeLog = { context, paths: [], before: before as { _id?: unknown } | null };
    });

    schema.post(op, async function writeAfter(this: LoggedQuery) {
      const pending = this.changeLog;
      if (!pending?.before?._id) return;
      const r = await recorder();
      r.record({
        collection: collectionOf(this),
        docId: pending.before._id,
        action: 'DELETE',
        changes: [],
        context: pending.context,
      });
    });
  }
}

/** The global plugin — `mongoose.plugin(tableChangeLogPlugin)` before any model compiles. */
export function tableChangeLogPlugin(schema: Schema): void {
  attachDocumentHooks(schema);
  attachUpdateHooks(schema);
  attachDeleteHooks(schema);
}
