import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewListingDialog from '../../src/pages/ecomm/ReviewListingDialog';
import { REVIEW_PRODUCT_LISTING, type ProductListingRow } from '../../src/pages/ecomm/requestsQueries';
import { renderWithProviders } from './testkit';

const row = (over: Partial<ProductListingRow> = {}): ProductListingRow =>
  ({
    id: 'r1',
    product_name: 'Mug',
    inventory_count: 30,
    unit_cost: 200,
    commission_pct: 15,
    delivery_target: 'HOST',
    listing_review_status: 'PENDING',
    listing_review_notes: 'note',
    listing_submitted_by_name: 'Ravi',
    is_duncit_delivery_partner: true,
    size_label: 'L',
    height_cm: 10,
    weight_kg: 1,
    color: 'Blue',
    ...over,
  }) as ProductListingRow;

const reviewMock = (status: string, fail = false): MockedResponse => ({
  request: { query: REVIEW_PRODUCT_LISTING },
  variableMatcher: () => true,
  result: fail
    ? { errors: [{ message: 'cannot review' }] }
    : { data: { reviewProductListing: { id: 'r1', listing_review_status: status } } },
});

describe('ReviewListingDialog', () => {
  it('is closed when there is no row', () => {
    renderWithProviders(<ReviewListingDialog row={null} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('seeds the notes and commission from the row and shows host delivery', () => {
    renderWithProviders(<ReviewListingDialog row={row()} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByDisplayValue('note')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15')).toBeInTheDocument();
    expect(screen.getByText(/Host delivery/)).toBeInTheDocument();
  });

  it('handles a row with no notes or commission and lets fields be edited', () => {
    renderWithProviders(
      <ReviewListingDialog
        row={row({
          listing_review_notes: null,
          commission_pct: null as any,
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
      <ReviewListingDialog row={row({ delivery_target: 'VENUE' })} onClose={vi.fn()} onDone={vi.fn()} />,
    );
    expect(screen.getByText(/Venue delivery/)).toBeInTheDocument();
  });

  it('approves the listing and reports success', async () => {
    const onDone = vi.fn();
    renderWithProviders(
      <ReviewListingDialog row={row()} onClose={vi.fn()} onDone={onDone} />,
      { mocks: [reviewMock('APPROVED')] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Product approved for pod selection.'),
    );
  });

  it('denies the listing', async () => {
    const onDone = vi.fn();
    renderWithProviders(
      <ReviewListingDialog row={row({ commission_pct: null as any })} onClose={vi.fn()} onDone={onDone} />,
      { mocks: [reviewMock('DENIED')] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Product request denied.'));
  });

  it('surfaces a review error', async () => {
    renderWithProviders(
      <ReviewListingDialog row={row()} onClose={vi.fn()} onDone={vi.fn()} />,
      { mocks: [reviewMock('APPROVED', true)] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByText('cannot review')).toBeInTheDocument());
  });

  it('closes on cancel', () => {
    const onClose = vi.fn();
    renderWithProviders(<ReviewListingDialog row={row()} onClose={onClose} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
