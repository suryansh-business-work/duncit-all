import type { TableFetch, TableQueryState } from '../types';

/**
 * What a table's "GET API" dialog needs to know about the server query behind
 * its `fetchRows`: the `<name>Table` field and the exact variables the portal
 * sends for a given query state (pinned filters and extra variables included).
 *
 * `fetchRows` is an opaque function, so `makeApolloTableFetch` records this
 * beside the function it returns. A table fed any other way (`clientTableFetch`,
 * a hand-written fetch) has no server table query, and shows no GET API button.
 */
export interface TableApiSource {
  resultKey: string;
  variablesOf: (q: TableQueryState) => Record<string, unknown>;
}

const sources = new WeakMap<object, TableApiSource>();

export function registerTableApiSource<T>(fetch: TableFetch<T>, source: TableApiSource): TableFetch<T> {
  sources.set(fetch, source);
  return fetch;
}

export function tableApiSourceOf<T>(fetch: TableFetch<T>): TableApiSource | undefined {
  return sources.get(fetch);
}
