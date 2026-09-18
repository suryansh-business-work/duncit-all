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
      }
      server {
        version
        setName
        isWritablePrimary
        members
        uptimeSeconds
        connectionsCurrent
        connectionsAvailable
        connectionsTotalCreated
        storageEngine
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
}

export interface DatabaseServer {
  version: string;
  setName: string | null;
  isWritablePrimary: boolean | null;
  members: string[];
  uptimeSeconds: number | null;
  connectionsCurrent: number | null;
  connectionsAvailable: number | null;
  connectionsTotalCreated: number | null;
  storageEngine: string | null;
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
