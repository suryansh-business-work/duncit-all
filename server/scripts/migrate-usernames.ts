/**
 * Give every existing account the @handle new accounts are now created with.
 *
 * `profile.username` is what `/u/<username>` carries and what a shared profile
 * link is minted against. Accounts created before the field existed have none,
 * and until they do their links keep exposing the raw Mongo id — readable to
 * nobody, indexable as nothing.
 *
 * The handle is the person's name slugified plus a short random tail
 * (`suryansh-srivastava-7k2f`), which is exactly what signup mints — the same
 * `generateUsername` is imported rather than reimplemented, so a migrated
 * account and a new one can never end up with differently-shaped handles.
 *
 * Collisions are settled by the unique index, not by this script's own
 * bookkeeping: a duplicate write is caught and retried with a fresh tail. That
 * matters because the server may be serving signups while this runs.
 *
 * Idempotent — an account that already has a handle is skipped, so it is safe
 * to re-run after a partial pass.
 *
 * Run:
 *   npm run migrate:usernames
 *   npm run migrate:usernames:dry
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { UserModel } from '../src/modules/access/user/user.model';
import { generateUsername } from '../src/modules/access/user/username';

const dryRun = process.argv.includes('--dry-run');
const log = (...m: unknown[]) => console.log('[migrate-usernames]', ...m);

/** Attempts per account before it is reported as unresolved and left alone. */
const MAX_WRITE_ATTEMPTS = 5;

const isTaken = async (candidate: string): Promise<boolean> =>
  !!(await UserModel.exists({ 'profile.username': candidate }));

/**
 * Claim a handle for one account, racing the live server for it.
 *
 * `generateUsername` already checks before proposing, so the retry loop is the
 * narrow window between that check and this write — not the normal path.
 */
async function claim(
  userId: mongoose.Types.ObjectId,
  first: string,
  last: string
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const candidate = await generateUsername(first, last, { isTaken });
    if (dryRun) return candidate;
    try {
      await UserModel.updateOne(
        { _id: userId },
        { $set: { 'profile.username': candidate } }
      );
      return candidate;
    } catch (error: unknown) {
      if ((error as { code?: number })?.code !== 11000) throw error;
    }
  }
  return null;
}

async function run() {
  await connectDB();
  log(`mode: ${dryRun ? 'DRY-RUN' : 'WRITE'}`);

  // The unique index is what actually keeps two people off one handle, and
  // this script is what writes them in bulk — so it makes sure the constraint
  // exists before it starts, rather than trusting that a boot has happened
  // since the field was added. `createIndexes` only ADDS what is missing; it
  // never drops, which `syncIndexes` on a collection this central would.
  if (!dryRun) {
    await UserModel.createIndexes();
    log('user indexes ensured');
  }

  // Deleted accounts are deliberately included: their handle stays reserved,
  // so a restored account keeps the link that was shared for it.
  const users = await UserModel.find({
    $or: [{ 'profile.username': { $exists: false } }, { 'profile.username': null }],
  })
    .select('_id profile.first_name profile.last_name')
    .lean();
  log(`accounts without a handle: ${users.length}`);

  let assigned = 0;
  let unresolved = 0;
  for (const user of users) {
    const profile = (user as { profile?: { first_name?: string; last_name?: string } }).profile;
    const handle = await claim(
      user._id as mongoose.Types.ObjectId,
      profile?.first_name ?? '',
      profile?.last_name ?? ''
    );
    if (!handle) {
      unresolved += 1;
      log(`could not claim a handle for ${String(user._id)}`);
      continue;
    }
    assigned += 1;
    log(`${String(user._id)} -> ${handle}`);
  }

  log(`assigned: ${assigned}, unresolved: ${unresolved}`);
  await mongoose.disconnect();
  log('done.');
}

run().catch((e) => {
  console.error('[migrate-usernames] failed', e);
  process.exit(1);
});
