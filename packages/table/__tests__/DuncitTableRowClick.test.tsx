import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DuncitTable } from '../src/DuncitTable';
import { actionsColumn } from '../src/cells';
import type { DuncitColumn, TablePage, TableQueryState } from '../src/types';

type Person = { id: string; name: string };

const people: Person[] = [
  { id: 'p1', name: 'Person 1' },
  { id: 'p2', name: 'Person 2' },
];

function makeFetch() {
  return vi.fn(
    async (_q: TableQueryState): Promise<TablePage<Person>> => ({ rows: people, total: people.length }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('DuncitTable row interactions', () => {
  it('clicking a row calls onRowClick, but clicking an action button does not', async () => {
    const onRowClick = vi.fn();
    const onEdit = vi.fn();
    const columns: DuncitColumn<Person>[] = [
      { field: 'name', headerName: 'Name' },
      actionsColumn<Person>({ onEdit }),
    ];
    render(
      <DuncitTable<Person>
        tableId="rowclick"
        columns={columns}
        fetchRows={makeFetch()}
        getRowId={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );
    await screen.findByText('Person 1');

    // Plain cell click bubbles to the row -> onRowClick fires with the row.
    fireEvent.click(screen.getByText('Person 1'));
    await waitFor(() => expect(onRowClick).toHaveBeenCalledWith(people[0]));

    // Clicking the Edit button inside the cell fires its own handler but is
    // filtered out of the row-click path (target.closest('button, a')).
    onRowClick.mockClear();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(onEdit).toHaveBeenCalledWith(people[0]);
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
