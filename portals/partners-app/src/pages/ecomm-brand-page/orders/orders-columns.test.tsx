import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { buildOrderColumns } from './orders-columns';
import OrderCancellation from './OrderCancellation';
import { OrderItems } from './OrderDetailSections';
import { orderAddressValues } from './order-address';
import { orderRow } from './__tests__/fixtures';
import type { OrderRow } from './orders.queries';
import { renderWithProviders } from '../../../__tests__/render';

afterEach(cleanup);

const t = (key: string) => key;
const row = (over: Record<string, unknown> = {}) => orderRow(over) as unknown as OrderRow;
const column = (field: string) => {
  const found = buildOrderColumns(t).find((candidate) => candidate.field === field);
  if (!found?.valueGetter) throw new Error(`${field} has no value getter`);
  return found.valueGetter;
};

describe('the order created column', () => {
  it('writes the day the order was placed', () => {
    expect(column('created_at')(row({ created_at: '2026-07-01T10:00:00.000Z' }))).toMatch(/2026/);
  });

  it('shows a dash for an order with no creation time', () => {
    expect(column('created_at')(row({ created_at: null }))).toBe('—');
  });
});

describe('OrderCancellation', () => {
  const cancelled = (refund: Record<string, unknown>) =>
    row({
      cancelled_at: '2026-07-03T08:00:00.000Z',
      cancel_reason: 'Out of stock',
      refund: { ...orderRow().refund, ...refund },
    });

  it('shows nothing for an order that was not cancelled', () => {
    renderWithProviders(<OrderCancellation row={row({ cancelled_at: null })} />);
    expect(screen.queryByTestId('order-cancellation')).toBeNull();
  });

  it('says when a processed refund went back to the buyer', () => {
    renderWithProviders(
      <OrderCancellation row={cancelled({ status: 'PROCESSED', amount: 600, razorpay_refund_id: 'rfnd_1', refunded_at: '2026-07-04T08:00:00.000Z' })} />,
    );
    const section = screen.getByTestId('order-cancellation');
    expect(section.textContent).toContain('Out of stock');
    expect(section.textContent).toContain('rfnd_1');
    expect(section.textContent).toContain('600.00');
    // Cancelled on, and refunded on.
    expect(section.textContent?.match(/\d{2} [A-Za-z]{3} 2026/g)).toHaveLength(2);
  });

  it('leaves the refunded-on time empty while the refund is still pending', () => {
    renderWithProviders(<OrderCancellation row={cancelled({ status: 'PENDING', amount: 600, refunded_at: null })} />);
    expect(screen.getByTestId('order-cancellation').textContent).toContain('600.00');
    // Only the day it was cancelled; nothing has been refunded yet.
    expect(screen.getByTestId('order-cancellation').textContent?.match(/\d{2} [A-Za-z]{3} 2026/g)).toHaveLength(1);
  });
});

describe('OrderItems', () => {
  it('prices each line in the order currency', () => {
    renderWithProviders(<OrderItems row={row({ currency_symbol: '$' })} />);
    expect(screen.getAllByText(/\$250\.00/).length).toBeGreaterThanOrEqual(1);
  });

  it('prices each line in rupees when the order carries no currency symbol', () => {
    renderWithProviders(<OrderItems row={row({ currency_symbol: '' })} />);
    expect(screen.getAllByText(/₹250\.00/).length).toBeGreaterThanOrEqual(1);
  });
});

describe('orderAddressValues', () => {
  it('prefills the correction form from the order ship-to', () => {
    expect(orderAddressValues(row().shipping_address)).toMatchObject({ email: 'meera@example.com' });
  });

  it('starts blank for an order with no ship-to on file', () => {
    expect(orderAddressValues(null).email).toBe('');
  });
});
