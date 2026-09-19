import type {
  Region,
  RegionCandidate,
  RegionClub,
  RegionHostPod,
  RegionMember,
  RegionTreeEdge,
  RegionTreeNode,
} from '../../src/pages/queries';

/**
 * Region fixtures shaped exactly as the server's region module answers them —
 * including the tree's path-encoded node ids (`…/admin:<userId>/host:<userId>`),
 * which is the only place the canvas can read a person's id back from.
 */

type Typed<T> = T & { __typename: string };

export const makeRegion = (over: Partial<Region> = {}): Typed<Region> => ({
  __typename: 'Region',
  id: 'rgn-doc-1',
  region_no: 'RGN-000042',
  region_name: 'Bengaluru South',
  club_admin_user_ids: ['u-admin-asha', 'u-admin-vikram'],
  club_admin_count: 2,
  ...over,
});

/** A Club Admin with clubs, and one who has not set a name and runs none yet. */
export const ASHA: Typed<RegionMember> = {
  __typename: 'RegionMember',
  user_id: 'u-admin-asha',
  name: 'Asha Rao',
  email: 'asha.rao@duncit.com',
  clubs: ['Koramangala Runners', 'HSR Book Circle'],
  club_count: 2,
};

export const VIKRAM: Typed<RegionMember> = {
  __typename: 'RegionMember',
  user_id: 'u-admin-vikram',
  name: '',
  email: 'vikram.k@duncit.com',
  clubs: [],
  club_count: 0,
};

export const candidate = (over: Partial<RegionCandidate> = {}): Typed<RegionCandidate> => ({
  __typename: 'RegionCandidate',
  user_id: 'u-admin-neha',
  name: 'Neha Kapoor',
  email: 'neha.kapoor@duncit.com',
  ...over,
});

export const makeClub = (over: Partial<RegionClub> = {}): RegionClub => ({
  id: 'club-doc-1',
  club_id: 'koramangala-runners',
  club_name: 'Koramangala Runners',
  city: 'Bengaluru',
  locality: 'Koramangala',
  pod_count: 14,
  is_active: true,
  ...over,
});

export const makePod = (over: Partial<RegionHostPod> = {}): RegionHostPod => ({
  id: 'pod-doc-4821',
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunday 10K Social Run',
  pod_date_time: '2026-09-20T06:30:00.000Z',
  pod_mode: 'PHYSICAL',
  pod_amount: 1499,
  no_of_spots: 20,
  club_name: 'Koramangala Runners',
  is_active: true,
  ...over,
});

const CITY = 'city:loc-blr';
const LOCALITY = `${CITY}/loc:Koramangala`;
export const ADMIN_NODE_ID = `${LOCALITY}/admin:u-admin-asha`;
export const ROHAN_NODE_ID = `${ADMIN_NODE_ID}/host:u-host-rohan`;
export const MEERA_NODE_ID = `${ADMIN_NODE_ID}/host:u-host-meera`;

const node = (over: Partial<RegionTreeNode> & Pick<RegionTreeNode, 'id' | 'kind'>): Typed<RegionTreeNode> => ({
  __typename: 'RegionTreeNode',
  parent_id: null,
  label: '',
  sub_label: '',
  count: 0,
  ref_id: '',
  ...over,
});

/** Region -> City -> Locality -> Club Admin -> two Hosts, in the order the server emits them. */
export const TREE_NODES: Typed<RegionTreeNode>[] = [
  node({ id: 'region', kind: 'REGION', label: 'Bengaluru South', count: 1 }),
  node({ id: CITY, kind: 'CITY', parent_id: 'region', label: 'Bengaluru', count: 1, ref_id: 'loc-blr' }),
  node({ id: LOCALITY, kind: 'LOCALITY', parent_id: CITY, label: 'Koramangala', count: 1 }),
  node({
    id: ADMIN_NODE_ID,
    kind: 'CLUB_ADMIN',
    parent_id: LOCALITY,
    label: 'Asha Rao',
    sub_label: 'Koramangala Runners, HSR Book Circle',
    count: 2,
    ref_id: 'u-admin-asha',
  }),
  node({
    id: ROHAN_NODE_ID,
    kind: 'HOST',
    parent_id: ADMIN_NODE_ID,
    label: 'Rohan Mehta',
    sub_label: 'rohan.m@duncit.com',
    count: 6,
    ref_id: 'u-host-rohan',
  }),
  node({
    id: MEERA_NODE_ID,
    kind: 'HOST',
    parent_id: ADMIN_NODE_ID,
    label: 'Meera Iyer',
    sub_label: 'meera.iyer@duncit.com',
    count: 3,
    ref_id: 'u-host-meera',
  }),
];

const edge = (source: string, target: string): Typed<RegionTreeEdge> => ({
  __typename: 'RegionTreeEdge',
  id: `${source}->${target}`,
  source,
  target,
});

export const TREE_EDGES: Typed<RegionTreeEdge>[] = [
  edge('region', CITY),
  edge(CITY, LOCALITY),
  edge(LOCALITY, ADMIN_NODE_ID),
  edge(ADMIN_NODE_ID, ROHAN_NODE_ID),
  edge(ADMIN_NODE_ID, MEERA_NODE_ID),
];

/** A region with no Club Admins yet: the server sends the root box alone. */
export const EMPTY_TREE_NODES: Typed<RegionTreeNode>[] = [
  node({ id: 'region', kind: 'REGION', label: 'Bengaluru South' }),
];

export const financeSettings = (symbol = '₹') => ({
  __typename: 'PublicFinanceSettings',
  currency_symbol: symbol,
});
