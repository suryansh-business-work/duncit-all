import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import {
  mailPreferenceAnalyticsMock,
  makeMailPreferenceAnalytics,
  makeMailPreferenceLogRow,
} from '../mocks';
import { DuncitTable, fetchRowsFrom } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));

import MailPreferenceAnalyticsPage, {
  getMailPreferenceLogColumns,
  type MailPreferenceLogRow,
} from '../../src/pages/mail-preference-analytics-page';
import CategoryBreakdown from '../../src/pages/mail-preference-analytics-page/CategoryBreakdown';

/** The provider-free translator the page's hook falls back to, so the copy
 * asserted here is the copy that ships. */
const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

// ===========================================================================
describe('mail preference change-log columns', () => {
  const value = (field: string, row: MailPreferenceLogRow) =>
    getMailPreferenceLogColumns(t, ['marketing'])
      .find((column) => column.field === field)
      ?.valueGetter?.(row);

  it('reads who, what and where off a change', () => {
    const row = makeMailPreferenceLogRow();
    expect(value('email', row)).toBe('Asha Rao');
    expect(value('category', row)).toBe('Marketing');
    expect(value('enabled', row)).toBe('Opted out');
    expect(value('source', row)).toBe('Mail Preference page');
  });

  // A newsletter contact has no account, so the address is all there is.
  it('falls back to the address, reads a comeback, and names a bare surface', () => {
    const row = makeMailPreferenceLogRow({ user_id: null, user_name: '', enabled: true, source_detail: '' });
    expect(value('email', row)).toBe('asha@example.com');
    expect(value('enabled', row)).toBe('Opted back in');
    expect(value('source', row)).toBe('MWEB');
  });

  it('renders the person and the action chip for either direction', async () => {
    renderWithProviders(
      <DuncitTable
        columns={getMailPreferenceLogColumns(t, ['marketing'])}
        fetchRows={fetchRowsFrom([
          makeMailPreferenceLogRow(),
          makeMailPreferenceLogRow({ id: 'mpl2', user_name: '', enabled: true }),
        ])}
        getRowId={(row: MailPreferenceLogRow) => row.id}
      />,
    );
    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByTestId('cell-email')).toHaveTextContent('Asha Rao');
    expect(within(rows[0]).getByTestId('cell-enabled')).toHaveTextContent('Opted outOpted out');
    expect(within(rows[1]).getByTestId('cell-enabled')).toHaveTextContent('Opted back inOpted back in');
  });
});

// ===========================================================================
describe('CategoryBreakdown', () => {
  // Everybody who opted out came back: no bar has anything to be a share of.
  it('draws empty bars when no category is refused by anyone right now', () => {
    renderWithProviders(
      <CategoryBreakdown rows={[{ category: 'marketing', opted_out_now: 0, opt_outs: 2, opt_ins: 2 }]} />,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('−2 · +2')).toBeInTheDocument();
  });

  it('scales each bar against the worst category', () => {
    renderWithProviders(
      <CategoryBreakdown
        rows={[
          { category: 'marketing', opted_out_now: 10, opt_outs: 12, opt_ins: 2 },
          { category: 'notification', opted_out_now: 5, opt_outs: 5, opt_ins: 0 },
        ]}
      />,
    );
    const bars = screen.getAllByRole('progressbar');
    expect(bars[0]).toHaveAttribute('aria-valuenow', '100');
    expect(bars[1]).toHaveAttribute('aria-valuenow', '50');
  });
});

// ===========================================================================
describe('MailPreferenceAnalyticsPage', () => {
  it('re-reads the report for the range that is picked', async () => {
    renderWithProviders(<MailPreferenceAnalyticsPage />, {
      mocks: [
        mailPreferenceAnalyticsMock(),
        mailPreferenceAnalyticsMock(
          makeMailPreferenceAnalytics({
            range_days: 90,
            people_opted_out: 41,
            people_opted_out_all: 7,
            opt_outs: 63,
            opt_ins: 9,
            by_category: [{ category: 'marketing', opted_out_now: 40, opt_outs: 63, opt_ins: 9 }],
            by_source: [{ key: 'MWEB', count: 58 }],
          }),
        ),
      ],
    });
    expect(await screen.findByText('18')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Range/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Last 90 days'));

    expect(await screen.findByText('63')).toBeInTheDocument();
  });
});
