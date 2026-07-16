import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import PaymentReleasePage from '../../src/pages/finance/PaymentReleasePage';
import ReleaseBreakdownLines from '../../src/pages/finance/payment-release-page/payment-release-review/ReleaseBreakdownLines';
import { ReleaseKindChip } from '../../src/pages/finance/payment-release-page/ReleaseStatusChip';
import { resetTableControls, tableControls } from './mocks/table';
import { renderUI } from './testkit';

vi.mock('@apollo/client', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn(), useApolloClient: vi.fn() };
});

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);
const mockedUseApolloClient = vi.mocked(useApolloClient);

const v2 = { version: 2, collected_total: 1000, gst_pct: 18, gst_amount: 150, platform_fee_pct: 5, platform_fee_amount: 40, pool_amount: 810, share_amount: 400, commission_pct: 10, commission_amount: 40, payout_amount: 360, duncit_revenue: 120 };
const v1 = { version: 1, collected_total: 1000, venue_bill: 400, gst_pct: 18, gst_amount: 150, duncit_pct: 10, duncit_amount: 100, payout_pct: 50, payout_amount: 350 };

const pending = {
  id: 'rel1', release_id: 'REL-1', kind: 'VENUE_BILLING', status: 'PENDING', pod_id: 'pod1', pod_title: 'Yoga',
  beneficiary_name: 'Venue Co', beneficiary_email: 'v@x.com', amount_requested: 1000,
  bill_url: 'https://bill', evidence_media: [{ url: 'm', type: 'IMAGE' }], notes: 'note', requested_at: '2024-01-01T00:00:00Z', breakdown: v2,
};
const approved = {
  id: 'rel2', release_id: 'REL-2', kind: 'HOST_PAYMENT', status: 'APPROVED', pod_id: 'pod2', pod_title: 'Chess',
  beneficiary_name: 'Host', beneficiary_email: 'h@x.com', amount_requested: 500,
  bill_url: null, evidence_media: null, notes: null, requested_at: 'bad-date', breakdown: v1,
};

beforeEach(() => {
  mockedUseQuery.mockReset().mockReturnValue({ data: { publicFinanceSettings: { currency_symbol: '₹' } } } as any);
  mockedUseMutation.mockReset().mockReturnValue([vi.fn().mockResolvedValue({}), { loading: false }] as any);
  mockedUseApolloClient.mockReset().mockReturnValue({} as any);
  resetTableControls();
});

describe('ReleaseKindChip', () => {
  it('labels both kinds', () => {
    const { rerender } = renderUI(<ReleaseKindChip kind="VENUE_BILLING" />);
    expect(screen.getByText('Venue Billing')).toBeInTheDocument();
    rerender(<ReleaseKindChip kind="HOST_PAYMENT" />);
    expect(screen.getByText('Host Payment')).toBeInTheDocument();
  });
});

describe('ReleaseBreakdownLines', () => {
  it('returns null when there is no breakdown', () => {
    const { container } = renderUI(<ReleaseBreakdownLines request={{ breakdown: null }} />);
    expect(container.querySelector('[data-testid]')).toBeNull();
  });

  it('renders the v2 host waterfall and the v1 legacy snapshot', () => {
    renderUI(<ReleaseBreakdownLines request={{ kind: 'HOST_PAYMENT', breakdown: v2 }} />);
    expect(screen.getByText('Host amount (pool remainder)')).toBeInTheDocument();
    renderUI(<ReleaseBreakdownLines request={{ kind: 'VENUE_BILLING', breakdown: v1 }} />);
    expect(screen.getByText('Venue bill')).toBeInTheDocument();
  });
});

describe('PaymentReleasePage', () => {
  it('lists rows with all proof/status/action variants and reviews a request', async () => {
    tableControls.rows = [pending, approved];
    renderUI(<PaymentReleasePage />);
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    // Proof cell (bill link + media count + notes) on the pending row
    expect(screen.getByRole('link', { name: 'Bill' })).toBeInTheDocument();
    expect(screen.getByText('1 media files')).toBeInTheDocument();

    // APPROVED row's Review button is disabled; PENDING row's is enabled
    const reviewButtons = screen.getAllByRole('button', { name: /review/i });
    expect(reviewButtons.some((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(reviewButtons.find((b) => !(b as HTMLButtonElement).disabled)!);

    const dialog = await screen.findByRole('dialog');
    // v2 breakdown lines render inside the dialog
    expect(within(dialog).getByText('Settlement breakdown')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('validates the reason for a rejection and can cancel', async () => {
    tableControls.rows = [pending];
    renderUI(<PaymentReleasePage />);
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /review/i }));
    const dialog = await screen.findByRole('dialog');

    // switch decision to Reject → approval_type + amount disabled
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Decision' }));
    fireEvent.click(screen.getByRole('option', { name: 'Reject' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));
    expect(await within(dialog).findByText('Reason is required')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('toggles the release type to partial and shows a submit error', async () => {
    mockedUseMutation.mockReturnValue([vi.fn().mockRejectedValue(new Error('review failed')), { loading: false }] as any);
    tableControls.rows = [pending];
    renderUI(<PaymentReleasePage />);
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /review/i }));
    const dialog = await screen.findByRole('dialog');

    // Partial release enables the amount field and requires a reason
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Release type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Partial Release' }));
    fireEvent.change(within(dialog).getByLabelText('Approved amount'), { target: { value: '250' } });
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'partial payout' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));
    expect(await within(dialog).findByText('review failed')).toBeInTheDocument();
  });

  it('shows the busy state', async () => {
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: true }] as any);
    tableControls.rows = [pending];
    renderUI(<PaymentReleasePage />);
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /review/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
