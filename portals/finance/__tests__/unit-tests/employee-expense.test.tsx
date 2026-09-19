/**
 * Finance > Employee Expenses — the queue Finance decides employee claims in.
 *
 * What is pinned here is what a decision rests on: the tiles counting what is
 * still owed an answer, each row saying who filed it and whether a bill is
 * behind it, and the review dialog refusing a rejection with no reason.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { logs } from '@duncit/logs';
import EmployeeExpensePage from '../../src/pages/finance/employee-expense-page';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import type { VarsMatcher } from '../mocks/expense-config.mock';
import {
  approvedClaim,
  billlessClaim,
  employeeSummaryErrorMock,
  employeeSummaryMock,
  makeClaim,
  makeEmployeeSummary,
  rejectedClaim,
  reviewClaimMock,
} from '../mocks/employee-expense.mock';

const renderPage = (mocks: MockedResponse[] = [employeeSummaryMock()]) =>
  renderWithProviders(<EmployeeExpensePage />, { mocks });

const cellText = (field: string) => screen.getAllByTestId(`cell-${field}`).map((cell) => cell.textContent);

const tile = (label: string) =>
  screen.getAllByTestId('stat-card').find((card) => within(card).getByTestId('stat-label').textContent === label) as HTMLElement;

/** Opens the review dialog on the queue's row at `index`. */
const openClaim = async (index: number) => {
  await waitFor(() => expect(screen.getAllByTestId('row-open').length).toBeGreaterThan(index));
  fireEvent.click(screen.getAllByTestId('row-open')[index]);
  return screen.findByRole('dialog', { name: 'Review claim' });
};

const dialogGone = () => waitFor(() => expect(screen.queryByRole('dialog', { name: 'Review claim' })).toBeNull());

beforeEach(() => {
  resetTableControls();
  tableControls.rowsByKey = {
    employeeExpensesTable: [makeClaim(), billlessClaim(), approvedClaim(), rejectedClaim()],
  };
});

describe('EmployeeExpensePage — the queue', () => {
  it('opens on the claims awaiting a decision, with the tiles above them', async () => {
    renderPage();
    expect(screen.getAllByTestId('stat-loading')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Awaiting review' })).toHaveAttribute('aria-selected', 'true');

    await waitFor(() => expect(screen.queryByTestId('stat-loading')).toBeNull());
    expect(within(tile('Awaiting your decision')).getByTestId('stat-value')).toHaveTextContent('₹2100.00');
    expect(within(tile('Awaiting your decision')).getByTestId('stat-hint')).toHaveTextContent('2 claim(s)');
    expect(within(tile('Approved')).getByTestId('stat-value')).toHaveTextContent('₹5980.00');
    expect(within(tile('Rejected')).getByTestId('stat-hint')).toHaveTextContent('1 claim(s)');
    expect(within(tile('Claimed all time')).getByTestId('stat-value')).toHaveTextContent('₹9340.00');
    expect(within(tile('Claimed all time')).getByTestId('stat-hint')).toHaveTextContent('across 3 employee(s)');

    fireEvent.click(screen.getByRole('tab', { name: 'All claims' }));
    expect(screen.getByRole('tab', { name: 'All claims' })).toHaveAttribute('aria-selected', 'true');
  });

  it('says who filed each claim, what it was for, and whether a bill is behind it', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(4));
    expect(cellText('employee_name')).toEqual([
      'Asha RaoDUN-EXP-4F2A19',
      'ravi@duncit.comDUN-EXP-77B0C1',
      'Asha RaoDUN-EXP-19C2AA',
      'Asha RaoDUN-EXP-5D0E3B',
    ]);
    expect(cellText('status')).toEqual(['Awaiting review', 'Awaiting review', 'Approved', 'Rejected']);
    // The payee when there is one, else what it was for.
    expect(cellText('category')[0]).toBe('TravelUber');
    expect(cellText('category')[1]).toBe('MealsTeam lunch after the league final');
    expect(cellText('bill_url')).toEqual(['INV-2291', 'Not attached', 'View bill', 'INV-2291']);
    expect(cellText('payment_method')).toEqual(['Upi', 'Cash', 'Upi', 'Upi']);
    await waitFor(() => expect(cellText('amount')[0]).toBe('₹1240.00'));
  });

  it('opens a bill without the click reaching the row behind it', async () => {
    renderPage();
    const bill = await screen.findByRole('link', { name: 'View bill' });
    expect(bill).toHaveAttribute('href', 'https://ik.imagekit.io/duncit/bills/inv-2291.pdf');
    // jsdom has no navigation; keep it from trying.
    bill.addEventListener('click', (event) => event.preventDefault());
    const reachedDocument = vi.fn();
    document.addEventListener('click', reachedDocument);
    fireEvent.click(bill);
    document.removeEventListener('click', reachedDocument);
    expect(reachedDocument).not.toHaveBeenCalled();
  });
});

describe('ReviewClaimDialog', () => {
  it('rejects only with a note, then refreshes the queue and the tiles', async () => {
    const reviewed = vi.fn<VarsMatcher>(() => true);
    renderPage([employeeSummaryMock(), reviewClaimMock({ match: reviewed })]);
    const dialog = await openClaim(0);

    expect(within(dialog).queryByText('No bill is attached to this claim.')).toBeNull();
    expect(within(dialog).getByText('Asha Rao')).toBeInTheDocument();
    expect(within(dialog).getByText('Uber')).toBeInTheDocument();
    expect(within(dialog).getByText('UPI-778812')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'INV-2291' })).toBeInTheDocument();

    const reject = within(dialog).getByRole('button', { name: 'Reject' });
    expect(reject).toBeDisabled();
    expect(within(dialog).getByText('Required — tell the employee why this was rejected.')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Note to the employee'), {
      target: { value: 'Personal trip' },
    });
    expect(within(dialog).getByText('Optional — anything the employee should know.')).toBeInTheDocument();
    fireEvent.click(reject);
    await dialogGone();
    expect(reviewed).toHaveBeenCalledWith({ expense_doc_id: 'claim-1', decision: 'REJECTED', note: 'Personal trip' });
  });

  it('warns about a missing bill and still lets the claim be approved without a note', async () => {
    const reviewed = vi.fn<VarsMatcher>(() => true);
    renderPage([employeeSummaryMock(), reviewClaimMock({ match: reviewed })]);
    const dialog = await openClaim(1);

    expect(within(dialog).getByText('No bill is attached to this claim.')).toBeInTheDocument();
    expect(within(dialog).getByText('ravi@duncit.com')).toBeInTheDocument();
    expect(within(dialog).getByText('Not attached')).toBeInTheDocument();
    // Neither a payee nor a reference was given.
    expect(within(dialog).getAllByText('—')).toHaveLength(2);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    await dialogGone();
    expect(reviewed).toHaveBeenCalledWith({ expense_doc_id: 'claim-2', decision: 'APPROVED', note: '' });
  });

  it('shows a decided claim read-only, with who decided it and why', async () => {
    renderPage();
    let dialog = await openClaim(2);
    expect(within(dialog).getByText('This claim has already been decided.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(within(dialog).getByRole('link', { name: 'View bill' })).toBeInTheDocument();
    expect(within(dialog).getByText('Decided 14 Aug 2026')).toBeInTheDocument();
    // No description and no note: both read as a dash, not as blank space.
    expect(within(dialog).getAllByText('—')).toHaveLength(2);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await dialogGone();

    dialog = await openClaim(3);
    expect(within(dialog).getByText('Personal travel, not a Duncit trip')).toBeInTheDocument();
  });

  it('says why a decision failed and keeps the dialog open', async () => {
    renderPage([employeeSummaryMock(), reviewClaimMock({ fail: true })]);
    const dialog = await openClaim(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    expect(await within(dialog).findByText('This claim has already been decided')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Review claim' })).toBeInTheDocument();
  });

  it('never carries a note from one claim over to the next', async () => {
    renderPage();
    let dialog = await openClaim(0);
    fireEvent.change(within(dialog).getByLabelText('Note to the employee'), { target: { value: 'Looks fine' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await dialogGone();

    dialog = await openClaim(1);
    expect(within(dialog).getByLabelText('Note to the employee')).toHaveValue('');
  });

  it('logs when the tiles cannot refresh after a decision', async () => {
    const warn = vi.spyOn(logs.portal.finance, 'warn').mockImplementation(() => undefined);
    renderPage([employeeSummaryMock(makeEmployeeSummary(), 1), employeeSummaryErrorMock(), reviewClaimMock()]);
    const dialog = await openClaim(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    await dialogGone();
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('EmployeeExpensePage', 'handleDecided', {
        error: expect.any(Error),
        msg: 'Employee expense summary refresh failed',
      }),
    );
    warn.mockRestore();
  });
});
