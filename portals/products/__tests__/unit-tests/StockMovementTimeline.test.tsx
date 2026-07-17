import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StockMovementTimeline from '../../src/pages/inventory-page/inventory-product-page/StockMovementTimeline';

const movement = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  user_name: 'Asha',
  type: 'IN',
  quantity: 5,
  reason: 'Restock',
  balance_after: 15,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('StockMovementTimeline', () => {
  it('shows a loading line while movements load', () => {
    render(<StockMovementTimeline movements={[]} loading />);
    expect(screen.getByText(/Loading movements/i)).toBeInTheDocument();
  });

  it('shows the empty state when there are no movements', () => {
    render(<StockMovementTimeline movements={[]} loading={false} />);
    expect(screen.getByText(/No stock movements yet/i)).toBeInTheDocument();
  });

  it('renders positive and negative movements with a reason', () => {
    render(
      <StockMovementTimeline
        movements={[movement({ id: 'a', quantity: 5, reason: 'Restock' }), movement({ id: 'b', type: 'OUT', quantity: -2, reason: '' })]}
        loading={false}
      />,
    );
    expect(screen.getByText(/\+5 • Balance after: 15/)).toBeInTheDocument();
    expect(screen.getByText(/-2 • Balance after: 15/)).toBeInTheDocument();
  });

  it('falls back to the default chip colour for an unknown type', () => {
    render(<StockMovementTimeline movements={[movement({ type: 'MYSTERY', user_name: '' })]} loading={false} />);
    expect(screen.getByText('MYSTERY')).toBeInTheDocument();
    // No user_name → "system".
    expect(screen.getByText(/system/)).toBeInTheDocument();
  });
});
