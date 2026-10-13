import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import PodShopReturnForm from '../pod-shop-return.form';
import type { ProductOrder } from '../../../pages/pod-history-page/productOrders';
import { fallbackT } from '../../../i18n/fallback';

// Only the fields the form reads; the rest of a ProductOrder is irrelevant here.
const order = {
  id: 'o1',
  order_no: 'PS-1001',
  line_items: [
    { product_id: 'p1', variant_id: 'v1', variant_label: 'Blue', name: 'Mug', qty: 3 },
    { product_id: 'p2', variant_id: '', name: 'Cap', qty: 1 },
    { product_id: 'p3', variant_id: 'v3', name: 'Shirt', qty: 1 },
  ],
  returnable: [
    { product_id: 'p1', variant_id: 'v1', returnable_qty: 2, returnable_until: null },
    { product_id: 'p2', variant_id: '', returnable_qty: 1, returnable_until: null },
    // Nothing left to return on this one: it must not get a stepper.
    { product_id: 'p3', variant_id: 'v3', returnable_qty: 0, returnable_until: null },
  ],
} as unknown as ProductOrder;

function renderForm(over: Partial<Parameters<typeof PodShopReturnForm>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  render(<PodShopReturnForm order={order} busy={false} errorMessage={null} onCancel={onCancel} onSubmit={onSubmit} {...over} />);
  return { onSubmit, onCancel };
}

describe('PodShopReturnForm', () => {
  it('lists only the lines that can still go back, starting at none selected', () => {
    renderForm();
    expect(screen.getByText('Mug — Blue')).toBeInTheDocument();
    expect(screen.getByText('Cap')).toBeInTheDocument();
    expect(screen.queryByText('Shirt')).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-shop-return-qty-0-value')).toHaveTextContent('0');
    expect(screen.getByTestId('pod-shop-return-qty-0-value')).toHaveTextContent('2');
  });

  it('bounds the stepper between none and what is left to return', async () => {
    renderForm();
    const minus = screen.getByTestId('pod-shop-return-qty-0-minus');
    const plus = screen.getByTestId('pod-shop-return-qty-0-plus');
    expect(minus).toBeDisabled();
    fireEvent.click(plus);
    await waitFor(() => expect(screen.getByTestId('pod-shop-return-qty-0-value')).toHaveTextContent('1 of 2'));
    fireEvent.click(plus);
    await waitFor(() => expect(plus).toBeDisabled());
    expect(screen.getByTestId('pod-shop-return-qty-0-value')).toHaveTextContent(fallbackT('mweb.podShopReturns.qtyOf', { vars: { qty: '2', max: '2' } }));
    expect(plus).toBeDisabled();
    fireEvent.click(minus);
    expect(screen.getByTestId('pod-shop-return-qty-0-value')).toHaveTextContent(fallbackT('mweb.podShopReturns.qtyOf', { vars: { qty: '1', max: '2' } }));
  });

  it('refuses a submit with nothing picked and no reason', async () => {
    const { onSubmit } = renderForm();
    fireEvent.click(screen.getByTestId('pod-shop-return-submit'));
    expect(await screen.findByTestId('pod-shop-return-lines-error')).toHaveTextContent(
      fallbackT('mweb.podShopReturns.errorPickItem'),
    );
    expect(screen.getByText(fallbackT('mweb.podShopReturns.errorPickReason'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the picked quantities with the reason and comments', async () => {
    const { onSubmit } = renderForm();
    fireEvent.click(screen.getByTestId('pod-shop-return-qty-0-plus'));
    fireEvent.click(screen.getByTestId('pod-shop-return-qty-1-plus'));
    fireEvent.click(screen.getByRole('radio', { name: fallbackT('mweb.podShopReturns.reasonDamaged') }));
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.podShopReturns.commentsLabel')), {
      target: { value: 'Handle cracked' },
    });
    fireEvent.click(screen.getByTestId('pod-shop-return-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0]?.[0];
    expect(values.reason).toBe('damaged');
    expect(values.comments).toBe('Handle cracked');
    expect(values.lines.map((l: { product_id: string; qty: number }) => [l.product_id, l.qty])).toEqual([
      ['p1', 1],
      ['p2', 1],
    ]);
  });

  it('shows the server error, locks both buttons while busy, and cancels', () => {
    const { onCancel } = renderForm({ busy: true, errorMessage: 'Return window closed' });
    expect(screen.getByTestId('pod-shop-return-error')).toHaveTextContent('Return window closed');
    expect(screen.getByTestId('pod-shop-return-submit')).toBeDisabled();
    expect(screen.getByTestId('pod-shop-return-submit')).toHaveTextContent(fallbackT('mweb.podShopReturns.submitting'));
    expect(screen.getByTestId('pod-shop-return-cancel')).toBeDisabled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls cancel when the buyer backs out', () => {
    const { onCancel } = renderForm();
    fireEvent.click(screen.getByTestId('pod-shop-return-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
