import gql from 'graphql-tag';

// Copied byte counts can exceed GraphQL Int's 2^31 limit on a large database,
// so every byte field is a Float.
export const dataCloneTypeDefs = gql`
  """
  Progress for one collection inside a clone job. The bytes field is the BSON
  size of the documents actually written, so it grows while the copy runs.
  """
  type DataCloneCollection {
    name: String!
    "PENDING | COPYING | DONE | FAILED"
    status: String!
    sourceCount: Int!
    copiedCount: Int!
    bytes: Float!
    error: String
    startedAt: String
    finishedAt: String
  }

  "A production -> staging clone. Runs server-side; the browser only polls it."
  type DataCloneJob {
    id: ID!
    "RUNNING | SUCCEEDED | FAILED"
    status: String!
    sourceDatabase: String!
    targetDatabase: String!
    currentCollection: String
    collectionsTotal: Int!
    collectionsDone: Int!
    documentsCopied: Int!
    bytesCopied: Float!
    collections: [DataCloneCollection!]!
    "Collections this clone deliberately never copies (credentials, tokens, logs)."
    excluded: [String!]!
    error: String
    startedBy: String
    startedAt: String
    finishedAt: String
  }

  """
  What a clone would read and write, resolved from the server environment.
  The ready flag is false — with the reason in error — when the endpoints are
  not configured, or when the target would resolve to the source database.
  """
  type DataCloneTargets {
    sourceDatabase: String!
    targetDatabase: String!
    excluded: [String!]!
    ready: Boolean!
    error: String
  }

  extend type Query {
    "Source/target databases and the exclusion list, without starting anything."
    dataCloneTargets: DataCloneTargets!
    "One clone job by id, or the most recent one when id is omitted. Polled for progress."
    dataCloneJob(id: ID): DataCloneJob
  }

  extend type Mutation {
    """
    Start a production -> staging clone and return the job immediately. The copy
    itself continues on the server, so closing the browser cannot interrupt it.
    SUPER_ADMIN only, and audited.
    """
    startDataClone: DataCloneJob!
  }
`;
