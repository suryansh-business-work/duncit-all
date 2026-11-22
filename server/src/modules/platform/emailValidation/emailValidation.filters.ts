import { LEGACY_PORTAL } from '@modules/crm/emailVerification/emailVerification.model';
import type { TableFilterInput, TableQueryInput } from '@utils/table-query';
import { statusesOf } from './emailValidation.checks';

/**
 * The two log filters the shared table engine cannot express on its own.
 *
 * - `verdict` is not stored: it is read from `status`, so a verdict filter
 *   becomes a filter on the statuses it covers.
 * - `portal` is missing on checks run before any console could run one; those
 *   were all the CRM's, so "CRM" has to match the missing value too.
 *
 * Both are lifted out of the table input into a base Mongo filter; every
 * other filter goes on to the engine untouched.
 */

type Condition = Record<string, unknown>;

/** The values a filter names — `in` lists them, `eq`/`ne` name one. */
const valuesOf = (filter: TableFilterInput): string[] =>
  filter.op === 'in' ? (filter.values ?? []) : [filter.value ?? ''].filter(Boolean);

const SUPPORTED_OPS = new Set(['eq', 'ne', 'in']);

/** A positive filter matches any of the values; `ne` matches none of them. */
function matchOrExclude(path: string, values: unknown[], op: string): Condition | null {
  if (values.length === 0) return null;
  return { [path]: op === 'ne' ? { $nin: values } : { $in: values } };
}

function verdictCondition(filter: TableFilterInput): Condition | null {
  const statuses = valuesOf(filter).flatMap((verdict) => statusesOf(verdict));
  return matchOrExclude('status', [...new Set(statuses)], filter.op);
}

function portalCondition(filter: TableFilterInput): Condition | null {
  const portals: Array<string | null> = valuesOf(filter);
  // `null` also matches a field that is absent — the legacy CRM rows.
  if (portals.includes(LEGACY_PORTAL)) portals.push(null);
  return matchOrExclude('portal', portals, filter.op);
}

const LIFTED: Readonly<Record<string, (filter: TableFilterInput) => Condition | null>> = {
  verdict: verdictCondition,
  portal: portalCondition,
};

export function splitLogFilters(input: TableQueryInput | null | undefined): {
  input: TableQueryInput;
  base: Condition;
} {
  const rest: TableFilterInput[] = [];
  const conditions: Condition[] = [];
  for (const filter of input?.filters ?? []) {
    const lift = Object.hasOwn(LIFTED, filter.field) ? LIFTED[filter.field] : undefined;
    if (!lift) {
      rest.push(filter);
      continue;
    }
    // An operator these fields cannot take (contains, between…) is dropped, as the engine drops one.
    const condition = SUPPORTED_OPS.has(filter.op) ? lift(filter) : null;
    if (condition) conditions.push(condition);
  }
  return {
    input: { ...input, filters: rest },
    base: conditions.length > 0 ? { $and: conditions } : {},
  };
}
