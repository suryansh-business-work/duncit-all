import { gql } from '@apollo/client';
import type {
  GrowthActor,
  GrowthCalculation,
  GrowthInputsInput,
  SaveGrowthCalculationInput,
  UpdateGrowthCalculationInput,
} from '@duncit/gql-types';
import type { GrowthOutputs } from './growth-calculator';

/** Every field a saved calculation is shown with — the list, the details dialog and the editor. */
const GROWTH_CALCULATION_FIELDS = gql`
  fragment GrowthCalculationFields on GrowthCalculation {
    id
    title
    description
    inputs {
      pax_per_pod
      price_per_pax
      profit_margin_pct
      hosts_per_venue
      pods_per_host_per_month
      venues_per_city
      target_cities
      host_conversion_pct
      venue_conversion_pct
    }
    per_pod {
      pod_value
      earnings_per_pod
    }
    per_city {
      venues
      hosts
      monthly_pods
      monthly_gmv
      monthly_earnings
      host_leads
      venue_leads
    }
    totals {
      cities
      venues
      hosts
      monthly_pods
      host_leads
      venue_leads
      total_leads
      monthly_gmv
      monthly_earnings
      annual_gmv
      annual_earnings
    }
    formula_version
    revision
    calculated_by {
      user_id
      name
      email
      roles
    }
    last_edited_by {
      user_id
      name
    }
    last_edited_at
    duplicated_from
    created_at
    updated_at
    can_edit
  }
`;

export const GROWTH_CALCULATIONS_TABLE = gql`
  query GrowthCalculationsTable($query: TableQueryInput) {
    growthCalculationsTable(query: $query) {
      total
      page
      page_size
      rows {
        ...GrowthCalculationFields
      }
    }
  }
  ${GROWTH_CALCULATION_FIELDS}
`;

export const SAVE_GROWTH_CALCULATION = gql`
  mutation SaveGrowthCalculation($input: SaveGrowthCalculationInput!) {
    saveGrowthCalculation(input: $input) {
      ...GrowthCalculationFields
    }
  }
  ${GROWTH_CALCULATION_FIELDS}
`;

export const UPDATE_GROWTH_CALCULATION = gql`
  mutation UpdateGrowthCalculation($id: ID!, $input: UpdateGrowthCalculationInput!) {
    updateGrowthCalculation(id: $id, input: $input) {
      ...GrowthCalculationFields
    }
  }
  ${GROWTH_CALCULATION_FIELDS}
`;

export const DUPLICATE_GROWTH_CALCULATION = gql`
  mutation DuplicateGrowthCalculation($id: ID!, $title: String!, $clientRequestId: String) {
    duplicateGrowthCalculation(id: $id, title: $title, client_request_id: $clientRequestId) {
      id
    }
  }
`;

export const DELETE_GROWTH_CALCULATION = gql`
  mutation DeleteGrowthCalculation($id: ID!) {
    deleteGrowthCalculation(id: $id)
  }
`;

/** A saved calculation as the console reads it. */
export type SavedCalculation = Omit<GrowthCalculation, '__typename' | 'last_edited_by' | 'per_pod' | 'per_city' | 'totals'> &
  GrowthOutputs & {
    last_edited_by: Pick<GrowthActor, 'user_id' | 'name'> | null;
  };

export interface GrowthCalculationsTableData {
  growthCalculationsTable: { total: number; page: number; page_size: number; rows: SavedCalculation[] };
}

export interface SaveGrowthCalculationData {
  saveGrowthCalculation: SavedCalculation;
}
export interface SaveGrowthCalculationVars {
  input: SaveGrowthCalculationInput;
}

export interface UpdateGrowthCalculationData {
  updateGrowthCalculation: SavedCalculation;
}
export interface UpdateGrowthCalculationVars {
  id: string;
  input: UpdateGrowthCalculationInput;
}

export interface DuplicateGrowthCalculationData {
  duplicateGrowthCalculation: { id: string };
}
export interface DuplicateGrowthCalculationVars {
  id: string;
  title: string;
  clientRequestId?: string | null;
}

export interface DeleteGrowthCalculationData {
  deleteGrowthCalculation: boolean;
}

export type { GrowthInputsInput };
