/**
 * The GET URL for one table query — the server's `/table-api/<resultKey>`
 * contract (server/src/modules/platform/tableApi/tableApi.request.ts).
 *
 * The shared `query` variable (TableQueryInput) is spread into readable
 * `page` / `page_size` / `search` / `sort_by` / `sort_dir` / `filters` params;
 * any other variable keeps its own name. Empty values are left off.
 */

const TABLE_QUERY_VARIABLE = 'query';

const isEmpty = (value: unknown) => value === null || value === undefined || value === '';

function setParam(url: URL, name: string, value: unknown): void {
  if (isEmpty(value) || (Array.isArray(value) && value.length === 0)) return;
  url.searchParams.set(name, typeof value === 'string' ? value : JSON.stringify(value));
}

export function tableApiUrl(
  baseUrl: string,
  resultKey: string,
  variables: Record<string, unknown>,
  token: string,
): string {
  const url = new URL(`${baseUrl}/${resultKey}`);
  url.searchParams.set('token', token);
  for (const [name, value] of Object.entries(variables)) {
    if (name === TABLE_QUERY_VARIABLE && typeof value === 'object' && value !== null) {
      for (const [field, inner] of Object.entries(value)) setParam(url, field, inner);
    } else {
      setParam(url, name, value);
    }
  }
  return url.toString();
}
