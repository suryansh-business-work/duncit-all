import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShortfallFundingForm, { SHORTFALL_NOTE_MAX, SHORTFALL_NOTE_MIN, shortfallFundingSchema } from './index';

const TOO_SHORT = 'Say who funds the shortfall in at least 10 characters.';
const TOO_LONG = 'Keep the funding note to 2000 characters or fewer.';

const messages = (result: ReturnType<ReturnType<typeof shortfallFundingSchema>['safeParse']>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('shortfallFundingSchema', () => {
  it('mirrors the server: at least 10 characters, at most 2000', () => {
    expect(SHORTFALL_NOTE_MIN).toBe(10);
    expect(SHORTFALL_NOTE_MAX).toBe(2000);
  });

  it('refuses an empty note, and a note of only spaces', () => {
    expect(messages(shortfallFundingSchema().safeParse({ note: '' }))).toBe(TOO_SHORT);
    expect(messages(shortfallFundingSchema().safeParse({ note: ' '.repeat(12) }))).toBe(TOO_SHORT);
  });

  it('counts the characters after trimming: nine refused, ten accepted and returned trimmed', () => {
    expect(messages(shortfallFundingSchema().safeParse({ note: '  123456789  ' }))).toBe(TOO_SHORT);
    const parsed = shortfallFundingSchema().safeParse({ note: '  Duncit ops  ' });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ note: 'Duncit ops' });
  });

  it('accepts the longest note a release stores and refuses one character more', () => {
    expect(shortfallFundingSchema().safeParse({ note: 'a'.repeat(SHORTFALL_NOTE_MAX) }).success).toBe(true);
    expect(messages(shortfallFundingSchema().safeParse({ note: 'a'.repeat(SHORTFALL_NOTE_MAX + 1) }))).toBe(TOO_LONG);
  });

  it('words its refusals in the reader’s language', () => {
    const t = (key: string) => `[${key}]`;
    expect(messages(shortfallFundingSchema(t).safeParse({ note: 'short' }))).toBe('[finance.paymentRelease.fundingNoteTooShort]');
  });
});

describe('ShortfallFundingForm', () => {
  const base = { total: 40.87, shortfall: 15.89, symbol: '₹', busy: false };
  const noteField = () => screen.getByRole('textbox', { name: /Funding note/ });
  const approve = () => fireEvent.click(screen.getByRole('button', { name: 'Approve all payouts' }));

  it('states what is being approved, how much the pod does not cover, and what the note must say', () => {
    render(<ShortfallFundingForm {...base} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Who funds the shortfall?' });
    expect(dialog).toHaveTextContent(
      'Approving these payouts (₹40.87 in total) sends out ₹15.89 more than the pod collected. Say who covers that amount — the note is saved on every payout approved.',
    );
    expect(noteField()).toHaveValue('');
    expect(noteField()).toBeRequired();
    expect(noteField()).toHaveAttribute('maxlength', String(SHORTFALL_NOTE_MAX));
    expect(screen.getByText('Who pays the shortfall, in at least 10 characters.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refuses a note that is too short and approves nothing', async () => {
    const onSubmit = vi.fn();
    render(<ShortfallFundingForm {...base} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(noteField(), { target: { value: 'Duncit' } });
    approve();
    expect(await screen.findByText(TOO_SHORT)).toBeInTheDocument();
    expect(noteField()).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends the note trimmed', async () => {
    const onSubmit = vi.fn();
    render(<ShortfallFundingForm {...base} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(noteField(), { target: { value: '  Duncit marketing budget  ' } });
    approve();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ note: 'Duncit marketing budget' }));
    expect(screen.queryByText(TOO_SHORT)).not.toBeInTheDocument();
  });

  it('shows why the server refused the last attempt, and closes on Cancel or Escape', () => {
    const onClose = vi.fn();
    render(
      <ShortfallFundingForm {...base} errorMessage="Could not pay REL-1. Nothing was lost." onClose={onClose} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not pay REL-1. Nothing was lost.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('cannot be cancelled or sent twice while the approval is running', () => {
    const onClose = vi.fn();
    render(<ShortfallFundingForm {...base} busy onClose={onClose} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Approve all payouts/ })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
