/**
 * The Duncit Expense form, its schema and the value mappers either side of it.
 *
 * Rendered the way ExpenseDrawer mounts it: one form kept mounted, fed the
 * expense being edited (or null for a new one), a busy flag while a save is in
 * flight, and the save/cancel callbacks. The harness below swaps the expense
 * and flips `busy` exactly as the drawer does between rows and saves.
 */
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import ExpenseForm, {
  expenseSchema,
  previewStatus,
  toExpenseInput,
  toFormValues,
  type ExpenseFormValues,
  type ExpenseRecord,
} from '../../src/pages/finance/expense-management-page/expense-form';
import { renderWithProviders } from '../testkit';
import { pickOption, typeInto } from '../expense-dom';
import {
  allExpenseOptionsMocks,
  makeRelatedEntity,
  relatedEntitiesMock,
  relatedEntityMock,
} from '../mocks/expense-config.mock';
import { attributedExpense, makeExpense, type ExpenseMock } from '../mocks/expense.mock';

/** A ledger row as the drawer holds it (the selection omits these two fields). */
const toRecord = (mock: ExpenseMock): ExpenseRecord => ({
  ...mock,
  expense_id: 'DUN-EXP-4F2A19',
  refunds: mock.refunds.map((refund) => ({ ...refund, created_at: refund.date })),
});

type Submit = (values: ExpenseFormValues) => void;

interface HarnessProps {
  first: ExpenseRecord | null;
  next?: ExpenseRecord;
  onSubmit: Submit;
  onCancel: () => void;
}

/** ExpenseDrawer's side of the contract: which expense, and whether it is saving. */
function DrawerHarness({ first, next, onSubmit, onCancel }: Readonly<HarnessProps>) {
  const [expense, setExpense] = useState(first);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setBusy(true)}>
        harness-busy
      </button>
      <button type="button" onClick={() => setExpense(next ?? null)}>
        harness-next
      </button>
      <ExpenseForm expense={expense} currency="₹" busy={busy} onCancel={onCancel} onSubmit={onSubmit} />
    </>
  );
}

const renderForm = (first: ExpenseRecord | null, next?: ExpenseRecord) => {
  const onSubmit = vi.fn<Submit>();
  const onCancel = vi.fn();
  renderWithProviders(<DrawerHarness first={first} next={next} onSubmit={onSubmit} onCancel={onCancel} />, {
    mocks: [
      ...allExpenseOptionsMocks(),
      relatedEntitiesMock('VENUE'),
      relatedEntitiesMock('POD', []),
      // A picked venue is re-read by id while the picker re-searches its name.
      relatedEntityMock(makeRelatedEntity()),
    ],
  });
  return { onSubmit, onCancel };
};

const statusPreview = () => screen.getByTestId('status-chip');
const entityBox = () => screen.getByRole('combobox', { name: 'Related entity' });

/** Opens the entity picker and picks one of the listed venues. */
const pickEntity = async (name: RegExp) => {
  fireEvent.click(screen.getByRole('button', { name: 'Open' }));
  fireEvent.click(await screen.findByRole('option', { name }));
};

const submit = (label = 'Add expense') => fireEvent.click(screen.getByRole('button', { name: label }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExpenseForm — Related From', () => {
  it('asks for the entity once a type is picked, and clears it when the type changes', async () => {
    const { onSubmit } = renderForm(null);
    typeInto('Amount', '250');
    await pickOption('Category', 'Rent');
    await pickOption('Payment method', 'UPI');
    expect(entityBox()).toBeDisabled();

    await pickOption('Expense Related From', 'Venue');
    submit();
    expect(await screen.findByText('Pick what this expense was for')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await pickEntity(/Smash Arena/);
    await waitFor(() => expect(entityBox()).toHaveValue('Smash Arena'));

    // A pod is a different collection: the venue chosen above cannot follow.
    await pickOption('Expense Related From', 'Pod');
    await waitFor(() => expect(entityBox()).toHaveValue(''));

    await pickOption('Expense Related From', 'Not attributed');
    expect(entityBox()).toBeDisabled();
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ related_from_type: '', related_from_id: '' });
  });
});

describe('ExpenseForm — compensation', () => {
  it('previews the status the numbers produce, and refuses more than was spent', async () => {
    const { onSubmit } = renderForm(null);
    expect(statusPreview()).toHaveTextContent('Pending compensation');

    typeInto('Amount', '250');
    typeInto('Compensated amount', '100');
    expect(statusPreview()).toHaveTextContent('Partially compensated');
    typeInto('Compensated amount', '250');
    expect(statusPreview()).toHaveTextContent('Fully compensated');

    fireEvent.click(screen.getByLabelText('Reject this expense — nobody pays it back'));
    expect(statusPreview()).toHaveTextContent('Rejected');

    typeInto('Compensated amount', '300');
    submit();
    expect(
      await screen.findByText('Compensation cannot be more than the expense itself'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hands every filled field to the save, ready to become the mutation input', async () => {
    const { onSubmit } = renderForm(null);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-08-01T10:00:00.000Z' } });
    typeInto('Amount', '250');
    await pickOption('Category', 'Marketing');
    await pickOption('Payment method', 'Bank transfer');
    await pickOption('Expense Related From', 'Venue');
    await pickEntity(/Smash Arena/);
    typeInto('Vendor / payee', 'Smash Arena Pvt Ltd');
    typeInto('Paid by', 'Asha');
    typeInto('Reference / txn id', 'UTR-7781');
    typeInto('Description', 'Court hire for DUN-POD-4821');
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    await pickOption('Compensation method', 'Vendor refund');
    typeInto('Compensated amount', '100');
    fireEvent.change(screen.getByLabelText('Compensation date'), {
      target: { value: '2026-08-03T10:00:00.000Z' },
    });
    typeInto('Compensation reference / txn id', 'RF-22');

    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(toExpenseInput(onSubmit.mock.calls[0][0])).toEqual({
      date: '2026-08-01T10:00:00.000Z',
      category: 'MARKETING',
      amount: 250,
      vendor_name: 'Smash Arena Pvt Ltd',
      payment_method: 'BANK_TRANSFER',
      reference: 'UTR-7781',
      description: 'Court hire for DUN-POD-4821',
      attachment_url: 'https://img.example/new.png',
      related_from_type: 'VENUE',
      related_from_id: 'ven-1',
      paid_by: 'Asha',
      compensation_method: 'VENDOR_REFUND',
      compensated_amount: 100,
      compensation_date: '2026-08-03T10:00:00.000Z',
      compensation_reference: 'RF-22',
      compensation_rejected: false,
    });
  });
});

describe('ExpenseForm — editing a saved expense', () => {
  it('opens on the saved values, keeps a retired option, and follows the next row', async () => {
    const saved = toRecord({
      ...attributedExpense(),
      category: 'EVENT_MATERIAL',
      compensation_status: 'REJECTED',
    });
    const { onCancel } = renderForm(saved, toRecord(makeExpense()));

    // Switched off since it was filed: shown, not silently blanked.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent(
        'EVENT_MATERIAL (no longer offered)',
      ),
    );
    expect(screen.getByLabelText('Compensated amount')).toHaveValue(40);
    expect(screen.getByLabelText('Compensation date')).toHaveValue('2024-01-05T10:00:00.000Z');
    expect(screen.getByLabelText('Reject this expense — nobody pays it back')).toBeChecked();
    expect(statusPreview()).toHaveTextContent('Rejected');
    await waitFor(() => expect(entityBox()).toHaveValue('Smash Arena'));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'harness-busy' }));
    const saving = screen.getByRole('button', { name: /Saving/ });
    expect(saving).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'harness-next' }));
    await waitFor(() => expect(screen.getByLabelText('Compensated amount')).toHaveValue(null));
    expect(screen.getByLabelText('Compensation date')).toHaveValue('');
    expect(within(screen.getByRole('combobox', { name: 'Category' })).getByText('Rent')).toBeInTheDocument();
  });
});

describe('expenseSchema / value mappers', () => {
  const VALID = {
    date: new Date('2026-08-01T10:00:00.000Z'),
    category: 'RENT',
    amount: '250',
    payment_method: 'UPI',
  };

  const messageFor = (input: unknown, field: string) => {
    const result = expenseSchema().safeParse(input);
    if (result.success) return undefined;
    return result.error.issues.find((issue) => issue.path[0] === field)?.message;
  };

  it('reads its messages out of the shipped copy when no translator is passed', () => {
    expect(messageFor({ ...VALID, amount: '0' }, 'amount')).toBe('Enter an amount greater than 0');
    expect(messageFor({ ...VALID, date: null }, 'date')).toBe('Pick the day the money left');
    expect(messageFor({ ...VALID, category: '' }, 'category')).toBe('Pick a category');
    expect(messageFor({ ...VALID, vendor_name: 'v'.repeat(201) }, 'vendor_name')).toBe('Too long');
    expect(messageFor({ ...VALID, related_from_type: 'VENUE' }, 'related_from_id')).toBe(
      'Pick what this expense was for',
    );
    expect(messageFor({ ...VALID, compensated_amount: '251' }, 'compensated_amount')).toBe(
      'Compensation cannot be more than the expense itself',
    );
    expect(messageFor(VALID, 'amount')).toBeUndefined();
  });

  it('starts a new expense on today with every list left for a person to choose', () => {
    const values = toFormValues(null);
    expect(values).toMatchObject({ category: '', payment_method: '', amount: '', compensation_date: null });
    expect(values.date.getTime()).toBeGreaterThan(0);
  });

  it('maps a blank compensation to nothing owed and no relation', () => {
    const values = toFormValues(toRecord(makeExpense()));
    expect(values).toMatchObject({ related_from_id: '', compensated_amount: '', compensation_rejected: false });
    expect(toExpenseInput(values)).toMatchObject({
      related_from_id: null,
      compensated_amount: 0,
      compensation_date: null,
      amount: 100,
    });
  });

  it('derives the compensation status from the money alone', () => {
    expect(previewStatus(100, 0, false)).toBe('PENDING');
    expect(previewStatus(100, 40, false)).toBe('PARTIAL');
    expect(previewStatus(100, 100, false)).toBe('FULL');
    expect(previewStatus(100, 100, true)).toBe('REJECTED');
  });
});
