import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MATCHED_USER_ENTITIES, buildMatchedUserColumns } from '@/components/lead-table/matchedUserColumns';
import type { CrmLeadRowBase } from '@/components/lead-table/leadColumns';
import type { CrmMatchedUser } from '@/api/crm.types';
import { englishT } from '../helpers/englishT';

type Row = CrmLeadRowBase & { matched_user?: Pick<CrmMatchedUser, 'platforms_used' | 'last_activity_at'> | null };

// What usePlatformText answers, spelled so a test can tell the column used it.
const platformText = {
  options: [
    { value: 'ANDROID' as const, label: 'Android' },
    { value: 'IOS' as const, label: 'iOS' },
    { value: 'WEB' as const, label: 'Web' },
  ],
  valueText: (platforms: readonly string[] | null | undefined) => (platforms ?? []).join(' + '),
};
const formatDateTime = (iso: string) => `AT(${iso})`;

const columns = () => buildMatchedUserColumns<Row>({ platformText, formatDateTime, t: englishT() });
const column = (field: string) => {
  const found = columns().find((c) => c.field === field);
  if (!found) throw new Error(`no ${field} column`);
  return found;
};
const row = (matched_user?: Row['matched_user']): Row => ({ id: 'l-1', lead_status: 'New', priority: 'High', matched_user });

describe('buildMatchedUserColumns', () => {
  it('is offered only on the lead kinds the server matches to accounts', () => {
    expect([...MATCHED_USER_ENTITIES].sort()).toEqual(['ecomm', 'host', 'venue']);
  });

  it('filters Devices on the server by any of the platforms, and never sorts either column', () => {
    expect(column('duncit_platforms')).toMatchObject({
      headerName: 'Devices',
      type: 'enum',
      sortable: false,
      options: platformText.options,
    });
    expect(column('matched_last_activity_at')).toMatchObject({ headerName: 'Last activity', sortable: false, filterable: false });
  });

  it('shows a matched account’s platforms as icons, and "Not on Duncit" for a lead with no account', () => {
    const devices = column('duncit_platforms');
    render(<>{devices.cellRenderer?.(row({ platforms_used: ['ANDROID', 'WEB'], last_activity_at: null })) as ReactNode}</>);
    expect(screen.getAllByRole('img').map((icon) => icon.getAttribute('aria-label'))).toEqual(['Android', 'Web']);
    expect(screen.getByTestId('crm-lead-platforms-l-1')).toBeInTheDocument();

    render(<>{devices.cellRenderer?.(row(null)) as ReactNode}</>);
    expect(screen.getByText('Not on Duncit')).toBeInTheDocument();
  });

  it('exports the platforms as text and says when a lead has no account', () => {
    const devices = column('duncit_platforms');
    expect(devices.valueGetter?.(row({ platforms_used: ['IOS'], last_activity_at: null }))).toBe('IOS');
    expect(devices.valueGetter?.(row(undefined))).toBe('Not on Duncit');
  });

  it('reads Last activity in the admin zone, "Not recorded yet" for an account never seen, a dash with no account', () => {
    const last = column('matched_last_activity_at');
    expect(last.valueGetter?.(row({ platforms_used: [], last_activity_at: '2026-11-23T10:30:00.000Z' }))).toBe(
      'AT(2026-11-23T10:30:00.000Z)',
    );
    expect(last.valueGetter?.(row({ platforms_used: [], last_activity_at: null }))).toBe('Not recorded yet');
    expect(last.valueGetter?.(row(null))).toBe('—');
  });
});
