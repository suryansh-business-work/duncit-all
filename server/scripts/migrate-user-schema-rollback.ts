/**
 * Rollback the user-schema refactor.
 *
 * Strategy:
 *   1. Drop the new relation collections (user_roles, user_relationships,
 *      pod_followers, club_followers, user_saved_pods, user_interests).
 *      Safe because the original arrays are STILL on the user docs — the
 *      forward migration deliberately does not $unset them during cutover.
 *   2. $unset the nested subdocs added in the forward pass (auth, profile,
 *      communication, metadata, counters, security, pet_profile, profile_links).
 *
 * After this, the user collection is identical to the pre-migration state
 * EXCEPT for any fields that were never in the legacy schema (security
 * defaults), which are removed cleanly by the $unset.
 *
 * Run with:
 *   ts-node --transpile-only scripts/migrate-user-schema-rollback.ts --confirm
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';

const log = (...m: any[]) => console.log('[rollback]', ...m);

async function rollback() {
  if (!process.argv.includes('--confirm')) {
    console.error(
      '[rollback] refusing to run without --confirm. This will drop the new relation collections.'
    );
    process.exit(2);
  }

  await connectDB();
  const db = mongoose.connection.db!;

  const collections = [
    'userroles',
    'userrelationships',
    'podfollowers',
    'clubfollowers',
    'usersavedpods',
    'userinterests',
  ];

  for (const name of collections) {
    try {
      await db.dropCollection(name);
      log(`dropped ${name}`);
    } catch (err: any) {
      if (err?.codeName === 'NamespaceNotFound') {
        log(`(skipped) ${name} did not exist`);
      } else {
        console.error(`[rollback] could not drop ${name}:`, err);
      }
    }
  }

  const users = db.collection('users');
  const res = await users.updateMany(
    {},
    {
      $unset: {
        auth: '',
        profile: '',
        communication: '',
        metadata: '',
        counters: '',
        security: '',
        // pet_profile and profile_links existed on the old schema too. Leave
        // them untouched — the legacy values are still in place.
      },
    }
  );
  log(`unset nested subdocs on ${res.modifiedCount} user docs`);

  await mongoose.disconnect();
  log('done');
}

rollback().catch((err) => {
  console.error('[rollback] fatal:', err);
  process.exit(1);
});
