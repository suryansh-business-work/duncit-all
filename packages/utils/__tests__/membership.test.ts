import { describe, expect, it } from 'vitest';
import {
  groupMembershipBenefits,
  membershipCellKind,
  membershipCellValue,
  type MembershipBenefitRow,
} from '../src/membership';

/** A comparison row, with only the fields under test set deliberately. */
const row = (over: Partial<MembershipBenefitRow> = {}): MembershipBenefitRow => ({
  id: 'r1',
  group: 'Pods',
  label: 'Priority booking',
  values: [
    { plan_key: 'free', value: '—' },
    { plan_key: 'plus', value: '✓' },
  ],
  ...over,
});

describe('membershipCellKind', () => {
  // Admin may type the tick glyph or a word; the apps swap either for an icon.
  it('reads a tick or an affirmative word as YES', () => {
    expect(membershipCellKind('✓')).toBe('YES');
    expect(membershipCellKind('yes')).toBe('YES');
    expect(membershipCellKind('true')).toBe('YES');
    expect(membershipCellKind('y')).toBe('YES');
  });

  it('reads a dash or a negative word as NO', () => {
    expect(membershipCellKind('—')).toBe('NO');
    expect(membershipCellKind('-')).toBe('NO');
    expect(membershipCellKind('–')).toBe('NO');
    expect(membershipCellKind('no')).toBe('NO');
    expect(membershipCellKind('false')).toBe('NO');
    expect(membershipCellKind('n')).toBe('NO');
  });

  // A row added before a plan existed has no entry for that column; it must
  // render "not included", never a blank cell.
  it('treats an empty or missing cell as NO', () => {
    expect(membershipCellKind('')).toBe('NO');
    expect(membershipCellKind('   ')).toBe('NO');
    expect(membershipCellKind(null)).toBe('NO');
    expect(membershipCellKind(undefined)).toBe('NO');
  });

  it('ignores case and surrounding whitespace when matching a keyword', () => {
    expect(membershipCellKind('  YES ')).toBe('YES');
    expect(membershipCellKind('True')).toBe('YES');
    expect(membershipCellKind(' No ')).toBe('NO');
    expect(membershipCellKind('FALSE')).toBe('NO');
  });

  it('renders anything else verbatim as TEXT', () => {
    expect(membershipCellKind('2 per month')).toBe('TEXT');
    expect(membershipCellKind('Unlimited')).toBe('TEXT');
    expect(membershipCellKind('0')).toBe('TEXT');
  });

  // "yes please" is not a tick: only the whole cell is matched, so a phrase
  // that merely starts with a keyword stays readable text.
  it('does not match a keyword buried inside a longer phrase', () => {
    expect(membershipCellKind('yes, up to 3')).toBe('TEXT');
    expect(membershipCellKind('not included')).toBe('TEXT');
  });
});

describe('membershipCellValue', () => {
  it('returns the value the row promises that plan', () => {
    expect(membershipCellValue(row(), 'plus')).toBe('✓');
    expect(membershipCellValue(row(), 'free')).toBe('—');
  });

  // Plan keys are identifiers, not labels: the same row answers 'plus' with its
  // tick and 'Plus' / 'plu' with nothing, so a near-miss key can never borrow
  // another plan's promise.
  it('matches the plan key exactly, not by prefix or case', () => {
    const r = row();
    expect(membershipCellValue(r, 'plus')).toBe('✓');
    expect(membershipCellValue(r, 'Plus')).toBe('');
    expect(membershipCellValue(r, 'plu')).toBe('');
  });

  // A tier added after a benefit (or a benefit added after a tier) has no
  // entry — whether the row lists other plans or none at all — and the empty
  // string is what membershipCellKind reads as NO. The sibling plan on the same
  // row still gets its tick, so "missing" is per plan, not per row.
  it('returns an empty string, which reads as NO, for a plan the row has no entry for', () => {
    const r = row();
    const missing = membershipCellValue(r, 'founder');
    expect(missing).toBe('');
    expect(membershipCellKind(missing)).toBe('NO');
    expect(membershipCellValue(r, 'plus')).toBe('✓');

    expect(membershipCellValue(row({ values: [] }), 'plus')).toBe('');
  });

  it('takes the first entry when a plan key is repeated', () => {
    const dup = row({
      values: [
        { plan_key: 'plus', value: 'first' },
        { plan_key: 'plus', value: 'second' },
      ],
    });
    expect(membershipCellValue(dup, 'plus')).toBe('first');
  });
});

describe('groupMembershipBenefits', () => {
  it('collects consecutive rows under one section heading', () => {
    const a = row({ id: 'a', group: 'Pods' });
    const b = row({ id: 'b', group: 'Pods' });
    const c = row({ id: 'c', group: 'Shop' });
    expect(groupMembershipBenefits([a, b, c])).toEqual([
      { group: 'Pods', rows: [a, b] },
      { group: 'Shop', rows: [c] },
    ]);
  });

  // Sections are keyed by heading, not by adjacency: a heading that reappears
  // later in sort_order folds back into its first section.
  it('folds a heading that reappears later back into its existing section', () => {
    const a = row({ id: 'a', group: 'Pods' });
    const b = row({ id: 'b', group: 'Shop' });
    const c = row({ id: 'c', group: 'Pods' });
    const grouped = groupMembershipBenefits([a, b, c]);
    expect(grouped.map((g) => g.group)).toEqual(['Pods', 'Shop']);
    expect(grouped[0].rows.map((r) => r.id)).toEqual(['a', 'c']);
    expect(grouped[1].rows.map((r) => r.id)).toEqual(['b']);
  });

  it('keeps sections in the order the API sent them, which is sort_order', () => {
    const rows = ['Zeta', 'Alpha', 'Mid'].map((group) => row({ id: group, group }));
    expect(groupMembershipBenefits(rows).map((g) => g.group)).toEqual(['Zeta', 'Alpha', 'Mid']);
  });

  // The reason this is a Map: grouping into a plain object would hoist
  // integer-looking keys to the front in ascending numeric order, so a
  // section titled "10" would jump above "Pods" and below "2".
  it('does not reorder headings that look like integers', () => {
    const rows = ['10', 'Pods', '2'].map((group) => row({ id: group, group }));
    expect(groupMembershipBenefits(rows).map((g) => g.group)).toEqual(['10', 'Pods', '2']);
  });

  it('keeps the incoming row order within a section', () => {
    const rows = ['x', 'y', 'z'].map((id) => row({ id, group: 'Pods' }));
    expect(groupMembershipBenefits(rows)[0].rows.map((r) => r.id)).toEqual(['x', 'y', 'z']);
  });

  it('returns no sections for an empty catalogue', () => {
    expect(groupMembershipBenefits([])).toEqual([]);
  });

  it('does not mutate the rows it is given', () => {
    const rows = [row({ id: 'a' }), row({ id: 'b' })];
    const copy = rows.map((r) => ({ ...r, values: [...r.values] }));
    groupMembershipBenefits(rows);
    expect(rows).toEqual(copy);
  });
});
