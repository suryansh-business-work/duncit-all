import { gql } from '@apollo/client';

/** Every saved calculation carries its full pod list: the table's figures are
 * derived from the same inputs the editor opens, so one query serves both. */
const CALCULATOR_FIELDS = `
  id
  name
  kind
  updated_at
  pods {
    pod_key
    name
    pod_amount
    no_of_spots
    pod_count
    gst_percent
    platform_fee_percent
    venue_amount
    host_commission_percent
    venue_commission_percent
    club_admin_percent
  }
`;

export const POD_CALCULATORS = gql`
  query PodCalculators($kind: String!) {
    podCalculators(kind: $kind) {
      ${CALCULATOR_FIELDS}
    }
  }
`;

export const CREATE_POD_CALCULATOR = gql`
  mutation CreatePodCalculator($input: SavePodCalculatorInput!) {
    createPodCalculator(input: $input) {
      ${CALCULATOR_FIELDS}
    }
  }
`;

export const UPDATE_POD_CALCULATOR = gql`
  mutation UpdatePodCalculator($calculator_doc_id: ID!, $input: SavePodCalculatorInput!) {
    updatePodCalculator(calculator_doc_id: $calculator_doc_id, input: $input) {
      ${CALCULATOR_FIELDS}
    }
  }
`;

export const DELETE_POD_CALCULATOR = gql`
  mutation DeletePodCalculator($calculator_doc_id: ID!) {
    deletePodCalculator(calculator_doc_id: $calculator_doc_id)
  }
`;

export const POD_CALCULATOR_PDF = gql`
  query PodCalculatorPdf($calculator_doc_id: ID!) {
    podCalculatorPdfBase64(calculator_doc_id: $calculator_doc_id)
  }
`;

export const EMAIL_POD_CALCULATOR = gql`
  mutation EmailPodCalculator($calculator_doc_id: ID!, $to: String!) {
    emailPodCalculator(calculator_doc_id: $calculator_doc_id, to: $to)
  }
`;
