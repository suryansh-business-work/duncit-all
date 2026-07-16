import type { DocumentNode } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';

/**
 * Builds a `MockedResponse` for a server `<name>Table` query driven by
 * `useApolloTableFetch` (a `client.query` with a `TableQueryInput` variable).
 *
 * With `MockedProvider` running its default `addTypename: true`, Apollo injects
 * `__typename` into every object selection and normalises the result — so the
 * page wrapper AND every row must carry `__typename`. Rows already do (the typed
 * entity factories add it); this helper stamps the page-level `__typename` and
 * matches any variables so the table's initial fetch + refetches all resolve.
 */
export const tablePageMock = <Row extends { __typename: string }>(
  query: DocumentNode,
  resultKey: string,
  pageTypename: string,
  rows: Row[],
): MockedResponse => ({
  request: { query },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { [resultKey]: { __typename: pageTypename, total: rows.length, rows } } },
});
