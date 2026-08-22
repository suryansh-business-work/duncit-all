/**
 * The membership comparison table.
 *
 * Its whole job is to be readable at a glance, and the two rules that make it
 * so are both about cells that do not exist:
 *
 *  - a row with no entry for a plan renders as "not included", never as a
 *    blank. A benefit added after a tier — or a tier added after a benefit —
 *    would otherwise leave a hole a reader interprets as "unknown", which is
 *    the one thing a pricing table must never say.
 *  - YES and NO are drawn as ICONS from the app's own set (rule 31), and only
 *    anything else is printed verbatim. A table that printed "Yes" as a glyph
 *    would render a tick on one platform and a box on another.
 *
 * Rows are grouped in the order the API sent them, so Finance controls the
 * reading order of the page rather than this component.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render } from '@testing-library/react';
import {
  groupMembershipBenefits,
  membershipCellKind,
  membershipCellValue,
  type MembershipBenefitRow,
} from '@duncit/utils';
import { describe, expect, it } from 'vitest';

import ComparisonTable from '../ComparisonTable';
import type { MembershipPlanData } from '../queries';

const testTheme = createTheme();

const PLANS: MembershipPlanData[] = [
  {
    id: 'p-1',
    key: 'FREE',
    name: 'Free',
    tagline: 'Get started',
    price_label: '₹0',
    price_note: 'forever',
    badge_label: '',
    accent_color: '#888888',
    cta_label: 'Current plan',
  },
  {
    id: 'p-2',
    key: 'PLUS',
    name: 'Plus',
    tagline: 'For regulars',
    price_label: '₹299',
    price_note: 'a month',
    badge_label: 'Popular',
    accent_color: '#ff4f73',
    cta_label: 'Notify me',
  },
];

const BENEFITS: MembershipBenefitRow[] = [
  {
    id: 'b-1',
    group: 'Pods',
    label: 'Join any pod',
    values: [
      { plan_key: 'FREE', value: 'Yes' },
      { plan_key: 'PLUS', value: 'Yes' },
    ],
  },
  {
    id: 'b-2',
    group: 'Pods',
    label: 'Priority booking',
    values: [
      { plan_key: 'FREE', value: 'No' },
      { plan_key: 'PLUS', value: 'Yes' },
    ],
  },
  {
    id: 'b-3',
    group: 'Coins',
    label: 'Monthly coins',
    values: [
      { plan_key: 'FREE', value: '0' },
      { plan_key: 'PLUS', value: '500' },
    ],
  },
  {
    // Added after PLUS existed: it has no entry for FREE at all.
    id: 'b-4',
    group: 'Coins',
    label: 'Birthday bonus',
    values: [{ plan_key: 'PLUS', value: '250' }],
  },
];

const table = (over: Partial<Parameters<typeof ComparisonTable>[0]> = {}) =>
  render(
    <ThemeProvider theme={testTheme}>
      <ComparisonTable plans={PLANS} benefits={BENEFITS} {...over} />
    </ThemeProvider>
  );

describe('membershipCellKind', () => {
  it('reads every way a yes is written as YES', () => {
    for (const value of ['Yes', 'yes', ' TRUE ', 'true']) {
      expect(membershipCellKind(value)).toBe('YES');
    }
  });

  it('reads every way a no is written as NO', () => {
    for (const value of ['No', 'no', 'FALSE', ' false ']) {
      expect(membershipCellKind(value)).toBe('NO');
    }
  });

  it('reads a missing cell as NO, never as unknown', () => {
    // A pricing table must never leave a hole a reader has to interpret.
    expect(membershipCellKind('')).toBe('NO');
    expect(membershipCellKind(null)).toBe('NO');
    expect(membershipCellKind(undefined)).toBe('NO');
  });

  it('reads anything else as text, to be printed verbatim', () => {
    expect(membershipCellKind('500 coins')).toBe('TEXT');
    expect(membershipCellKind('0')).toBe('TEXT');
  });
});

describe('membershipCellValue', () => {
  it('answers what a row promises one plan', () => {
    expect(membershipCellValue(BENEFITS[2] as MembershipBenefitRow, 'PLUS')).toBe('500');
  });

  it('answers empty for a plan the row never mentioned', () => {
    expect(membershipCellValue(BENEFITS[3] as MembershipBenefitRow, 'FREE')).toBe('');
  });
});

describe('groupMembershipBenefits', () => {
  it('keeps the groups in the order the API sent them', () => {
    const groups = groupMembershipBenefits(BENEFITS);

    // Finance controls the reading order of the page, not this component.
    expect(groups.map((group) => group.group)).toEqual(['Pods', 'Coins']);
  });

  it('keeps the rows inside a group in their own order', () => {
    const [pods] = groupMembershipBenefits(BENEFITS);

    expect(pods?.rows.map((row) => row.label)).toEqual(['Join any pod', 'Priority booking']);
  });

  it('groups nothing when there is nothing to group', () => {
    expect(groupMembershipBenefits([])).toEqual([]);
  });
});

describe('ComparisonTable', () => {
  it('heads a column per plan', () => {
    const { container } = table();

    expect(container.textContent).toContain('Free');
    expect(container.textContent).toContain('Plus');
  });

  it('heads its columns with the plan NAME alone — the price belongs to the cards above', () => {
    const { container } = table();

    // Repeating the price here would be a second place for it to drift from
    // whatever Finance set.
    expect(container.textContent).toContain('Plus');
    expect(container.textContent).not.toContain('₹299');
  });

  it('groups the rows under their headings', () => {
    const { container } = table();

    expect(container.textContent).toContain('Pods');
    expect(container.textContent).toContain('Coins');
  });

  it('names every benefit', () => {
    const { container } = table();

    expect(container.textContent).toContain('Join any pod');
    expect(container.textContent).toContain('Birthday bonus');
  });

  it('prints a text cell verbatim rather than as an icon', () => {
    const { container } = table();

    expect(container.textContent).toContain('500');
  });

  it('draws yes and no as icons, so no glyph renders differently per platform', () => {
    const { container } = table();

    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  it('says the table scrolls sideways, since it cannot fit a phone', () => {
    const { container } = table();

    expect(container.textContent).toContain('Scroll sideways');
  });

  it('renders a table with no plans yet', () => {
    const { container } = table({ plans: [] });

    expect(container).toBeDefined();
  });

  it('renders a table with no benefits yet', () => {
    const { container } = table({ benefits: [] });

    expect(container.textContent).toContain('Free');
  });
});
