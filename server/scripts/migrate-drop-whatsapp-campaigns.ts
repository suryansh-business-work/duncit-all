/**
 * Remove WhatsApp marketing campaigns.
 *
 * The WHATSAPP channel is gone from `MarketingCampaignChannel` (GraphQL enum and
 * the Mongoose enum). A stored row still carrying it cannot be serialised — the
 * campaigns table would fail for everybody the moment one exists — so the rows
 * have to go with the enum value.
 *
 * Only campaigns are touched. The audience filter "WhatsApp verified" is a
 * property of a USER and is unrelated; nothing here reads it.
 *
 * Idempotent; safe to re-run.
 *
 * Run:
 *   npm run migrate:drop-whatsapp-campaigns -- --dry-run    (report only)
 *   npm run migrate:drop-whatsapp-campaigns                 (delete)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { MarketingCampaignModel } from '../src/modules/crm/marketing/marketing.model';

const dryRun = process.argv.includes('--dry-run');
const log = (...m: unknown[]) => console.log('[drop-whatsapp-campaigns]', ...m);

async function run() {
  await connectDB();
  log(`mode: ${dryRun ? 'DRY-RUN' : 'WRITE'}`);

  // Bypass the model's typed filter: WHATSAPP is no longer part of the union,
  // which is the whole point of the cleanup.
  const filter = { channel: 'WHATSAPP' } as unknown as Record<string, unknown>;
  const doomed = await MarketingCampaignModel.find(filter).select('campaign_id name status').lean();

  if (doomed.length === 0) {
    log('no WhatsApp campaigns found — nothing to do');
    return;
  }

  log(`${doomed.length} WhatsApp campaign(s) found:`);
  for (const c of doomed) {
    log(`  ${c.campaign_id}  ${c.status.padEnd(9)}  ${c.name}`);
  }

  if (dryRun) {
    log('dry run — nothing deleted. Re-run without --dry-run to remove them.');
    return;
  }

  const { deletedCount } = await MarketingCampaignModel.deleteMany(filter);
  log(`deleted ${deletedCount} campaign(s)`);
}

try {
  await run();
} catch (error) {
  log('failed:', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
