import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import PaymentReleasePage from '../../src/pages/finance/PaymentReleasePage';
import ReleaseBreakdownLines from '../../src/pages/finance/payment-release-page/payment-release-review/ReleaseBreakdownLines';
import { ReleaseKindChip } from '../../src/pages/finance/payment-release-page/ReleaseStatusChip';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  makeApprovedReleaseRow,
  makeBreakdownV1,
  makeBreakdownV2,
  makeReleaseRow,
  podCoinTotalsMock,
  publicFinanceSettingsMock,
  publicFinanceSettingsNullMock,
  reviewPaymentReleaseMock,
} from '../mocks/payment-release.mock';

const pending = makeReleaseRow();

beforeEach(() => {
  resetTableControls();
});

describe('ReleaseKindChip', () => {
  it('labels both kinds', () => {
    const { rerender } = renderWithProviders(<ReleaseKindChip kind="VENUE_BILLING" />);
    expect(screen.getByText('Venue Billing')).toBeInTheDocument();
    rerender(<ReleaseKindChip kind="HOST_PAYMENT" />);
    expect(screen.getByText('Host Payment')).toBeInTheDocument();
  });

  it('labels the club-admin cut and an e-commerce brand payout', () => {
    const { rerender } = renderWithProviders(<ReleaseKindChip kind="CLUB_ADMIN" />);
    expect(screen.getByText('Club Admin')).toBeInTheDocument();
    rerender(<ReleaseKindChip kind="ECOMM_PAYMENT" />);
    expect(screen.getByText('E-Commerce Brand')).toBeInTheDocument();
  });
});

describe('ReleaseBreakdownLines', () => {
  it('returns null when there is no breakdown', () => {
    const { container } = renderWithProviders(<ReleaseBreakdownLines request={{ breakdown: null }} />, {
      mocks: [publicFinanceSettingsMock()],
    });
    expect(container.querySelector('[data-testid]')).toBeNull();
  });

  it('renders the v2 host waterfall and the v1 legacy snapshot', () => {
    renderWithProviders(<ReleaseBreakdownLines request={{ kind: 'HOST_PAYMENT', breakdown: makeBreakdownV2() }} />, {
      mocks: [publicFinanceSettingsMock()],
    });
    expect(screen.getByText('Host amount (pool remainder)')).toBeInTheDocument();
    renderWithProviders(<ReleaseBreakdownLines request={{ kind: 'VENUE_BILLING', breakdown: makeBreakdownV1() }} />, {
      mocks: [publicFinanceSettingsMock()],
    });
    expect(screen.getByText('Venue bill')).toBeInTheDocument();
  });

  it('handles zero percentages and a missing currency symbol', () => {
    const zeroV2 = makeBreakdownV2({ gst_pct: 0, gst_amount: 0, platform_fee_pct: 0, platform_fee_amount: 0, pool_amount: 1000, share_amount: 500, commission_pct: 0, commission_amount: 0, payout_amount: 500, duncit_revenue: 0 });
    renderWithProviders(<ReleaseBreakdownLines request={{ kind: 'VENUE_BILLING', breakdown: zeroV2 }} />, {
      mocks: [publicFinanceSettingsNullMock()],
    });
    expect(screen.getByText('Venue amount (booked slot price)')).toBeInTheDocument();
    const zeroV1 = makeBreakdownV1({ gst_pct: 0, gst_amount: 0, duncit_pct: 0, duncit_amount: 0, payout_pct: 0, payout_amount: 500 });
    renderWithProviders(<ReleaseBreakdownLines request={{ kind: 'HOST_PAYMENT', breakdown: zeroV1 }} />, {
      mocks: [publicFinanceSettingsNullMock()],
    });
    expect(screen.getByText('Venue bill')).toBeInTheDocument();
  });

  it('shows the attendance a host payout settled on, and the pod’s coin and tier notes', async () => {
    const breakdown = makeBreakdownV2({ booked_seats: 10, attended_seats: 8, attended_total: 800 });
    renderWithProviders(<ReleaseBreakdownLines request={{ kind: 'HOST_PAYMENT', pod_id: 'pod1', breakdown }} />, {
      mocks: [
        publicFinanceSettingsMock(),
        podCoinTotalsMock({ coins_redeemed_total: 50, coins_earned_total: 12, ticket_discount_total: 120 }),
      ],
    });
    expect(screen.getByText('Attendance at completion')).toBeInTheDocument();
    expect(screen.getByText('8 of 10 seats')).toBeInTheDocument();
    expect(screen.getByText('Settled on (attended seats)')).toBeInTheDocument();
    expect(await screen.findByText(/^Duncit Coins on this pod: 50 spent by buyers .* 12 earned back\.$/)).toBeInTheDocument();
    expect(
      await screen.findByText('₹120.00 in multi-ticket discounts is already off the collected total.'),
    ).toBeInTheDocument();
  });

  it('reads a pod nobody attended as zero of its booked seats', () => {
    const breakdown = makeBreakdownV2({ booked_seats: 4, attended_seats: 0, attended_total: 0 });
    renderWithProviders(<ReleaseBreakdownLines request={{ kind: 'CLUB_ADMIN', breakdown }} />, {
      mocks: [publicFinanceSettingsMock()],
    });
    expect(screen.getByText('0 of 4 seats')).toBeInTheDocument();
    expect(screen.getByText('Club admin cut (off the pool)')).toBeInTheDocument();
  });
});

describe('PaymentReleasePage', () => {
  it('lists rows with all proof/status/action variants and reviews a request', async () => {
    tableControls.rows = [pending, makeApprovedReleaseRow()];
    renderWithProviders(<PaymentReleasePage />, {
      mocks: [publicFinanceSettingsMock(), reviewPaymentReleaseMock()],
    });
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Bill' })).toBeInTheDocument();
    expect(screen.getByText('1 media files')).toBeInTheDocument();

    const reviewButtons = screen.getAllByRole('button', { name: /review/i });
    expect(reviewButtons.some((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(reviewButtons.find((b) => !(b as HTMLButtonElement).disabled)!);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Settlement breakdown')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('validates the reason for a rejection and can cancel', async () => {
    tableControls.rows = [pending];
    renderWithProviders(<PaymentReleasePage />, { mocks: [publicFinanceSettingsMock()] });
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /review/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Decision' }));
    fireEvent.click(screen.getByRole('option', { name: 'Reject' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));
    expect(await within(dialog).findByText('Reason is required')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('toggles the release type to partial and shows a submit error', async () => {
    tableControls.rows = [pending];
    renderWithProviders(<PaymentReleasePage />, {
      mocks: [publicFinanceSettingsMock(), reviewPaymentReleaseMock({ fail: true })],
    });
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /review/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Release type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Partial Release' }));
    const amount = within(dialog).getByLabelText('Approved amount');
    fireEvent.change(amount, { target: { value: '' } });
    fireEvent.change(amount, { target: { value: '250' } });
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'partial payout' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));
    expect(await within(dialog).findByText('review failed')).toBeInTheDocument();
  });

  it('submits successfully even when the table has no refetch handle', async () => {
    tableControls.rows = [pending];
    tableControls.setRefetch = false;
    renderWithProviders(<PaymentReleasePage />, {
      mocks: [publicFinanceSettingsMock(), reviewPaymentReleaseMock()],
    });
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /review/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('resets the amount when switching the release type back to Full', async () => {
    tableControls.rows = [pending];
    renderWithProviders(<PaymentReleasePage />, { mocks: [publicFinanceSettingsMock()] });
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /review/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Release type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Partial Release' }));
    expect(within(dialog).getByLabelText('Approved amount')).not.toBeDisabled();
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Release type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Full Release' }));
    expect(within(dialog).getByLabelText('Approved amount')).toBeDisabled();
  });

  it('reviews a zero-amount request', async () => {
    tableControls.rows = [makeReleaseRow({ id: 'rel0', amount_requested: 0 })];
    renderWithProviders(<PaymentReleasePage />, {
      mocks: [publicFinanceSettingsMock(), reviewPaymentReleaseMock()],
    });
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /review/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the busy state', async () => {
    tableControls.rows = [pending];
    renderWithProviders(<PaymentReleasePage />, {
      mocks: [publicFinanceSettingsMock(), reviewPaymentReleaseMock({ delay: 60_000 })],
    });
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /review/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /saving/i })).toBeDisabled());
  });
});
