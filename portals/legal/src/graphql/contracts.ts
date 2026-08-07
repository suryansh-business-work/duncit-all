import { gql } from '@apollo/client';

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';

export interface Contract {
  id: string;
  /** The permanent handle, CTR-000001. Never edited, never reused. */
  contract_no: string;
  title: string;
  description: string;
  content: string;
  status: ContractStatus;
  counterparty: string;
  effective_from: string | null;
  effective_to: string | null;
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

const CONTRACT_FIELDS = gql`
  fragment ContractFields on Contract {
    id
    contract_no
    title
    description
    content
    status
    counterparty
    effective_from
    effective_to
    created_by_name
    updated_by_name
    created_at
    updated_at
  }
`;

export const CONTRACTS_TABLE = gql`
  ${CONTRACT_FIELDS}
  query LegalContractsTable($query: TableQueryInput) {
    contractsTable(query: $query) {
      total
      rows {
        ...ContractFields
      }
    }
  }
`;

export const CREATE_CONTRACT = gql`
  ${CONTRACT_FIELDS}
  mutation CreateLegalContract($input: CreateContractInput!) {
    createContract(input: $input) {
      ...ContractFields
    }
  }
`;

export const UPDATE_CONTRACT = gql`
  ${CONTRACT_FIELDS}
  mutation UpdateLegalContract($id: ID!, $input: UpdateContractInput!) {
    updateContract(id: $id, input: $input) {
      ...ContractFields
    }
  }
`;

export const ARCHIVE_CONTRACT = gql`
  mutation ArchiveLegalContract($id: ID!) {
    archiveContract(id: $id) {
      id
      status
    }
  }
`;

export const DELETE_CONTRACT = gql`
  mutation DeleteLegalContract($id: ID!) {
    deleteContract(id: $id)
  }
`;

/** Status options for the table's select filter and the form. */
export const CONTRACT_STATUS_OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export const contractStatusLabel = (status: ContractStatus): string =>
  CONTRACT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
