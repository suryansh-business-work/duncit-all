import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { e2eRun } from '../mocks/e2e.mock';

vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../mocks/table-probe')).TableProbe,
}));

import E2eRunsTable from '../../src/pages/e2e/E2eRunsTable';

beforeEach(() => vi.clearAllMocks());

const cell = (row: HTMLElement, field: string) =>
  within(row).getByText((_, el) => el?.getAttribute('data-col') === field).textContent;

describe('E2E runs table columns', () => {
  it('answers the Slack outcome, the run link and the sign-up address for sorting and export', async () => {
    const rows = [
      e2eRun({ slack_ts: '1700000000.1', workflow_run_url: 'https://github.example.test/runs/5' }),
      e2eRun({ id: 'e2', slack_ts: null, workflow_run_url: '', signup_email: '', reported_by: '' }),
    ];
    renderWithProviders(
      <E2eRunsTable
        fetchRows={async () => ({ rows, total: rows.length })}
        refetchRef={{ current: null }}
        onRowClick={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const [first, second] = await screen.findAllByRole('row');
    expect(cell(first, 'slack_ts')).toBe('posted');
    expect(cell(second, 'slack_ts')).toBe('skipped');
    expect(cell(first, 'workflow_run_url')).toBe('https://github.example.test/runs/5');
    expect(cell(second, 'workflow_run_url')).toBe('');
    expect(cell(second, 'signup_email')).toBe('—');
    expect(cell(first, 'reported_by')).toBe('ci');
    expect(cell(second, 'reported_by')).toBe('—');
  });
});
