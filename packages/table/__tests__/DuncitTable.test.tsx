import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DuncitTable } from '../src/DuncitTable';
import type { DuncitColumn, TablePage, TableQueryState } from '../src/types';

type Person = { id: string; name: string; email: string };

const people: Person[] = Array.from({ length: 30 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `Person ${i + 1}`,
  email: `person${i + 1}@x.dev`,
}));

const columns: DuncitColumn<Person>[] = [
  { field: 'name', headerName: 'Name', filter: { type: 'text' } },
  { field: 'email', headerName: 'Email' },
];

function makeFetch(rows: Person[] = people) {
  return vi.fn(async (q: TableQueryState): Promise<TablePage<Person>> => {
    let data = rows;
    if (q.search) {
      data = data.filter((p) => p.name.toLowerCase().includes(q.search.toLowerCase()));
    }
    const start = (q.page - 1) * q.pageSize;
    return { rows: data.slice(start, start + q.pageSize), total: data.length };
  });
}

function renderTable(
  fetchRows: ReturnType<typeof makeFetch>,
  extra: Partial<Parameters<typeof DuncitTable<Person>>[0]> = {},
) {
  return render(
    <DuncitTable
      tableId={`test-${Math.random().toString(36).slice(2)}`}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={(row) => row.id}
      {...extra}
    />,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('DuncitTable', () => {
  it('renders fetched rows in the grid', async () => {
    const fetchRows = makeFetch();
    renderTable(fetchRows);
    expect(await screen.findByText('Person 1')).toBeInTheDocument();
    expect(screen.getByText('person1@x.dev')).toBeInTheDocument();
    expect(fetchRows).toHaveBeenCalledTimes(1);
    expect(fetchRows).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 25, search: '' }),
    );
  });

  it('search fires exactly one new fetch after the debounce, with page reset to 1', async () => {
    const fetchRows = makeFetch();
    renderTable(fetchRows);
    await screen.findByText('Person 1');

    fireEvent.change(screen.getByRole('textbox', { name: 'Search…' }), {
      target: { value: 'person 2' },
    });
    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2), { timeout: 2000 });
    expect(fetchRows).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'person 2', page: 1 }),
    );
  });

  it('TablePagination next page fetches page 2', async () => {
    const fetchRows = makeFetch();
    renderTable(fetchRows);
    await screen.findByText('Person 1');

    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
    await waitFor(() => expect(fetchRows).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    expect(await screen.findByText('Person 26')).toBeInTheDocument();
  });

  it('applying a filter from the popover fetches with filters and shows a chip', async () => {
    const fetchRows = makeFetch();
    renderTable(fetchRows);
    await screen.findByText('Person 1');

    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'ali' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(fetchRows).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          filters: [{ field: 'name', op: 'contains', value: 'ali' }],
        }),
      ),
    );
    expect(screen.getByText('Name contains ali')).toBeInTheDocument();
  });

  it('fetch error shows an Alert and Retry refetches', async () => {
    const fetchRows = makeFetch();
    fetchRows.mockRejectedValueOnce(new Error('boom'));
    renderTable(fetchRows);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('boom');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Person 1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchRows).toHaveBeenCalledTimes(2);
  });

  it('shows emptyText when there are zero rows', async () => {
    const fetchRows = makeFetch([]);
    renderTable(fetchRows, { emptyText: 'Nothing here yet' });
    expect(await screen.findByText('Nothing here yet')).toBeInTheDocument();
  });

  it('column menu hides a column', async () => {
    const fetchRows = makeFetch();
    renderTable(fetchRows);
    await screen.findByText('Person 1');
    expect(screen.getByText('Email')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Email' }));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByText('Email')).not.toBeInTheDocument());
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('refetchRef.current() triggers a new fetch', async () => {
    const fetchRows = makeFetch();
    const refetchRef: { current: (() => void) | null } = { current: null };
    renderTable(fetchRows, { refetchRef });
    await screen.findByText('Person 1');
    expect(refetchRef.current).not.toBeNull();

    act(() => {
      refetchRef.current?.();
    });
    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2));
  });

  it('header click emits a server sort instead of sorting locally', async () => {
    const fetchRows = makeFetch();
    renderTable(fetchRows);
    await screen.findByText('Person 1');

    fireEvent.click(screen.getByText('Name'));
    await waitFor(() =>
      expect(fetchRows).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'name', sortDir: 'asc', page: 1 }),
      ),
    );
  });
});
