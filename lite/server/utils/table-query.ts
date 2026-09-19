/**
 * The server side of DUNCIT TABLE CONTRACT v1, for the Lite console's grids.
 *
 * The same rules the main server applies: page >= 1, page_size 1..100 (25 by
 * default), an allowlisted sort with `_id` as the stable tiebreaker, an escaped
 * search regex, and every client field name checked against the entity's
 * allowlist — unknown fields are dropped, never errored on. Lite keeps its own
 * copy because it is its own deployable with no dependency on the main server.
 */
export type TableFilterOp = 'eq' | 'ne' | 'in' | 'contains' | 'gte' | 'lte' | 'between' | 'is_true' | 'is_false';
export type TableFieldType = 'string' | 'number' | 'date' | 'boolean' | 'enum';

export interface TableFilterInput {
  field: string;
  op: TableFilterOp;
  value?: string | null;
  values?: string[] | null;
}

export interface TableQueryInput {
  search?: string | null;
  page?: number | null;
  page_size?: number | null;
  sort_by?: string | null;
  sort_dir?: string | null;
  filters?: TableFilterInput[] | null;
}

export interface TableFieldConfig {
  path?: string;
  type: TableFieldType;
}

export interface TableEntityConfig {
  searchFields: string[];
  sortFields: Record<string, string>;
  filterFields: Record<string, TableFieldConfig>;
  defaultSort: Record<string, 1 | -1>;
}

export interface TablePageResult<T> {
  docs: T[];
  total: number;
  page: number;
  page_size: number;
}

type Coerced = string | number | Date;

export function escapedSearchRegex(search: string): RegExp {
  return new RegExp(search.trim().replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
}

function coerceOne(raw: string, type: TableFieldType): Coerced | undefined {
  if (type === 'number') {
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  }
  if (type === 'date') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return raw;
}

function singleValueCondition(f: TableFilterInput, type: TableFieldType): unknown {
  if (f.value == null) return undefined;
  const v = coerceOne(f.value, type);
  if (v === undefined) return undefined;
  if (f.op === 'eq') return v;
  if (f.op === 'ne') return { $ne: v };
  if (f.op === 'gte') return { $gte: v };
  return { $lte: v };
}

function filterCondition(f: TableFilterInput, type: TableFieldType): unknown {
  if (f.op === 'is_true') return true;
  if (f.op === 'is_false') return false;
  if (type === 'boolean') return undefined;
  if (f.op === 'in') {
    const vals = (f.values ?? []).map((v) => coerceOne(v, type)).filter((v): v is Coerced => v !== undefined);
    return vals.length === 0 ? undefined : { $in: vals };
  }
  if (f.op === 'between') {
    const [lo, hi] = f.values ?? [];
    if (lo === undefined || hi === undefined) return undefined;
    const min = coerceOne(lo, type);
    const max = coerceOne(hi, type);
    if (min === undefined || max === undefined) return undefined;
    return { $gte: min, $lte: max };
  }
  if (f.op === 'contains') return f.value == null ? undefined : escapedSearchRegex(f.value);
  return singleValueCondition(f, type);
}

function isOpObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null) return false;
  if (v instanceof RegExp || v instanceof Date || Array.isArray(v)) return false;
  return Object.keys(v).every((k) => k.startsWith('$'));
}

function mergeCondition(target: Record<string, unknown>, path: string, cond: unknown): void {
  const existing = target[path];
  target[path] = isOpObject(existing) && isOpObject(cond) ? { ...existing, ...cond } : cond;
}

export function buildTableFilter(input: TableQueryInput | null | undefined, config: TableEntityConfig): Record<string, unknown> {
  const q = input ?? {};
  const out: Record<string, unknown> = {};
  for (const f of q.filters ?? []) {
    if (!Object.hasOwn(config.filterFields, f.field)) continue;
    const fc = config.filterFields[f.field];
    const cond = filterCondition(f, fc.type);
    if (cond === undefined) continue;
    mergeCondition(out, fc.path ?? f.field, cond);
  }
  const search = q.search?.trim();
  if (search && config.searchFields.length > 0) {
    const rx = escapedSearchRegex(search);
    out.$or = config.searchFields.map((field) => ({ [field]: rx }));
  }
  return out;
}

export function clampPage(q: TableQueryInput): { page: number; pageSize: number } {
  const page = Math.max(1, Math.trunc(q.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(q.page_size ?? 25)));
  return { page, pageSize };
}

export function resolveSort(q: TableQueryInput, config: TableEntityConfig): Record<string, 1 | -1> {
  let chosen = config.defaultSort;
  if (q.sort_by && Object.hasOwn(config.sortFields, q.sort_by)) {
    const dir: 1 | -1 = q.sort_dir === 'asc' ? 1 : -1;
    chosen = { [config.sortFields[q.sort_by]]: dir };
  }
  return { ...chosen, _id: -1 };
}

export function combineFilters(base: Record<string, unknown>, built: Record<string, unknown>): Record<string, unknown> {
  const hasBase = Object.keys(base).length > 0;
  const hasBuilt = Object.keys(built).length > 0;
  if (hasBase && hasBuilt) return { $and: [base, built] };
  return hasBase ? base : built;
}

export interface TableQueryModel {
  find: (filter: Record<string, unknown>) => any;
  countDocuments: (filter: Record<string, unknown>) => any;
}

export async function runTableQuery<TDoc>(
  Model: TableQueryModel,
  baseFilter: Record<string, unknown>,
  input: TableQueryInput | null | undefined,
  config: TableEntityConfig,
): Promise<TablePageResult<TDoc>> {
  const q = input ?? {};
  const filter = combineFilters(baseFilter, buildTableFilter(q, config));
  const { page, pageSize } = clampPage(q);
  const sort = resolveSort(q, config);
  const [docs, total] = await Promise.all([
    Model.find(filter).sort(sort).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Model.countDocuments(filter),
  ]);
  return { docs, total, page, page_size: pageSize };
}
