import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StockAdjustForm from './stock-adjust.form';
import { makeStockAdjustSchema, toStockDelta, type StockAdjustValues } from './stock-adjust.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key;
const errorsOf = (values: StockAdjustValues, stock = 10) => {
  const result = makeStockAdjustSchema(t, stock).safeParse(values);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('makeStockAdjustSchema', () => {
  it('accepts a print run and a removal within stock', () => {
    expect(errorsOf({ direction: 'ADD', quantity: '500', reason: 'Print run' })).toEqual({});
    expect(errorsOf({ direction: 'REMOVE', quantity: '10', reason: 'Damaged' })).toEqual({});
  });

  it('never removes more cards than are in stock', () => {
    expect(errorsOf({ direction: 'REMOVE', quantity: '11', reason: 'Lost' })).toEqual({
      quantity: 'loyalty.designs.stockRemoveTooMany({"n":10})',
    });
  });

  it.each([['0'], ['-3'], ['2.5'], ['100001'], ['']])('refuses a quantity of %j', (quantity) => {
    expect(errorsOf({ direction: 'ADD', quantity, reason: 'x' })).toEqual({
      quantity: 'loyalty.designs.stockQuantityInvalid({"max":100000})',
    });
  });

  it('always asks why, within 300 characters', () => {
    expect(errorsOf({ direction: 'ADD', quantity: '1', reason: '  ' })).toEqual({ reason: 'loyalty.designs.stockReasonRequired' });
    expect(errorsOf({ direction: 'ADD', quantity: '1', reason: 'r'.repeat(301) })).toEqual({
      reason: 'loyalty.designs.stockReasonMax({"max":300})',
    });
  });
});

describe('toStockDelta', () => {
  it('signs the change by its direction', () => {
    expect(toStockDelta({ direction: 'ADD', quantity: '25', reason: '' })).toBe(25);
    expect(toStockDelta({ direction: 'REMOVE', quantity: '4', reason: '' })).toBe(-4);
  });
});

describe('StockAdjustForm', () => {
  const props = { designName: 'Classic', currentStock: 8, busy: false, onCancel: vi.fn() };
  const type = (testId: string, value: string) =>
    fireEvent.change(screen.getByTestId(testId).querySelector('input, textarea')!, { target: { value } });

  it('removes damaged cards with the reason', async () => {
    const onSubmit = vi.fn();
    render(<StockAdjustForm {...props} open onSubmit={onSubmit} />);
    expect(screen.getByText('Adjust printed stock — Classic')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('stock-remove'));
    // Pressing the selected direction again keeps it selected.
    fireEvent.click(screen.getByTestId('stock-remove'));
    type('stock-quantity', '3');
    type('stock-reason', ' Water damage ');
    fireEvent.click(screen.getByTestId('stock-confirm'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(-3, 'Water damage'));
  });

  it('refuses to remove more than is in stock, and shows the server’s refusal', async () => {
    const onSubmit = vi.fn();
    render(<StockAdjustForm {...props} open errorMessage="Only 8 cards are in stock" onSubmit={onSubmit} />);
    expect(screen.getByText('Only 8 cards are in stock')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('stock-remove'));
    type('stock-quantity', '9');
    type('stock-reason', 'Lost');
    fireEvent.click(screen.getByTestId('stock-confirm'));
    expect(await screen.findByText('Only 8 cards are in stock.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('starts clean on every opening and closes on cancel', () => {
    const onCancel = vi.fn();
    const { rerender } = render(<StockAdjustForm {...props} open onCancel={onCancel} onSubmit={vi.fn()} />);
    type('stock-quantity', '5');
    rerender(<StockAdjustForm {...props} open={false} onCancel={onCancel} onSubmit={vi.fn()} />);
    rerender(<StockAdjustForm {...props} open onCancel={onCancel} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('stock-quantity').querySelector('input')).toHaveValue('');
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
