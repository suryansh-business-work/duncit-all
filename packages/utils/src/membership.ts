/**
 * Membership pricing-table logic shared by mWeb and the native app (rule
 * 27/40). Framework-free: the MUI and Tamagui tables stay in their apps and
 * render from this one derivation, so the two surfaces can never disagree
 * about how many rows a section has or which cells read as a tick.
 *
 * Nothing here knows a price or a benefit — the catalogue comes from
 * Admin > Membership. This only decides SHAPE.
 */

/** One plan's cell on a comparison row, as the API returns it. */
export interface MembershipBenefitValue {
  plan_key: string;
  value: string;
}

/** One comparison row, as the API returns it. */
export interface MembershipBenefitRow {
  id: string;
  group: string;
  label: string;
  values: MembershipBenefitValue[];
}

/** Rows that share a section heading, in the order the API sent them. */
export interface MembershipBenefitGroup {
  group: string;
  rows: MembershipBenefitRow[];
}

/**
 * How a cell should be drawn. The apps render YES/NO as an icon from their own
 * icon set — never as the glyph itself (rule 31) — and TEXT verbatim.
 */
export type MembershipCellKind = 'YES' | 'NO' | 'TEXT';

/** Values that mean "included". Admin may type a tick or a word. */
const YES_VALUES = new Set(['✓', 'yes', 'true', 'y']);

/** Values that mean "not included" — including an empty cell, since a row
 * added before a plan existed has no value for that column at all. */
const NO_VALUES = new Set(['—', '-', '–', '', 'no', 'false', 'n']);

export function membershipCellKind(value: string | null | undefined): MembershipCellKind {
  const normalised = String(value ?? '').trim().toLowerCase();
  if (YES_VALUES.has(normalised)) return 'YES';
  if (NO_VALUES.has(normalised)) return 'NO';
  return 'TEXT';
}

/**
 * The cell a row promises a plan.
 *
 * Returns an empty string when the row has no entry for that plan, which
 * `membershipCellKind` reads as NO — a benefit added after a tier, or a tier
 * added after a benefit, renders as "not included" rather than blank.
 */
export function membershipCellValue(row: MembershipBenefitRow, planKey: string): string {
  return row.values.find((v) => v.plan_key === planKey)?.value ?? '';
}

/**
 * Group rows under their section headings, preserving the order the API sent
 * (which is `sort_order`). A Map is what does the preserving: grouping into a
 * plain object would reorder any heading that looks like an integer.
 */
export function groupMembershipBenefits(
  rows: readonly MembershipBenefitRow[]
): MembershipBenefitGroup[] {
  const groups = new Map<string, MembershipBenefitRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.group);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(row.group, [row]);
    }
  }
  return [...groups].map(([group, groupRows]) => ({ group, rows: groupRows }));
}
