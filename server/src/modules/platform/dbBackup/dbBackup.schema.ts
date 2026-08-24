import gql from 'graphql-tag';

// Archive sizes pass GraphQL Int's 2^31 ceiling on any real database, so every
// byte field is a Float.
export const dbBackupTypeDefs = gql`
  "What one collection contributed to an archive."
  type DbBackupCollection {
    name: String!
    documents: Int!
    "Uncompressed BSON size of that collection's documents."
    bytes: Float!
  }

  """
  One backup run. The archive itself never appears here — it is downloaded
  through a short-lived signed link, never named by a URL this returns.
  """
  type DbBackup {
    id: ID!
    "RUNNING | SUCCEEDED | FAILED"
    status: String!
    """
    SCHEDULED | MANUAL | UPLOADED. Only SCHEDULED archives are pruned by
    retention. UPLOADED is an archive this server did not take — it was sent in
    from an operator's machine and read end to end before it was allowed to
    count as one.
    """
    trigger: String!
    database: String!
    fileName: String
    "False once the archive is gone: pruned, deleted, or never written."
    hasFile: Boolean!
    "Compressed size on disk."
    sizeBytes: Float!
    "Uncompressed size, so the compression ratio is readable."
    rawBytes: Float!
    documentsTotal: Int!
    collectionsTotal: Int!
    collections: [DbBackupCollection!]!
    currentCollection: String
    error: String
    "Email of the operator who ran it; null for a scheduled run."
    startedBy: String
    startedAt: String
    """
    When the archive was TAKEN, read from its own header. Only an uploaded
    archive carries one, and for those it is not startedAt — that is the day it
    was sent here, this is the day the data is from.
    """
    archiveTakenAt: String
    finishedAt: String
  }

  type DbBackupTablePage {
    rows: [DbBackup!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  """
  The automatic backup schedule.

  timeOfDay is wall-clock time in the platform's configured timezone (Admin >
  Settings), not the server's UTC — an operator picking 03:00 means their own
  quiet hour.
  """
  type DbBackupSettings {
    """
    The database a restore would REPLACE. Not part of the schedule: the page
    needs it and this is the query it already makes. It is not the same as a
    row's own database once an archive from somewhere else has been uploaded,
    and the restore warning has to name the one being destroyed.
    """
    liveDatabase: String!
    """
    The largest archive this server accepts in one upload, in bytes. The same
    number nginx enforces, so the picker can refuse a file before spending
    minutes sending it.
    """
    uploadMaxBytes: Float!
    enabled: Boolean!
    "DAILY | WEEKLY"
    frequency: String!
    "24-hour HH:mm."
    timeOfDay: String!
    "0 = Sunday. Only meaningful when frequency is WEEKLY."
    weekday: Int!
    "How many SCHEDULED archives to keep. Manual backups are never pruned."
    keepLast: Int!
    lastRunAt: String
    "When the schedule next fires, or null when it is off."
    nextRunAt: String
  }

  input DbBackupSettingsInput {
    enabled: Boolean!
    frequency: String!
    timeOfDay: String!
    weekday: Int!
    keepLast: Int!
  }

  "What one collection got back during a restore."
  type DbRestoreCollection {
    name: String!
    documents: Int!
    error: String
  }

  """
  One restore run — the destructive direction. Every collection the archive
  carries is dropped and rewritten, so anything written since it was taken is
  gone.
  """
  type DbRestore {
    id: ID!
    "RUNNING | SUCCEEDED | FAILED"
    status: String!
    backupId: ID!
    backupFile: String!
    "When the archive being restored was taken."
    backupTakenAt: String
    collections: [DbRestoreCollection!]!
    collectionsTotal: Int!
    currentCollection: String
    documentsRestored: Int!
    """
    Collections a restore deliberately leaves alone: the backup rows, the
    schedule and the restore rows themselves. Restoring those would delete the
    row recording the restore while it is still being written to.
    """
    skipped: [String!]!
    error: String
    startedBy: String
    startedAt: String
    finishedAt: String
  }

  """
  A single-use pass to POST one archive to the server's upload route.

  The browser cannot put its session header on a raw file POST, so the pass is
  what authorises it. The row it belongs to already exists — RUNNING, and
  pointing at the name the bytes must land on.
  """
  type DbBackupUploadPass {
    uploadUrl: String!
    ticket: String!
    backupId: ID!
  }

  "A download good for a few minutes, for exactly one archive."
  type DbBackupDownload {
    url: String!
    fileName: String!
    expiresInSeconds: Int!
  }

  extend type Query {
    "Every backup run, paged for the table."
    dbBackupsTable(query: TableQueryInput): DbBackupTablePage!
    "The automatic backup schedule, created with defaults on first read."
    dbBackupSettings: DbBackupSettings!
    "One restore by id, or the most recent one. Polled for progress."
    dbRestoreJob(id: ID): DbRestore
  }

  extend type Mutation {
    """
    Take a backup now and return the row immediately. The archive is written on
    the server, so closing the browser cannot interrupt it. SUPER_ADMIN only.
    """
    runDbBackup: DbBackup!

    "Save the automatic schedule. SUPER_ADMIN only."
    saveDbBackupSettings(input: DbBackupSettingsInput!): DbBackupSettings!

    """
    Delete one archive from disk. The row survives and loses its download — what
    was backed up and when is history, not a file pointer.
    """
    deleteDbBackup(id: ID!): DbBackup!

    """
    Mint a short-lived signed download link for one archive.

    A backup is the entire database in a file, so it is not served statically
    the way a build artifact is, and a browser download cannot carry the session
    header. The link names one backup and stops working within minutes.
    """
    requestDbBackupDownload(id: ID!): DbBackupDownload!

    """
    Claim a name for an archive being sent in, and hand back a one-shot pass for
    the upload route. Creates the backup row up front so an abandoned upload
    leaves something the stale sweep can clean. SUPER_ADMIN only.
    """
    dbBackupUploadAuth(fileName: String!): DbBackupUploadPass!

    """
    The upload finished: read the archive end to end and, if it is whole, turn
    it into a restorable backup. Returns immediately — the read continues
    server-side and the row stays RUNNING until it is through. An archive that
    cannot be read is failed and deleted rather than left where someone could
    restore from it.
    """
    completeDbBackupUpload(id: ID!): DbBackup!

    """
    Restore the live database from one archive. DESTRUCTIVE: every collection
    the archive carries is dropped and rewritten, and anything written since it
    was taken is lost. Returns immediately; the walk continues server-side.
    SUPER_ADMIN only, and audited.
    """
    restoreDbBackup(id: ID!): DbRestore!
  }
`;
