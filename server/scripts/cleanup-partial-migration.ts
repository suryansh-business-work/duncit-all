/**
 * One-shot cleanup after the first (partial) migration run that produced
 * stale `auth.google_id: null` / `auth.email: null` keys conflicting with
 * the unique-sparse indexes.
 *
 * 1. Drop the legacy sparse indexes that block re-run.
 * 2. $unset any null optional auth fields so the new partial-filter indexes
 *    accept them.
 *
 * Safe to run multiple times.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';

async function run() {
  await connectDB();
  const db = mongoose.connection.db!;
  const users = db.collection('users');

  // Drop the old sparse indexes — the new partial-filter ones get rebuilt on
  // next model load.
  for (const name of ['auth.google_id_1', 'auth.email_1', 'auth.phone.number_1_auth.phone.extension_1']) {
    try {
      await users.dropIndex(name);
      console.log('[cleanup] dropped index', name);
    } catch (e: any) {
      if (e?.codeName === 'IndexNotFound') {
        console.log('[cleanup] (skipped) index', name, 'did not exist');
      } else {
        throw e;
      }
    }
  }

  // Strip null/empty optional auth fields.
  const res = await users.updateMany(
    {},
    {
      $unset: {
        'auth.google_id': '',
      },
    },
    {}
  );
  console.log('[cleanup] unset null auth.google_id on', res.modifiedCount, 'docs');

  // For docs that have auth.email as empty string or null, unset it too.
  const r2 = await users.updateMany(
    { $or: [{ 'auth.email': null }, { 'auth.email': '' }] },
    { $unset: { 'auth.email': '' } }
  );
  console.log('[cleanup] unset empty auth.email on', r2.modifiedCount, 'docs');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[cleanup] fatal:', err);
  process.exit(1);
});
