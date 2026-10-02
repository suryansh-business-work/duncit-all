/**
 * One prime step for a whole page of pods.
 *
 * `Pod` carries per-row field resolvers for its club, its hosts and its
 * co-hosts. Left alone each one reads the database once PER POD, so an
 * unbounded discovery feed turned a single `pods` query into hundreds of round
 * trips and blew straight past the client's request timeout.
 *
 * Calling this before the rows are returned loads every club, every host and
 * every venue/location in ONE read each, so the field resolvers that follow
 * (club, host_names, co_hosts, place_label, place_detail) are cache hits. It is an
 * optimisation, not a prerequisite: each resolver still asks the same loader
 * and fetches whatever was not primed, which is what keeps single-pod reads
 * (`pod`, `podBySlugs`) correct without a priming step of their own.
 */
import { Types } from 'mongoose';
import { primeUserActors } from '@modules/access/user/user.loaders';
import { primeClubs } from '@modules/clubs/club/club.loaders';
import { primePodPlaces } from './pod.place';
import { PodModel } from './pod.model';
import { loadOne, type CacheCarrier, type IdLike } from '@utils/request-cache';

interface PodRowRelations {
  club_id?: string | null;
  pod_hosts_id?: string[] | null;
  co_hosts?: { user_id?: string | null }[] | null;
  pod_mode?: string | null;
  venue_id?: string | null;
  location_id?: string | null;
}

export async function primePodRelations(
  carrier: CacheCarrier,
  rows: readonly (PodRowRelations | null | undefined)[],
): Promise<void> {
  const clubIds: string[] = [];
  const userIds: string[] = [];

  for (const row of rows) {
    if (!row) continue;
    if (row.club_id) clubIds.push(String(row.club_id));
    for (const id of row.pod_hosts_id ?? []) {
      if (id) userIds.push(String(id));
    }
    for (const entry of row.co_hosts ?? []) {
      if (entry?.user_id) userIds.push(String(entry.user_id));
    }
  }

  await Promise.all([
    primeClubs(carrier, clubIds),
    primeUserActors(carrier, userIds),
    primePodPlaces(carrier, rows),
  ]);
}

/** The pod a payment, coupon or product order points at, as those rows show it. */
export interface PodSummary {
  id: string;
  pod_id: string;
  pod_title: string;
  pod_date_time: string | null;
  pod_amount: number;
}

const POD_SUMMARY_BUCKET = 'podSummary';

async function fetchPodSummaries(ids: string[]): Promise<Map<string, PodSummary>> {
  const valid = ids.filter((id) => Types.ObjectId.isValid(id));
  const pods = await PodModel.find({ _id: { $in: valid } })
    .select('pod_id pod_title pod_date_time pod_amount')
    .lean();
  return new Map(
    pods.map((p) => [
      String(p._id),
      {
        id: String(p._id),
        pod_id: p.pod_id,
        pod_title: p.pod_title,
        pod_date_time: p.pod_date_time?.toISOString?.() ?? null,
        pod_amount: p.pod_amount,
      },
    ])
  );
}

/**
 * `Payment.pod`, `Coupon.pod` and `ProductOrder.pod`. Each was a `findById` per
 * row — three identical copies — so a 50-row payments table cost 50 reads.
 * Rows asking in the same tick now share one `$in` read.
 */
export function loadPodSummary(carrier: CacheCarrier, id: IdLike): Promise<PodSummary | null> {
  return loadOne(carrier, POD_SUMMARY_BUCKET, id ? String(id) : null, fetchPodSummaries);
}
