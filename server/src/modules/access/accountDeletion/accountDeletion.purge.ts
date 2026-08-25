import mongoose, { type ClientSession, type Model, type Schema } from 'mongoose';
import { traceFilter, type UserReference } from './accountDeletion.trace';
import { isRetainedModel, redactionFor } from './accountDeletion.retention';

/**
 * HOW a reference is cleared, which is not the same question as where it is.
 *
 * A reference either means "this document is the member's" or "the member
 * appears inside this document". Getting that wrong is the worst bug this
 * feature could have: `Pod.comments.author_id` says somebody left a comment on
 * a pod, and deleting the pod because of it would take the host's event and
 * everybody else's booking with it.
 *
 *  - DELETE_DOCUMENTS — a scalar field on the document itself. A ticket
 *    carrying this `user_id` IS this member's ticket, so the row goes.
 *  - REMOVE_FROM_DOCUMENTS — the member is one entry in an array, or one
 *    sub-document inside one. Only their entry is pulled; the document stays
 *    for whoever it actually belongs to.
 *  - REDACT_RECORDS — the document is a financial or audit record that has to
 *    outlive the account (see `accountDeletion.retention.ts`). The row stays,
 *    the personal data on it is overwritten, and what used to show a name
 *    shows "Deleted user".
 */
export type PurgeKind = 'DELETE_DOCUMENTS' | 'REMOVE_FROM_DOCUMENTS' | 'REDACT_RECORDS';

interface PlainPull {
  kind: 'REMOVE_FROM_DOCUMENTS';
  /** `$pull` the id straight out of an array of ids. */
  mode: 'VALUE';
  path: string;
}

interface SubdocPull {
  kind: 'REMOVE_FROM_DOCUMENTS';
  /** `$pull` the whole sub-document whose field matches the member. */
  mode: 'SUBDOC';
  path: string;
  matchPath: string;
}

interface DeleteDocs {
  kind: 'DELETE_DOCUMENTS';
}

interface RedactDocs {
  kind: 'REDACT_RECORDS';
  /** The `$set` that erases the person, or null when the reference carries no
   * personal data and the row only has to be left alone. */
  set: Readonly<Record<string, unknown>> | null;
}

export type PurgePlan = PlainPull | SubdocPull | DeleteDocs | RedactDocs;

/**
 * Work out which of the three it is, from the schema.
 *
 * The subdocument-array case has to be found by walking the PREFIXES of the
 * path, not by looking at the leaf: `comments.author_id` has a scalar leaf and
 * still must not delete the pod. `comments.likes` goes further — an array
 * nested inside an array of sub-documents, which Mongo cannot write through a
 * plain dotted path at all, hence the all-positional `$[]`.
 */
export function purgePlan(modelName: string, schema: Schema, fieldPath: string): PurgePlan {
  // Retention answers before the schema does. A retained record's shape is
  // irrelevant — whether the member is a scalar field or one entry in an array,
  // the document is not this feature's to remove.
  if (isRetainedModel(modelName)) {
    return { kind: 'REDACT_RECORDS', set: redactionFor(modelName, fieldPath) };
  }
  const parts = fieldPath.split('.');
  for (let i = 1; i < parts.length; i += 1) {
    const prefix = parts.slice(0, i).join('.');
    if (!(schema.path(prefix) as any)?.$isMongooseDocumentArray) continue;
    const rest = parts.slice(i).join('.');
    const leafIsArray = !!(schema.path(fieldPath) as any)?.$isMongooseArray;
    // An array inside the sub-document: pull from every element's own array.
    if (leafIsArray) {
      return { kind: 'REMOVE_FROM_DOCUMENTS', mode: 'VALUE', path: `${prefix}.$[].${rest}` };
    }
    return { kind: 'REMOVE_FROM_DOCUMENTS', mode: 'SUBDOC', path: prefix, matchPath: rest };
  }
  if ((schema.path(fieldPath) as any)?.$isMongooseArray) {
    return { kind: 'REMOVE_FROM_DOCUMENTS', mode: 'VALUE', path: fieldPath };
  }
  return { kind: 'DELETE_DOCUMENTS' };
}

/** What the console labels the button, without re-deriving it on the client. */
export function purgeKind(modelName: string, fieldPath: string): PurgeKind {
  if (isRetainedModel(modelName)) return 'REDACT_RECORDS';
  const model = mongoose.models[modelName];
  if (!model) return 'DELETE_DOCUMENTS';
  return purgePlan(modelName, model.schema, fieldPath).kind;
}

/**
 * Clear one member out of one reference. Returns how many documents changed.
 *
 * Every write takes the caller's session, so the row it touches and the
 * purge-log entry the caller writes about it commit together or not at all. A
 * log that says a collection was cleared when it was not is worse than no log:
 * it is the record the next operator trusts instead of re-counting.
 */
export async function purgeReference(
  ref: UserReference,
  userId: string,
  session?: ClientSession
): Promise<number> {
  const model = mongoose.models[ref.model_name] as Model<any>;
  const filter = traceFilter(ref, userId);
  const value = Object.values(filter)[0];
  const plan = purgePlan(ref.model_name, model.schema, ref.field_path);

  if (plan.kind === 'DELETE_DOCUMENTS') {
    const res = await model.deleteMany(filter, { session });
    return res.deletedCount ?? 0;
  }
  if (plan.kind === 'REDACT_RECORDS') {
    // Nothing personal on this reference — the row is an id, an amount and a
    // date. It is kept exactly as it is, and reports 0 changed.
    if (!plan.set) return 0;
    const res = await model.updateMany(filter, { $set: plan.set }, { session });
    return res.modifiedCount ?? 0;
  }
  const pull =
    plan.mode === 'SUBDOC'
      ? { [plan.path]: { [plan.matchPath]: value } }
      : { [plan.path]: value };
  const res = await model.updateMany(filter, { $pull: pull }, { session });
  return res.modifiedCount ?? 0;
}
