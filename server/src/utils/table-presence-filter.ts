import type { TableQueryInput } from './table-query';

/**
 * A yes/no column whose "yes" means "a value was stored" — a Slack message ts,
 * a finished-at stamp — rather than a stored boolean.
 *
 * The table engine answers `is_true` / `is_false` as a literal match against
 * `true` / `false`, which a nullable string never equals. Leave such a field OUT
 * of `filterFields` (so the engine drops it) and AND this into the base filter.
 */
export function presenceFilter(
  input: TableQueryInput | null | undefined,
  field: string,
  path: string = field
): Record<string, unknown> {
  const op = input?.filters?.find((f) => f.field === field)?.op;
  if (op === 'is_true') return { [path]: { $nin: [null, ''] } };
  if (op === 'is_false') return { [path]: { $in: [null, ''] } };
  return {};
}
