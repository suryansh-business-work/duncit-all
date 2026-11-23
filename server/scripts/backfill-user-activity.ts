/**
 * Seed Admin > Users "Last Activity" and "Platforms Used" from the history the
 * server already holds (app sessions, login activity, last sign-in).
 *
 *   npm run backfill:user-activity:dry     # report only
 *   npm run backfill:user-activity         # write
 *
 * Optional: from deploy onwards every signed-in request keeps both columns
 * current on its own. This only fills in the accounts that have not been back
 * since, so the columns do not start blank.
 *
 * Idempotent and safe beside live traffic: it only moves a time forward
 * (`$max`) and adds platforms (`$addToSet`), never edits anything else. The
 * logic lives in `user.activity.backfill.ts`, where it is tested.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectForMigration } from './lib/migration-db';
import { backfillUserActivity } from '@modules/access/user/user.activity.backfill';

const DRY = process.argv.includes('--dry-run');

async function main() {
  await connectForMigration({ dry: DRY });
  const result = await backfillUserActivity({ dryRun: DRY });

  console.log(`accounts with a dated record : ${result.accounts}`);
  console.log(`  of which a platform is known: ${result.with_platforms}`);
  if (!DRY) console.log(`accounts updated             : ${result.written}`);
  console.log(`\n${DRY ? 'DRY RUN, nothing written.' : 'Done.'} Only activity.last_at and activity.platforms are touched.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
