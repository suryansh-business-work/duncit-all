/**
 * Plant the OLD document shape in a local database, so the cleanup migration can
 * be rehearsed on something that actually has the fields it deletes.
 *
 *   npm run seed:dead-user-copies              # writes to mongodb://127.0.0.1:27017/duncit-local
 *   npm run migrate:drop-user-copies:local:dry # should now report the seeded rows
 *   npm run migrate:drop-user-copies:local     # clears them
 *   npm run migrate:drop-user-copies:local:dry # should now report zero
 *
 * Why this exists: the code no longer WRITES `user_name`, `sender_name` and the
 * rest, so a freshly-seeded local database has nothing for the migration to find
 * and a "0 documents" run proves nothing. This writes the pre-change shape
 * deliberately, through the raw driver, bypassing the Mongoose schemas that
 * would now strip those very fields.
 *
 * LOCAL ONLY, and it refuses to run anywhere else — it inserts junk rows.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const uriArg = process.argv.indexOf('--uri');
const URI = uriArg === -1 ? 'mongodb://127.0.0.1:27017/duncit-local' : process.argv[uriArg + 1];
const COUNT = 25;

const isLocal = (uri: string) =>
  /^mongodb:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])[:/]/i.test(uri.trim());

/** One seeded document per collection the migration cleans, carrying exactly the
 * fields that migration removes. `_seed` marks them so a re-run replaces rather
 * than accumulates. */
const SEEDS: Record<string, Record<string, unknown>> = {
  podmessages: { user_name: 'Old Name', user_photo: 'https://cdn.example/old.jpg', text: 'seed' },
  supportchatmessages: { sender_name: 'Old Agent', sender_photo: 'https://cdn.example/a.jpg' },
  productreviews: { user_name: 'Old Reviewer', rating: 5 },
  inventoryactivitylogs: { user_name: 'ops@example.com', action: 'UPDATE' },
  inventorystockmovements: { user_name: 'ops@example.com', quantity: 1 },
  inventoryproducts: { last_updated_by_name: 'ops@example.com', listing_reviewed_by_name: 'ops@example.com' },
  contracts: { created_by_name: 'Old Legal', updated_by_name: 'Old Legal' },
  legaldocuments: { created_by_name: 'Old Legal', updated_by_name: 'Old Legal' },
  grievancetickets: { handled_by_name: 'Old Officer' },
  approvalrequests: { reviewed_by_name: 'Old Reviewer' },
};

async function main(): Promise<void> {
  if (!isLocal(URI)) {
    console.error(`Refusing to seed a non-local database: ${URI}\nThis inserts junk rows.`);
    process.exit(1);
  }
  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle after connect');
  console.log(`Seeding ${mongoose.connection.name} with the pre-change document shape\n`);

  for (const [name, doc] of Object.entries(SEEDS)) {
    const collection = db.collection(name);
    await collection.deleteMany({ _seed: 'dead-user-copies' });
    const rows = Array.from({ length: COUNT }, (_, i) => ({
      ...doc,
      _seed: 'dead-user-copies',
      seed_index: i,
    }));
    await collection.insertMany(rows);
    console.log(`${name.padEnd(26)} ${COUNT} rows with [${Object.keys(doc).join(', ')}]`);
  }

  // The ticket copies live inside an embedded array, which is the one case the
  // migration handles differently — so the rehearsal has to cover it too.
  const tickets = db.collection('tickets');
  await tickets.deleteMany({ _seed: 'dead-user-copies' });
  await tickets.insertMany(
    Array.from({ length: COUNT }, (_, i) => ({
      _seed: 'dead-user-copies',
      seed_index: i,
      guest_name: 'Website visitor',
      messages: [
        { author_name: 'Old Author', author_photo: 'https://cdn.example/x.jpg', body_text: 'seed' },
        { author_name: 'Old Agent', author_photo: '', body_text: 'seed reply' },
      ],
    }))
  );
  console.log(`${'tickets (messages[])'.padEnd(26)} ${COUNT} rows with [author_name, author_photo]`);

  console.log('\nSeeded. Now run: npm run migrate:drop-user-copies:local:dry');
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
