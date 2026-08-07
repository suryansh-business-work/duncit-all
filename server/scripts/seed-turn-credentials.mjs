/**
 * Put the TURN relay's credentials into a database.
 *
 * Staff calls are peer to peer, so a call that cannot find a direct path needs
 * a relay — and the browser is told where that relay is by the server, which
 * reads it from an EnvEntry (see staffCallIce.ts). Every database therefore
 * needs its own entry: staging and production run the same code against
 * SEPARATE databases, and an entry created in one is invisible to the other.
 * That asymmetry is exactly how "I configured it and calls still fail" happens.
 *
 * Plain ESM with nothing but mongoose on purpose: the deployed image carries
 * only compiled output and runtime dependencies — no `src`, no ts-node — so a
 * TypeScript sibling of this file could not be run where it is most needed.
 *
 *   Locally, against whichever database MONGO_URI points at:
 *     MONGO_URI=… TURN_URLS=… TURN_USERNAME=… TURN_CREDENTIAL=… \
 *       node server/scripts/seed-turn-credentials.mjs
 *
 *   On the VPS, reusing a container's own connection settings:
 *     docker exec -e TURN_URLS=… -e TURN_USERNAME=… -e TURN_CREDENTIAL=… -i \
 *       duncit-server node --input-type=module -e "$(cat seed-turn-credentials.mjs)"
 *
 * Pass --dry-run to see what would change without writing. Idempotent: running
 * it twice leaves one entry, and re-running with a rotated credential updates
 * that same entry rather than adding a second one.
 */
import mongoose from 'mongoose';

const CATEGORY = 'TURN';
const COLLECTION = 'enventries';

const dryRun = process.argv.includes('--dry-run');

const required = (name) => {
  const value = (process.env[name] ?? '').trim();
  if (value) return value;
  console.error(`Missing ${name}. Every value comes from the environment — never from this file.`);
  process.exit(2);
};

const mongoUri = required('MONGO_URI');
const urls = required('TURN_URLS');
const username = required('TURN_USERNAME');
const credential = required('TURN_CREDENTIAL');
// Matches the server's own connection: production falls through to the URI's
// default database, staging is pinned to duncit-staging.
const dbName = (process.env.MONGO_DB_NAME ?? '').trim() || undefined;
const entryName = (process.env.TURN_ENTRY_NAME ?? '').trim() || 'TURN relay';

await mongoose.connect(mongoUri, dbName ? { dbName } : {});
const db = mongoose.connection.db;
const entries = db.collection(COLLECTION);

const existing = await entries.findOne({ category: CATEGORY, name: entryName });
const others = await entries.countDocuments({
  category: CATEGORY,
  name: { $ne: entryName },
  is_default: true,
});

console.log(`database        ${mongoose.connection.name}`);
console.log(`entry           ${entryName} (${existing ? 'update' : 'create'})`);
console.log(`urls            ${urls}`);
console.log(`username        ${username}`);
console.log(`credential      ${credential.length} characters, not shown`);
if (others > 0) {
  // getRuntimeEnvValue reads the one entry that is active AND default, so a
  // second default is not a spare — it is a coin toss.
  console.log(`other defaults  ${others} will be demoted`);
}

if (dryRun) {
  console.log('\n--dry-run: nothing written.');
  await mongoose.disconnect();
  process.exit(0);
}

const now = new Date();
await entries.updateOne(
  { category: CATEGORY, name: entryName },
  {
    $set: {
      category: CATEGORY,
      name: entryName,
      description: 'Relay for staff audio/video calls. Managed by seed-turn-credentials.mjs.',
      config: { urls, username, credential },
      is_active: true,
      is_default: true,
      updated_at: now,
    },
    $setOnInsert: { created_at: now, assigned_portals: [] },
  },
  { upsert: true }
);

if (others > 0) {
  await entries.updateMany(
    { category: CATEGORY, name: { $ne: entryName } },
    { $set: { is_default: false, updated_at: now } }
  );
}

const saved = await entries.findOne({ category: CATEGORY, name: entryName });
console.log(
  `\nwritten. active=${saved.is_active} default=${saved.is_default} — the server reads this per request, so there is nothing to restart.`
);

await mongoose.disconnect();
