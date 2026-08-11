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
  What a clone would read and write, resolved from the two saved connections.
  The ready flag is false — with the reason in error — when either end is
  missing or has never been proved, or when the target would resolve to the
  source database.
  """
  type DataCloneTargets {
    sourceDatabase: String!
    targetDatabase: String!
    excluded: [String!]!
    ready: Boolean!
    error: String
  }

  "Which end of a clone a saved connection is. There is exactly one of each."
  enum DataCloneRole {
    PRODUCTION
    STAGING
  }

  """
  One saved database connection.

  The connection string itself is never returned — uriMasked keeps the cluster
  and the user and drops the password, which is enough to recognise which
  account is saved and not enough to use it. connected is only true because the
  server actually reached that database, and collectionCount is what it counted
  there.
  """
  type DataCloneConnection {
    role: DataCloneRole!
    uriMasked: String!
    hasUri: Boolean!
    database: String!
    connected: Boolean!
    collectionCount: Int!
    lastTestedAt: String
    "Why the last connect attempt failed, in the driver's own words."
    lastTestError: String
  }

  "Both ends of a clone. A clone can only start when both are connected."
  type DataCloneSettings {
    production: DataCloneConnection!
    staging: DataCloneConnection!
  }

  """
  A blank uri keeps the stored one, so the database name can be corrected
  without re-pasting credentials that are only ever shown masked.
  """
  input DataCloneConnectionInput {
    uri: String
    database: String!
  }

  extend type Query {
    "Source/target databases and the exclusion list, without starting anything."
    dataCloneTargets: DataCloneTargets!
    "One clone job by id, or the most recent one when id is omitted. Polled for progress."
    dataCloneJob(id: ID): DataCloneJob
    "The saved production + staging connections, seeded from the environment on first read."
    dataCloneSettings: DataCloneSettings!
  }

  extend type Mutation {
    """
    Start a production -> staging clone and return the job immediately. The copy
    itself continues on the server, so closing the browser cannot interrupt it.
    SUPER_ADMIN only, and audited.
    """
    startDataClone: DataCloneJob!

    """
    Save one end and immediately prove it by connecting with exactly what was
    saved. Returns both ends, so the caller never has to merge two shapes.
    """
    saveDataCloneConnection(role: DataCloneRole!, input: DataCloneConnectionInput!): DataCloneSettings!

    "Re-prove an already-saved connection — a rotated password changes the answer."
    testDataCloneConnection(role: DataCloneRole!): DataCloneSettings!
  }
`;
