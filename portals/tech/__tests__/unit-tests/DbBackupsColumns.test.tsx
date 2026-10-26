import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { backupRow } from '../mocks/backups.mock';

vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../mocks/table-probe')).TableProbe,
}));

import BackupsTable from '../../src/pages/database/backups/BackupsTable';

const rows = [
  backupRow(),
  backupRow({ id: 'run', finishedAt: null, fileName: null, startedBy: null }),
];

beforeEach(() => vi.clearAllMocks());

describe('Backups table columns', () => {
  it('gives the finished time of a completed archive, and a dash for one still running', async () => {
    renderWithProviders(
      <BackupsTable
        fetchRows={async () => ({ rows, total: rows.length })}
        refetchRef={{ current: null }}
        onDownload={vi.fn()}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const probeRows = await screen.findAllByRole('row');
    expect(probeRows).toHaveLength(2);
    const finished = (row: HTMLElement) => within(row).getByText((_, el) => el?.getAttribute('data-col') === 'finished_at');
    expect(finished(probeRows[0]).textContent).not.toBe('—');
    expect(finished(probeRows[0]).textContent).not.toBe('');
    expect(finished(probeRows[1]).textContent).toBe('—');
  });
});
