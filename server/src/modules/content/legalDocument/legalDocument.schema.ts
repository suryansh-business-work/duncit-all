export const legalDocumentTypeDefs = /* GraphQL */ `
  type LegalDocumentVersion {
    id: ID!
    name: String!
    document_type: String!
    description: String!
    content: String!
    updated_by: ID
    updated_by_name: String!
    created_at: String!
  }

  type LegalDocument {
    id: ID!
    name: String!
    document_type: String!
    description: String!
    content: String!
    created_by_name: String!
    updated_by_name: String!
    version_count: Int!
    versions: [LegalDocumentVersion!]!
    "UNSIGNED until every required signatory has signed, then SIGNED."
    signing_status: SigningStatus!
    signed_at: String
    "A signed contract is closed to edits — the lock IS the signature."
    is_locked: Boolean!
    signatories: [LegalDocumentSignatory!]!
    created_at: String!
    updated_at: String!
  }

  enum SigningStatus {
    UNSIGNED
    SIGNED
  }

  enum SignatureMethod {
    DRAW
    TYPE
    UPLOAD
  }

  "One person who must sign, and their signature once they have."
  type LegalDocumentSignatory {
    id: ID!
    full_name: String!
    designation: String!
    email: String!
    initials: String!
    "A data URL for a drawn or typed signature, or the uploaded image URL."
    signature_image: String!
    signature_method: SignatureMethod
    signed_at: String
  }

  input SignLegalDocumentInput {
    full_name: String!
    designation: String!
    initials: String!
    "Data URL or hosted image. Must be under 5 MB."
    signature_image: String!
    signature_method: SignatureMethod!
  }

  type LegalDocumentTypeCount {
    document_type: String!
    count: Int!
  }

  type LegalDocumentStats {
    total: Int!
    by_type: [LegalDocumentTypeCount!]!
  }

  "Server-side table page for the shared table engine (legalDocumentsTable)."
  type LegalDocumentTablePage {
    rows: [LegalDocument!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "Server-side table page over the by-type aggregate (legalDocumentStatsTable)."
  type LegalDocumentTypeCountTablePage {
    rows: [LegalDocumentTypeCount!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input LegalDocumentFilterInput {
    search: String
    document_type: String
  }

  input CreateLegalDocumentInput {
    name: String!
    document_type: String!
    description: String
    content: String
  }

  input UpdateLegalDocumentInput {
    name: String
    document_type: String
    description: String
    content: String
  }

  extend type Query {
    legalDocuments(filter: LegalDocumentFilterInput): [LegalDocument!]!
    legalDocumentsTable(query: TableQueryInput): LegalDocumentTablePage!
    legalDocument(id: ID!): LegalDocument
    legalDocumentStats: LegalDocumentStats!
    legalDocumentStatsTable(query: TableQueryInput): LegalDocumentTypeCountTablePage!
    """
    The contract as a PDF (base64) — the same document before and after
    signing, with a signature block appended once it has been signed.
    """
    legalDocumentPdfBase64(id: ID!): String!
    "Which signing methods this platform allows, from the feature flags."
    legalSignatureMethods: [SignatureMethod!]!
  }

  extend type Mutation {
    createLegalDocument(input: CreateLegalDocumentInput!): LegalDocument!
    updateLegalDocument(id: ID!, input: UpdateLegalDocumentInput!): LegalDocument!
    deleteLegalDocument(id: ID!): Boolean!
    cloneLegalDocument(id: ID!): LegalDocument!
    "Sign as the acting user. Locks the contract once nobody is left to sign."
    signLegalDocument(id: ID!, input: SignLegalDocumentInput!): LegalDocument!
    "Email the signed contract, with the PDF attached."
    shareLegalDocument(id: ID!, to: String!, message: String): Boolean!
  }
`;
