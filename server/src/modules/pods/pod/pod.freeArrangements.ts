/**
 * Free Arrangements (Pods console): every FREE pod and every pod whose venue
 * offer asked for the venue free, with the justification its host gave and
 * when they accepted the free policy — so Duncit can monitor, track and audit
 * them and act on misuse (account health, Finance holds). Read-only; cancelled
 * pods stay listed, because an audit keeps what happened. Host, club and venue
 * names come in one lookup each for the whole page, never per row.
 */
import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { UserModel } from '@modules/access/user/user.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { contactName } from '@modules/pods/podChangeRequest/podChangeRequest.common';
import { freeJustificationOut } from '@modules/venues/venueOffer/venueOffer.free';
import type { FreeJustification } from '@modules/venues/venueOffer/venueOffer.types';
import { PodModel } from './pod.model';

/** What makes a pod a free arrangement: the pod itself, its venue, or both. */
export type FreeArrangementKind = 'FREE_POD' | 'FREE_VENUE' | 'BOTH';

const FREE_ARRANGEMENT_FILTER = {
  $or: [{ pod_type: 'FREE' }, { venue_free_justification: { $ne: null } }],
};

/** Allowlists for the shared table engine (adminFreeArrangementsTable — DUNCIT TABLE CONTRACT v1). */
const FREE_ARRANGEMENTS_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['pod_title', 'free_justification.details', 'venue_free_justification.details'],
  sortFields: {
    pod_title: 'pod_title',
    pod_date_time: 'pod_date_time',
    created_at: 'created_at',
    pod_type: 'pod_type',
    venue_approval_status: 'venue_approval_status',
  },
  filterFields: {
    pod_title: { type: 'string' },
    pod_type: { type: 'enum' },
    venue_approval_status: { type: 'enum' },
    is_active: { type: 'boolean' },
    pod_date_time: { type: 'date' },
    created_at: { type: 'date' },
    reason: { type: 'enum', paths: ['free_justification.reason', 'venue_free_justification.reason'] },
  },
  defaultSort: { created_at: -1 },
};

interface FreePodDoc {
  _id: Types.ObjectId;
  pod_id?: string;
  pod_title?: string;
  pod_type?: string;
  pod_date_time?: Date;
  pod_hosts_id?: Types.ObjectId[];
  club_id?: Types.ObjectId | null;
  venue_id?: Types.ObjectId | null;
  venue_approval_status?: string;
  is_active?: boolean;
  deleted_at?: Date | null;
  created_at?: Date;
  free_justification?: FreeJustification | null;
  venue_free_justification?: FreeJustification | null;
}

export function freeArrangementKind(pod: Pick<FreePodDoc, 'pod_type' | 'venue_free_justification'>): FreeArrangementKind {
  const freeVenue = !!pod.venue_free_justification;
  if (pod.pod_type === 'FREE') return freeVenue ? 'BOTH' : 'FREE_POD';
  return 'FREE_VENUE';
}

const idsOf = (values: ReadonlyArray<Types.ObjectId | null | undefined>) => [...new Set(values.filter(Boolean).map(String))];

/** The page's hosts, clubs and venues, one query each. */
async function namesFor(pods: readonly FreePodDoc[]) {
  const [hosts, clubs, venues] = await Promise.all([
    UserModel.find({ _id: { $in: idsOf(pods.map((p) => p.pod_hosts_id?.[0])) } })
      .select('profile.first_name profile.last_name auth.email')
      .lean(),
    ClubModel.find({ _id: { $in: idsOf(pods.map((p) => p.club_id)) } }).select('club_name').lean(),
    VenueModel.find({ _id: { $in: idsOf(pods.map((p) => p.venue_id)) } }).select('venue_name').lean(),
  ]);
  return {
    host: new Map(hosts.map((u) => [String(u._id), { name: contactName(u), email: String(u.auth?.email ?? '') }])),
    club: new Map(clubs.map((c) => [String(c._id), String(c.club_name ?? '')])),
    venue: new Map(venues.map((v) => [String(v._id), String(v.venue_name ?? '')])),
  };
}

export const podFreeArrangementsService = {
  /** Staff: a page of free arrangements, newest first. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<FreePodDoc>(
      PodModel,
      FREE_ARRANGEMENT_FILTER,
      input,
      FREE_ARRANGEMENTS_TABLE_CONFIG,
      { includeDeleted: true }
    );
    const names = await namesFor(docs);
    const rows = docs.map((pod) => {
      const host = names.host.get(String(pod.pod_hosts_id?.[0] ?? ''));
      return {
        id: String(pod._id),
        pod_slug: pod.pod_id ?? '',
        pod_title: pod.pod_title ?? '',
        pod_type: pod.pod_type ?? 'PAID',
        pod_date_time: pod.pod_date_time ? pod.pod_date_time.toISOString() : null,
        kind: freeArrangementKind(pod),
        host_name: host?.name ?? '',
        host_email: host?.email ?? '',
        club_name: names.club.get(String(pod.club_id ?? '')) ?? '',
        venue_name: names.venue.get(String(pod.venue_id ?? '')) ?? '',
        venue_approval_status: pod.venue_approval_status ?? 'NONE',
        is_active: !!pod.is_active,
        cancelled: !!pod.deleted_at,
        created_at: pod.created_at ? pod.created_at.toISOString() : null,
        free_justification: freeJustificationOut(pod.free_justification),
        venue_free_justification: freeJustificationOut(pod.venue_free_justification),
      };
    });
    return { rows, total, page, page_size };
  },
};
