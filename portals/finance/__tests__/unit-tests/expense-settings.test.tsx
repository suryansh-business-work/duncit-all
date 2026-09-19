/**
 * Finance > Settings > Expense Settings — the page that edits every Expense
 * dropdown: tabs per list, the add/edit dialog, and the guarded delete.
 *
 * Most tests mount the page the way Finance comes BACK to it: with the first
 * list already in the Apollo cache, so it renders on the first paint. The
 * finance table stub reads its rows once, at mount (see mocks/table.tsx), so
 * rows that only arrive later would never reach a row's Edit/Delete buttons.
 */
import { useQuery } from '@apollo/client/react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import ExpenseSettingsPage from '../../src/pages/finance/expense-settings-page';
import { EXPENSE_OPTIONS_TABLE } from '../../src/pages/finance/expense-config';
import { renderWithProviders } from '../testkit';
import { pickOption, typeInto } from '../expense-dom';
import type { VarsMatcher } from '../mocks/expense-config.mock';
import {
  createOptionMock,
  deleteOptionMock,
  makeOptionRow,
  optionsTableErrorMock,
  optionsTableMock,
  updateOptionMock,
} from '../mocks/expense-settings.mock';

/** Mounts the page once its Related From list is cached — a return visit. */
function ReturningVisit() {
  const { data } = useQuery(EXPENSE_OPTIONS_TABLE, { variables: { kind: 'RELATED_FROM_TYPE' } });
  return data ? <ExpenseSettingsPage /> : null;
}

const renderReturning = (mocks: MockedResponse[]) =>
  renderWithProviders(<ReturningVisit />, { mocks: [optionsTableMock('RELATED_FROM_TYPE'), ...mocks] });

const cellText = (field: string) => screen.getAllByTestId(`cell-${field}`).map((cell) => cell.textContent);

const rowOf = (label: string) =>
  screen.getAllByTestId('table-row').find((row) => row.textContent?.includes(label)) as HTMLElement;

const openAdd = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Add option' }));
  return screen.findByRole('dialog', { name: 'Add option' });
};

const confirmDialog = () => screen.findByRole('dialog', { name: 'Delete option' });

describe('ExpenseSettingsPage — lists', () => {
  it('lists the Related From types with their entity list, and drops that column elsewhere', async () => {
    renderReturning([optionsTableMock('CATEGORY', [makeOptionRow({ id: 'opt-rent', kind: 'CATEGORY', key: 'RENT', label: 'Rent', entity_source: '' })])]);
    await waitFor(() => expect(cellText('label')).toEqual(['VenueVENUE', 'Event partnerEVENT_PARTNER']));
    expect(cellText('entity_source')).toEqual(['VENUE', '—']);
    expect(
      screen.getByText(/Switching an option off removes it from the form/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Expense Categories' }));
    await waitFor(() => expect(screen.queryAllByTestId('cell-entity_source')).toHaveLength(0));

    // A category has no entity list to pick.
    const dialog = await openAdd();
    expect(within(dialog).queryByRole('combobox', { name: 'Entity list' })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add option' })).toBeNull());
  });
});

describe('ExpenseSettingsPage — add and edit', () => {
  it('adds an option: validates, previews the stored key, saves and closes', async () => {
    const created = vi.fn<VarsMatcher>(() => true);
    renderWithProviders(<ExpenseSettingsPage />, {
      mocks: [optionsTableMock('RELATED_FROM_TYPE'), createOptionMock({ match: created, delay: 300 })],
    });
    const dialog = await openAdd();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Give the option a display name')).toBeInTheDocument();
    expect(within(dialog).getByText('Give the option a key')).toBeInTheDocument();

    typeInto('Display name', 'League');
    typeInto('Stored key', 'league play');
    // The key's error clears as it is revalidated, and the live preview returns.
    expect(await within(dialog).findByText('Saved as LEAGUE_PLAY')).toBeInTheDocument();
    await pickOption('Entity list', 'CLUB');
    fireEvent.click(within(dialog).getByLabelText('Offered on the Expense form'));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByRole('button', { name: 'Saving…' })).toBeDisabled();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add option' })).toBeNull());
    expect(created).toHaveBeenCalledWith({
      kind: 'RELATED_FROM_TYPE',
      input: { key: 'league play', label: 'League', entity_source: 'CLUB', is_active: false },
    });
  });

  it('says why a create was refused, and starts clean after Cancel', async () => {
    renderWithProviders(<ExpenseSettingsPage />, {
      mocks: [optionsTableMock('RELATED_FROM_TYPE'), createOptionMock({ fail: true })],
    });
    let dialog = await openAdd();
    typeInto('Display name', 'Venue');
    typeInto('Stored key', 'VENUE');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('That key is already used in this list')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add option' })).toBeNull());
    dialog = await openAdd();
    expect(within(dialog).queryByText('That key is already used in this list')).toBeNull();
  });

  it('edits an option without ever sending its key', async () => {
    const updated = vi.fn<VarsMatcher>(() => true);
    renderReturning([updateOptionMock(updated)]);
    await waitFor(() => expect(rowOf('Venue')).toBeDefined());
    fireEvent.click(within(rowOf('VenueVENUE')).getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit option' });
    expect(within(dialog).getByLabelText('Stored key')).toBeDisabled();
    expect(
      within(dialog).getByText('The key is what every expense filed under this option stores, so it never changes.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Display name')).toHaveValue('Venue');

    typeInto('Display name', 'Venue hire');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit option' })).toBeNull());
    expect(updated).toHaveBeenCalledWith({
      option_id: 'opt-venue',
      input: { label: 'Venue hire', entity_source: 'VENUE', is_active: true },
    });
  });

  it('reports a list that could not be re-read after a write', async () => {
    let wrote = false;
    renderWithProviders(<ExpenseSettingsPage />, {
      mocks: [
        optionsTableMock('RELATED_FROM_TYPE', undefined, () => !wrote),
        optionsTableErrorMock(() => wrote),
        createOptionMock({
          match: () => {
            wrote = true;
            return true;
          },
        }),
      ],
    });
    const dialog = await openAdd();
    typeInto('Display name', 'League');
    typeInto('Stored key', 'LEAGUE');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Could not reload the list')).toBeInTheDocument();
  });
});

describe('ExpenseSettingsPage — delete', () => {
  it('deletes an unused option once confirmed, and backs out on Cancel', async () => {
    const deleted = vi.fn<VarsMatcher>(() => true);
    renderReturning([deleteOptionMock({ match: deleted })]);
    await waitFor(() => expect(rowOf('Event partner')).toBeDefined());
    // Built-in and in use: never deletable.
    expect(
      within(rowOf('VenueVENUE')).getByRole('button', {
        name: 'Built-in options and options already used by an expense cannot be deleted — switch them off instead.',
      }),
    ).toBeDisabled();

    fireEvent.click(within(rowOf('Event partner')).getByRole('button', { name: 'Delete' }));
    const first = await confirmDialog();
    expect(within(first).getByText('Event partner will be removed from this list for good.')).toBeInTheDocument();
    fireEvent.click(within(first).getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete option' })).toBeNull());

    fireEvent.click(within(rowOf('Event partner')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await confirmDialog()).getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete option' })).toBeNull());
    expect(deleted).toHaveBeenCalledWith({ option_id: 'opt-partner' });
  });

  it('shows a refused delete on the page, and lets it be dismissed', async () => {
    renderReturning([deleteOptionMock({ fail: true })]);
    await waitFor(() => expect(rowOf('Event partner')).toBeDefined());
    fireEvent.click(within(rowOf('Event partner')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await confirmDialog()).getByTestId('confirm-dialog-confirm'));

    const message = '1 expense(s) use this option — switch it off instead of deleting it';
    expect(await screen.findByText(message)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete option' })).toBeNull());
    fireEvent.click(within(screen.getByText(message).closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText(message)).toBeNull());
  });
});
