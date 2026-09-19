/**
 * Finance > Expenses > Dashboard.
 *
 * One query drives the tiles and the three breakdowns, and the filter bar is
 * what writes its variables — so the assertions are about the numbers landing
 * on the right tile and every filter reaching the server in the shape it
 * answers (blank fields dropped, not sent as '').
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import ExpenseDashboardPage from '../../src/pages/finance/expense-dashboard-page';
import { renderWithProviders } from '../testkit';
import { pickOption, typeInto } from '../expense-dom';
import {
  allExpenseOptionsMocks,
  makeRelatedEntity,
  relatedEntitiesMock,
  relatedEntityMock,
  type VarsMatcher,
} from '../mocks/expense-config.mock';
import { expenseDashboardMock, makeExpenseDashboard } from '../mocks/expense-dashboard.mock';

const renderDashboard = (match: VarsMatcher = () => true) =>
  renderWithProviders(<ExpenseDashboardPage />, {
    mocks: [
      ...allExpenseOptionsMocks(),
      expenseDashboardMock(makeExpenseDashboard(), match),
      relatedEntitiesMock('VENUE'),
      relatedEntityMock(makeRelatedEntity()),
    ],
  });

const tile = (label: string) =>
  screen.getAllByTestId('stat-card').filter((card) => within(card).getByTestId('stat-label').textContent === label);

/** The Card around one breakdown, found by its caption. */
const breakdown = (title: string) => screen.getByText(title).closest('.MuiCard-root') as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExpenseDashboardPage', () => {
  it('shows loading tiles, then every total, count and breakdown bar', async () => {
    renderDashboard();
    expect(screen.getAllByTestId('stat-loading')).toHaveLength(8);
    expect(screen.getAllByText('No expenses match these filters.')).toHaveLength(3);

    await waitFor(() => expect(screen.queryByTestId('stat-loading')).toBeNull());
    const [total] = tile('Total expenses');
    expect(within(total).getByTestId('stat-value')).toHaveTextContent('₹12500.00');
    expect(within(total).getByTestId('stat-hint')).toHaveTextContent('9 expense(s)');
    expect(within(tile('Total compensation')[0]).getByTestId('stat-value')).toHaveTextContent('₹4800.00');
    const [owed, pendingState] = tile('Pending compensation');
    expect(within(owed).getByTestId('stat-value')).toHaveTextContent('₹6700.00');
    expect(within(owed).getByTestId('stat-hint')).toHaveTextContent('Not yet paid back, and not rejected');
    expect(within(pendingState).getByTestId('stat-hint')).toHaveTextContent('4 expense(s)');
    expect(within(tile('This month')[0]).getByTestId('stat-hint')).toHaveTextContent('Last month ₹8300.00');
    expect(within(tile('Partially compensated')[0]).getByTestId('stat-value')).toHaveTextContent('₹3000.00');
    expect(within(tile('Fully compensated')[0]).getByTestId('stat-value')).toHaveTextContent('₹3500.00');
    expect(within(tile('Rejected expenses')[0]).getByTestId('stat-hint')).toHaveTextContent('1 expense(s)');

    // Bars are relative to the biggest slice, labelled from the configured lists.
    const byCategory = breakdown('Expense by category');
    await waitFor(() => expect(within(byCategory).getByText('Rent')).toBeInTheDocument());
    expect(within(byCategory).getByText('₹8000.00')).toBeInTheDocument();
    expect(
      within(byCategory)
        .getAllByRole('progressbar')
        .map((bar) => bar.getAttribute('aria-valuenow')),
    ).toEqual(['100', '56']);

    const byType = breakdown('Expense by related entity type');
    await waitFor(() => expect(within(byType).getByText('Venue')).toBeInTheDocument());
    expect(within(byType).getByText('Not attributed')).toBeInTheDocument();
    expect(within(byType).getByText('₹5500.00')).toBeInTheDocument();

    expect(
      within(breakdown('Expense by compensation method')).getByText('No expenses match these filters.'),
    ).toBeInTheDocument();
  });

  it('sends every filter it is given, drops the blank ones, and clears them all', async () => {
    const match = vi.fn<VarsMatcher>(() => true);
    renderDashboard(match);
    await waitFor(() => expect(match).toHaveBeenCalledWith({ filter: null }));
    const lastFilter = () => match.mock.lastCall?.[0].filter;

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-01T00:00:00.000Z' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-08-31T00:00:00.000Z' } });
    await pickOption('Category', 'Rent');
    await pickOption('Expense Related From', 'Venue');
    // The type alone: its blank entity is not sent as ''.
    await waitFor(() => expect(lastFilter()).toMatchObject({ related_from_type: 'VENUE' }));
    expect(lastFilter()).not.toHaveProperty('related_from_id');

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(await screen.findByRole('option', { name: /Smash Arena/ }));
    await pickOption('Compensation status', 'Partially compensated');
    await pickOption('Compensation method', 'Vendor refund');
    typeInto('Paid by', 'Asha');

    await waitFor(() =>
      expect(lastFilter()).toEqual({
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-31T00:00:00.000Z',
        category: 'RENT',
        related_from_type: 'VENUE',
        related_from_id: 'ven-1',
        compensation_status: 'PARTIAL',
        compensation_method: 'VENDOR_REFUND',
        paid_by: 'Asha',
      }),
    );

    // Clearing a date drops it from the query rather than sending ''.
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '' } });
    await waitFor(() => expect(lastFilter()).not.toHaveProperty('from'));
    expect(screen.getByLabelText('From')).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(lastFilter()).toBeNull());
    expect(screen.getByLabelText('Paid by')).toHaveValue('');
  });
});
