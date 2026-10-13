import type { AdminCategoryValue } from './types';

/** Super, Category and Sub all chosen — the only row a server accepts. */
export const isCompleteCategory = (
  row?: Pick<AdminCategoryValue, 'super_id' | 'category_id' | 'sub_id'> | null,
): boolean => !!(row?.super_id && row.category_id && row.sub_id);

/**
 * The indexes of the rows whose sub category an EARLIER row already carries.
 * The first row to name a sub category keeps it (it may be the primary); a row
 * with no sub category chosen yet is never a duplicate. Pure, so a Zod schema
 * and the rows field flag exactly the same rows.
 */
export function duplicateCategoryRows(rows: readonly Pick<AdminCategoryValue, 'sub_id'>[]): Set<number> {
  const seen = new Set<string>();
  const duplicates = new Set<number>();
  rows.forEach((row, index) => {
    if (!row.sub_id) return;
    if (seen.has(row.sub_id)) duplicates.add(index);
    seen.add(row.sub_id);
  });
  return duplicates;
}

/**
 * The message a react-hook-form error for the WHOLE list carries. A resolver
 * files a list-level issue ("add at least one", "too many") under `root` for a
 * field array and under `message` otherwise; per-row errors are not this.
 */
export function categoryRowsMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const { root, message } = error as { root?: { message?: unknown }; message?: unknown };
  const text = root?.message ?? message;
  return typeof text === 'string' ? text : '';
}
