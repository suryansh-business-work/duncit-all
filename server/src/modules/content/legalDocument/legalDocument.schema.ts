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
    created_at: String!
    updated_at: String!
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
  }

  extend type Mutation {
    createLegalDocument(input: CreateLegalDocumentInput!): LegalDocument!
    updateLegalDocument(id: ID!, input: UpdateLegalDocumentInput!): LegalDocument!
    deleteLegalDocument(id: ID!): Boolean!
    cloneLegalDocument(id: ID!): LegalDocument!
  }
`;
