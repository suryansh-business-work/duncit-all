/**
 * Give every venue its `venue_categories` list.
 *
 *   npm run migrate:venue-categories:dry     # report only
 *   npm run migrate:venue-categories         # write
 *   npm run migrate:venue-categories:local   # against a local restore
 *
 * A venue used to carry ONE Super → Category → Sub triple in `venue_category`;
 * it can now belong to several, held in `venue_categories`, with the old field
 * kept as the mirror of the list's first entry. A venue saved before the list
 * existed has only the old field.
 *
 * Why run it when the readers already cope. Every reader matches on the list OR
 * the legacy triple, so nothing is hidden before this runs — but the legacy half
 * of that match is unindexed and exists only for these documents. Once this has
 * run on an environment the list is complete there, and the legacy half can be
 * dropped from `venueCategoryMatch` in a later release.
 *
 * What it does, per venue (`planVenueCategoryBackfill`, the same pure function
 * the unit tests pin):
 *   - no list, a legacy triple   → the list becomes that one entry;
 *   - a list whose first entry the legacy triple no longer mirrors → the legacy
 *     triple is re-written from it (the list is the truth);
 *   - anything else (already in step, or no category at all) → untouched.
 *
 * It never invents a category and never removes one. Raw collection writes, so
 * the venue change log does not record a line per venue for a change of shape.
 *
 * Idempotent: every write is guarded by the state it was planned against, and a
 * venue this has fixed plans `skip` on the next run.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectForMigration } from './lib/migration-db';
import {
  planVenueCategoryBackfill,
  type VenueCategoryCarrier,
} from '../src/modules/venues/venue/venue.categories';

const DRY = process.argv.includes('--dry-run');

/** "No list yet" — the state a `fill` is planned against, re-checked by its write. */
const NO_LIST = { $or: [{ venue_categories: { $exists: false } }, { venue_categories: { $size: 0 } }] };

async function main(): Promise<void> {
  const connection = await connectForMigration({ dry: DRY });
  const db = connection.db;
  if (!db) throw new Error('No database handle after connect');

  const venues = db.collection('venues');
  const docs = await venues
    .find({})
    .project<VenueCategoryCarrier & { _id: mongoose.Types.ObjectId }>({ venue_category: 1, venue_categories: 1 })
    .toArray();

  let filled = 0;
  let mirrored = 0;
  let untouched = 0;
  for (const doc of docs) {
    const plan = planVenueCategoryBackfill(doc);
    if (plan.action === 'skip') {
      untouched += 1;
      continue;
    }
    if (plan.action === 'fill') {
      filled += 1;
      if (!DRY) {
        await venues.updateOne({ _id: doc._id, ...NO_LIST }, { $set: { venue_categories: plan.venue_categories } });
      }
      continue;
    }
    mirrored += 1;
    console.log(`venue ${String(doc._id)}: legacy category re-mirrored from the list`);
    if (!DRY) {
      // Guarded on the list still starting with the entry the plan read.
      await venues.updateOne(
        { _id: doc._id, 'venue_categories.0.sub_category_id': plan.venue_category.sub_category_id },
        { $set: { venue_category: plan.venue_category } }
      );
    }
  }

  console.log(`${'list filled'.padEnd(16)} ${String(filled).padStart(7)} venues`);
  console.log(`${'mirror repaired'.padEnd(16)} ${String(mirrored).padStart(7)} venues`);
  console.log(`${'untouched'.padEnd(16)} ${String(untouched).padStart(7)} venues`);
  console.log(`\n${DRY ? 'DRY RUN — nothing written.' : 'Done.'} ${docs.length} venue(s) read.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
