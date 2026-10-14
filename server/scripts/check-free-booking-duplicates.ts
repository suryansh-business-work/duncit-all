/**
 * Report people holding more than one JOINED unpaid booking on the same pod.
 *
 *     npm run check:free-booking-duplicates     # read-only, writes nothing
 *
 * PodMember now carries a unique partial index,
 * `one_unpaid_joined_booking_per_pod_user` — { pod_id, user_id } over rows that
 * are JOINED with `payment_id: null` — so two concurrent free joins can no
 * longer both book. An index build FAILS on a collection that already holds a
 * duplicate, and Mongoose's autoIndex only logs that failure: the server would
 * boot without the guarantee. Run this against staging and production BEFORE
 * deploying; every group it prints must be resolved first (cancel the extra
 * booking and run `npm run reconcile:pod-seats` for its pod).
 *
 * Read-only by design: which of two bookings is the "real" one (the ticket that
 * was scanned, the one a referral credited) is a judgement, not a rule.
 *
 * The models are NOT imported: compiling PodMemberModel with autoIndex on would
 * try to build the very index this script exists to check for.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

type DuplicateGroup = {
  _id: { pod_id: unknown; user_id: unknown };
  count: number;
  members: { id: unknown; source: string | null; joined_at: Date | null; seats: number | null }[];
};

async function findDuplicates(): Promise<DuplicateGroup[]> {
  return mongoose.connection
    .collection('podmembers')
    .aggregate<DuplicateGroup>([
      // Exactly the rows the index covers.
      { $match: { status: 'JOINED', payment_id: { $type: 'null' } } },
      {
        $group: {
          _id: { pod_id: '$pod_id', user_id: '$user_id' },
          count: { $sum: 1 },
          members: {
            $push: { id: '$_id', source: '$source', joined_at: '$joined_at', seats: '$seats' },
          },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
}

function printGroup(group: DuplicateGroup) {
  console.log(`  pod ${String(group._id.pod_id)}  user ${String(group._id.user_id)}  — ${group.count} JOINED rows`);
  for (const m of group.members) {
    const joined = m.joined_at ? m.joined_at.toISOString() : '-';
    console.log(`      membership ${String(m.id)}  source ${m.source ?? '-'}  seats ${m.seats ?? 1}  joined ${joined}`);
  }
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set — point it at the database you want to check.');
    process.exitCode = 1;
    return;
  }
  await mongoose.connect(uri, { dbName: process.env.MONGO_DB_NAME, autoIndex: false });

  const groups = await findDuplicates();
  if (groups.length === 0) {
    console.log('OK — no pod has two JOINED unpaid bookings for the same person. Safe to deploy the index.');
  } else {
    console.log(`${groups.length} pod/person pairs hold more than one JOINED unpaid booking:\n`);
    for (const group of groups) printGroup(group);
    console.log('\nResolve these before deploying — the unique index will not build while they exist.');
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
