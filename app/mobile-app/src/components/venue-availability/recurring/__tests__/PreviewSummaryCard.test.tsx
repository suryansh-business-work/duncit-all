import { screen } from '@testing-library/react-native';
import { formatMoney } from '@duncit/utils';
import type { PreviewSummary } from '@duncit/slots';

import { renderWithProviders } from '@/utils/test-utils';
import { PreviewSummaryCard } from '../PreviewSummaryCard';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars
      ? `${key}|${Object.entries(options.vars)
          .map(([name, value]) => `${name}=${value}`)
          .join(',')}`
      : key;
  return { useTranslation: () => ({ t }) };
});

const summaryOf = (patch: Partial<PreviewSummary> = {}): PreviewSummary => ({
  total: 0,
  bySpace: {},
  estimatedRevenue: 0,
  skippedWeeklyOff: 0,
  skippedHolidays: 0,
  skippedPast: 0,
  skippedBeyondCap: 0,
  ...patch,
});

const mount = (summary: PreviewSummary, maxAdvanceDays = 30) =>
  renderWithProviders(<PreviewSummaryCard summary={summary} maxAdvanceDays={maxAdvanceDays} />);

describe('PreviewSummaryCard', () => {
  it('shows the total number of slots and the estimated revenue', () => {
    mount(summaryOf({ total: 12, estimatedRevenue: 4800 }));
    expect(screen.getByTestId('recurring-preview-total')).toHaveTextContent(
      'availability.recurring.preview.slotsCount|count=12',
    );
    expect(screen.getByTestId('recurring-preview-revenue')).toHaveTextContent(formatMoney(4800));
  });

  it('lists each space with its slot count, price and capacity, sorted by name', () => {
    mount(
      summaryOf({
        total: 5,
        bySpace: {
          'Court 2': { count: 3, price: 500, capacity: 8 },
          'Court 1': { count: 2, price: 300, capacity: 4 },
        },
      }),
    );
    const names = screen.getAllByText(/^Court/).map((node) => node.props.children);
    expect(names).toEqual(['Court 1', 'Court 2']);
    expect(
      screen.getByText(
        `availability.recurring.preview.slotsCount|count=2 · availability.recurring.preview.priceCap|price=${formatMoney(300)},capacity=4`,
      ),
    ).toBeOnTheScreen();
  });

  it('calls the unnamed space the whole venue', () => {
    mount(summaryOf({ total: 1, bySpace: { '': { count: 1, price: 399, capacity: 10 } } }));
    expect(screen.getByText('availability.wholeVenue')).toBeOnTheScreen();
  });

  it('shows no per-space rows for an empty preview', () => {
    mount(summaryOf());
    expect(screen.queryByText('availability.wholeVenue')).toBeNull();
  });

  it('shows no auto-skipped line when nothing was skipped', () => {
    mount(summaryOf({ total: 1 }));
    expect(screen.queryByText(/autoSkipped/)).toBeNull();
  });

  it('lists every reason that skipped something, joined in order', () => {
    mount(
      summaryOf({
        total: 1,
        skippedWeeklyOff: 4,
        skippedHolidays: 2,
        skippedPast: 1,
        skippedBeyondCap: 6,
      }),
      45,
    );
    expect(
      screen.getByText(
        'availability.recurring.preview.autoSkipped|list=' +
          'availability.recurring.preview.skipWeeklyOff|count=4 · ' +
          'availability.recurring.preview.skipHoliday|count=2 · ' +
          'availability.recurring.preview.skipPast|count=1 · ' +
          'availability.recurring.preview.skipBeyondCap|count=6,days=45',
      ),
    ).toBeOnTheScreen();
  });

  it.each([
    ['skippedWeeklyOff', 'skipWeeklyOff'],
    ['skippedHolidays', 'skipHoliday'],
    ['skippedPast', 'skipPast'],
    ['skippedBeyondCap', 'skipBeyondCap'],
  ] as const)('mentions only %s when it is the only reason', (field, key) => {
    mount(summaryOf({ total: 1, [field]: 3 }));
    const line = screen.getByText(/autoSkipped/).props.children as string;
    expect(line).toContain(`availability.recurring.preview.${key}`);
    expect(line).not.toContain(' · ');
  });
});
