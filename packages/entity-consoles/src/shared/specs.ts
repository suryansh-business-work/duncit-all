import { CLUB_ADMIN_COUNTS, CLUB_COUNTS, HOST_COUNTS, VENUE_COUNTS } from './counts';
import type { DirectorySpec, DirectoryTile } from './types';

/**
 * The four specs, written as data.
 *
 * Three of the four entities share a lifecycle — drafted, submitted, approved
 * or declined — so their tiles are the same four tiles, built once by
 * `lifecycleTiles`. Clubs are the exception and say so in their own spec rather
 * than forcing a status field the club table does not have.
 */

/**
 * The tiles for an entity whose life is an application: how many there are,
 * how many got through, how many are waiting on somebody, how many did not.
 *
 * `pendingKey` differs because "not yet reviewed" is SUBMITTED for a venue or
 * host (the applicant pressed send) and DRAFT for a club admin (staff seeded
 * the record from an approved interview and nobody has looked yet).
 */
const lifecycleTiles = (): readonly DirectoryTile[] => [
  { key: 'total', labelKey: 'directory.common.total', tone: 'primary', listQuery: null },
  { key: 'approved', labelKey: 'directory.common.approved', tone: 'success', listQuery: 'status=APPROVED' },
  { key: 'pending', labelKey: 'directory.common.awaitingReview', tone: 'warning', listQuery: 'status=SUBMITTED' },
  { key: 'declined', labelKey: 'directory.common.declined', tone: 'error', listQuery: 'status=REJECTED' },
];

/** Club admins share the shape but are pending while still DRAFT. */
const clubAdminTiles: readonly DirectoryTile[] = lifecycleTiles().map((tile) =>
  tile.key === 'pending' ? { ...tile, listQuery: 'status=DRAFT' } : tile
);

export const VENUES_SPEC: DirectorySpec = {
  entity: 'venues',
  titleKey: 'directory.venues.title',
  subtitleKey: 'directory.venues.subtitle',
  dashboardTitleKey: 'directory.venues.dashboardTitle',
  tiles: lifecycleTiles(),
  countsDocument: VENUE_COUNTS,
};

export const CLUBS_SPEC: DirectorySpec = {
  entity: 'clubs',
  titleKey: 'directory.clubs.title',
  subtitleKey: 'directory.clubs.subtitle',
  dashboardTitleKey: 'directory.clubs.dashboardTitle',
  // No status lifecycle: a club is live or not, and verified or not.
  tiles: [
    { key: 'total', labelKey: 'directory.common.total', tone: 'primary', listQuery: null },
    { key: 'active', labelKey: 'directory.common.active', tone: 'success', listQuery: 'is_active=true' },
    { key: 'verified', labelKey: 'directory.common.verified', tone: 'primary', listQuery: 'is_verified=true' },
    { key: 'inactive', labelKey: 'directory.common.inactive', tone: 'warning', listQuery: 'is_active=false' },
  ],
  countsDocument: CLUB_COUNTS,
};

export const CLUB_ADMINS_SPEC: DirectorySpec = {
  entity: 'clubAdmins',
  titleKey: 'directory.clubAdmins.title',
  subtitleKey: 'directory.clubAdmins.subtitle',
  dashboardTitleKey: 'directory.clubAdmins.dashboardTitle',
  tiles: clubAdminTiles,
  countsDocument: CLUB_ADMIN_COUNTS,
};

export const HOSTS_SPEC: DirectorySpec = {
  entity: 'hosts',
  titleKey: 'directory.hosts.title',
  subtitleKey: 'directory.hosts.subtitle',
  dashboardTitleKey: 'directory.hosts.dashboardTitle',
  tiles: lifecycleTiles(),
  countsDocument: HOST_COUNTS,
};

/** Every spec, keyed by entity — how a portal looks up the one it mounts. */
export const DIRECTORY_SPECS = {
  venues: VENUES_SPEC,
  clubs: CLUBS_SPEC,
  clubAdmins: CLUB_ADMINS_SPEC,
  hosts: HOSTS_SPEC,
} as const;
