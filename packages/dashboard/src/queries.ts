import { gql } from '@apollo/client';

// Written out twice rather than shared through a `${…}` interpolation: the
// repo's schema gate skips any document it cannot resolve statically, so an
// interpolated selection ships unvalidated (and a stray brace inside one takes
// the whole portal down at module load).
export const MY_DASHBOARD_LAYOUT = gql`
  query MyDashboardLayout($dashboard_id: ID!) {
    myDashboardLayout(dashboard_id: $dashboard_id) {
      dashboard_id
      items {
        widget_id
        x
        y
        w
        h
      }
      updated_at
    }
  }
`;

export const SAVE_DASHBOARD_LAYOUT = gql`
  mutation SaveDashboardLayout($dashboard_id: ID!, $items: [DashboardLayoutItemInput!]!) {
    saveDashboardLayout(dashboard_id: $dashboard_id, items: $items) {
      dashboard_id
      items {
        widget_id
        x
        y
        w
        h
      }
      updated_at
    }
  }
`;

export const RESET_DASHBOARD_LAYOUT = gql`
  mutation ResetDashboardLayout($dashboard_id: ID!) {
    resetDashboardLayout(dashboard_id: $dashboard_id)
  }
`;

/** The server's item shape — `widget_id` where the client says `id`. */
export interface DashboardLayoutItemDto {
  widget_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardLayoutDto {
  dashboard_id: string;
  items: DashboardLayoutItemDto[];
  updated_at: string | null;
}
