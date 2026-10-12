/**
 * The venue-bill summary at Complete Pod and on Finance's Payment Release
 * page. It only arranges the lines it is handed — every figure is the
 * server's — and links the uploaded bill when there is one to open.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { VenueBillLine } from '@duncit/utils';

import VenueBillSummary from '../src/finance-waterfall/VenueBillSummary';

// A ₹300 slot with a ₹450.50 bill paid on top of it, 9 of 12 seats attended.
const lines: VenueBillLine[] = [
  { key: 'attendees', label: 'Total attendees', value: '9 of 12 seats' },
  { key: 'slot-price', label: 'Earlier slot price', value: '₹300.00' },
  { key: 'final-bill', label: 'Final bill uploaded', value: '₹450.50' },
  { key: 'venue-total', label: 'Venue total (slot price + bill)', value: '₹750.50', strong: true },
];

const BILL_URL = 'https://ik.example/staging/bills/pod-4821.pdf';

describe('VenueBillSummary', () => {
  it('renders every line under its own test id, label beside value, in the order given', () => {
    render(<VenueBillSummary lines={lines} />);
    for (const line of lines) {
      const row = within(screen.getByTestId(`venue-bill-line-${line.key}`));
      expect(row.getByText(line.label)).toBeInTheDocument();
      expect(row.getByText(line.value)).toBeInTheDocument();
    }
    const rendered = within(screen.getByTestId('venue-bill-summary'))
      .getAllByTestId(/^venue-bill-line-/)
      .map((node) => node.dataset.testid);
    expect(rendered).toEqual(lines.map((line) => `venue-bill-line-${line.key}`));
  });

  it('renders only the lines it was given', () => {
    render(<VenueBillSummary lines={lines.filter((line) => line.key !== 'slot-price')} />);
    expect(screen.queryByTestId('venue-bill-line-slot-price')).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/^venue-bill-line-/)).toHaveLength(3);
  });

  it('shows the heading only when one is given', () => {
    const { rerender } = render(<VenueBillSummary lines={lines} />);
    expect(screen.queryByText('Venue bill')).not.toBeInTheDocument();
    rerender(<VenueBillSummary lines={lines} title="Venue bill" />);
    expect(screen.getByText('Venue bill')).toBeInTheDocument();
  });

  it('weights the total line above the others', () => {
    render(<VenueBillSummary lines={lines} />);
    const total = within(screen.getByTestId('venue-bill-line-venue-total'));
    const bill = within(screen.getByTestId('venue-bill-line-final-bill'));
    expect(total.getByText('₹750.50')).toHaveStyle({ fontWeight: 700 });
    expect(total.getByText('Venue total (slot price + bill)')).toHaveStyle({ fontWeight: 700 });
    expect(bill.getByText('₹450.50')).toHaveStyle({ fontWeight: 400 });
  });

  it('links the uploaded bill in a new tab without leaking the referrer', () => {
    render(<VenueBillSummary lines={lines} billUrl={BILL_URL} viewBillLabel="View bill" />);
    const link = screen.getByRole('link', { name: 'View bill' });
    expect(link).toHaveAttribute('href', BILL_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it.each([
    ['no bill was uploaded', { viewBillLabel: 'View bill' }],
    ['the bill URL is null', { billUrl: null, viewBillLabel: 'View bill' }],
    ['the bill URL is empty', { billUrl: '', viewBillLabel: 'View bill' }],
    ['the link has no text', { billUrl: BILL_URL }],
  ])('renders no link when %s', (_case, props) => {
    render(<VenueBillSummary lines={lines} {...props} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
