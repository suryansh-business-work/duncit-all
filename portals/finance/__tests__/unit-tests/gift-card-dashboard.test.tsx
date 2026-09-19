/**
 * Finance > Gift Cards > Dashboard — what was sold, what became coins, what is
 * still owed, and the sales policy the buy page reads.
 *
 * jsdom has no canvas, so the Bar is a probe that shows what the page hands
 * chart.js: the month labels and both series.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { GiftCardDashboardPage } from '../../src/pages/finance/gift-cards';
import GiftCardMonthlyChart from '../../src/pages/finance/gift-cards/GiftCardMonthlyChart';
import GiftCardSettingsCard from '../../src/pages/finance/gift-cards/GiftCardSettingsCard';
import { parseDenominations } from '../../src/pages/finance/gift-cards/gift-card-settings.schema';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { renderWithProviders } from '../testkit';
import { dashboardLayoutMock } from '../mocks/dashboard-layout.mock';
import {
  giftCardSettingsErrorMock,
  giftCardSettingsMock,
  giftCardStatsErrorMock,
  giftCardStatsMock,
  makeGiftCardMonth,
  makeGiftCardStats,
  updateGiftCardSettingsMock,
} from '../mocks/gift-card.mock';

vi.mock('react-chartjs-2', () => ({
  Bar: ({ data }: { data: { labels: string[]; datasets: { label: string; data: number[] }[] } }) => (
    <div data-testid="bar-chart">
      <span data-testid="bar-labels">{data.labels.join(' | ')}</span>
      {data.datasets.map((set) => (
        <span key={set.label} data-testid={`bar-series-${set.label}`}>
          {set.data.join(',')}
        </span>
      ))}
    </div>
  ),
}));

beforeEach(() => {
  notifySuccess.mockClear();
  notifyError.mockClear();
});

const tile = (label: string) =>
  screen.getAllByTestId('stat-card').find((card) => within(card).queryByText(label)) as HTMLElement;

const field = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;

describe('GiftCardDashboardPage', () => {
  it('shows the tiles, the month-by-month chart and the policy for the last 12 months', async () => {
    renderWithProviders(<GiftCardDashboardPage />, {
      mocks: [giftCardStatsMock(12), giftCardSettingsMock(), dashboardLayoutMock('finance.giftcards')],
    });
    expect(await screen.findByRole('heading', { name: 'Gift Cards' })).toBeInTheDocument();
    await waitFor(() => expect(within(tile('Value sold')).getByTestId('stat-value')).toHaveTextContent('₹36,000'));
    expect(within(tile('Cards sold')).getByTestId('stat-value')).toHaveTextContent('24');
    expect(within(tile('Validity')).getByTestId('stat-hint')).toHaveTextContent('12 months from purchase');
    expect(screen.getByTestId('bar-labels')).toHaveTextContent('Jul 26 | Aug 26');
    expect(screen.getByTestId('bar-series-Sold')).toHaveTextContent('8,16');
    expect(screen.getByRole('heading', { name: 'Sales policy' })).toBeInTheDocument();
  });

  it('re-reads the stats for the period picked', async () => {
    renderWithProviders(<GiftCardDashboardPage />, {
      mocks: [
        giftCardStatsMock(12),
        giftCardStatsMock(6, makeGiftCardStats({ sold_count: 5 })),
        giftCardSettingsMock(),
        dashboardLayoutMock('finance.giftcards'),
      ],
    });
    await waitFor(() => expect(within(tile('Cards sold')).getByTestId('stat-value')).toHaveTextContent('24'));

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Period' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '6 months' }));
    await waitFor(() => expect(within(tile('Cards sold')).getByTestId('stat-value')).toHaveTextContent('5'));
  });

  it('shows the error and blank tiles when the stats cannot be read', async () => {
    renderWithProviders(<GiftCardDashboardPage />, {
      mocks: [giftCardStatsErrorMock(), giftCardSettingsMock(), dashboardLayoutMock('finance.giftcards')],
    });
    expect(await screen.findByText('gift card stats unavailable')).toBeInTheDocument();
    expect(within(tile('Cards sold')).getByTestId('stat-value')).toHaveTextContent('—');
    expect(within(tile('Validity')).queryByTestId('stat-hint')).not.toBeInTheDocument();
  });
});

describe('GiftCardMonthlyChart', () => {
  it('spins while the months load', () => {
    renderWithProviders(<GiftCardMonthlyChart buckets={[]} loading />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('reads a period with nothing sold or redeemed as empty', () => {
    renderWithProviders(<GiftCardMonthlyChart buckets={[makeGiftCardMonth('2026-07', 0, 0)]} loading={false} />);
    expect(screen.getByText('No gift card activity yet.')).toBeInTheDocument();
  });

  it('draws a period that only saw redemptions', () => {
    renderWithProviders(
      <GiftCardMonthlyChart
        buckets={[makeGiftCardMonth('2026-06', 0, 0), makeGiftCardMonth('2026-07', 0, 2)]}
        loading={false}
      />,
    );
    expect(screen.getByTestId('bar-series-Redeemed')).toHaveTextContent('0,2');
  });
});

describe('GiftCardSettingsCard', () => {
  it('reads the amount presets back as whole rupees', () => {
    expect(parseDenominations('500, 1000,2000')).toEqual([500, 1000, 2000]);
  });

  it('loads the policy and saves an edit', async () => {
    renderWithProviders(<GiftCardSettingsCard />, {
      mocks: [giftCardSettingsMock(), updateGiftCardSettingsMock()],
    });
    await waitFor(() => expect(field(/^Amount presets/).value).toBe('500, 1000, 2000'));
    expect(field(/^Minimum amount/).value).toBe('250');
    expect(field(/^Maximum amount/).value).toBe('10000');
    expect(field(/^Validity \(months\)/).value).toBe('12');
    expect(screen.getByRole('button', { name: 'Save policy' })).toBeDisabled();

    fireEvent.change(field(/^Amount presets/), { target: { value: '500, 1500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Gift card policy saved'));
  });

  it('flags a malformed preset list and an empty bound instead of saving', async () => {
    renderWithProviders(<GiftCardSettingsCard />, {
      mocks: [giftCardSettingsMock(), updateGiftCardSettingsMock()],
    });
    await waitFor(() => expect(field(/^Amount presets/).value).toBe('500, 1000, 2000'));

    fireEvent.change(field(/^Amount presets/), { target: { value: '500,,abc' } });
    fireEvent.change(field(/^Minimum amount/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));

    await waitFor(() => expect(field(/^Amount presets/)).toHaveAttribute('aria-invalid', 'true'));
    expect(field(/^Minimum amount/)).toHaveAttribute('aria-invalid', 'true');
    expect(field(/^Maximum amount/)).toHaveAttribute('aria-invalid', 'false');
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('says the policy could not be saved when the server refuses it', async () => {
    renderWithProviders(<GiftCardSettingsCard />, {
      mocks: [giftCardSettingsMock(), updateGiftCardSettingsMock(true)],
    });
    await waitFor(() => expect(field(/^Maximum amount/).value).toBe('10000'));
    fireEvent.change(field(/^Maximum amount/), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith('The policy could not be saved. Please try again.'),
    );
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('shows why the policy could not be read', async () => {
    renderWithProviders(<GiftCardSettingsCard />, { mocks: [giftCardSettingsErrorMock()] });
    expect(await screen.findByRole('alert')).toHaveTextContent('policy unavailable');
  });
});
