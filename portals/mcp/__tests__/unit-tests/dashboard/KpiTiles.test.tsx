import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import KpiTiles from '../../../src/pages/dashboard/KpiTiles';
import { formatCost } from '../../../src/lib/format';

const TOTALS = {
  calls: 1234,
  errors: 12,
  blocked: 3,
  users: 4,
  input_tokens: 56000,
  output_tokens: 7800,
  cost: 3.5,
  avg_ms: 420,
};

const tile = (key: string) => screen.getByTestId(`mcp-kpi-${key}`);

describe('KpiTiles', () => {
  it('shows every headline number of the window, grouped for reading', () => {
    render(<KpiTiles totals={TOTALS} currency="USD" loading={false} />);
    expect(within(tile('calls')).getByText('Tool calls')).toBeInTheDocument();
    expect(tile('calls')).toHaveTextContent('1,234');
    expect(tile('errors')).toHaveTextContent('12');
    expect(tile('blocked')).toHaveTextContent('Blocked or denied');
    expect(tile('blocked')).toHaveTextContent('3');
    expect(tile('users')).toHaveTextContent('4');
    expect(tile('input')).toHaveTextContent('56,000');
    expect(tile('output')).toHaveTextContent('7,800');
    expect(tile('latency')).toHaveTextContent('420 ms');
  });

  it('prices the cost in the currency the calls were priced in, and says where prices come from', () => {
    render(<KpiTiles totals={TOTALS} currency="USD" loading={false} />);
    expect(tile('cost')).toHaveTextContent(formatCost(3.5, 'USD', 'en-IN'));
    expect(tile('cost')).toHaveTextContent('From the token prices in Settings');
  });

  it('reads the cost as a plain number while no call has said which currency', () => {
    render(<KpiTiles totals={{ ...TOTALS, cost: 0 }} currency="" loading={false} />);
    expect(tile('cost')).toHaveTextContent('Estimated cost0');
  });

  it('shows zeros, not blanks, before there are any totals', () => {
    render(<KpiTiles totals={undefined} currency="" loading={false} />);
    expect(tile('calls')).toHaveTextContent('0');
    expect(tile('latency')).toHaveTextContent('0 ms');
  });

  it('holds a placeholder in place of every value while loading', () => {
    render(<KpiTiles totals={undefined} currency="" loading />);
    expect(tile('calls')).not.toHaveTextContent('0');
    expect(tile('calls')).toHaveTextContent('Tool calls');
  });
});
