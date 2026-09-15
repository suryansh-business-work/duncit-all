import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { downloadTextFile, notify } = vi.hoisted(() => ({ downloadTextFile: vi.fn(), notify: vi.fn() }));

vi.mock('@duncit/utils', () => ({ downloadTextFile }));
vi.mock('@duncit/dialogs', () => ({ notify }));
vi.mock('../src/tableApi/TableApiDialog', () => ({
  TableApiDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <button type="button" onClick={onClose}>
        close api
      </button>
    ) : null,
}));

const { TableDataActions } = await import('../src/toolbar/TableDataActions');
const { makeApolloTableFetch } = await import('../src/apolloFetch');

type Pod = { id: string; name: string };

const QUERY = { search: '', page: 2, pageSize: 25, sortBy: null, sortDir: 'asc' as const, filters: [] };
const ROWS: Pod[] = [{ id: 'DUN-POD-4821', name: 'Sunrise Yoga' }];
const columns = [{ field: 'name', headerName: 'Pod' }];

function renderActions(overrides: Record<string, unknown> = {}) {
  const fetchRows = vi.fn(async () => ({ rows: [{ id: 'DUN-POD-1', name: 'Book Club' }], total: 1 }));
  const props = {
    tableId: 'pods',
    columns,
    hiddenOverrides: {},
    fetchRows,
    query: QUERY,
    rows: ROWS,
    total: 1,
    loading: false,
    ...overrides,
  };
  render(<TableDataActions<Pod> {...props} />);
  return props;
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Download' }));

beforeEach(() => {
  downloadTextFile.mockReset();
  notify.mockReset();
});

describe('TableDataActions downloads', () => {
  it('saves the page on screen as CSV without refetching', async () => {
    const { fetchRows } = renderActions();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Current page as CSV' }));
    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1));
    expect(downloadTextFile.mock.calls[0][1]).toBe('pods-page-2.csv');
    expect(downloadTextFile.mock.calls[0][0]).toContain('Sunrise Yoga');
    expect(fetchRows).not.toHaveBeenCalled();
  });

  it('fetches every matching row for an all-rows JSON download, showing progress meanwhile', async () => {
    let finish: (value: { rows: Pod[]; total: number }) => void = () => undefined;
    const fetchRows = vi.fn(() => new Promise<{ rows: Pod[]; total: number }>((resolve) => { finish = resolve; }));
    renderActions({ fetchRows });
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'All rows as JSON' }));
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    finish({ rows: [{ id: 'DUN-POD-1', name: 'Book Club' }], total: 1 });
    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1));
    expect(downloadTextFile.mock.calls[0][1]).toBe('pods-all.json');
    expect(downloadTextFile.mock.calls[0][0]).toContain('Book Club');
  });

  it('says so when the rows could not be fetched', async () => {
    renderActions({ fetchRows: vi.fn(async () => { throw new Error('offline'); }) });
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'All rows as CSV' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('The download could not be prepared. Please try again.', 'error'));
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
  });

  it('offers no all-rows download for an empty result, and closes on Escape', async () => {
    renderActions({ total: 0 });
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'All rows as CSV' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'Current page as JSON' })).not.toHaveAttribute('aria-disabled');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('switches off while the table is loading', () => {
    renderActions({ loading: true });
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
  });
});

describe('TableDataActions GET API', () => {
  it('has no GET API button for a table without a server query', () => {
    renderActions();
    expect(screen.queryByRole('button', { name: 'GET API' })).not.toBeInTheDocument();
  });

  it('opens and closes the GET API dialog for an Apollo-backed table', () => {
    const fetchRows = makeApolloTableFetch<Pod>({ query: vi.fn() }, {}, 'podsTable');
    renderActions({ fetchRows });
    fireEvent.click(screen.getByRole('button', { name: 'GET API' }));
    fireEvent.click(screen.getByRole('button', { name: 'close api' }));
    expect(screen.queryByRole('button', { name: 'close api' })).not.toBeInTheDocument();
  });
});
