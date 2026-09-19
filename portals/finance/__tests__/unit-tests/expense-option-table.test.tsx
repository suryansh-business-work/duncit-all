/**
 * Expense Settings — one configured list as Finance edits it.
 *
 * Rendered straight from the rows the page hands it, because the page's rows
 * are the Apollo cache's: after an add or an edit the server answers with the
 * bare option (usage not counted), so a just-written row reaches this table
 * with `usage_count: null` until the page's refetch lands. That row must read
 * as unused and stay deletable, not as broken.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import ExpenseOptionTable from '../../src/pages/finance/expense-settings-page/ExpenseOptionTable';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import { makeOptionRow, relatedTypeRows, type ExpenseOptionRowMock } from '../mocks/expense-settings.mock';

const LOCKED = 'Built-in options and options already used by an expense cannot be deleted — switch them off instead.';

/** Built-in + used, custom + unused + off, custom + used, and a row just written. */
const ROWS: ExpenseOptionRowMock[] = [
  ...relatedTypeRows(),
  makeOptionRow({ id: 'opt-pod', key: 'POD', label: 'Pod', entity_source: 'POD', is_system: false, usage_count: 3 }),
  makeOptionRow({ id: 'opt-league', key: 'LEAGUE', label: 'League', entity_source: 'CLUB', is_system: false, usage_count: null }),
];

const renderTable = (showSource = true, rows = ROWS) => {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  renderWithProviders(<ExpenseOptionTable rows={rows} showSource={showSource} onEdit={onEdit} onDelete={onDelete} />);
  return { onEdit, onDelete };
};

const cellText = (field: string) => screen.getAllByTestId(`cell-${field}`).map((cell) => cell.textContent);
const row = (index: number) => screen.getAllByTestId('table-row')[index];

beforeEach(() => {
  resetTableControls();
});

describe('ExpenseOptionTable', () => {
  it('shows each option, its entity list, whether it is offered, used or built in', async () => {
    renderTable();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(4));
    expect(cellText('label')).toEqual(['VenueVENUE', 'Event partnerEVENT_PARTNER', 'PodPOD', 'LeagueLEAGUE']);
    expect(cellText('entity_source')).toEqual(['VENUE', '—', 'POD', 'CLUB']);
    expect(cellText('is_active')).toEqual(['Offered', 'Hidden', 'Offered', 'Offered']);
    // The just-written row has no count yet and reads as unused.
    expect(cellText('usage_count')).toEqual(['12', '0', '3', '0']);
    expect(cellText('is_system')).toEqual(['Built-in', '', '', '']);
  });

  it('only lets an unused, custom option be deleted', async () => {
    const { onEdit, onDelete } = renderTable();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(4));

    expect(within(row(0)).getByRole('button', { name: LOCKED })).toBeDisabled();
    expect(within(row(2)).getByRole('button', { name: LOCKED })).toBeDisabled();

    fireEvent.click(within(row(1)).getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'opt-partner' }));
    fireEvent.click(within(row(3)).getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'opt-league' }));

    fireEvent.click(within(row(0)).getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'opt-venue' }));
  });

  it('finds an option by its stored key as well as its name', async () => {
    tableControls.queries = [{ ...tableControls.queries[0], search: 'event_partner' }];
    renderTable();
    await waitFor(() => expect(cellText('label')).toEqual(['Event partnerEVENT_PARTNER']));
  });

  it('has no entity column for the lists that do not search one', async () => {
    renderTable(false);
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(4));
    expect(screen.queryAllByTestId('cell-entity_source')).toHaveLength(0);
  });
});
