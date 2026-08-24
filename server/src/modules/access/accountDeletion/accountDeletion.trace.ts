import mongoose, { Types, type Model, type Schema } from 'mongoose';

/**
 * Where a member appears across the database, discovered from the schemas
 * rather than from a hand-kept list.
 *
 * A list would be wrong within a week: 140-odd fields across 70-odd
 * collections point at a user today, and every new feature adds more. Nobody
 * updates a registry they do not know exists, and a deletion that quietly
 * misses a collection is the one bug this feature cannot afford. So the scan
 * walks `mongoose.models` and asks each schema what it says about itself.
 *
 * Two kinds of reference count:
 *   - an ObjectId field declared `ref: 'User'` (single or array), which is how
 *     most of the codebase points at a member; and
 *   - a String field named like a user id, which a handful of collections use
 *     because they are written from contexts that only ever held the id as a
 *     string (telemetry, staff chat, the AI logs).
 *
 * Anything else is invisible to this scan, and deliberately so — guessing at
 * a field because its name looked promising would delete other people's rows.
 */

/** String fields that hold a stringified user id. Matched on the leaf name so
 * `from_user_id` and `metadata.user_id` are both caught. */
const STRING_USER_FIELD = /^(?:[a-z]+_)?user_id$/;

/** Models this scan never reports.
 *
 * `User` is the account itself, which the caller removes last and separately.
 * `AccountDeletionRequest` is the record of the request being carried out —
 * purging it mid-purge would erase the audit trail of the purge. */
const SKIP_MODELS = new Set(['User', 'AccountDeletionRequest']);

export interface UserReference {
  /** The mongoose model name, e.g. `Ticket`. */
  model_name: string;
  /** The underlying collection, which is what a DB console shows. */
  collection_name: string;
  /** The dotted field path that points at the member, e.g. `pod_attendees`. */
  field_path: string;
  /** Whether the stored value is an ObjectId or a stringified id. */
  id_kind: 'OBJECT_ID' | 'STRING';
}

export interface UserTraceGroup extends UserReference {
  /** How many documents in that collection point at this member right now. */
  count: number;
}

/** Walk one schema, collecting every path that points at a User. Recurses into
 * subdocument arrays and nested schemas, which is where several of the
 * references live (`pod_attendees`, a chat's `participants`). */
function collectPaths(schema: Schema, prefix = ''): Array<Pick<UserReference, 'field_path' | 'id_kind'>> {
  const found: Array<Pick<UserReference, 'field_path' | 'id_kind'>> = [];
  schema.eachPath((name, type: any) => {
    const path = prefix ? `${prefix}.${name}` : name;
    const nested = type?.schema as Schema | undefined;
    if (nested) {
      found.push(...collectPaths(nested, path));
      return;
    }
    // `[{ type: ObjectId, ref: 'User' }]` puts the ref on the array's caster;
    // a single field puts it on the field's own options.
    const ref = type?.options?.ref ?? type?.caster?.options?.ref;
    if (ref === 'User') {
      found.push({ field_path: path, id_kind: 'OBJECT_ID' });
      return;
    }
    const instance = type?.instance ?? type?.caster?.instance;
    if (instance === 'String' && STRING_USER_FIELD.test(name)) {
      found.push({ field_path: path, id_kind: 'STRING' });
    }
  });
  return found;
}

/** Every user-pointing field in the database, model by model. */
export function userReferences(): UserReference[] {
  const refs: UserReference[] = [];
  for (const [modelName, m] of Object.entries(mongoose.models)) {
    if (SKIP_MODELS.has(modelName)) continue;
    const model = m as Model<any>;
    for (const path of collectPaths(model.schema)) {
      refs.push({
        model_name: modelName,
        collection_name: model.collection.name,
        field_path: path.field_path,
        id_kind: path.id_kind,
      });
    }
  }
  refs.sort(
    (a, b) =>
      a.model_name.localeCompare(b.model_name) || a.field_path.localeCompare(b.field_path)
  );
  return refs;
}

/** The filter that finds one member's rows through one reference. */
export function traceFilter(ref: UserReference, userId: string): Record<string, unknown> {
  // An array field is matched by the same equality — Mongo tests membership
  // for arrays, so one filter shape covers both.
  const value = ref.id_kind === 'OBJECT_ID' ? new Types.ObjectId(userId) : userId;
  return { [ref.field_path]: value };
}

/**
 * Count this member's rows behind every reference, dropping the ones that
 * match nothing.
 *
 * The counts run concurrently because they are independent reads, and there
 * are ~150 of them — sequentially that is a page that takes a visible pause
 * to open.
 */
export async function userTrace(userId: string): Promise<UserTraceGroup[]> {
  if (!Types.ObjectId.isValid(userId)) return [];
  const refs = userReferences();
  const counted = await Promise.all(
    refs.map(async (ref) => {
      const model = mongoose.models[ref.model_name] as Model<any>;
      const count = await model.countDocuments(traceFilter(ref, userId));
      return { ...ref, count };
    })
  );
  return counted.filter((group) => group.count > 0);
}
