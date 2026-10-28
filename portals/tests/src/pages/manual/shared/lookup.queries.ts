import { gql } from '@apollo/client';
import type { ManualColumn, ManualPerson, ManualSurface } from './types';

/*
 * The lists the board's filters and the case forms pick from. Small, read
 * once and shared through Apollo's cache by every page that needs them.
 */

export const MANUAL_TEST_COLUMNS = gql`
  query ManualTestColumns {
    manualTestColumns {
      id
      name
      order
      category
      wip_limit
      case_count
    }
  }
`;

export const MANUAL_TEST_ASSIGNEES = gql`
  query ManualTestAssignees {
    manualTestAssignees {
      id
      name
      photo
    }
  }
`;

export const MANUAL_TEST_SURFACES = gql`
  query ManualTestSurfaces {
    manualTestSurfaces {
      key
      name
    }
  }
`;

export const MANUAL_TEST_LABELS = gql`
  query ManualTestLabels($search: String) {
    manualTestLabels(search: $search)
  }
`;

/**
 * The E2E flows a case can link to — the E2E Flows table's own query, asking
 * only for names. A search narrows it, so the list never loads every flow.
 */
export const MANUAL_TEST_E2E_FLOWS = gql`
  query ManualTestE2eFlows($query: TableQueryInput) {
    e2eFlowsTable(query: $query) {
      rows {
        id
        name
        sub_flows {
          id
          name
        }
      }
    }
  }
`;

/** The linked flow's sub flows — the E2E flow page's own query, names only. */
export const MANUAL_TEST_E2E_FLOW = gql`
  query ManualTestE2eFlow($id: ID!) {
    e2eFlow(id: $id) {
      id
      name
      sub_flows {
        id
        name
      }
    }
  }
`;

export interface ColumnsData {
  manualTestColumns: ManualColumn[];
}
export interface AssigneesData {
  manualTestAssignees: ManualPerson[];
}
export interface SurfacesData {
  manualTestSurfaces: ManualSurface[];
}
export interface LabelsData {
  manualTestLabels: string[];
}
export interface E2eFlowOption {
  id: string;
  name: string;
  sub_flows: { id: string; name: string }[];
}
export interface E2eFlowsData {
  e2eFlowsTable: { rows: E2eFlowOption[] };
}
export interface E2eFlowData {
  e2eFlow: E2eFlowOption | null;
}
