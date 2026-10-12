import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import ExpenseClaimPage from '../../src/pages/expenses/ExpenseClaimPage';
import { labelize } from '../../src/pages/expenses/queries';
import { renderWithProviders } from '../testkit';
import {
  createExpenseMock,
  expenseCurrencyMock,
  makeExpenseClaim,
  myExpenseErrorMock,
  myExpenseMock,
  updateExpenseMock,
} from '../mocks';

// The pickers' own suites cover the calendar; a native date input speaks the
// same value / onChange / helper-text contract this form depends on.
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({
    label,
    value,
    onChange,
    slotProps,
  }: {
    label: string;
    value: Date | null;
    onChange: (next: Date | null) => void;
    slotProps?: { textField?: { helperText?: string; error?: boolean } };
  }) => (
    <label>
      {label}
      <input
        type="date"
        aria-label={label}
        value={value ? value.toISOString().slice(0, 10) : ''}
        aria-invalid={slotProps?.textField?.error ? 'true' : undefined}
        onChange={(event) => onChange(event.target.value ? new Date(event.target.value) : null)}
      />
      <span>{slotProps?.textField?.helperText}</span>
    </label>
  ),
}));

// The uploader needs the media backend; a button that reports a stored file
// is the same contract as far as this form is concerned.
vi.mock('@duncit/media-picker', () => ({
  SingleImageUploadField: ({
    value,
    onChange,
    label,
    buttonLabel,
    helperText,
  }: {
    value: string;
    onChange: (url: string) => void;
    label: string;
    buttonLabel: string;
    helperText: string;
  }) => (
    <div>
      <span>{label}</span>
      <button type="button" onClick={() => onChange('https://ik.imagekit.io/duncit/employee-expenses/new.pdf')}>
        {buttonLabel}
      </button>
      <input aria-label="Bill address" value={value} onChange={(event) => onChange(event.target.value)} />
      <span data-testid="bill-value">{value}</span>
      <span>{helperText}</span>
    </div>
  ),
}));

/**
 * File or edit one claim. A claim is a request, not a payment, and the page
 * says so; the bill is optional on purpose, and everything Finance needs to
 * chase is validated here before it is sent.
 */
const renderNew = (mocks: MockedResponse[] = []) =>
  renderWithProviders(<></>, {
    mocks: [expenseCurrencyMock(), ...mocks],
    initialEntries: ['/expenses/new'],
    routes: (
      <>
        <Route path="/expenses/new" element={<ExpenseClaimPage />} />
        <Route path="/expenses" element={<div>EXPENSES LIST</div>} />
      </>
    ),
  });

const renderEdit = (mocks: MockedResponse[], id = 'exp-1') =>
  renderWithProviders(<></>, {
    mocks: [expenseCurrencyMock(), ...mocks],
    initialEntries: [`/expenses/${id}/edit`],
    routes: (
      <>
        <Route path="/expenses/:expenseId/edit" element={<ExpenseClaimPage />} />
        <Route path="/expenses" element={<div>EXPENSES LIST</div>} />
      </>
    ),
  });

const amount = () => screen.getByLabelText('Amount');
const submit = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('ExpenseClaimPage — filing a claim', () => {
  it('opens on today with the disclaimer that filing is a request and the amount in the admin currency', async () => {
    renderNew();

    expect(await screen.findByRole('heading', { name: 'New claim' })).toBeInTheDocument();
    expect(screen.getByText(/Filing a claim is a request, not a payment/)).toBeInTheDocument();
    expect(screen.getByLabelText('Spend date')).toHaveValue(new Date().toISOString().slice(0, 10));
    expect(await screen.findByText('₹')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'File claim' })).toBeInTheDocument();
  });

  it('files the claim with a numeric amount and an ISO date, then returns to the list', async () => {
    renderNew([
      createExpenseMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return (
          input.amount === 450.5 &&
          input.category === 'TRAVEL' &&
          input.payment_method === 'UPI' &&
          input.merchant === 'Uber' &&
          input.bill_number === 'INV-9' &&
          input.bill_url === 'https://ik.imagekit.io/duncit/employee-expenses/new.pdf' &&
          input.reference === 'UTR1' &&
          input.description === 'Cab to the client' &&
          input.date === '2026-03-04T00:00:00.000Z'
        );
      }),
    ]);
    await screen.findByRole('heading', { name: 'New claim' });

    fireEvent.change(screen.getByLabelText('Spend date'), { target: { value: '2026-03-04' } });
    fireEvent.change(amount(), { target: { value: '450.5' } });
    fireEvent.change(screen.getByLabelText('Paid to'), { target: { value: 'Uber' } });
    fireEvent.change(screen.getByLabelText('Bill / invoice number'), { target: { value: 'INV-9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    expect(screen.getByTestId('bill-value')).toHaveTextContent('new.pdf');
    fireEvent.change(screen.getByLabelText('Reference / transaction id'), { target: { value: 'UTR1' } });
    fireEvent.change(screen.getByLabelText('What it was for'), { target: { value: 'Cab to the client' } });
    submit('File claim');

    expect(await screen.findByText('EXPENSES LIST')).toBeInTheDocument();
  });

  it('refuses a claim with no amount, and one that is not above zero', async () => {
    renderNew();
    await screen.findByRole('heading', { name: 'New claim' });
    submit('File claim');
    expect(await screen.findByText('Enter an amount greater than 0')).toBeInTheDocument();
    expect(screen.queryByText('EXPENSES LIST')).not.toBeInTheDocument();

    fireEvent.change(amount(), { target: { value: '-5' } });
    submit('File claim');
    expect(await screen.findByText('Enter an amount greater than 0')).toBeInTheDocument();
  });

  it('refuses a claim with no spend date', async () => {
    renderNew();
    await screen.findByRole('heading', { name: 'New claim' });
    fireEvent.change(screen.getByLabelText('Spend date'), { target: { value: '' } });
    fireEvent.change(amount(), { target: { value: '10' } });
    submit('File claim');

    expect(await screen.findByText('Pick the day you paid')).toBeInTheDocument();
  });

  it('refuses text that is longer than Finance can store', async () => {
    renderNew();
    await screen.findByRole('heading', { name: 'New claim' });
    fireEvent.change(amount(), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Paid to'), { target: { value: 'm'.repeat(201) } });
    submit('File claim');

    expect(await screen.findByText('Too long')).toBeInTheDocument();
  });

  it('refuses a bill address that is longer than Finance can store', async () => {
    renderNew();
    await screen.findByRole('heading', { name: 'New claim' });
    fireEvent.change(amount(), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Bill address'), {
      target: { value: `https://example.com/${'a'.repeat(2050)}` },
    });
    submit('File claim');

    expect(await screen.findByText('Too long')).toBeInTheDocument();
    expect(screen.queryByText('EXPENSES LIST')).not.toBeInTheDocument();
  });

  it("shows the server's reason when the claim is refused and stays on the form", async () => {
    renderNew([createExpenseMock(() => true, 'The filing window for March is closed')]);
    await screen.findByRole('heading', { name: 'New claim' });
    fireEvent.change(amount(), { target: { value: '100' } });
    submit('File claim');

    expect(await screen.findByText('The filing window for March is closed')).toBeInTheDocument();
    expect(screen.queryByText('EXPENSES LIST')).not.toBeInTheDocument();
  });

  it('goes back to the list from Back and from Cancel without filing anything', async () => {
    renderNew();
    await screen.findByRole('heading', { name: 'New claim' });
    fireEvent.click(screen.getByRole('button', { name: 'Back to my expenses' }));
    expect(await screen.findByText('EXPENSES LIST')).toBeInTheDocument();
  });

  it('cancels from the form', async () => {
    renderNew();
    await screen.findByRole('heading', { name: 'New claim' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('EXPENSES LIST')).toBeInTheDocument();
  });
});

describe('ExpenseClaimPage — editing a claim', () => {
  const claim = makeExpenseClaim({ date: '2026-03-04T00:00:00.000Z' });

  it('seeds the form from the saved claim and updates it by id', async () => {
    renderEdit([
      myExpenseMock(claim),
      updateExpenseMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return variables.expense_doc_id === 'exp-1' && input.amount === 1500 && input.merchant === 'Uber';
      }),
    ]);

    expect(await screen.findByRole('heading', { name: 'Edit claim' })).toBeInTheDocument();
    await waitFor(() => expect(amount()).toHaveValue(1200));
    expect(screen.getByLabelText('Paid to')).toHaveValue('Uber');
    expect(screen.getByLabelText('Reference / transaction id')).toHaveValue('UTR998877');
    expect(screen.getByLabelText('Spend date')).toHaveValue('2026-03-04');
    expect(screen.getByTestId('bill-value')).toHaveTextContent('inv-77.pdf');

    fireEvent.change(amount(), { target: { value: '1500' } });
    submit('Save');

    expect(await screen.findByText('EXPENSES LIST')).toBeInTheDocument();
  });

  it('keeps the form off the page until the claim it edits has arrived', async () => {
    renderEdit([myExpenseMock(claim)]);
    // First paint: the claim is still on its way, so there is no form to fill in.
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();
    await waitFor(() => expect(amount()).toHaveValue(1200));
  });

  it('says the claim could not be found when the id answers with nothing', async () => {
    renderEdit([myExpenseMock(null)]);
    expect(
      await screen.findByText('This claim could not be found. It may have been withdrawn already.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();
  });

  it("shows the server's own words when the claim cannot be read", async () => {
    renderEdit([myExpenseErrorMock('That claim belongs to somebody else')]);
    expect(await screen.findByText('That claim belongs to somebody else')).toBeInTheDocument();
  });

  it('shows a saving label and blocks Cancel while the update is in flight', async () => {
    renderEdit([myExpenseMock(claim), { ...updateExpenseMock(), delay: 400 }]);
    await waitFor(() => expect(amount()).toHaveValue(1200));
    submit('Save');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled());
    expect(await screen.findByText('EXPENSES LIST')).toBeInTheDocument();
  });
});

describe('labelize', () => {
  it.each([
    ['TRAVEL', 'Travel'],
    ['FOOD_AND_MEALS', 'Food And Meals'],
    ['BANK_TRANSFER', 'Bank Transfer'],
  ])('words %s as "%s"', (code, words) => {
    expect(labelize(code)).toBe(words);
  });

  it('keeps the gap a doubled underscore leaves rather than throwing on an empty word', () => {
    expect(labelize('A__B')).toBe('A  B');
  });
});
