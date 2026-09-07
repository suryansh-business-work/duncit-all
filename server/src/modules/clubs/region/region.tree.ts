/**
 * The Regional Club Admin's org tree.
 *
 *   Region -> City -> Locality -> Club Admin -> Host -> (pods, in a drawer)
 *
 * Only the top level is stored. Every level below it is DERIVED from the clubs
 * the region's Club Admins run and the pods those clubs hold, because all of it
 * is already true somewhere else: a club knows its city and its locality, a pod
 * knows its hosts. Storing the shape as well would be a second answer to
 * "which city is this club in", and the two would disagree the first time a
 * club moved.
 *
 * A club admin can appear under more than one Locality — they often run clubs
 * in two parts of a city — and that is the honest shape rather than a bug: the
 * node id carries the whole path, so the two are separate boxes on the canvas.
 */
import { Types } from 'mongoose';
import { ClubModel } from '@modules/clubs/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { UserModel } from '@modules/access/user/user.model';

/** Every level the canvas draws. Pods are a drawer, not a node. */
export const REGION_NODE_KINDS = ['REGION', 'CITY', 'LOCALITY', 'CLUB_ADMIN', 'HOST'] as const;
export type RegionNodeKind = (typeof REGION_NODE_KINDS)[number];

export interface RegionTreeNode {
  /** Carries the whole path, so the same club admin under two localities is
   * two nodes rather than one box with two parents. */
  id: string;
  kind: RegionNodeKind;
  parent_id: string | null;
  label: string;
  /** The line under the label — a club count, a pod count, an email. */
  sub_label: string;
  /** Direct children (or pods, on a HOST node). Drawn on the node. */
  count: number;
  /**
   * The underlying document id: a Location for CITY, a User for CLUB_ADMIN and
   * HOST. It is what the pods drawer asks for, and '' where there is no single
   * document behind the node (a locality is a string on a club).
   */
  ref_id: string;
}

export interface RegionTree {
  nodes: RegionTreeNode[];
  /** `source -> target`; parent_id is on the node too, but React Flow wants both. */
  edges: Array<{ id: string; source: string; target: string }>;
}

/** The clubs a locality node groups, keyed by the path the node id encodes. */
const LOCALITY_FALLBACK = 'Unassigned locality';
const CITY_FALLBACK = 'Unassigned city';

interface ClubRow {
  _id: Types.ObjectId;
  club_name: string;
  location_id: Types.ObjectId | null;
  locality: string;
  admin_user_ids: Types.ObjectId[];
}

/** A lean() user, as far as naming one goes. */
interface NamedUser {
  profile?: { first_name?: string | null; last_name?: string | null } | null;
  auth?: { email?: string | null } | null;
}

/** first+last name, or the email when a profile has neither. */
function personName(user: NamedUser): string {
  const name = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ').trim();
  return name || user.auth?.email || '';
}

async function loadPeople(ids: Types.ObjectId[]) {
  if (ids.length === 0) return new Map<string, { name: string; email: string }>();
  const users = await UserModel.find({ _id: { $in: ids } })
    .select('profile.first_name profile.last_name auth.email')
    .lean<Array<NamedUser & { _id: unknown }>>();
  return new Map(
    users.map((user) => [
      String(user._id),
      { name: personName(user), email: user.auth?.email ?? '' },
    ])
  );
}

/**
 * Builds the whole tree in four reads, not one per node.
 *
 * The naive shape — walk the clubs, then query each club's pods for its hosts —
 * is a query per club admin per locality, and a region with forty clubs then
 * opens forty round trips deep. One pod aggregation for every club in the
 * region answers the host level in a single pass.
 */
export async function buildRegionTree(
  regionName: string,
  clubAdminIds: Types.ObjectId[]
): Promise<RegionTree> {
  const nodes: RegionTreeNode[] = [];
  const edges: RegionTree['edges'] = [];
  const rootId = 'region';
  const addEdge = (source: string, target: string) => {
    edges.push({ id: `${source}->${target}`, source, target });
  };

  if (clubAdminIds.length === 0) {
    nodes.push({
      id: rootId,
      kind: 'REGION',
      parent_id: null,
      label: regionName,
      sub_label: '',
      count: 0,
      ref_id: '',
    });
    return { nodes, edges };
  }

  const clubs = (await ClubModel.find({ admin_user_ids: { $in: clubAdminIds } })
    .select('club_name location_id locality admin_user_ids')
    .lean()) as unknown as ClubRow[];

  const [locations, people, hostRows] = await Promise.all([
    LocationModel.find({ _id: { $in: clubs.map((club) => club.location_id).filter(Boolean) } })
      .select('location_name city')
      .lean(),
    loadPeople([...clubAdminIds, ...clubs.flatMap((club) => club.admin_user_ids)]),
    // One pass over every pod in the region: which hosts run pods for which
    // club, and how many each. This is the whole HOST level.
    PodModel.aggregate([
      { $match: { club_id: { $in: clubs.map((club) => club._id) } } },
      { $unwind: '$pod_hosts_id' },
      { $group: { _id: { club: '$club_id', host: '$pod_hosts_id' }, pods: { $sum: 1 } } },
    ]),
  ]);

  const cityName = new Map(
    locations.map((row) => [String(row._id), row.location_name || row.city || CITY_FALLBACK])
  );
  const hostIds = hostRows.map((row) => row._id.host as Types.ObjectId);
  const hostPeople = await loadPeople(hostIds);
  /** club id -> [{ host, pods }] */
  const hostsByClub = new Map<string, Array<{ host: string; pods: number }>>();
  for (const row of hostRows) {
    const club = String(row._id.club);
    const list = hostsByClub.get(club) ?? [];
    list.push({ host: String(row._id.host), pods: row.pods });
    hostsByClub.set(club, list);
  }

  /**
   * Group the clubs into city -> locality -> club admin.
   *
   * A club with more than one admin lands under each of them, which is what the
   * data says: both people run it.
   */
  const tree = new Map<string, Map<string, Map<string, ClubRow[]>>>();
  const inRegion = new Set(clubAdminIds.map(String));
  for (const club of clubs) {
    const city = club.location_id ? String(club.location_id) : '';
    const locality = club.locality?.trim() || '';
    const byLocality = tree.get(city) ?? new Map();
    const byAdmin = byLocality.get(locality) ?? new Map();
    for (const adminId of club.admin_user_ids ?? []) {
      const admin = String(adminId);
      // A club can be co-run by somebody outside this region; their branch is
      // not this manager's to see.
      if (!inRegion.has(admin)) continue;
      byAdmin.set(admin, [...(byAdmin.get(admin) ?? []), club]);
    }
    byLocality.set(locality, byAdmin);
    tree.set(city, byLocality);
  }

  nodes.push({
    id: rootId,
    kind: 'REGION',
    parent_id: null,
    label: regionName,
    sub_label: '',
    count: tree.size,
    ref_id: '',
  });

  for (const [city, byLocality] of tree) {
    const cityId = `city:${city || 'none'}`;
    nodes.push({
      id: cityId,
      kind: 'CITY',
      parent_id: rootId,
      label: cityName.get(city) ?? CITY_FALLBACK,
      sub_label: '',
      count: byLocality.size,
      ref_id: city,
    });
    addEdge(rootId, cityId);

    for (const [locality, byAdmin] of byLocality) {
      const localityId = `${cityId}/loc:${locality || 'none'}`;
      nodes.push({
        id: localityId,
        kind: 'LOCALITY',
        parent_id: cityId,
        label: locality || LOCALITY_FALLBACK,
        sub_label: '',
        count: byAdmin.size,
        ref_id: '',
      });
      addEdge(cityId, localityId);

      for (const [admin, adminClubs] of byAdmin) {
        const adminId = `${localityId}/admin:${admin}`;
        const person = people.get(admin);
        nodes.push({
          id: adminId,
          kind: 'CLUB_ADMIN',
          parent_id: localityId,
          label: person?.name || admin,
          sub_label: adminClubs.map((club) => club.club_name).join(', '),
          count: adminClubs.length,
          ref_id: admin,
        });
        addEdge(localityId, adminId);

        // One host may run pods for two of this admin's clubs; the branch shows
        // them once, with the pods added up.
        const podsByHost = new Map<string, number>();
        for (const club of adminClubs) {
          for (const row of hostsByClub.get(String(club._id)) ?? []) {
            podsByHost.set(row.host, (podsByHost.get(row.host) ?? 0) + row.pods);
          }
        }
        for (const [host, pods] of podsByHost) {
          const hostId = `${adminId}/host:${host}`;
          const hostPerson = hostPeople.get(host);
          nodes.push({
            id: hostId,
            kind: 'HOST',
            parent_id: adminId,
            label: hostPerson?.name || host,
            sub_label: hostPerson?.email ?? '',
            count: pods,
            ref_id: host,
          });
          addEdge(adminId, hostId);
        }
      }
    }
  }

  return { nodes, edges };
}

/** Every club in the region — the scope the pods drawer is allowed to read. */
export async function regionClubIds(clubAdminIds: Types.ObjectId[]): Promise<Types.ObjectId[]> {
  if (clubAdminIds.length === 0) return [];
  const clubs = await ClubModel.find({ admin_user_ids: { $in: clubAdminIds } })
    .select('_id')
    .lean();
  return clubs.map((club) => club._id as Types.ObjectId);
}
