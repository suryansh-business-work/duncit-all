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

/** Case-insensitive regex with the user input escaped (no ReDoS / injection). */
export function supportSearchRegex(search: string): RegExp {
  return new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
}

interface PaginableModel {
  find: (filter: Record<string, unknown>) => any;
  countDocuments: (filter: Record<string, unknown>) => Promise<number>;
}

export async function paginateDocs<T>(
  Model: PaginableModel,
  filter: Record<string, unknown>,
  opts: SupportPageOpts | undefined,
  sortable: Set<string>,
  defaultSort: Record<string, 1 | -1>
): Promise<{ docs: T[]; total: number; page: number; page_size: number }> {
  const o = opts ?? {};
  const page = Math.max(1, Math.trunc(o.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(o.page_size ?? 25)));
  const chosen: Record<string, 1 | -1> =
    o.sort_by && sortable.has(o.sort_by)
      ? { [o.sort_by]: o.sort_dir === 'asc' ? 1 : -1 }
      : defaultSort;
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
