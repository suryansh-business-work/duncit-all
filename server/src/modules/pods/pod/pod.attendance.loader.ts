/**
 * Batched, per-request attendance counts for `Pod.attendance`.
 *
 * The field used to call the settlement roster once per pod. That roster also
 * reads payments and member names, which a count never needs, so a list that
 * asked for attendance (Previous Pods, a club's pod list) paid four queries for
 * each row. This answers a whole page in two `$in` reads.
 *
 * The counting rule is the roster's own (`podAttendanceRoster`): JOINED
 * bookings only, each worth `normalizeSeats(seats)`, attended when its ticket
 * reads CHECKED_IN. An integration test seeds one pod and checks that both
 * functions return the same numbers, so the card and the payout agree.
 */
import { Types } from 'mongoose';
import { loadOne, type CacheCarrier } from '@utils/request-cache';
import { normalizeSeats } from './pod.seats';

const BUCKET = 'podAttendance';

export interface PodAttendanceCounts {
  attended_seats: number;
  booked_seats: number;
}

const ZERO: PodAttendanceCounts = { attended_seats: 0, booked_seats: 0 };

/** The three fields the count reads off a JOINED booking. */
interface MemberRow {
  _id: unknown;
  pod_id: unknown;
  seats?: unknown;
}

export async function fetchPodAttendance(ids: string[]): Promise<Map<string, PodAttendanceCounts>> {
  const keys = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  const out = new Map<string, PodAttendanceCounts>();
  if (keys.length === 0) return out;

  const { PodMemberModel } = await import('@modules/pods/podMember/podMember.model');
  const { TicketModel } = await import('@modules/pods/ticket/ticket.model');
  const members = await PodMemberModel.find({ pod_id: { $in: keys }, status: 'JOINED' })
    .select('_id pod_id seats')
    .lean<MemberRow[]>();
  if (members.length === 0) return out;

  const checkedIn: unknown[] = await TicketModel.find({
    membership_id: { $in: members.map((m) => m._id) },
    status: 'CHECKED_IN',
  }).distinct('membership_id');
  const scanned = new Set(checkedIn.map(String));

  for (const m of members) {
    const podId = String(m.pod_id);
    const counts = out.get(podId) ?? { ...ZERO };
    const seats = normalizeSeats(m.seats);
    counts.booked_seats += seats;
    if (scanned.has(String(m._id))) counts.attended_seats += seats;
    out.set(podId, counts);
  }
  return out;
}

/** One pod's counts. A pod with no booking has no row, which means zero. */
export async function loadPodAttendance(carrier: CacheCarrier, id: string): Promise<PodAttendanceCounts> {
  return (await loadOne<PodAttendanceCounts>(carrier, BUCKET, id, fetchPodAttendance)) ?? { ...ZERO };
}
