import { gql } from '@apollo/client';

const REGION_FIELDS = `
  id
  region_no
  region_name
  club_admin_user_ids
  club_admin_count
`;

export const MY_REGION_TREE = gql`
  query MyRegionTree {
    myRegion {
      ${REGION_FIELDS}
    }
    myRegionTree {
      nodes {
        id
        kind
        parent_id
        label
        sub_label
        count
        ref_id
      }
      edges {
        id
        source
        target
      }
    }
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

export const MY_REGION_MEMBERS = gql`
  query MyRegionMembers {
    myRegion {
      ${REGION_FIELDS}
    }
    myRegionMembers {
      user_id
      name
      email
      clubs
      club_count
    }
  }
`;

export const REGION_CLUB_ADMIN_CANDIDATES = gql`
  query RegionClubAdminCandidates($search: String) {
    regionClubAdminCandidates(search: $search) {
      user_id
      name
      email
    }
  }
`;

export const REGION_HOST_PODS = gql`
  query RegionHostPods($host_user_id: ID!, $query: TableQueryInput) {
    regionHostPods(host_user_id: $host_user_id, query: $query) {
      total
      rows {
        id
        pod_id
        pod_title
        pod_date_time
        pod_mode
        pod_amount
        no_of_spots
        club_name
        is_active
      }
    }
  }
`;

export const RENAME_MY_REGION = gql`
  mutation RenameMyRegion($region_name: String!) {
    renameMyRegion(region_name: $region_name) {
      ${REGION_FIELDS}
    }
  }
`;

export const ADD_REGION_CLUB_ADMIN = gql`
  mutation AddRegionClubAdmin($user_id: ID!) {
    addRegionClubAdmin(user_id: $user_id) {
      ${REGION_FIELDS}
    }
  }
`;

export const REMOVE_REGION_CLUB_ADMIN = gql`
  mutation RemoveRegionClubAdmin($user_id: ID!) {
    removeRegionClubAdmin(user_id: $user_id) {
      ${REGION_FIELDS}
    }
  }
`;

/** The five levels the canvas draws. Pods are the drawer, not a node. */
export type RegionNodeKind = 'REGION' | 'CITY' | 'LOCALITY' | 'CLUB_ADMIN' | 'HOST';

export interface RegionTreeNode {
  id: string;
  kind: RegionNodeKind;
  parent_id: string | null;
  label: string;
  sub_label: string;
  count: number;
  ref_id: string;
}

export interface RegionTreeEdge {
  id: string;
  source: string;
  target: string;
}

export interface Region {
  id: string;
  region_no: string;
  region_name: string;
  club_admin_user_ids: string[];
  club_admin_count: number;
}

export interface RegionMember {
  user_id: string;
  name: string;
  email: string;
  clubs: string[];
  club_count: number;
}

export interface RegionCandidate {
  user_id: string;
  name: string;
  email: string;
}

export interface RegionHostPod {
  id: string;
  pod_id: string;
  pod_title: string;
  pod_date_time: string;
  pod_mode: string;
  pod_amount: number;
  no_of_spots: number;
  club_name: string;
  is_active: boolean;
}

/**
 * Node colour per level, so depth is readable at a glance on a wide canvas.
 * MUI palette keys rather than hex — the canvas follows the portal's theme,
 * including dark mode.
 */
export const NODE_TONE: Readonly<Record<RegionNodeKind, string>> = {
  REGION: 'primary',
  CITY: 'info',
  LOCALITY: 'secondary',
  CLUB_ADMIN: 'warning',
  HOST: 'success',
};

/**
 * Kind -> translation key. Written out rather than composed: the rule-38 gate
 * only sees a key that appears somewhere as a quoted literal.
 */
export const NODE_KIND_KEYS: Readonly<Record<RegionNodeKind, string>> = {
  REGION: 'partners.regional.kindRegion',
  CITY: 'partners.regional.kindCity',
  LOCALITY: 'partners.regional.kindLocality',
  CLUB_ADMIN: 'partners.regional.kindClubAdmin',
  HOST: 'partners.regional.kindHost',
};
