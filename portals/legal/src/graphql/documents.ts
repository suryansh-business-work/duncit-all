import { gql } from '@apollo/client';

export const LEGAL_DOCUMENT_FIELDS = gql`
  fragment LegalDocumentFields on LegalDocument {
    id
    document_no
    name
    is_active
    document_type
    description
    created_by_name
    updated_by_name
    version_count
    signing_status
    signed_at
    is_locked
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
      ...LegalDocumentFields
    }
  }
  ${LEGAL_DOCUMENT_FIELDS}
`;

/**
 * Show or hide a document without editing it.
 *
 * A mutation of its own rather than a field on the update input, because the
 * server refuses `updateLegalDocument` on a SIGNED document — and taking one
 * down is exactly the remedy you reach for when something signed turns out to
 * be wrong.
 */
export const SET_LEGAL_DOCUMENT_ACTIVE = gql`
  mutation SetLegalDocumentActive($id: ID!, $isActive: Boolean!) {
    setLegalDocumentActive(id: $id, is_active: $isActive) {
      id
      is_active
      updated_by_name
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

export type SigningStatus = 'UNSIGNED' | 'SIGNED';
export type SignatureMethod = 'DRAW' | 'TYPE' | 'UPLOAD';

export interface LegalDocumentSignatory {
  id: string;
  full_name: string;
  designation: string;
  email: string;
  initials: string;
  signature_image: string;
  signature_method: SignatureMethod | null;
  signed_at: string | null;
}

export interface LegalDocumentListItem {
  id: string;
  /** Permanent handle, DOC-000001. Never edited, never reused. */
  document_no: string;
  name: string;
  /** Off hides the document from the app without deleting it. */
  is_active: boolean;
  document_type: string;
  description: string;
  created_by_name: string;
  updated_by_name: string;
  version_count: number;
  signing_status: SigningStatus;
  signed_at: string | null;
  /** A signed contract is closed to edits. */
  is_locked: boolean;
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

/** The contract as a PDF — unsigned before signing, signed after. */
export const LEGAL_DOCUMENT_PDF = gql`
  query LegalDocumentPdf($id: ID!) {
    legalDocumentPdfBase64(id: $id)
  }
`;

/** Which signing methods this platform allows (Admin feature flags). */
export const LEGAL_SIGNATURE_METHODS = gql`
  query LegalSignatureMethods {
    legalSignatureMethods
  }
`;

export const SIGN_LEGAL_DOCUMENT = gql`
  mutation SignLegalDocument($id: ID!, $input: SignLegalDocumentInput!) {
    signLegalDocument(id: $id, input: $input) {
      id
      signing_status
      signed_at
      is_locked
    }
  }
`;

export const SHARE_LEGAL_DOCUMENT = gql`
  mutation ShareLegalDocument($id: ID!, $to: String!, $message: String) {
    shareLegalDocument(id: $id, to: $to, message: $message)
  }
`;
