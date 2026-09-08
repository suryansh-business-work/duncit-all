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
import { loadPeople } from './region.scope';

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

/** Push into a map of lists without rebuilding the list each time — the naive
 * `[...(get() ?? []), x]` is quadratic, and a region's pods are the one place
 * here with thousands of rows. */
function pushInto<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/** Group the clubs into city -> locality -> club admin. A club with more than
 * one admin lands under each of them, which is what the data says: both people
 * run it. Admins outside this region are skipped — their branch is not this
 * manager's to see. */
function groupClubs(clubs: ClubRow[], inRegion: ReadonlySet<string>) {
  const tree = new Map<string, Map<string, Map<string, ClubRow[]>>>();
  for (const club of clubs) {
    const city = club.location_id ? String(club.location_id) : '';
    const locality = club.locality?.trim() || '';
    let byLocality = tree.get(city);
    if (!byLocality) {
      byLocality = new Map();
      tree.set(city, byLocality);
    }
    let byAdmin = byLocality.get(locality);
    if (!byAdmin) {
      byAdmin = new Map();
      byLocality.set(locality, byAdmin);
    }
    for (const adminId of club.admin_user_ids ?? []) {
      const admin = String(adminId);
      if (!inRegion.has(admin)) continue;
      pushInto(byAdmin, admin, club);
    }
  }
  return tree;
}

/**
 * Builds the whole tree in FOUR reads, not one per node.
 *
 * The naive shape — walk the clubs, then query each club's pods for its hosts —
 * is a query per club admin per locality, and a region with forty clubs then
 * opens forty round trips deep. One pod aggregation over every club in the
 * region answers the host level in a single pass, and the club admins and the
 * hosts are named together in ONE user read rather than one each.
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

  const [locations, hostRows] = await Promise.all([
    LocationModel.find({ _id: { $in: clubs.map((club) => club.location_id).filter(Boolean) } })
      .select('location_name city')
      .lean(),
    // One pass over every pod in the region: which hosts run pods for which
    // club, and how many each. This is the whole HOST level.
    PodModel.aggregate([
      { $match: { club_id: { $in: clubs.map((club) => club._id) } } },
      { $unwind: '$pod_hosts_id' },
      { $group: { _id: { club: '$club_id', host: '$pod_hosts_id' }, pods: { $sum: 1 } } },
    ]),
  ]);

  // Club admins and hosts are named TOGETHER: two `$in` reads over the same
  // collection, one after the other, is a round trip spent on nothing.
  const people = await loadPeople([
    ...clubAdminIds.map(String),
    ...clubs.flatMap((club) => (club.admin_user_ids ?? []).map(String)),
    ...hostRows.map((row) => String(row._id.host)),
  ]);

  const cityName = new Map(
    locations.map((row) => [String(row._id), row.location_name || row.city || CITY_FALLBACK])
  );
  /** club id -> [{ host, pods }] */
  const hostsByClub = new Map<string, Array<{ host: string; pods: number }>>();
  for (const row of hostRows) {
    pushInto(hostsByClub, String(row._id.club), {
      host: String(row._id.host),
      pods: row.pods as number,
    });
  }

  const tree = groupClubs(clubs, new Set(clubAdminIds.map(String)));

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
          const hostPerson = people.get(host);
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
