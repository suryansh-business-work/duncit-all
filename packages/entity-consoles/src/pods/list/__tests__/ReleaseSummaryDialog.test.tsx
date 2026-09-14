import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ReleaseSummaryDialog, { type ReleaseSummary } from '../ReleaseSummaryDialog';

const summary: ReleaseSummary = {
  currency_symbol: '₹',
  releases: [
    { id: 'r1', release_id: 'DUN-REL-1001', kind: 'HOST_PAYMENT', status: 'APPROVED', amount_requested: 454.58 },
    { id: 'r2', release_id: 'DUN-REL-1002', kind: 'VENUE_BILLING', status: 'APPROVED', amount_requested: 270 },
    { id: 'r3', release_id: 'DUN-REL-1003', kind: 'CLUB_ADMIN', status: 'PENDING', amount_requested: 40.5 },
    { id: 'r4', release_id: 'DUN-REL-1004', kind: 'ECOMM_PAYMENT', status: 'APPROVED', amount_requested: 1200 },
  ],
};

describe('ReleaseSummaryDialog', () => {
  it('stays closed while there is no summary to show', () => {
    render(<ReleaseSummaryDialog summary={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists every payout release with its label, amount, status and id', () => {
    render(<ReleaseSummaryDialog summary={summary} onClose={vi.fn()} />);

    expect(screen.getByText('Pod completed — payouts released')).toBeInTheDocument();
    expect(screen.getByText('Host payout ₹454.58 (APPROVED)')).toBeInTheDocument();
    expect(screen.getByText('Venue payout ₹270.00 (APPROVED)')).toBeInTheDocument();
    expect(screen.getByText('Club admin payout ₹40.50 (PENDING)')).toBeInTheDocument();
    expect(screen.getByText('Product sales payout ₹1200.00 (APPROVED)')).toBeInTheDocument();
    expect(screen.getByText('DUN-REL-1003')).toBeInTheDocument();
  });

  it('names a release kind it has no label for by its raw kind', () => {
    const unknownKind = {
      currency_symbol: '₹',
      releases: [{ id: 'r9', release_id: 'DUN-REL-1009', kind: 'HOST', status: 'APPROVED', amount_requested: 100 }],
    } as unknown as ReleaseSummary;
    render(<ReleaseSummaryDialog summary={unknownKind} onClose={vi.fn()} />);
    expect(screen.getByText('HOST ₹100.00 (APPROVED)')).toBeInTheDocument();
  });

  it('closes from Done', () => {
    const onClose = vi.fn();
    render(<ReleaseSummaryDialog summary={summary} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
