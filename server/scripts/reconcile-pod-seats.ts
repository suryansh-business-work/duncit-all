/**
 * Find (and optionally repair) pods whose seat counter disagrees with their
 * bookings.
 *
 *     npm run reconcile:pod-seats        # report only — safe, read-only
 *     npm run reconcile:pod-seats:fix    # write the computed value
 *
 * THE INVARIANT: for every pod, `extra_seats` equals the sum of `seats - 1`
 * over its JOINED memberships. Occupancy is a pair — `pod_attendees` is an
 * identity list (one entry per person) and `extra_seats` carries the seats
 * people bought beyond their own — so if the counter drifts, the pod silently
 * gains or loses capacity and no screen can show the truth.
 *
 * It DID drift, in two ways that are now closed:
 *   - buying a second time on the same pod bumped the counter while the
 *     membership kept its old seat count, and the later backout released only
 *     the old count, orphaning the rest permanently;
 *   - the counter was written as an absolute `$set` from a read-modify-write,
 *     so two concurrent bookings lost one of the increments.
 * Run this once after deploying to see what those left behind.
 *
 * The memberships are the source of truth: a PodMember row is what was paid
 * for, and it is what the ticket and the refund are built from. Fix mode sets
 * the counter to match them and never touches `pod_attendees`.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';

const FIX = process.argv.includes('--fix');

type Drift = { id: string; title: string; actual: number; expected: number };

async function findDrifted(): Promise<{ drifted: Drift[]; total: number }> {
  // One aggregation: seats held by the JOINED memberships of each pod.
  const rows = await PodMemberModel.aggregate<{ _id: unknown; expected: number }>([
    { $match: { status: 'JOINED' } },
    {
      $group: {
        _id: '$pod_id',
        expected: { $sum: { $max: [0, { $subtract: [{ $ifNull: ['$seats', 1] }, 1] }] } },
      },
    },
  ]);
  const expectedByPod = new Map(rows.map((r) => [String(r._id), r.expected]));

  const pods = await PodModel.find({}).select('_id pod_title extra_seats').lean();
  const drifted: Drift[] = [];
  for (const pod of pods) {
    const id = String(pod._id);
    const actual = pod.extra_seats ?? 0;
    // A pod with no multi-seat bookings is absent from the aggregation, and its
    // counter should be 0 — that case has to be checked too, not skipped.
    const expected = expectedByPod.get(id) ?? 0;
    if (actual !== expected) {
      drifted.push({ id, title: pod.pod_title ?? '(untitled)', actual, expected });
    }
  }
  return { drifted, total: pods.length };
}

function printDrift(d: Drift) {
  const delta = d.expected - d.actual;
  const sign = delta > 0 ? '+' : '';
  console.log(
    `  ${d.id}  ${String(d.title).slice(0, 48).padEnd(48)} extra_seats ${d.actual} -> ${d.expected} (${sign}${delta})`
  );
}

async function repair(drifted: Drift[]) {
  for (const d of drifted) {
    await PodModel.updateOne({ _id: d.id }, { $set: { extra_seats: d.expected } });
  }
  console.log(`\nRepaired ${drifted.length} pods.`);
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set — point it at the database you want to check.');
    process.exitCode = 1;
    return;
  }
  await mongoose.connect(uri, { dbName: process.env.MONGO_DB_NAME });

  const { drifted, total } = await findDrifted();

  if (drifted.length === 0) {
    console.log(`OK — extra_seats matches the memberships on all ${total} pods.`);
  } else {
    console.log(`${drifted.length} of ${total} pods have drifted:\n`);
    for (const d of drifted) {
      printDrift(d);
    }
    if (FIX) {
      await repair(drifted);
    } else {
      console.log('\nReport only. Re-run with --fix to write these values.');
    }
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
