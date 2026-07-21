/**
 * Shared server-side pagination for the agent-facing support list queries
 * (tickets, chat sessions, SOS alerts, callbacks). Mirrors the whatsapp
 * `paginate()` pattern: clamped page/page_size (cap 100), whitelisted sort and
 * a parallel find().sort().skip().limit() + countDocuments().
 *
 * The public shape of each row is produced by an async `pub()` mapper, so this
 * helper returns the raw (hydrated) docs plus the page envelope meta; each
 * service maps `docs` through its own mapper before returning.
 */

export interface SupportPageOpts {
  search?: string | null;
  page?: number | null;
  page_size?: number | null;
  sort_by?: string | null;
  sort_dir?: string | null;
}

/** Case-insensitive regex with the user input escaped (no ReDoS / injection).
 * Single implementation lives in the shared table-query engine. */
export { escapedSearchRegex as supportSearchRegex } from '@utils/table-query';

interface PaginableModel {
  find: (filter: Record<string, unknown>) => any;
  countDocuments: (filter: Record<string, unknown>) => Promise<number>;
}

interface AggregatableModel extends PaginableModel {
  aggregate: (pipeline: any[]) => any;
}

/** Clamped page/page_size plus the whitelisted (or default) sort — shared by
 * the plain and ranked pagination paths. */
function resolvePageSort(
  opts: SupportPageOpts | undefined,
  sortable: Set<string>,
  defaultSort: Record<string, 1 | -1>
): { page: number; pageSize: number; chosen: Record<string, 1 | -1> } {
  const o = opts ?? {};
  const page = Math.max(1, Math.trunc(o.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(o.page_size ?? 25)));
  const chosen: Record<string, 1 | -1> =
    o.sort_by && sortable.has(o.sort_by)
      ? { [o.sort_by]: o.sort_dir === 'asc' ? 1 : -1 }
      : defaultSort;
  return { page, pageSize, chosen };
}

export async function paginateDocs<T>(
  Model: PaginableModel,
  filter: Record<string, unknown>,
  opts: SupportPageOpts | undefined,
  sortable: Set<string>,
  defaultSort: Record<string, 1 | -1>
): Promise<{ docs: T[]; total: number; page: number; page_size: number }> {
  const { page, pageSize, chosen } = resolvePageSort(opts, sortable, defaultSort);
  // Append _id as a unique tiebreaker so low-cardinality sort fields (status,
  // priority) yield a STABLE total order — without it, rows can shift between
  // pages and get duplicated on one page while dropping off another.
  const sort: Record<string, 1 | -1> = { ...chosen, _id: -1 };
  const [docs, total] = await Promise.all([
    Model.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    Model.countDocuments(filter),
  ]);
  return { docs, total, page, page_size: pageSize };
}

/** Display-order rank for `paginateDocsRanked`: rows whose `field` value sits
 * earlier in `order` come first; the regular sort applies within each rank. */
export interface RankSpec {
  field: string;
  order: readonly string[];
}

/**
 * Same envelope as `paginateDocs`, but with a computed rank (e.g. "HIGH
 * priority first") as the primary sort key. Values missing from `order` sink
 * to the bottom. Uses an aggregation because a plain `.sort()` cannot express
 * a custom enum order; the returned docs are plain objects, which the `pub()`
 * mappers read field-by-field.
 */
export async function paginateDocsRanked<T>(
  Model: AggregatableModel,
  filter: Record<string, unknown>,
  opts: SupportPageOpts | undefined,
  sortable: Set<string>,
  defaultSort: Record<string, 1 | -1>,
  rank: RankSpec
): Promise<{ docs: T[]; total: number; page: number; page_size: number }> {
  const { page, pageSize, chosen } = resolvePageSort(opts, sortable, defaultSort);
  const sort: Record<string, 1 | -1> = { __rank: 1, ...chosen, _id: -1 };
  const [docs, total] = await Promise.all([
    Model.aggregate([
      { $match: filter },
      {
        $addFields: {
          __rank: {
            $let: {
              vars: { i: { $indexOfArray: [rank.order, `$${rank.field}`] } },
              in: { $cond: [{ $eq: ['$$i', -1] }, rank.order.length, '$$i'] },
            },
          },
        },
      },
      { $sort: sort },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
      { $unset: '__rank' },
    ]),
    Model.countDocuments(filter),
  ]);
  return { docs, total, page, page_size: pageSize };
}
