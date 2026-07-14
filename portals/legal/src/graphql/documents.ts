import { gql } from '@apollo/client';

export const LEGAL_DOCUMENT_FIELDS = gql`
  fragment LegalDocumentFields on LegalDocument {
    id
    name
    document_type
    description
    created_by_name
    updated_by_name
    version_count
    created_at
    updated_at
  }
`;

// NOTE: no page imports this since the DuncitTable migration (kept per the
// table contract — existing list queries are never removed by a migration).
export const LEGAL_DOCUMENTS = gql`
  query LegalDocuments($filter: LegalDocumentFilterInput) {
    legalDocuments(filter: $filter) {
      ...LegalDocumentFields
    }
  }
  ${LEGAL_DOCUMENT_FIELDS}
`;

export const LEGAL_DOCUMENTS_TABLE = gql`
  query LegalDocumentsTable($query: TableQueryInput) {
    legalDocumentsTable(query: $query) {
      total
      rows {
        ...LegalDocumentFields
      }
    }
  }
  ${LEGAL_DOCUMENT_FIELDS}
`;

export const LEGAL_DOCUMENT = gql`
  query LegalDocument($id: ID!) {
    legalDocument(id: $id) {
      ...LegalDocumentFields
      content
      versions {
        id
        name
        document_type
        description
        content
        updated_by_name
        created_at
      }
    }
  }
  ${LEGAL_DOCUMENT_FIELDS}
`;

export const LEGAL_DOCUMENT_STATS = gql`
  query LegalDocumentStats {
    legalDocumentStats {
      total
      by_type {
        document_type
        count
      }
    }
  }
`;

export const LEGAL_DOCUMENT_STATS_TABLE = gql`
  query LegalDocumentStatsTable($query: TableQueryInput) {
    legalDocumentStatsTable(query: $query) {
      total
      rows {
        document_type
        count
      }
    }
  }
`;

export const CREATE_LEGAL_DOCUMENT = gql`
  mutation CreateLegalDocument($input: CreateLegalDocumentInput!) {
    createLegalDocument(input: $input) {
      id
    }
  }
`;

export const UPDATE_LEGAL_DOCUMENT = gql`
  mutation UpdateLegalDocument($id: ID!, $input: UpdateLegalDocumentInput!) {
    updateLegalDocument(id: $id, input: $input) {
      id
      version_count
      updated_at
    }
  }
`;

export const DELETE_LEGAL_DOCUMENT = gql`
  mutation DeleteLegalDocument($id: ID!) {
    deleteLegalDocument(id: $id)
  }
`;

export const CLONE_LEGAL_DOCUMENT = gql`
  mutation CloneLegalDocument($id: ID!) {
    cloneLegalDocument(id: $id) {
      id
    }
  }
`;

export interface LegalDocumentVersion {
  id: string;
  name: string;
  document_type: string;
  description: string;
  content: string;
  updated_by_name: string;
  created_at: string;
}

export interface LegalDocumentListItem {
  id: string;
  name: string;
  document_type: string;
  description: string;
  created_by_name: string;
  updated_by_name: string;
  version_count: number;
  created_at: string;
  updated_at: string;
}

export interface LegalDocumentDetail extends LegalDocumentListItem {
  content: string;
  versions: LegalDocumentVersion[];
}

export interface LegalDocumentTypeCount {
  document_type: string;
  count: number;
}

export interface LegalDocumentStats {
  total: number;
  by_type: LegalDocumentTypeCount[];
}
