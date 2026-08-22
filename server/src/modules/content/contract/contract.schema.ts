export const contractTypeDefs = /* GraphQL */ `
  "Where a contract is in its life."
  enum ContractStatus {
    DRAFT
    ACTIVE
    EXPIRED
    ARCHIVED
  }

  type Contract {
    id: ID!
    """
    The permanent, globally unique handle (CTR-000001). Minted on creation,
    never edited, and never reused — the counter behind it only counts up, so
    a deleted contract's id is not handed to another one.
    """
    contract_no: String!
    title: String!
    description: String!
    content: String!
    status: ContractStatus!
    counterparty: String!
    effective_from: String
    effective_to: String
    "UNSIGNED until every required signatory has signed, then SIGNED."
    signing_status: SigningStatus!
    signed_at: String
    "A signed contract is closed to edits — the lock IS the signature."
    is_locked: Boolean!
    "Everyone who must sign, and their signature once they have."
    signatories: [ContractSignatory!]!
    created_by_name: String!
    updated_by_name: String!
    created_at: String!
    updated_at: String!
  }

  """
  One person who must sign a contract, and their signature once they have.

  The same shape a legal document's signatory carries, because both sign
  through one service — a separate type is what would let the two drift.
  """
  type ContractSignatory {
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

  input SignContractInput {
    full_name: String!
    designation: String!
    initials: String!
    "Data URL or hosted image. Must be under 5 MB."
    signature_image: String!
    signature_method: SignatureMethod!
  }

  "Server-side table page for the shared table engine (contractsTable)."
  type ContractTablePage {
    rows: [Contract!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input CreateContractInput {
    title: String!
    description: String
    content: String
    status: ContractStatus
    counterparty: String
    effective_from: String
    effective_to: String
  }

  input UpdateContractInput {
    title: String
    description: String
    content: String
    status: ContractStatus
    counterparty: String
    effective_from: String
    effective_to: String
  }

  extend type Query {
    contractsTable(query: TableQueryInput): ContractTablePage!
    contract(id: ID!): Contract
    """
    The contract as a PDF (base64) — the same document before and after
    signing, with a signature block appended once it has been signed.
    """
    contractPdfBase64(id: ID!): String!
  }

  extend type Mutation {
    createContract(input: CreateContractInput!): Contract!
    updateContract(id: ID!, input: UpdateContractInput!): Contract!
    """
    Sign as the acting user. Locks the contract once nobody is left to sign,
    and moves a DRAFT to ACTIVE — a signed contract is in force.
    """
    signContract(id: ID!, input: SignContractInput!): Contract!
    "Email the signed contract, with the PDF attached."
    shareContract(id: ID!, to: String!, message: String): Boolean!
    """
    Shorthand for setting the status to ARCHIVED.

    Works on a SIGNED contract, unlike updateContract: filing something away is
    not editing what it says.
    """
    archiveContract(id: ID!): Contract!
    deleteContract(id: ID!): Boolean!
    "One-time repair: give an id to any contract that has none."
    backfillContractIds: EntityIdBackfillResult!
  }
`;
