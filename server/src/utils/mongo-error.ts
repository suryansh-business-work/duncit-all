/**
 * MongoDB's duplicate-key failure, said in words.
 *
 * A unique index that rejects a write throws
 * `E11000 duplicate key error collection: duncit.pods index: club_id_1_pod_id_1
 * dup key: { club_id: ObjectId('6a84…'), pod_id: "the-duncit-house-party-7" }`.
 * That sentence is written for whoever runs the database; handed verbatim to
 * whoever pressed Publish it says nothing they can act on, and it leaks the
 * collection and index layout to every client that asks.
 *
 * Every write that can trip a unique index answers through GraphQL, so the
 * rewrite lives once in `formatError` rather than in each of the sixty call
 * sites remembering to catch code 11000 — the ones that already catch it throw
 * their own message and never reach here.
 */

const DUPLICATE_KEY = 11000;

interface MongoDuplicateError {
  code?: unknown;
  /** `{ club_id: 1, pod_id: 1 }` — the index the write collided on. */
  keyPattern?: Record<string, unknown> | null;
  /** `{ club_id: ObjectId('6a84…'), pod_id: 'the-duncit-house-party-7' }`. */
  keyValue?: Record<string, unknown> | null;
}

/** Whether a thrown value is Mongo's E11000. */
export function isDuplicateKeyError(err: unknown): err is MongoDuplicateError {
  return (err as MongoDuplicateError | null)?.code === DUPLICATE_KEY;
}

/** Whether an E11000 collided on a particular indexed field. */
export function duplicateKeyOn(err: unknown, field: string): boolean {
  if (!isDuplicateKeyError(err)) return false;
  return field in (err.keyPattern ?? err.keyValue ?? {});
}

/**
 * Column names that are not sentences. Anything absent is humanised from its
 * own name (`gift_card_code` -> "gift card code"), which reads correctly far
 * more often than it does not, and costs nothing when a new index appears.
 */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  pod_id: 'pod link',
  club_id: 'club link',
  venue_id: 'venue link',
  auto_pod_no: 'Auto Pod number',
  email: 'email address',
  mobile_number: 'mobile number',
  whatsapp_number: 'WhatsApp number',
  username: 'username',
  order_no: 'order number',
  short_code: 'short link',
  share_key: 'share link',
};

const labelOf = (field: string): string =>
  FIELD_LABELS[field] ?? field.replace(/_id$/, '').replaceAll('_', ' ').trim();

/**
 * The fields worth naming to the reader.
 *
 * A compound index reads `{ club_id: ObjectId('6a84…'), pod_id: 'sunday-brunch' }`,
 * where the ObjectId is the SCOPE the uniqueness is measured inside ("unique
 * within this club") and never the value anybody typed. Naming it would send
 * the reader looking for a club to change.
 */
function meaningfulFields(err: MongoDuplicateError): string[] {
  const keyValue = err.keyValue ?? {};
  const fields = Object.keys(err.keyPattern ?? keyValue);
  const typed = fields.filter((field) => typeof keyValue[field] !== 'object');
  return typed.length > 0 ? typed : fields;
}

const joinWords = (words: string[]): string =>
  words.length < 2 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;

/**
 * The sentence to put on the screen, or null when the error is not an E11000
 * and must keep its own message.
 */
export function duplicateKeyMessage(err: unknown): string | null {
  if (!isDuplicateKeyError(err)) return null;
  const labels = meaningfulFields(err).map(labelOf).filter(Boolean);
  if (labels.length === 0) {
    return 'Those details are already in use. Please change them and try again.';
  }
  if (labels.length === 1) {
    return `That ${labels[0]} is already in use. Please change it and try again.`;
  }
  return `Those details are already in use (${joinWords(labels)}). Please change them and try again.`;
}
