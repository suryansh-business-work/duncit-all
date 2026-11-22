import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as api from '../src';
import { EM_DASH, LabeledIds, labeledIdsText } from '../src/cells';

const ids = [
  { label: 'Razorpay payment', value: 'pay_U39hOwzQiUFqHT' },
  { label: 'Razorpay order', value: 'order_U39IVJblWttbgN' },
  { label: 'Razorpay refund', value: null },
  { label: 'Duncit ref', value: 'DPAY-MWRKSGXI1EE90B59' },
];

describe('LabeledIds', () => {
  it('prints every id under its own name and leaves out the ones the row does not have', () => {
    render(<LabeledIds ids={ids} />);
    expect(screen.getByText('pay_U39hOwzQiUFqHT')).toBeInTheDocument();
    expect(screen.getByText('order_U39IVJblWttbgN')).toBeInTheDocument();
    expect(screen.getByText('DPAY-MWRKSGXI1EE90B59')).toBeInTheDocument();
    expect(screen.getByText(/Razorpay payment/)).toBeInTheDocument();
    expect(screen.queryByText(/Razorpay refund/)).not.toBeInTheDocument();
  });

  it('renders the values monospace, so an id can be read back character by character', () => {
    render(<LabeledIds ids={ids.slice(0, 1)} />);
    expect(screen.getByText('pay_U39hOwzQiUFqHT')).toHaveStyle({ fontFamily: 'monospace' });
  });

  it('shows an em-dash for a row with no ids at all (blank or whitespace-only values count as none)', () => {
    render(<LabeledIds ids={[{ label: 'Razorpay payment', value: '  ' }, { label: 'Razorpay order', value: undefined }]} />);
    expect(screen.getByText(EM_DASH)).toBeInTheDocument();
  });
});

describe('labeledIdsText', () => {
  it('joins the present ids with their names for export and quick filter', () => {
    expect(labeledIdsText(ids)).toBe(
      'Razorpay payment: pay_U39hOwzQiUFqHT · Razorpay order: order_U39IVJblWttbgN · Duncit ref: DPAY-MWRKSGXI1EE90B59'
    );
  });

  it('answers an em-dash when nothing is present', () => {
    expect(labeledIdsText([])).toBe(EM_DASH);
    expect(labeledIdsText([{ label: 'Razorpay refund', value: '' }])).toBe(EM_DASH);
  });

  it('is part of the package\'s public API', () => {
    expect(api.LabeledIds).toBe(LabeledIds);
    expect(api.labeledIdsText).toBe(labeledIdsText);
  });
});
