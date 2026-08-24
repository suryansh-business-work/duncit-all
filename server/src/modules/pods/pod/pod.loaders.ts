/**
 * One prime step for a whole page of pods.
 *
 * `Pod` carries per-row field resolvers for its club, its hosts and its
 * co-hosts. Left alone each one reads the database once PER POD, so an
 * unbounded discovery feed turned a single `pods` query into hundreds of round
 * trips and blew straight past the client's request timeout.
 *
 * Calling this before the rows are returned loads every club and every host in
 * ONE read each, so the field resolvers that follow are cache hits. It is an
 * optimisation, not a prerequisite: each resolver still asks the same loader
 * and fetches whatever was not primed, which is what keeps single-pod reads
 * (`pod`, `podBySlugs`) correct without a priming step of their own.
 */
import { primeUserActors } from '@modules/access/user/user.loaders';
import { primeClubs } from '@modules/clubs/club/club.loaders';
import type { CacheCarrier } from '@utils/request-cache';

interface PodRowRelations {
  club_id?: string | null;
  pod_hosts_id?: string[] | null;
  co_hosts?: { user_id?: string | null }[] | null;
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

  await Promise.all([primeClubs(carrier, clubIds), primeUserActors(carrier, userIds)]);
}
