/**
 * Reclaim the space the denormalised user fields still occupy.
 *
 *   npm run migrate:drop-user-copies:dry     # report only, counts + estimated bytes
 *   npm run migrate:drop-user-copies         # write ($unset)
 *
 * Removing a field from a Mongoose schema stops it being READ or WRITTEN — it
 * does NOT remove it from documents already on disk. Every message ever posted
 * still carries the `user_name` and `user_photo` copied onto it, invisible to
 * the app and paid for on every disk read, every index scan that touches the
 * document, every backup and every replication stream.
 *
 * This is the pass that actually deletes them. It is separate from the code
 * change on purpose: the code has to ship and prove itself first, because a
 * `$unset` is the one step that cannot be rolled back by redeploying.
 *
 * Idempotent — an already-clean document simply matches nothing.
 *
 * NOT touched: every field the audit classified as a point-in-time record
 * (invoice bill-to, orders, payout releases, issued tickets, signed documents,
 * grievance filings, the Reported-Problem reporter snapshot, pod audit actors),
 * and the mirrored copies that back admin-table search. Those are still read.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const DRY = process.argv.includes('--dry-run');
/** Point at a database explicitly, e.g. a local restore of a production dump:
 *   npm run migrate:drop-user-copies:dry -- --uri mongodb://127.0.0.1:27017/duncit
 * Without it the script uses MONGO_URI from `server/.env`, like every other
 * migration here. */
const uriArg = process.argv.indexOf('--uri');
const URI_OVERRIDE = uriArg !== -1 ? process.argv[uriArg + 1] : undefined;
const FORCE_REMOTE = process.argv.includes('--i-know-this-is-production');

/** Is this connection string pointing at a database on this machine? */
function isLocal(uri: string): boolean {
  return /^mongodb:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])[:/]/i.test(uri.trim());
}

/** Collection name → the dead fields on it. Raw collection names, because this
 * runs against documents the models no longer describe. */
const DEAD_FIELDS: Record<string, string[]> = {
  podmessages: ['user_name', 'user_photo'],
  supportchatmessages: ['sender_name', 'sender_photo'],
  productreviews: ['user_name'],
  inventoryactivitylogs: ['user_name'],
  inventorystockmovements: ['user_name'],
  inventoryproducts: ['last_updated_by_name', 'listing_reviewed_by_name'],
  contracts: ['created_by_name', 'updated_by_name'],
  legaldocuments: ['created_by_name', 'updated_by_name'],
  grievancetickets: ['handled_by_name'],
  approvalrequests: ['reviewed_by_name'],
};

/** Ticket messages are a subdocument array, so the fields are unset per element
 * with the positional-all operator rather than by top-level key. */
const TICKET_MESSAGE_FIELDS = ['messages.$[].author_name', 'messages.$[].author_photo'];

/** Rough BSON cost of one field: key name + type byte + terminator, plus the
 * value. Photo URLs dominate; names and emails are short. */
function estimateBytes(field: string): number {
  const key = field.split('.').pop() ?? field;
  const value = key.includes('photo') ? 90 : 24;
  return key.length + 2 + value + 5;
}

async function main(): Promise<void> {
  const uri = URI_OVERRIDE ?? process.env.MONGO_URI;
  if (!uri) {
    console.error('No database. Set MONGO_URI in server/.env, or pass --uri <connection-string>.');
    process.exit(1);
  }
  // A WRITE against a remote cluster needs saying out loud.
  //
  // `$unset` is the one step in this whole change that a redeploy cannot undo,
  // and the default `.env` here points at the hosted cluster — so the easiest
  // possible mistake is running the real thing against production while meaning
  // to rehearse. Local writes are unguarded; anything else must be deliberate.
  if (!DRY && !isLocal(uri) && !FORCE_REMOTE) {
    console.error(
      'Refusing to write to a non-local database.\n' +
        'Rehearse on a local restore first:\n' +
        '  npm run migrate:drop-user-copies:local:dry\n' +
        '  npm run migrate:drop-user-copies:local\n' +
        'When production is genuinely the target, re-run with --i-know-this-is-production.'
    );
    process.exit(1);
  }

  await mongoose.connect(uri);
  // Name the target before touching it: this is meant to be rehearsed on a local
  // restore first, and "which database did I just run that against?" is not a
  // question anyone should have to answer afterwards.
  console.log(`Connected to ${mongoose.connection.name} (${DRY ? 'DRY RUN' : 'WRITING'})\n`);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle after connect');

  let totalDocs = 0;
  let totalBytes = 0;

  for (const [name, fields] of Object.entries(DEAD_FIELDS)) {
    const collection = db.collection(name);
    const filter = { $or: fields.map((f) => ({ [f]: { $exists: true } })) };
    const matched = await collection.countDocuments(filter);
    const bytes = matched * fields.reduce((sum, f) => sum + estimateBytes(f), 0);
    totalDocs += matched;
    totalBytes += bytes;
    console.log(
      `${name.padEnd(26)} ${String(matched).padStart(9)} docs  ~${(bytes / 1_048_576).toFixed(1)} MB  [${fields.join(', ')}]`
    );
    if (!DRY && matched > 0) {
      const unset = Object.fromEntries(fields.map((f) => [f, '']));
      const res = await collection.updateMany(filter, { $unset: unset });
      console.log(`  → cleared on ${res.modifiedCount} documents`);
    }
  }

  // Support tickets: the copies live inside the embedded `messages` array.
  const tickets = db.collection('tickets');
  const ticketFilter = { 'messages.author_name': { $exists: true } };
  const ticketDocs = await tickets.countDocuments(ticketFilter);
  console.log(`${'tickets (messages[])'.padEnd(26)} ${String(ticketDocs).padStart(9)} docs  [author_name, author_photo]`);
  if (!DRY && ticketDocs > 0) {
    const unset = Object.fromEntries(TICKET_MESSAGE_FIELDS.map((f) => [f, '']));
    const res = await tickets.updateMany(ticketFilter, { $unset: unset });
    console.log(`  → cleared on ${res.modifiedCount} documents`);
  }
  totalDocs += ticketDocs;

  console.log(
    `\n${DRY ? 'DRY RUN — nothing written.' : 'Done.'} ${totalDocs} documents carry dead copies, ~${(totalBytes / 1_048_576).toFixed(1)} MB (excluding ticket subdocuments).`
  );
  if (!DRY) {
    console.log(
      'NOTE: $unset frees space inside each document but does not shrink the\n' +
      'data files. WiredTiger reuses it for new writes; run compact per\n' +
      'collection (or resync a secondary) if you need it returned to the OS.'
    );
  }
  await mongoose.disconnect();
}

// `main().catch(...)` rather than top-level await: the server compiles to
// CommonJS, where a top-level await is a syntax error.
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
