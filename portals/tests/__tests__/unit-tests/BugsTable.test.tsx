import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BugsTable from '../../src/pages/bugs-page/BugsTable';
import type { BugRow } from '../../src/pages/bugs-page/queries';

const makeBug = (over: Partial<BugRow> = {}): BugRow => ({
  id: 'b1',
  title: 'Cannot read length of undefined',
  error_name: 'TypeError',
  message: 'x is undefined',
  page: '/home',
  source: 'mweb',
  app: 'DuncitApp',
  platform: 'web',
  os: 'iOS 17',
  occurrence_count: 5,
  first_seen_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-02T00:00:00.000Z',
  env_counts: { localhost: 1, staging: 2, production: 3 },
  last_url: 'https://mweb.duncit.com/home',
  last_host: 'mweb.duncit.com',
  last_stack: 'TypeError: x\n  at foo',
  status: 'OPEN',
  ...over,
});

describe('BugsTable', () => {
  it('renders every cell renderer and wires the Triage action', async () => {
    const onOpen = vi.fn();
    const rows = [makeBug()];
    render(
      <BugsTable
        fetchRows={vi.fn(async () => ({ rows, total: 1 }))}
        refetchRef={{ current: null }}
        onOpen={onOpen}
      />,
    );

    // status chip (renderStatus), title (renderTitle), last-seen (renderLastSeen)
    expect(await screen.findByText('Cannot read length of undefined')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();

    // actions cell (renderActions)
    fireEvent.click(screen.getByRole('button', { name: 'Triage' }));
    expect(onOpen).toHaveBeenCalledWith(rows[0]);
  });
});
