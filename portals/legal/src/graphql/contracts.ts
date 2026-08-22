import { gql } from '@apollo/client';

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';
export type SigningStatus = 'UNSIGNED' | 'SIGNED';
export type SignatureMethod = 'DRAW' | 'TYPE' | 'UPLOAD';

/** One person who must sign, and their signature once they have. */
export interface ContractSignatory {
  id: string;
  full_name: string;
  designation: string;
  email: string;
  initials: string;
  signature_image: string;
  signature_method: SignatureMethod | null;
  signed_at: string | null;
}

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
  /** UNSIGNED until every required signatory has signed. */
  signing_status: SigningStatus;
  signed_at: string | null;
  /** A signed contract is closed to edits — the lock IS the signature. */
  is_locked: boolean;
  signatories: ContractSignatory[];
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
    signing_status
    signed_at
    is_locked
    signatories {
      id
      full_name
      designation
      email
      initials
      signature_image
      signature_method
      signed_at
    }
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

/** The contract as a PDF — unsigned before signing, signed after. */
export const CONTRACT_PDF = gql`
  query LegalContractPdf($id: ID!) {
    contractPdfBase64(id: $id)
  }
`;

export const SIGN_CONTRACT = gql`
  mutation SignLegalContract($id: ID!, $input: SignContractInput!) {
    signContract(id: $id, input: $input) {
      id
      status
      signing_status
      signed_at
      is_locked
    }
  }
`;

export const SHARE_CONTRACT = gql`
  mutation ShareLegalContract($id: ID!, $to: String!, $message: String) {
    shareContract(id: $id, to: $to, message: $message)
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
