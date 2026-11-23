import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PaymentTraceSearchForm, { TRACE_REF_MAX, paymentTraceSearchSchema } from './index';

const messages = (result: ReturnType<ReturnType<typeof paymentTraceSearchSchema>['safeParse']>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('paymentTraceSearchSchema', () => {
  it('accepts every id shape a payment goes by, trimmed', () => {
    for (const ref of ['DPAY-MWRKSGXI1EE90B59', 'pay_U39IlCSe3KJuyJ', 'order_U39IVJblWttbgN', 'rfnd_Q1', 'DUN/2026/0001']) {
      const result = paymentTraceSearchSchema().safeParse({ ref: `  ${ref}  ` });
      expect(result.success && result.data.ref).toBe(ref);
    }
  });

  it('refuses an empty or whitespace-only id', () => {
    expect(messages(paymentTraceSearchSchema().safeParse({ ref: '   ' }))).toBe('Enter an id to trace.');
  });

  it('accepts an id of exactly the limit and refuses one character more', () => {
    expect(paymentTraceSearchSchema().safeParse({ ref: 'a'.repeat(TRACE_REF_MAX) }).success).toBe(true);
    expect(messages(paymentTraceSearchSchema().safeParse({ ref: 'a'.repeat(TRACE_REF_MAX + 1) }))).toBe('That id is too long.');
  });
});

describe('PaymentTraceSearchForm', () => {
  it('shows the traced id and submits the trimmed new one', async () => {
    const onSubmit = vi.fn();
    render(<PaymentTraceSearchForm initialRef="pay_OLD" busy={false} onSubmit={onSubmit} />);
    const field = screen.getByRole('textbox', { name: 'Payment, order, refund or invoice id' });
    expect(field).toHaveValue('pay_OLD');
    fireEvent.change(field, { target: { value: '  order_NEW  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Trace' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('order_NEW'));
  });

  it('does not submit an empty id and says why', async () => {
    const onSubmit = vi.fn();
    render(<PaymentTraceSearchForm initialRef="" busy={false} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trace' }));
    expect(await screen.findByText('Enter an id to trace.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('follows a new id from the address bar into the field', () => {
    const { rerender } = render(<PaymentTraceSearchForm initialRef="pay_A" busy={false} onSubmit={vi.fn()} />);
    rerender(<PaymentTraceSearchForm initialRef="rfnd_B" busy={false} onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: 'Payment, order, refund or invoice id' })).toHaveValue('rfnd_B');
  });
});
