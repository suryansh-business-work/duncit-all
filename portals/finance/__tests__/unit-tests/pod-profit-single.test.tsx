import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import SinglePodTab from '../../src/pages/calculators/pod-profit/single';
import { ConfirmProvider } from '../../../../packages/dialogs/src/useConfirm';
import { renderWithProviders } from '../testkit';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import {
  calculatorDefaultsMock,
  createPodCalculatorMock,
  deletePodCalculatorMock,
  makeCalculator,
  makePod,
  podCalculatorsErrorMock,
  podCalculatorsMock,
  updatePodCalculatorMock,
} from '../mocks/pod-calculator.mock';

// The stub's useConfirm always says yes. These flows need the real one — a
// Cancel that resolves false is half of what they do — so swap it in and mount
// the real provider around the tab.
vi.mock('./mocks/dialogs', async (importOriginal) => {
  const stub = await importOriginal<typeof import('./mocks/dialogs')>();
  const { useConfirm } = await import('../../../../packages/dialogs/src/useConfirm');
  return { ...stub, useConfirm };
});

// The single tab stores its one pod under the calculation's own name.
const single = (id: string, name: string) =>
  makeCalculator({ id, name, pods: [makePod({ name })] });

const saved = single('66f1a2b3c4d5e6f708192a01', 'Diwali weekend');

const renderTab = (mocks: MockedResponse[], entry = '/') =>
  renderWithProviders(
    <ConfirmProvider>
      <SinglePodTab />
    </ConfirmProvider>,
    { mocks: [calculatorDefaultsMock(), ...mocks], path: '/', entry },
  );

const nameField = () => screen.findByLabelText<HTMLInputElement>('Calculation name');
const nameValue = () => screen.getByLabelText<HTMLInputElement>('Calculation name').value;
const saveButton = () => screen.getByRole('button', { name: 'Save' });

beforeEach(() => {
  resetTableControls();
  notifySuccess.mockClear();
  notifyError.mockClear();
});

describe('Single pod tab — scratch pad', () => {
  it('names and saves a fresh calculation, then opens the new row', async () => {
    const created = single('66f1a2b3c4d5e6f708192a09', 'Navratri garba night');
    renderTab([
      podCalculatorsMock('SINGLE', []),
      createPodCalculatorMock(created, { delay: 20 }),
      podCalculatorsMock('SINGLE', [created]),
    ]);

    const name = await nameField();
    // Unnamed, there is nothing to save it under.
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'New calculation' })).toBeNull();
    expect(screen.getByTestId('table-empty')).toHaveTextContent('No saved calculations yet');

    fireEvent.change(name, { target: { value: '  Navratri garba night ' } });
    fireEvent.click(saveButton());
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Calculation saved'));
    // Refetched and opened: the saved row is loaded, clean, and exportable.
    expect(await screen.findByRole('button', { name: 'New calculation' })).toBeInTheDocument();
    expect(nameValue()).toBe('Navratri garba night');
    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
  });

  it('reports a refused save and keeps the calculator as it was', async () => {
    renderTab([
      podCalculatorsMock('SINGLE', []),
      createPodCalculatorMock(saved, { fail: 'A calculation name is required' }),
    ]);
    fireEvent.change(await nameField(), { target: { value: 'Diwali weekend' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('A calculation name is required'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(saveButton()).toBeEnabled();
  });

  it('shows the list error when the refetch after a save fails', async () => {
    renderTab([
      podCalculatorsMock('SINGLE', []),
      createPodCalculatorMock(saved),
      podCalculatorsErrorMock('SINGLE', 'Network request failed'),
    ]);
    fireEvent.change(await nameField(), { target: { value: 'Diwali weekend' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Calculation saved'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network request failed');
  });

  it('adds, edits and removes expense lines, charging each to its side', async () => {
    renderTab([podCalculatorsMock('SINGLE', [])]);
    await nameField();
    expect(screen.getByText('No expenses yet — add one to see net profit after costs.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(screen.queryByText(/No expenses yet/)).toBeNull();

    const labels = screen.getAllByLabelText<HTMLInputElement>('Expense');
    const amounts = screen.getAllByLabelText<HTMLInputElement>('Amount');
    expect(labels).toHaveLength(2);

    fireEvent.change(labels[1], { target: { value: 'Coach travel' } });
    fireEvent.mouseDown(screen.getAllByRole('combobox')[1]);
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Host' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    fireEvent.change(amounts[1], { target: { value: '1500' } });
    // A negative cost reads as nothing spent.
    fireEvent.change(amounts[0], { target: { value: '-20' } });
    expect(amounts[0].value).toBe('0');

    expect(screen.getByText('Total expenses: ₹1,500')).toBeInTheDocument();
    expect(screen.getAllByText('Host expenses: ₹1,500').length).toBeGreaterThan(0);
    expect(screen.getByText('Costs & net')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove expense' })[0]);
    const remaining = screen.getAllByLabelText<HTMLInputElement>('Expense');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].value).toBe('Coach travel');
    expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('Host');
  });

  it('shows the error when the saved list cannot load', async () => {
    renderTab([podCalculatorsErrorMock('SINGLE', 'Network request failed')]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Network request failed');
  });
});

describe('Single pod tab — a saved calculation', () => {
  const entry = `/?calculation=${saved.id}`;

  it('loads a row picked from the library', async () => {
    const other = single('66f1a2b3c4d5e6f708192a02', 'Navratri garba night');
    tableControls.queries = [{ search: 'navratri', filters: [], page: 1, pageSize: 25, sortBy: undefined, sortDir: 'asc' }];
    renderTab([podCalculatorsMock('SINGLE', [saved, other])]);

    // The search keeps only the matching row.
    const rows = await screen.findAllByTestId('table-row');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByTestId('cell-name')).toHaveTextContent('Navratri garba night');
    expect(within(rows[0]).getByTestId('cell-duncit_revenue_total')).toHaveTextContent('₹4,193.93');

    fireEvent.click(within(rows[0]).getByTestId('row-open'));
    await waitFor(() => expect(nameValue()).toBe('Navratri garba night'));
    expect(screen.getByRole('button', { name: 'New calculation' })).toBeInTheDocument();
  });

  it('saves an edit and goes clean once the stored row matches', async () => {
    const renamed = single(saved.id, 'Diwali weekend (final)');
    renderTab(
      [podCalculatorsMock('SINGLE', [saved]), updatePodCalculatorMock(renamed), podCalculatorsMock('SINGLE', [renamed])],
      entry,
    );
    const name = await nameField();
    expect(name.value).toBe('Diwali weekend');
    expect(saveButton()).toBeDisabled();

    fireEvent.change(name, { target: { value: 'Diwali weekend (final)' } });
    expect(saveButton()).toBeEnabled();
    // Unsaved edits are not in the report yet.
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeDisabled();

    fireEvent.click(saveButton());
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Calculation saved'));
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
  });

  it('deletes only once the confirmation is accepted', async () => {
    renderTab([podCalculatorsMock('SINGLE', [saved]), deletePodCalculatorMock(), podCalculatorsMock('SINGLE', [])], entry);
    await nameField();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('dialog', { name: 'Delete this saved calculation?' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(notifySuccess).not.toHaveBeenCalled();
    expect((await nameField()).value).toBe('Diwali weekend');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Calculation deleted'));
    // Back on a blank scratch pad.
    await waitFor(() => expect(nameValue()).toBe(''));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('reports a failed delete and leaves the row open', async () => {
    renderTab([podCalculatorsMock('SINGLE', [saved]), deletePodCalculatorMock({ fail: 'Calculation not found' })], entry);
    await nameField();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Calculation not found'));
    expect((await nameField()).value).toBe('Diwali weekend');
  });

  it('starts a new calculation from an open one', async () => {
    renderTab([podCalculatorsMock('SINGLE', [saved])], entry);
    await nameField();

    fireEvent.click(screen.getByRole('button', { name: 'New calculation' }));
    await waitFor(() => expect(nameValue()).toBe(''));
    expect(screen.queryByRole('button', { name: 'Download PDF' })).toBeNull();
  });

  it('opens a stored calculation that has no pods on the default deductions', async () => {
    const empty = makeCalculator({ id: '66f1a2b3c4d5e6f708192a03', name: 'Imported estimate', pods: [] });
    renderTab([podCalculatorsMock('SINGLE', [empty])], `/?calculation=${empty.id}`);

    expect((await nameField()).value).toBe('Imported estimate');
    expect(screen.getByLabelText<HTMLInputElement>('Ticket price per spot (GST-inclusive)').value).toBe('1000');
    // The pod on screen is not what is stored, so it can be saved but not exported.
    expect(saveButton()).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
  });
});
