import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewBrandDialog from '../../src/pages/ecomm/ReviewBrandDialog';
import { renderWithProviders } from '../testkit';
import {
  approveEcommBrandMock,
  makeEcommBrandRow,
  rejectEcommBrandMock,
} from '../mocks/ecommBrand.mock';

const submitted = (over = {}) =>
  makeEcommBrandRow({ status: 'SUBMITTED', reviewer_notes: '', tags: [], ...over });

describe('ReviewBrandDialog', () => {
  it('is closed when there is no brand', () => {
    renderWithProviders(<ReviewBrandDialog brand={null} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('seeds notes and tags from the brand and shows what was submitted', () => {
    renderWithProviders(
      <ReviewBrandDialog
        brand={makeEcommBrandRow({
          status: 'SUBMITTED',
          reviewer_notes: 'needs a call',
          tags: ['premium', 'apparel'],
        })}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue('needs a call')).toBeInTheDocument();
    expect(screen.getByDisplayValue('premium, apparel')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText(/Asha · sales@acme.com/)).toBeInTheDocument();
    // A SUBMITTED brand is the normal case — no "already decided" warning.
    expect(screen.queryByText(/not awaiting review/i)).not.toBeInTheDocument();
  });

  it('warns when the brand is not awaiting review', () => {
    renderWithProviders(
      <ReviewBrandDialog
        brand={makeEcommBrandRow({ status: 'APPROVED' })}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByText(/This brand is APPROVED, not awaiting review/i)).toBeInTheDocument();
  });

  it('falls back to a generic title and empty notes when the brand carries neither', () => {
    renderWithProviders(
      <ReviewBrandDialog
        brand={makeEcommBrandRow({
          brand_name: '',
          status: 'SUBMITTED',
          reviewer_notes: null,
          tags: null,
        })}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByLabelText('Reviewer notes')).toHaveValue('');
  });

  it('approves with trimmed notes and parsed tags', async () => {
    const onDone = vi.fn();
    renderWithProviders(
      <ReviewBrandDialog brand={submitted()} onClose={vi.fn()} onDone={onDone} />,
      { mocks: [approveEcommBrandMock()] },
    );
    fireEvent.change(screen.getByLabelText('Reviewer notes'), { target: { value: '  ok  ' } });
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: ' premium , , x ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, approve' }));
    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith(
        'Acme approved. The owner now has the E-commerce Manager role.',
      ),
    );
  });

  it('approves with no notes at all', async () => {
    const onDone = vi.fn();
    renderWithProviders(
      <ReviewBrandDialog brand={submitted()} onClose={vi.fn()} onDone={onDone} />,
      { mocks: [approveEcommBrandMock()] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, approve' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('requires notes to reject and then rejects', async () => {
    const onDone = vi.fn();
    renderWithProviders(
      <ReviewBrandDialog brand={submitted()} onClose={vi.fn()} onDone={onDone} />,
      { mocks: [rejectEcommBrandMock()] },
    );
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reviewer notes'), {
      target: { value: 'missing GSTIN' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, reject' }));
    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Acme rejected. The partner can edit and submit it again.'),
    );
  });

  it('backs out of the confirmation without calling the server', async () => {
    const onDone = vi.fn();
    renderWithProviders(<ReviewBrandDialog brand={submitted()} onClose={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Yes, approve' })).not.toBeInTheDocument(),
    );
    expect(onDone).not.toHaveBeenCalled();
  });

  it('surfaces a review error', async () => {
    renderWithProviders(<ReviewBrandDialog brand={submitted()} onClose={vi.fn()} onDone={vi.fn()} />, {
      mocks: [approveEcommBrandMock({ fail: true })],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, approve' }));
    expect(await screen.findByText('cannot approve')).toBeInTheDocument();
  });

  it('closes on cancel', () => {
    const onClose = vi.fn();
    renderWithProviders(<ReviewBrandDialog brand={submitted()} onClose={onClose} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
