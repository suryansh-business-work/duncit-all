/**
 * Backfill `Club.location_id` from the legacy hand-picked `meetup_venues_id`.
 *
 * Clubs used to store an explicit array of venue _id strings ("We usually meet
 * at"). Venues now auto-match a club by the club's single `location_id` + its
 * Super/Sub category, so every existing club needs a `location_id`.
 *
 * For each ACTIVE club with no `location_id` but with `meetup_venues_id`:
 *   1. Load its linked venues that are APPROVED + active with a location_id.
 *   2. Pick the most common location among them (ties → first seen).
 *   3. Set `club.location_id` to it.
 *
 * Clubs with no resolvable venue location are logged and skipped (an admin sets
 * the location manually). Idempotent; safe to re-run.
 *
 * Run:
 *   npm run migrate:club-location
 *   npm run migrate:club-location:dry
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { ClubModel } from '../src/modules/pods/club/club.model';
import { VenueModel } from '../src/modules/venues/venue/venue.model';

const dryRun = process.argv.includes('--dry-run');
const log = (...m: unknown[]) => console.log('[migrate-club-location]', ...m);

/** Most-frequent location among the club's live linked venues, or null. */
async function resolveLocation(venueIds: string[]): Promise<string | null> {
  const validIds = venueIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) return null;
  const venues = await VenueModel.find({
    _id: { $in: validIds },
    status: 'APPROVED',
    is_active: true,
    location_id: { $ne: null },
  })
    .select('location_id')
    .lean();
  const counts = new Map<string, number>();
  for (const v of venues) {
    const key = String((v as { location_id?: mongoose.Types.ObjectId | null }).location_id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [loc, count] of counts) {
    if (count > bestCount) {
      best = loc;
      bestCount = count;
    }
  }
  return best;
}

async function run() {
  await connectDB();
  log(`mode: ${dryRun ? 'DRY-RUN' : 'WRITE'}`);

  const clubs = await ClubModel.find({
    is_active: true,
    $or: [{ location_id: { $exists: false } }, { location_id: null }],
    meetup_venues_id: { $exists: true, $ne: [] },
  });
  log(`active clubs missing location: ${clubs.length}`);

  let backfilled = 0;
  let unresolved = 0;
  for (const club of clubs) {
    const locationId = await resolveLocation(club.meetup_venues_id ?? []);
    if (!locationId) {
      unresolved += 1;
      log(`no live venue location for club ${club._id} (${club.club_id})`);
      continue;
    }
    backfilled += 1;
    log(`club ${club._id} (${club.club_id}) -> location ${locationId}`);
    if (!dryRun) {
      club.location_id = new mongoose.Types.ObjectId(locationId);
      await club.save();
    }
  }

  log(`backfilled: ${backfilled}, unresolved: ${unresolved}`);
  await mongoose.disconnect();
  log('done.');
}

run().catch((e) => {
  console.error('[migrate-club-location] failed', e);
  process.exit(1);
});
