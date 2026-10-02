import mongoose, { type Model } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import {
  traceFilter,
  userReferences,
  type UserReference,
} from '@modules/access/accountDeletion/accountDeletion.trace';

/**
 * "Download my data" — the GDPR right of access and data portability
 * (Art. 15 and 20), as one machine-readable JSON document.
 *
 * The records are found the same way account deletion finds them, by asking
 * every schema which fields point at a member (accountDeletion.trace.ts), so a
 * collection added next month is exported without anyone remembering to.
 *
 * Only references that make the member the record's SUBJECT are followed —
 * their tickets, posts, payments, preferences. A field like `reviewed_by` or
 * `participants` names them on somebody else's record, and exporting that
 * would hand one member another member's data.
 */
const SUBJECT_FIELDS = new Set([
  'user_id',
  'owner_id',
  'owner_user_id',
  'author_id',
  'buyer_id',
  'purchaser_user_id',
  'sender_id',
  'reporter_id',
  'requester_id',
  'submitted_by',
  'uploaded_by',
  'follower_id',
  'host_user_id',
  'subject_user_id',
]);

/** Credentials and their derivatives never leave the server, even to their owner. */
const SECRET_KEY = /password|hash|secret|token|salt/i;

/** Per collection-and-field, so one runaway log cannot make the file unusable. */
export const EXPORT_LIMIT_PER_GROUP = 1000;

const leafOf = (path: string) => path.split('.').pop() ?? path;

function isSubjectReference(ref: UserReference): boolean {
  return SUBJECT_FIELDS.has(leafOf(ref.field_path));
}

/** A deep copy with every secret-looking key dropped. */
export function withoutSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutSecrets);
  if (!value || typeof value !== 'object') return value;
  // ObjectId, Date, Buffer: let JSON.stringify use their own toJSON.
  if (typeof (value as { toJSON?: unknown }).toJSON === 'function') return value;
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    out[key] = withoutSecrets(inner);
  }
  return out;
}

interface ExportGroup {
  collection: string;
  field: string;
  truncated: boolean;
  records: unknown[];
}

async function exportGroup(ref: UserReference, userId: string): Promise<ExportGroup | null> {
  const model = mongoose.models[ref.model_name] as Model<unknown>;
  const docs = await model
    .find(traceFilter(ref, userId))
    .limit(EXPORT_LIMIT_PER_GROUP + 1)
    .lean();
  if (docs.length === 0) return null;
  return {
    collection: ref.model_name,
    field: ref.field_path,
    truncated: docs.length > EXPORT_LIMIT_PER_GROUP,
    records: docs.slice(0, EXPORT_LIMIT_PER_GROUP).map(withoutSecrets),
  };
}

/** Everything Duncit holds about one member, as pretty-printed JSON. */
export async function exportUserData(userId: string, now: Date = new Date()): Promise<string> {
  const account = await UserModel.findById(userId).lean();
  const refs = userReferences().filter(isSubjectReference);
  const groups = await Promise.all(refs.map((ref) => exportGroup(ref, userId)));
  return JSON.stringify(
    {
      generated_at: now.toISOString(),
      account: withoutSecrets(account),
      records: groups.filter((group): group is ExportGroup => group !== null),
    },
    null,
    2
  );
}
