import { gql } from '@apollo/client';

export const DATABASE_INFO = gql`
  query TechDatabaseInfo {
    techDatabaseInfo {
      connection {
        provider
        maskedUri
        username
        authSource
        hosts
        replicaSet
        tls
        databaseName
        databaseNamePinned
        environment
        secretName
        deployBranch
        secretsUrl
        deployRunsUrl
        state
        minPoolSize
        maxPoolSize
        maxTimeMs
        logsContainer
      }
      server {
        version
        setName
        isWritablePrimary
        members
        primary
        me
        lastWriteAt
        uptimeSeconds
        connectionsCurrent
        connectionsAvailable
        connectionsTotalCreated
        storageEngine
        opInsert
        opQuery
        opUpdate
        opDelete
        opCommand
        memResidentBytes
        networkBytesIn
        networkBytesOut
        networkRequests
        cacheBytes
        cacheMaxBytes
        statusError
      }
      storage {
        collections
        views
        documents
        avgDocumentBytes
        dataBytes
        storageBytes
        indexes
        indexBytes
        totalBytes
        fsUsedBytes
        fsTotalBytes
      }
      pingMs
      statsError
      databases {
        name
        isLive
        sizeOnDisk
        empty
        storage {
          collections
          views
          documents
          avgDocumentBytes
          dataBytes
          storageBytes
          indexes
          indexBytes
          totalBytes
          fsUsedBytes
          fsTotalBytes
        }
        statsError
      }
      databasesError
      replica {
        set
        term
        myState
        primary
        heartbeatIntervalMs
        configVersion
        members {
          name
          stateStr
          healthy
          self
          uptimeSeconds
          optimeAt
          lagSeconds
          lastHeartbeatAt
          pingMs
          syncSourceHost
          priority
          votes
        }
      }
      replicaError
      oplog {
        entries
        dataBytes
        maxBytes
        firstAt
        lastAt
        windowSeconds
      }
      oplogError
      events {
        at
        kind
        message
        attempt
      }
      collectedAt
    }
  }
`;

/** Server-side table page over the live database's collections. */
export const DATABASE_COLLECTIONS_TABLE = gql`
  query TechDatabaseCollectionsTable($query: TableQueryInput) {
    techDatabaseCollectionsTable(query: $query) {
      total
      rows {
        name
        documents
        dataBytes
        storageBytes
        indexBytes
        indexes
        avgDocumentBytes
      }
    }
  }
`;

export type DatabaseProvider = 'ATLAS' | 'SELF_HOSTED';
export type DatabaseEnvironment = 'production' | 'staging' | 'localhost';

export interface DatabaseConnection {
  provider: DatabaseProvider;
  maskedUri: string;
  username: string | null;
  authSource: string | null;
  hosts: string[];
  replicaSet: string | null;
  tls: boolean;
  databaseName: string;
  databaseNamePinned: boolean;
  environment: DatabaseEnvironment;
  secretName: string | null;
  deployBranch: string | null;
  secretsUrl: string | null;
  deployRunsUrl: string | null;
  state: string;
  minPoolSize: number;
  maxPoolSize: number;
  maxTimeMs: number;
  /** The mongod's container on this host, whose stdout is its log; null when it is not one. */
  logsContainer: string | null;
}

export interface DatabaseServer {
  version: string;
  setName: string | null;
  isWritablePrimary: boolean | null;
  members: string[];
  primary: string | null;
  me: string | null;
  lastWriteAt: string | null;
  uptimeSeconds: number | null;
  connectionsCurrent: number | null;
  connectionsAvailable: number | null;
  connectionsTotalCreated: number | null;
  storageEngine: string | null;
  opInsert: number | null;
  opQuery: number | null;
  opUpdate: number | null;
  opDelete: number | null;
  opCommand: number | null;
  memResidentBytes: number | null;
  networkBytesIn: number | null;
  networkBytesOut: number | null;
  networkRequests: number | null;
  cacheBytes: number | null;
  cacheMaxBytes: number | null;
  statusError: string | null;
}

export interface DatabaseStorage {
  collections: number;
  views: number;
  documents: number;
  avgDocumentBytes: number;
  dataBytes: number;
  storageBytes: number;
  indexes: number;
  indexBytes: number;
  totalBytes: number;
  fsUsedBytes: number | null;
  fsTotalBytes: number | null;
}

/** One database on the same mongod — production, staging and Lite share it. */
export interface DatabaseEntry {
  name: string;
  isLive: boolean;
  sizeOnDisk: number;
  empty: boolean;
  storage: DatabaseStorage | null;
  statsError: string | null;
}

export interface ReplicaMember {
  name: string;
  stateStr: string;
  healthy: boolean;
  self: boolean;
  uptimeSeconds: number;
  optimeAt: string | null;
  lagSeconds: number | null;
  lastHeartbeatAt: string | null;
  pingMs: number | null;
  syncSourceHost: string | null;
  priority: number | null;
  votes: number | null;
}

export interface DatabaseReplica {
  set: string;
  term: number | null;
  myState: string | null;
  primary: string | null;
  heartbeatIntervalMs: number | null;
  configVersion: number | null;
  members: ReplicaMember[];
}

export interface DatabaseOplog {
  entries: number;
  dataBytes: number;
  maxBytes: number | null;
  firstAt: string | null;
  lastAt: string | null;
  windowSeconds: number | null;
}

export interface DatabaseEvent {
  at: string;
  kind: string;
  message: string | null;
  attempt: number | null;
}

export interface DatabaseInfo {
  connection: DatabaseConnection;
  server: DatabaseServer | null;
  storage: DatabaseStorage | null;
  pingMs: number | null;
  statsError: string | null;
  databases: DatabaseEntry[];
  databasesError: string | null;
  replica: DatabaseReplica | null;
  replicaError: string | null;
  oplog: DatabaseOplog | null;
  oplogError: string | null;
  events: DatabaseEvent[];
  collectedAt: string;
}

export interface DatabaseCollection {
  name: string;
  documents: number;
  dataBytes: number;
  storageBytes: number;
  indexBytes: number;
  indexes: number;
  avgDocumentBytes: number;
}
