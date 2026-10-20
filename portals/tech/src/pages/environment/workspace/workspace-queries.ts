import { gql, type TypedDocumentNode } from '@apollo/client';
import type { EnvOverview, EnvTestLogEntry, QueryEnvTestHistoryArgs } from '@duncit/gql-types';

/** The mini dashboard and the sidebar's per-category counts. */
export const ENV_OVERVIEW: TypedDocumentNode<{ envOverview: EnvOverview }> = gql`
  query EnvOverview {
    envOverview {
      total active tested passing failing untested services services_ready
      categories { category total active tested passing failing untested }
    }
  }
`;

export const ENV_TEST_HISTORY: TypedDocumentNode<{ envTestHistory: EnvTestLogEntry[] }, QueryEnvTestHistoryArgs> = gql`
  query EnvTestHistory($entryId: ID, $category: EnvCategory, $limit: Int) {
    envTestHistory(entryId: $entryId, category: $category, limit: $limit) {
      id entry_id entry_name category kind ok message tested_by created_at
    }
  }
`;

/** Refetched after anything that changes a count or adds a test line. */
export const ENV_COUNT_QUERIES = ['EnvOverview', 'EnvTestHistory'];
