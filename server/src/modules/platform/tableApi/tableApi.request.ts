import type { Request } from 'express';
import { getNamedType, type GraphQLInputType } from 'graphql';
import { isTextArg, TABLE_QUERY_ARG_TYPE, type TableOperation } from './tableApi.operation';

/**
 * Query string → the table operation's variables.
 *
 *   GET /table-api/podsTable?token=…&page=2&page_size=50&search=yoga
 *       &sort_by=start_at&sort_dir=desc&filters=[{"field":"status","op":"eq","value":"LIVE"}]
 *
 * `page`, `page_size`, `search`, `sort_by`, `sort_dir` and `filters` fill the
 * shared `TableQueryInput`. Any other parameter is passed to the field argument
 * of the same name — text, ids and enums as written, everything else as JSON.
 */

export const TOKEN_PARAM = 'token';
export const TOKEN_HEADER = 'x-table-api-token';
const DEFAULT_PAGE_SIZE = 25;
const TABLE_QUERY_PARAMS = new Set(['page', 'page_size', 'search', 'sort_by', 'sort_dir', 'filters']);

function param(req: Request, name: string): string | undefined {
  const raw = req.query[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function json(name: string, raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`"${name}" must be valid JSON.`);
  }
}

function positiveInt(req: Request, name: string, fallback: number): number {
  const raw = param(req, name);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new Error(`"${name}" must be a whole number of 1 or more.`);
  return n;
}

/** The token, from the header (preferred by scripts) or the query string (what a pasted URL carries). */
export function tokenOf(req: Request): string {
  const header = req.headers[TOKEN_HEADER];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  return (fromHeader ?? param(req, TOKEN_PARAM) ?? '').trim();
}

function tableQueryOf(req: Request) {
  const filters = param(req, 'filters');
  return {
    page: positiveInt(req, 'page', 1),
    page_size: positiveInt(req, 'page_size', DEFAULT_PAGE_SIZE),
    search: param(req, 'search') ?? null,
    sort_by: param(req, 'sort_by') ?? null,
    sort_dir: param(req, 'sort_dir') ?? null,
    filters: filters ? json('filters', filters) : [],
  };
}

const isTableQuery = (type: GraphQLInputType) => getNamedType(type).name === TABLE_QUERY_ARG_TYPE;

/** Throws only for a malformed parameter; its message is safe to hand back as a 400. */
export function variablesOf(req: Request, operation: TableOperation): Record<string, unknown> {
  const variables: Record<string, unknown> = {};
  // A legacy table with its own flat `page`/`search` args takes those names as written.
  const usesTableQuery = operation.field.args.some((arg) => isTableQuery(arg.type));
  for (const arg of operation.field.args) {
    if (isTableQuery(arg.type)) {
      variables[arg.name] = tableQueryOf(req);
      continue;
    }
    const raw = param(req, arg.name);
    if (raw === undefined || (usesTableQuery && TABLE_QUERY_PARAMS.has(arg.name))) continue;
    variables[arg.name] = isTextArg(operation.field, arg.name) ? raw : json(arg.name, raw);
  }
  return variables;
}

/** The same URL with `page` swapped — the response's next/previous links. */
export function pageUrl(serverUrl: string, req: Request, page: number): string {
  const url = new URL(req.originalUrl, serverUrl);
  url.searchParams.set('page', String(page));
  return url.toString();
}
