import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { resetTableProbe, searchRows } from '../../mocks/table-stub';
import { bucket, usageSummary } from '../../mocks/fixtures';

vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../../mocks/table-stub')).StubTable,
}));

import Breakdowns from '../../../src/pages/dashboard/Breakdowns';
import BucketTable from '../../../src/pages/dashboard/BucketTable';

beforeEach(() => resetTableProbe());

const cells = (tableId: string, field: string) =>
  Array.from(screen.getByTestId(`table-${tableId}`).querySelectorAll(`[data-field="${field}"]`)).map((cell) => cell.textContent);

describe('Breakdowns', () => {
  it('splits a manager’s window six ways, by person included', async () => {
    render(<Breakdowns summary={usageSummary({ scope: 'ALL' })} currency="USD" />);
    for (const title of ['Top tools', 'By category', 'By AI app', 'By connector', 'By outcome', 'By person']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    await screen.findByTestId('table-mcp-usage-by-user');
    expect(cells('mcp-usage-by-user', 'key')).toEqual(['asha@duncit.com', 'Unknown']);
  });

  it('has no per-person split for someone who only sees their own calls', () => {
    render(<Breakdowns summary={usageSummary({ scope: 'MINE', by_user: [] })} currency="USD" />);
    expect(screen.queryByRole('heading', { name: 'By person' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading')).toHaveLength(5);
  });

  it('names each outcome in words rather than the server’s code', async () => {
    render(<Breakdowns summary={usageSummary()} currency="USD" />);
    await screen.findByTestId('table-mcp-usage-by-status');
    expect(cells('mcp-usage-by-status', 'key')).toEqual(['OK', 'Error']);
  });
});

describe('BucketTable', () => {
  it('shows calls, failures, cost and speed for each row in the reader’s format', async () => {
    render(
      <BucketTable
        tableId="t"
        title="Top tools"
        keyHeader="Tool"
        currency="USD"
        rows={[bucket({ key: 'pods_create_pod', calls: 12345, errors: 2, blocked: 1, cost: 0.042, avg_ms: 380 })]}
      />,
    );
    const row = await screen.findByTestId('row-pods_create_pod');
    expect(within(row).getByText('pods_create_pod')).toBeInTheDocument();
    expect(cells('t', 'calls')).toEqual(['12,345']);
    expect(cells('t', 'errors')).toEqual(['2']);
    expect(cells('t', 'blocked')).toEqual(['1']);
    expect(cells('t', 'cost')).toEqual(['$0.042']);
    expect(cells('t', 'avg_ms')).toEqual(['380 ms']);
    // Tokens are in the column menu, not on screen by default.
    expect(cells('t', 'input_tokens')).toEqual([]);
  });

  it('reads the cost as a plain number while no call has said which currency', async () => {
    render(<BucketTable tableId="t" title="Top tools" keyHeader="Tool" currency="" rows={[bucket({ key: 'x_tool', cost: 2 })]} />);
    await screen.findByTestId('row-x_tool');
    expect(cells('t', 'cost')).toEqual(['2']);
  });

  it('says the window is empty instead of drawing an empty table', () => {
    render(<BucketTable tableId="t" title="By person" keyHeader="Person" currency="USD" rows={[]} />);
    expect(screen.getByText('Nothing in this window.')).toBeInTheDocument();
    expect(screen.queryByTestId('table-t')).not.toBeInTheDocument();
  });

  it('searches rows by the label they show', async () => {
    render(
      <BucketTable
        tableId="t"
        title="By outcome"
        keyHeader="Outcome"
        currency="USD"
        rows={[bucket({ key: 'OK' }), bucket({ key: 'ERROR' })]}
        labelOf={(key) => (key === 'ERROR' ? 'Error' : key)}
      />,
    );
    await screen.findByTestId('table-t');
    const found = await searchRows('err');
    expect(found?.rows.map((row) => (row as { key: string }).key)).toEqual(['ERROR']);
  });

  it('shows new rows when the window changes, without being remounted', async () => {
    const { rerender } = render(
      <BucketTable tableId="t" title="Top tools" keyHeader="Tool" currency="USD" rows={[bucket({ key: 'a_tool' })]} />,
    );
    await screen.findByTestId('row-a_tool');
    rerender(<BucketTable tableId="t" title="Top tools" keyHeader="Tool" currency="USD" rows={[bucket({ key: 'b_tool' })]} />);
    await waitFor(() => expect(screen.getByTestId('row-b_tool')).toBeInTheDocument());
    expect(screen.queryByTestId('row-a_tool')).not.toBeInTheDocument();
  });
});
