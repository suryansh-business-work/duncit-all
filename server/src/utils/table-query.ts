/**
 * Shared server-side table query engine (DUNCIT TABLE CONTRACT v1).
 *
 * Generalizes support.pagination's `paginateDocs`: same page/page_size clamps
 * (page >= 1, page_size 1..100 default 25), allowlisted sort with the `_id`
 * stable-sort tiebreaker, escaped search regex, and a parallel
 * find().sort().skip().limit() + countDocuments().
 *
 * Every field name coming from the client is validated against the per-entity
 * allowlists in `TableEntityConfig`; unknown fields are silently dropped.
 * Values are coerced by declared type (number -> Number, date -> Date) and
 * invalid coercions drop the filter rather than erroring.
 */

export type TableSortDir = 'asc' | 'desc';
export type TableFilterOp =
  | 'eq'
  | 'ne'
  | 'in'
  | 'contains'
  | 'gte'
  | 'lte'
  | 'between'
  | 'is_true'
  | 'is_false';
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
  /** db path when it differs from the API field */
  path?: string;
  type: TableFieldType;
}

export interface TableEntityConfig {
  /** escaped-regex OR across these */
  searchFields: string[];
  /** api field -> db path allowlist */
  sortFields: Record<string, string>;
  /** allowlist; unknown fields silently dropped */
  filterFields: Record<string, TableFieldConfig>;
  defaultSort: Record<string, 1 | -1>;
}

export interface TablePageResult<T> {
  docs: T[];
  total: number;
  page: number;
  page_size: number;
}

/** Case-insensitive regex with the user input escaped (no ReDoS / injection). */
export function escapedSearchRegex(search: string): RegExp {
  return new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
}

type Coerced = string | number | Date;

function coerceOne(raw: string, type: TableFieldType): Coerced | undefined {
  if (type === 'number') {
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  }
  if (type === 'date') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return raw; // string / enum as given
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

/**
 * Builds one mongo condition for a single filter, or `undefined` when the
 * filter is invalid (missing/uncoercible values) and must be dropped.
 */
function filterCondition(f: TableFilterInput, type: TableFieldType): unknown {
  if (f.op === 'is_true') return true;
  if (f.op === 'is_false') return false;
  // boolean fields only support is_true/is_false — anything else is dropped
  if (type === 'boolean') return undefined;
  if (f.op === 'in') {
    const vals = (f.values ?? [])
      .map((v) => coerceOne(v, type))
      .filter((v): v is Coerced => v !== undefined);
    if (vals.length === 0) return undefined;
    return { $in: vals };
  }
  if (f.op === 'between') {
    const [lo, hi] = f.values ?? [];
    if (lo === undefined || hi === undefined) return undefined;
    const min = coerceOne(lo, type);
    const max = coerceOne(hi, type);
    if (min === undefined || max === undefined) return undefined;
    return { $gte: min, $lte: max };
  }
  if (f.op === 'contains') {
    if (f.value == null) return undefined;
    return escapedSearchRegex(f.value);
  }
  return singleValueCondition(f, type);
}

/** `{$gte: x}`-style operator fragment (mergeable with another range op). */
function isOpObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null) return false;
  if (v instanceof RegExp || v instanceof Date || Array.isArray(v)) return false;
  return Object.keys(v).every((k) => k.startsWith('$'));
}

/** AND-merge: two range filters on one field collapse into one {$gte,$lte}. */
function mergeCondition(target: Record<string, unknown>, path: string, cond: unknown): void {
  const existing = target[path];
  if (isOpObject(existing) && isOpObject(cond)) {
    target[path] = { ...existing, ...cond };
  } else {
    target[path] = cond;
  }
}

/** Mongo filter fragment from the client input — allowlisted fields only. */
export function buildTableFilter(
  input: TableQueryInput | null | undefined,
  config: TableEntityConfig
): Record<string, unknown> {
  const q = input ?? {};
  const out: Record<string, unknown> = {};
  for (const f of q.filters ?? []) {
    // Object.hasOwn guards both the allowlist AND prototype-key injection
    // ('__proto__', 'constructor') from client-supplied field names.
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

function clampPage(q: TableQueryInput): { page: number; pageSize: number } {
  const page = Math.max(1, Math.trunc(q.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(q.page_size ?? 25)));
  return { page, pageSize };
}

function resolveSort(q: TableQueryInput, config: TableEntityConfig): Record<string, 1 | -1> {
  let chosen = config.defaultSort;
  if (q.sort_by && Object.hasOwn(config.sortFields, q.sort_by)) {
    const dir: 1 | -1 = q.sort_dir === 'asc' ? 1 : -1;
    chosen = { [config.sortFields[q.sort_by]]: dir };
  }
  // Append _id as a unique tiebreaker so low-cardinality sort fields (status,
  // priority) yield a STABLE total order — without it, rows can shift between
  // pages and get duplicated on one page while dropping off another.
  return { ...chosen, _id: -1 };
}

/** `$and`-combine so client filters can never override guard keys in baseFilter. */
function combineFilters(
  base: Record<string, unknown>,
  built: Record<string, unknown>
): Record<string, unknown> {
  const hasBase = Object.keys(base).length > 0;
  const hasBuilt = Object.keys(built).length > 0;
  if (hasBase && hasBuilt) return { $and: [base, built] };
  if (hasBase) return base;
  return built;
}

interface TableQueryModel {
  find: (filter: Record<string, unknown>) => any;
  countDocuments: (filter: Record<string, unknown>) => Promise<number>;
}

export async function runTableQuery<TDoc>(
  Model: TableQueryModel,
  baseFilter: Record<string, unknown>,
  input: TableQueryInput | null | undefined,
  config: TableEntityConfig
): Promise<TablePageResult<TDoc>> {
  const q = input ?? {};
  const filter = combineFilters(baseFilter, buildTableFilter(q, config));
  const { page, pageSize } = clampPage(q);
  const sort = resolveSort(q, config);
  const [docs, total] = await Promise.all([
    Model.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    Model.countDocuments(filter),
  ]);
  return { docs, total, page, page_size: pageSize };
}

/* ------------------------- in-memory variant ------------------------- */
/* Same semantics over a plain array, for computed/aggregated datasets   */
/* that never touch a Model. JS sort is stable, so it already gives the  */
/* deterministic order the mongo `_id` tiebreaker exists for.            */

/** Coerce a value to a string for comparison/search. Objects serialise via JSON
 * so they never collapse to the ambiguous '[object Object]' (S6551). */
const toText = (value: unknown): string => {
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  const primitive = value as string | number | boolean | null | undefined;
  return String(primitive ?? '');
};

/** number/date-aware ordering; everything else falls back to localeCompare. */
function compareTyped(raw: unknown, target: Coerced, type: TableFieldType): number {
  if (type === 'number') return Number(raw) - (target as number);
  if (type === 'date') {
    return new Date(raw as string | number | Date).getTime() - (target as Date).getTime();
  }
  return toText(raw).localeCompare(target as string);
}

function matchesOps(raw: unknown, ops: Record<string, unknown>, type: TableFieldType): boolean {
  return Object.entries(ops).every(([op, v]) => {
    if (op === '$in') return (v as Coerced[]).some((x) => compareTyped(raw, x, type) === 0);
    if (op === '$ne') return compareTyped(raw, v as Coerced, type) !== 0;
    const cmp = compareTyped(raw, v as Coerced, type);
    if (op === '$gte') return cmp >= 0;
    return cmp <= 0; // $lte
  });
}

/** Evaluates a condition produced by filterCondition() against a row value. */
function matchesCondition(raw: unknown, cond: unknown, type: TableFieldType): boolean {
  if (cond instanceof RegExp) return cond.test(toText(raw));
  if (typeof cond === 'boolean') return raw === cond;
  if (isOpObject(cond)) return matchesOps(raw, cond, type);
  return compareTyped(raw, cond as Coerced, type) === 0; // eq
}

function rowMatchesFilters(
  row: Record<string, unknown>,
  filters: TableFilterInput[],
  config: TableEntityConfig
): boolean {
  return filters.every((f) => {
    if (!Object.hasOwn(config.filterFields, f.field)) return true; // unknown: dropped
    const fc = config.filterFields[f.field];
    const cond = filterCondition(f, fc.type);
    if (cond === undefined) return true; // invalid filter: dropped
    return matchesCondition(row[fc.path ?? f.field], cond, fc.type);
  });
}

/** strings localeCompare, numbers/dates numeric — mirrors mongo sort order. */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return toText(a).localeCompare(toText(b));
}

function compareRows(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  sort: Record<string, 1 | -1>
): number {
  for (const [key, dir] of Object.entries(sort)) {
    const cmp = compareValues(a[key], b[key]);
    if (cmp !== 0) return cmp * dir;
  }
  return 0;
}

export function applyTableQueryInMemory<T extends Record<string, unknown>>(
  rows: readonly T[],
  input: TableQueryInput | null | undefined,
  config: TableEntityConfig
): { rows: T[]; total: number; page: number; page_size: number } {
  const q = input ?? {};
  let filtered = rows.filter((row) => rowMatchesFilters(row, q.filters ?? [], config));
  const search = q.search?.trim();
  if (search && config.searchFields.length > 0) {
    const rx = escapedSearchRegex(search);
    filtered = filtered.filter((row) =>
      config.searchFields.some((field) => rx.test(toText(row[field])))
    );
  }
  const sort = resolveSort(q, config);
  const sorted = [...filtered];
  sorted.sort((a, b) => compareRows(a, b, sort));
  const { page, pageSize } = clampPage(q);
  const start = (page - 1) * pageSize;
  return { rows: sorted.slice(start, start + pageSize), total: sorted.length, page, page_size: pageSize };
}
