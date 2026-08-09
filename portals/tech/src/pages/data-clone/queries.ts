import { gql } from '@apollo/client';

const JOB_FIELDS = gql`
  fragment DataCloneJobFields on DataCloneJob {
    id
    status
    sourceDatabase
    targetDatabase
    currentCollection
    collectionsTotal
    collectionsDone
    documentsCopied
    bytesCopied
    excluded
    error
    startedBy
    startedAt
    finishedAt
    collections {
      name
      status
      sourceCount
      copiedCount
      bytes
      error
    }
  }
`;

/** Source/target databases + the exclusion list, without starting anything. */
export const DATA_CLONE_TARGETS = gql`
  query DataCloneTargets {
    dataCloneTargets {
      sourceDatabase
      targetDatabase
      excluded
      ready
      error
    }
  }
`;

/** The most recent job — polled while it runs. */
export const DATA_CLONE_JOB = gql`
  ${JOB_FIELDS}
  query DataCloneJob {
    dataCloneJob {
      ...DataCloneJobFields
    }
  }
`;

/** Starts the clone and returns immediately; the copy continues server-side. */
export const START_DATA_CLONE = gql`
  ${JOB_FIELDS}
  mutation StartDataClone {
    startDataClone {
      ...DataCloneJobFields
    }
  }
`;

export type CloneCollectionStatus = 'PENDING' | 'COPYING' | 'DONE' | 'FAILED';
export type CloneJobStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export interface CloneCollection {
  name: string;
  status: CloneCollectionStatus;
  sourceCount: number;
  copiedCount: number;
  bytes: number;
  error: string | null;
}

export interface CloneJob {
  id: string;
  status: CloneJobStatus;
  sourceDatabase: string;
  targetDatabase: string;
  currentCollection: string | null;
  collectionsTotal: number;
  collectionsDone: number;
  documentsCopied: number;
  bytesCopied: number;
  excluded: string[];
  error: string | null;
  startedBy: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  collections: CloneCollection[];
}

export interface CloneTargets {
  sourceDatabase: string;
  targetDatabase: string;
  excluded: string[];
  ready: boolean;
  error: string | null;
}
