import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { EnvironmentVariableModel } from '../src/modules/platform/settings/settings.model';

const log = (...args: unknown[]) => console.log('[migrate-env-scope]', ...args);

/**
 * Adds the new `scope` field to environment-variable overrides and replaces the
 * legacy single-field unique index on `key` with the compound `{scope, key}`
 * unique index. Safe to run multiple times.
 */
async function main() {
  await connectDB();
  const collection = EnvironmentVariableModel.collection;

  // 1) Backfill scope on any pre-scope documents.
  const res = await collection.updateMany(
    { scope: { $exists: false } },
    { $set: { scope: 'server' } }
  );
  log(`backfilled scope on ${res.modifiedCount} document(s)`);

  // 2) Drop the old unique index on { key } if it still exists.
  const indexes = await collection.indexes();
  for (const index of indexes) {
    const keys = Object.keys(index.key);
    if (keys.length === 1 && keys[0] === 'key' && index.unique) {
      log(`dropping legacy unique index ${index.name}`);
      await collection.dropIndex(index.name as string);
    }
  }

  // 3) Ensure the compound unique index exists.
  await EnvironmentVariableModel.syncIndexes();
  log('indexes synced');

  await mongoose.disconnect();
  log('done');
}

main().catch((err) => {
  console.error('[migrate-env-scope] failed', err);
  process.exit(1);
});
