import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReviewFailedPaymentForm, { REVIEW_NOTE_MAX, reviewFailedPaymentSchema } from './index';

const messages = (result: ReturnType<ReturnType<typeof reviewFailedPaymentSchema>['safeParse']>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('reviewFailedPaymentSchema', () => {
  it('accepts an approval with no note', () => {
    expect(reviewFailedPaymentSchema('REVIEW').safeParse({ decision: 'APPROVED', note: '' }).success).toBe(true);
  });

  it('requires a note to reject, and treats whitespace as no note', () => {
    expect(messages(reviewFailedPaymentSchema('REVIEW').safeParse({ decision: 'REJECTED', note: '   ' }))).toBe('Add a note.');
    expect(reviewFailedPaymentSchema('REVIEW').safeParse({ decision: 'REJECTED', note: 'Wrong merchant' }).success).toBe(true);
  });

  it('requires a note to close as not refundable whatever the decision field says', () => {
    expect(messages(reviewFailedPaymentSchema('NOT_REFUNDABLE').safeParse({ decision: 'APPROVED', note: '' }))).toBe('Add a note.');
  });

  it('accepts a note of exactly the limit and refuses one character more', () => {
    const schema = reviewFailedPaymentSchema('REVIEW');
    expect(schema.safeParse({ decision: 'REJECTED', note: 'a'.repeat(REVIEW_NOTE_MAX) }).success).toBe(true);
    expect(messages(schema.safeParse({ decision: 'REJECTED', note: 'a'.repeat(REVIEW_NOTE_MAX + 1) }))).toBe(
      'Keep the note under 1000 characters.',
    );
  });

  it('refuses an unknown decision', () => {
    expect(reviewFailedPaymentSchema('REVIEW').safeParse({ decision: 'MAYBE', note: 'x' }).success).toBe(false);
  });
});

describe('ReviewFailedPaymentForm', () => {
  const base = { open: true, subject: 'Riya Sharma · ₹499.00', busy: false, onClose: vi.fn() };

  it('submits the trimmed values of an approval', async () => {
    const onSubmit = vi.fn();
    render(<ReviewFailedPaymentForm {...base} mode="REVIEW" onSubmit={onSubmit} />);
    expect(screen.getByText('Riya Sharma · ₹499.00')).toBeInTheDocument();
    expect(screen.getByText('Optional for an approval.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Note' }), { target: { value: '  Statement matches  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save review' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ decision: 'APPROVED', note: 'Statement matches' }));
  });

  it('shows the explainer and the server refusal for a bank-reversal close, and cancels', () => {
    const onClose = vi.fn();
    render(
      <ReviewFailedPaymentForm {...base} onClose={onClose} mode="NOT_REFUNDABLE" errorMessage="Already refunded" onSubmit={vi.fn()} />,
    );
    expect(screen.getByText(/Razorpay never captured this money/)).toBeInTheDocument();
    expect(screen.getByText('Already refunded')).toBeInTheDocument();
    expect(screen.getByText('Required. The buyer sees this when their ticket is resolved.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('locks Cancel while a decision is being saved', () => {
    render(<ReviewFailedPaymentForm {...base} busy mode="REVIEW" onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
