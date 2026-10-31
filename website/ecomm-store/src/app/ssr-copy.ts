import type { ApolloClient } from '@apollo/client';
import { PUBLIC_TRANSLATIONS } from '@duncit/app-settings';

import { logFailure } from '../lib/log';
import { SSR_FORCE_FETCH_DELAY_MS } from './apolloClient';

/** The catalogue's `ROOT_QUERY` fields, one per locale: `publicTranslations({"locale":"en-us"})`. */
const CATALOGUE_FIELD = 'publicTranslations(';

const rowKey = (row: unknown): string | null =>
  typeof row === 'object' && row !== null && 'key' in row && typeof row.key === 'string' ? row.key : null;

/** A key the page read, or the `.one` / `.other` plural row the translator reads under it. */
function wasRead(key: string, read: ReadonlySet<string>): boolean {
  const dot = key.lastIndexOf('.');
  return read.has(key) || (dot > 0 && read.has(key.slice(0, dot)));
}

/**
 * The server's cache with the catalogue cut down to the rows this page read.
 * The catalogue is every key in the product (about 29,000 rows, 3 MB), and
 * inlined whole it made every page's HTML 3 MB. The hydrating render reads the
 * same keys as the server's, so it draws the same words.
 */
export function withPageCopyOnly(cache: Record<string, unknown>, read: ReadonlySet<string>): Record<string, unknown> {
  const root = cache.ROOT_QUERY;
  if (typeof root !== 'object' || root === null) return cache;
  const fields = Object.entries(root).map(([field, value]) => {
    if (!field.startsWith(CATALOGUE_FIELD) || !Array.isArray(value)) return [field, value];
    return [field, value.filter((row) => {
      const key = rowKey(row);
      return key !== null && wasRead(key, read);
    })];
  });
  return { ...cache, ROOT_QUERY: Object.fromEntries(fields) };
}

/**
 * A server-rendered page arrives with only its own copy. Fetch the whole
 * catalogue for the pages and dialogs still to come, once the handed-over
 * cache window has closed (until then Apollo answers a refetch from the
 * cache). Returns the cancel, for an effect's cleanup.
 */
export function fetchFullCopyAfterHydration(client: ApolloClient): () => void {
  const timer = setTimeout(() => {
    client.refetchQueries({ include: [PUBLIC_TRANSLATIONS] }).catch(logFailure('ssr', 'copy'));
  }, SSR_FORCE_FETCH_DELAY_MS);
  return () => clearTimeout(timer);
}
