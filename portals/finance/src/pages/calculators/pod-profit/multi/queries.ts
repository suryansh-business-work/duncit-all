import { gql } from '@apollo/client';

/** Every saved comparison carries its full pod list: the table's figures are
 * derived from the same inputs the editor opens, so one query serves both. */
const CALCULATOR_FIELDS = `
  id
  name
  updated_at
  pods {
    pod_key
    name
    pod_amount
    no_of_spots
    gst_percent
    platform_fee_percent
    venue_amount
    host_commission_percent
    venue_commission_percent
    club_admin_percent
  }
`;

export const MULTI_POD_CALCULATORS = gql`
  query MultiPodCalculators {
    multiPodCalculators {
      ${CALCULATOR_FIELDS}
    }
  }
`;

export const CREATE_MULTI_POD_CALCULATOR = gql`
  mutation CreateMultiPodCalculator($input: SaveMultiPodCalculatorInput!) {
    createMultiPodCalculator(input: $input) {
      ${CALCULATOR_FIELDS}
    }
  }
`;

export const UPDATE_MULTI_POD_CALCULATOR = gql`
  mutation UpdateMultiPodCalculator($calculator_doc_id: ID!, $input: SaveMultiPodCalculatorInput!) {
    updateMultiPodCalculator(calculator_doc_id: $calculator_doc_id, input: $input) {
      ${CALCULATOR_FIELDS}
    }
  }
`;

export const DELETE_MULTI_POD_CALCULATOR = gql`
  mutation DeleteMultiPodCalculator($calculator_doc_id: ID!) {
    deleteMultiPodCalculator(calculator_doc_id: $calculator_doc_id)
  }
`;
