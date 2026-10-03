/**
 * The Regional Club Admin's org tree. The three reads (clubs, their cities, the
 * pod aggregation) and the people lookup are faked; what is under test is the
 * DERIVED shape: Region -> City -> Locality -> Club Admin -> Host, the path-
 * carrying node ids, the fallbacks for a club with no city or locality, the
 * skipping of admins outside the region, and hosts summed across an admin's
 * clubs.
 */
import { Types } from 'mongoose';

jest.mock('@modules/clubs/club/club.model', () => ({ ClubModel: { find: jest.fn() } }));
jest.mock('@modules/pods/pod/pod.model', () => ({ PodModel: { aggregate: jest.fn() } }));
jest.mock('@modules/platform/location/location.model', () => ({ LocationModel: { find: jest.fn() } }));
jest.mock('../../region.scope', () => ({ loadPeople: jest.fn() }));

import { ClubModel } from '@modules/clubs/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { loadPeople } from '../../region.scope';
import { buildRegionTree, REGION_NODE_KINDS, type RegionTreeNode } from '../../region.tree';

const clubFind = ClubModel.find as jest.Mock;
const locationFind = LocationModel.find as jest.Mock;
const podAggregate = PodModel.aggregate as jest.Mock;
const people = loadPeople as jest.Mock;

const id = (n: number) => new Types.ObjectId(`65f2000000000000000000${String(n).padStart(2, '0')}`);
const ADMIN_A = id(1);
const ADMIN_B = id(2);
const OUTSIDER = id(3);
const HOST_X = id(4);
const HOST_Y = id(5);
const CITY_PUNE = id(10);
const CITY_GONE = id(11);
const CLUB_1 = id(20);
const CLUB_2 = id(21);
const CLUB_3 = id(22);
const CLUB_4 = id(23);

const selectLean = (rows: unknown[]) => ({ select: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(rows) })) });

const byId = (nodes: RegionTreeNode[], nodeId: string) => {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`no node ${nodeId}`);
  return node;
};

describe('REGION_NODE_KINDS', () => {
  it('lists every drawn level, top to bottom', () => {
    expect(REGION_NODE_KINDS).toEqual(['REGION', 'CITY', 'LOCALITY', 'CLUB_ADMIN', 'HOST']);
  });
});

describe('buildRegionTree', () => {
  it('draws a lone region node and reads nothing when the region has no club admins', async () => {
    const tree = await buildRegionTree('North Region', []);

    expect(tree).toEqual({
      nodes: [
        { id: 'region', kind: 'REGION', parent_id: null, label: 'North Region', sub_label: '', count: 0, ref_id: '' },
      ],
      edges: [],
    });
    expect(clubFind).not.toHaveBeenCalled();
    expect(people).not.toHaveBeenCalled();
  });

  it('derives cities, localities, admins and hosts from clubs and pods in four reads', async () => {
    clubFind.mockReturnValue(
      selectLean([
        // Two clubs of admin A in the same city + locality.
        { _id: CLUB_1, club_name: 'Runners', location_id: CITY_PUNE, locality: ' Baner ', admin_user_ids: [ADMIN_A] },
        {
          _id: CLUB_2,
          club_name: 'Walkers',
          location_id: CITY_PUNE,
          locality: 'Baner',
          // The outsider runs it too but is not in this region.
          admin_user_ids: [ADMIN_A, OUTSIDER],
        },
        // Admin B: a club with a city whose Location row is gone, and no locality.
        { _id: CLUB_3, club_name: 'Readers', location_id: CITY_GONE, locality: '', admin_user_ids: [ADMIN_B] },
        // A club with no city at all and no admin list.
        { _id: CLUB_4, club_name: 'Orphans', location_id: null, locality: undefined, admin_user_ids: undefined },
      ])
    );
    locationFind.mockReturnValue(selectLean([{ _id: CITY_PUNE, location_name: 'Pune' }]));
    podAggregate.mockResolvedValue([
      { _id: { club: CLUB_1, host: HOST_X }, pods: 2 },
      { _id: { club: CLUB_2, host: HOST_X }, pods: 3 },
      { _id: { club: CLUB_2, host: HOST_Y }, pods: 1 },
    ]);
    people.mockResolvedValue(
      new Map([
        [String(ADMIN_A), { name: 'Asha Admin', email: 'asha@example.test' }],
        [String(HOST_X), { name: 'Xavier Host', email: 'x@example.test' }],
        // HOST_Y is unnamed: the id stands in for the label.
        [String(ADMIN_B), { name: '', email: 'b@example.test' }],
      ])
    );

    const { nodes, edges } = await buildRegionTree('West', [ADMIN_A, ADMIN_B]);

    // The reads are scoped to the region, and the people lookup is ONE call.
    expect(clubFind).toHaveBeenCalledWith({ admin_user_ids: { $in: [ADMIN_A, ADMIN_B] } });
    expect(locationFind).toHaveBeenCalledWith({ _id: { $in: [CITY_PUNE, CITY_PUNE, CITY_GONE] } });
    expect(podAggregate).toHaveBeenCalledWith([
      { $match: { club_id: { $in: [CLUB_1, CLUB_2, CLUB_3, CLUB_4] } } },
      { $unwind: '$pod_hosts_id' },
      { $group: { _id: { club: '$club_id', host: '$pod_hosts_id' }, pods: { $sum: 1 } } },
    ]);
    expect(people).toHaveBeenCalledTimes(1);
    expect(people.mock.calls[0][0]).toEqual(
      expect.arrayContaining([String(ADMIN_A), String(ADMIN_B), String(OUTSIDER), String(HOST_X), String(HOST_Y)])
    );

    // Region counts its cities: Pune, the vanished city and "no city".
    expect(byId(nodes, 'region')).toMatchObject({ kind: 'REGION', label: 'West', count: 3 });

    const pune = `city:${CITY_PUNE}`;
    expect(byId(nodes, pune)).toEqual({
      id: pune,
      kind: 'CITY',
      parent_id: 'region',
      label: 'Pune',
      sub_label: '',
      count: 1,
      ref_id: String(CITY_PUNE),
    });
    // A Location that no longer exists still draws, under the fallback name.
    expect(byId(nodes, `city:${CITY_GONE}`)).toMatchObject({ label: 'Unassigned city', ref_id: String(CITY_GONE) });
    expect(byId(nodes, 'city:none')).toMatchObject({ label: 'Unassigned city', ref_id: '', count: 1 });

    // Locality is trimmed, so " Baner " and "Baner" are one box.
    const baner = `${pune}/loc:Baner`;
    expect(byId(nodes, baner)).toMatchObject({ kind: 'LOCALITY', parent_id: pune, label: 'Baner', count: 1 });
    expect(byId(nodes, `city:${CITY_GONE}/loc:none`)).toMatchObject({ label: 'Unassigned locality', count: 1 });
    // The orphan club has no in-region admin, so its locality is empty.
    expect(byId(nodes, 'city:none/loc:none')).toMatchObject({ count: 0 });

    const adminA = `${baner}/admin:${ADMIN_A}`;
    expect(byId(nodes, adminA)).toEqual({
      id: adminA,
      kind: 'CLUB_ADMIN',
      parent_id: baner,
      label: 'Asha Admin',
      sub_label: 'Runners, Walkers',
      count: 2,
      ref_id: String(ADMIN_A),
    });
    // An admin with no name falls back to the id.
    const adminB = `city:${CITY_GONE}/loc:none/admin:${ADMIN_B}`;
    expect(byId(nodes, adminB)).toMatchObject({ label: String(ADMIN_B), sub_label: 'Readers', count: 1 });

    // Host X runs pods for both of A's clubs: shown once, pods summed.
    expect(byId(nodes, `${adminA}/host:${HOST_X}`)).toEqual({
      id: `${adminA}/host:${HOST_X}`,
      kind: 'HOST',
      parent_id: adminA,
      label: 'Xavier Host',
      sub_label: 'x@example.test',
      count: 5,
      ref_id: String(HOST_X),
    });
    expect(byId(nodes, `${adminA}/host:${HOST_Y}`)).toMatchObject({
      label: String(HOST_Y),
      sub_label: '',
      count: 1,
    });

    // The outsider never becomes a node, and B's club has no hosts.
    expect(nodes.some((n) => n.ref_id === String(OUTSIDER))).toBe(false);
    expect(nodes.filter((n) => n.parent_id === adminB)).toEqual([]);

    // Every non-root node has exactly one edge from its parent.
    expect(edges).toHaveLength(nodes.length - 1);
    for (const node of nodes.filter((n) => n.parent_id)) {
      expect(edges).toContainEqual({
        id: `${node.parent_id}->${node.id}`,
        source: node.parent_id,
        target: node.id,
      });
    }
  });

  it('names a city by its `city` field when the location has no name', async () => {
    clubFind.mockReturnValue(
      selectLean([{ _id: CLUB_1, club_name: 'Runners', location_id: CITY_PUNE, locality: 'Aundh', admin_user_ids: [ADMIN_A] }])
    );
    locationFind.mockReturnValue(selectLean([{ _id: CITY_PUNE, location_name: '', city: 'Pune City' }]));
    podAggregate.mockResolvedValue([]);
    people.mockResolvedValue(new Map());

    const { nodes } = await buildRegionTree('West', [ADMIN_A]);

    expect(byId(nodes, `city:${CITY_PUNE}`).label).toBe('Pune City');
    // Unknown person: the admin node is labelled by id.
    expect(byId(nodes, `city:${CITY_PUNE}/loc:Aundh/admin:${ADMIN_A}`).label).toBe(String(ADMIN_A));
  });

  it('falls back to "Unassigned city" when the location has neither name nor city', async () => {
    clubFind.mockReturnValue(
      selectLean([{ _id: CLUB_1, club_name: 'Runners', location_id: CITY_PUNE, locality: 'Aundh', admin_user_ids: [ADMIN_A] }])
    );
    locationFind.mockReturnValue(selectLean([{ _id: CITY_PUNE }]));
    podAggregate.mockResolvedValue([]);
    people.mockResolvedValue(new Map());

    const { nodes } = await buildRegionTree('West', [ADMIN_A]);

    expect(byId(nodes, `city:${CITY_PUNE}`).label).toBe('Unassigned city');
  });

  it('draws only the region when the admins run no clubs', async () => {
    clubFind.mockReturnValue(selectLean([]));
    locationFind.mockReturnValue(selectLean([]));
    podAggregate.mockResolvedValue([]);
    people.mockResolvedValue(new Map());

    const tree = await buildRegionTree('Empty', [ADMIN_A]);

    expect(tree.nodes).toEqual([
      { id: 'region', kind: 'REGION', parent_id: null, label: 'Empty', sub_label: '', count: 0, ref_id: '' },
    ]);
    expect(tree.edges).toEqual([]);
    expect(people).toHaveBeenCalledWith([String(ADMIN_A)]);
  });
});
