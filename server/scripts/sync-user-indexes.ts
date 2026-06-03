/**
 * Fix stale `users` indexes — specifically the unique phone (and email /
 * google_id) indexes that predate the `partialFilterExpression` change.
 *
 * The bug it fixes: an OLD non-partial unique index on `auth.phone.number` +
 * `auth.phone.extension` indexes phone-less users as `(null, null)`, so the 2nd
 * signup without a phone collides → E11000 → "This phone number is already
 * registered." Mongoose never drops a changed index, so the stale one lingers.
 *
 * This script drops any phone/email/google_id unique index whose options no
 * longer match the schema, then re-creates the correct partial indexes via
 * `Model.syncIndexes()`. Idempotent; safe to re-run.
 *
 * Run:
 *   npm run sync:user-indexes
 *   npm run sync:user-indexes -- --dry-run
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db";
import { UserModel } from "../src/modules/access/user/user.model";

const dryRun = process.argv.includes("--dry-run");
const log = (...m: unknown[]) => console.log("[sync-user-indexes]", ...m);

// Legacy FLAT-schema auth fields. Their orphaned unique indexes survive the
// nested-schema migration and break new docs: the non-sparse
// `phone_number_1_phone_extension_1` indexes phone-less users as (null,null),
// so the 2nd phone-less signup collides. The schema's nested `auth.*` partial
// indexes replace them.
const LEGACY_AUTH_KEY_FIELDS = [
  "email",
  "google_id",
  "phone_number",
  "phone_extension",
];

async function run() {
  await connectDB();
  const collection = UserModel.collection;

  // Empty-string phone subdocs (`{ number: '', extension: '' }`) from older code
  // still count as `$type: string`, so they sit in the partial unique index and
  // collide with each other — and block the new index from building. Unset them
  // so phone-less users are truly excluded from the index.
  const emptyPhoneFilter = {
    $or: [{ "auth.phone.number": "" }, { "auth.phone.extension": "" }],
  };
  const emptyCount = await collection.countDocuments(emptyPhoneFilter);
  log(`empty-string phone subdocs to clear: ${emptyCount}`);
  if (emptyCount > 0 && !dryRun) {
    await collection.updateMany(emptyPhoneFilter, {
      $unset: { "auth.phone": "" },
    });
  }

  const existing = await collection.indexes();
  log(
    `mode: ${dryRun ? "DRY-RUN" : "WRITE"} — ${existing.length} indexes on "users"`,
  );
  for (const i of existing) {
    if (/phone|email|google/i.test(JSON.stringify(i.key))) {
      log(
        `  • ${i.name} key=${JSON.stringify(i.key)} unique=${!!i.unique} sparse=${!!i.sparse} partial=${i.partialFilterExpression ? JSON.stringify(i.partialFilterExpression) : "no"}`,
      );
    }
  }

  // Drop legacy unique indexes built on the old top-level auth fields. The
  // current nested `auth.*` partial indexes (kept by syncIndexes below) replace
  // them. Indexes keyed on `auth.*` are NOT touched here.
  for (const index of existing) {
    if (index.name === "_id_") continue;
    const keys = Object.keys(index.key);
    const isLegacyAuthIndex = keys.some((k) =>
      LEGACY_AUTH_KEY_FIELDS.includes(k),
    );
    if (isLegacyAuthIndex && index.unique) {
      log(
        `legacy auth unique index → drop: ${index.name} ${JSON.stringify(index.key)}`,
      );
      if (!dryRun) await collection.dropIndex(index.name as string);
    }
  }

  if (dryRun) {
    log("dry-run: skipping syncIndexes()");
  } else {
    const dropped = await UserModel.syncIndexes();
    log("syncIndexes() complete. Dropped by sync:", dropped);
    const after = await collection.indexes();
    const phone = after.find(
      (i) =>
        JSON.stringify(i.key) ===
        JSON.stringify({ "auth.phone.number": 1, "auth.phone.extension": 1 }),
    );
    const legacyGone = !after.some((i) =>
      Object.keys(i.key).some((k) => LEGACY_AUTH_KEY_FIELDS.includes(k)),
    );
    log(
      "phone index now:",
      phone?.name,
      "partial:",
      !!phone?.partialFilterExpression,
    );
    log("legacy auth indexes removed:", legacyGone);
  }

  await mongoose.disconnect();
  log("done.");
}

run().catch((e) => {
  console.error("[sync-user-indexes] failed", e);
  process.exit(1);
});
