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
