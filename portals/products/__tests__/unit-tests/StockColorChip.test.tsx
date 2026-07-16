import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StockColorChip from '../../src/pages/inventory-page/inventory-product-page/StockColorChip';

describe('StockColorChip', () => {
  it('shows healthy stock in green', () => {
    render(<StockColorChip inventory={20} lowStockAlert={5} />);
    expect(screen.getByText('20 in stock')).toBeInTheDocument();
  });

  it('shows a low-stock warning at or below the threshold', () => {
    render(<StockColorChip inventory={4} lowStockAlert={5} />);
    expect(screen.getByText('Low stock (4)')).toBeInTheDocument();
  });

  it('shows out of stock at zero or below', () => {
    render(<StockColorChip inventory={0} lowStockAlert={5} />);
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });
});
