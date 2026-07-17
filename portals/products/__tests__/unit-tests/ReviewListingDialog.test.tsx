import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewListingDialog from '../../src/pages/ecomm/ReviewListingDialog';
import { renderWithProviders } from '../testkit';
import { makeProductListingRow, reviewProductListingMock } from '../mocks/productListing.mock';

describe('ReviewListingDialog', () => {
  it('is closed when there is no row', () => {
    renderWithProviders(<ReviewListingDialog row={null} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('seeds the notes and commission from the row and shows host delivery', () => {
    renderWithProviders(
      <ReviewListingDialog row={makeProductListingRow()} onClose={vi.fn()} onDone={vi.fn()} />,
    );
    expect(screen.getByDisplayValue('note')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15')).toBeInTheDocument();
    expect(screen.getByText(/Host delivery/)).toBeInTheDocument();
  });

  it('handles a row with no notes or commission and lets fields be edited', () => {
    renderWithProviders(
      <ReviewListingDialog
        row={makeProductListingRow({
          listing_review_notes: null,
          commission_pct: null,
          listing_submitted_by_name: '',
        })}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    const note = screen.getByLabelText('Admin note');
    fireEvent.change(note, { target: { value: 'looks good' } });
    expect(screen.getByDisplayValue('looks good')).toBeInTheDocument();
    const commission = screen.getByLabelText('Commission %');
    fireEvent.change(commission, { target: { value: '20' } });
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
  });

  it('shows venue delivery when the target is VENUE', () => {
    renderWithProviders(
      <ReviewListingDialog
        row={makeProductListingRow({ delivery_target: 'VENUE' })}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByText(/Venue delivery/)).toBeInTheDocument();
  });

  it('approves the listing and reports success', async () => {
    const onDone = vi.fn();
    renderWithProviders(<ReviewListingDialog row={makeProductListingRow()} onClose={vi.fn()} onDone={onDone} />, {
      mocks: [reviewProductListingMock({ status: 'APPROVED' })],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Product approved for pod selection.'),
    );
  });

  it('denies the listing with blank notes and no commission', async () => {
    const onDone = vi.fn();
    renderWithProviders(
      <ReviewListingDialog
        // Blank notes exercise the `notes || ''` submit fallback.
        row={makeProductListingRow({ commission_pct: null, listing_review_notes: null })}
        onClose={vi.fn()}
        onDone={onDone}
      />,
      { mocks: [reviewProductListingMock({ status: 'DENIED' })] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Product request denied.'));
  });

  it('surfaces a review error', async () => {
    renderWithProviders(<ReviewListingDialog row={makeProductListingRow()} onClose={vi.fn()} onDone={vi.fn()} />, {
      mocks: [reviewProductListingMock({ fail: true })],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByText('cannot review')).toBeInTheDocument());
  });

  it('closes on cancel', () => {
    const onClose = vi.fn();
    renderWithProviders(<ReviewListingDialog row={makeProductListingRow()} onClose={onClose} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
