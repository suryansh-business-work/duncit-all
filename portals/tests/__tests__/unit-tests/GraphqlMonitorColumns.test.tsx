import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { monitorField, monitorOperation } from '../mocks/graphql-monitor.mock';

vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../mocks/table-probe')).TableProbe,
}));

import FieldsTable from '../../src/pages/graphql-monitor/fields/FieldsTable';
import OperationsTable from '../../src/pages/graphql-monitor/operations/OperationsTable';

const cell = (row: HTMLElement, field: string) =>
  within(row).getByText((_, el) => el?.getAttribute('data-col') === field).textContent;

describe('GraphQL monitor table columns', () => {
  it('gives an operation’s execute time and cached count for sorting and export', async () => {
    renderWithProviders(
      <OperationsTable operations={[monitorOperation({ execute_avg_ms: 1500, cached: 1234 })]} slowMs={500} onOpen={vi.fn()} />,
    );

    const [row] = await screen.findAllByRole('row');
    expect(cell(row, 'execute_avg_ms')).toBe('1.5 s');
    expect(cell(row, 'cached')).toBe('1.2K');
  });

  it('gives a field’s sampled call count', async () => {
    renderWithProviders(<FieldsTable fields={[monitorField({ sampled_calls: 4200 })]} />);

    const [row] = await screen.findAllByRole('row');
    expect(cell(row, 'sampled_calls')).toBe('4.2K');
  });
});
