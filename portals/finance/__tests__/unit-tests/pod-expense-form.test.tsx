/**
 * The pod-expense form, its schema, and the two states the drawer cannot put it
 * in on its own.
 *
 * The bill is deliberately optional: a spend usually has to be recorded on the
 * day it happens and the supplier's invoice turns up later, so the rule this
 * pins is that everything ELSE is required and nothing is silently truncated on
 * the way to the server.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import PodExpenseForm, {
  podExpenseSchema,
  toFormValues,
  toPodExpenseInput,
  type PodExpenseFormValues,
} from '../../src/pages/finance/pod-expense-page/pod-expense-form';
import PodExpenseFields from '../../src/pages/finance/pod-expense-page/pod-expense-form/PodExpenseFields';
import { renderWithProviders } from '../testkit';
import { makePodExpense } from '../mocks/pod-expense.mock';

const VALID = {
  date: new Date('2026-08-20T00:00:00.000Z'),
  category: 'VENUE_RENT',
  amount: 2500,
  payment_method: 'UPI',
};

/** The message zod attached to one field, or undefined when it accepted it. */
const messageFor = (input: unknown, field: string): string | undefined => {
  const result = podExpenseSchema().safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

type FieldError = readonly [keyof PodExpenseFormValues, string];

/**
 * Module-level so their identity is stable across renders: `setError` re-renders
 * the harness, and an effect keyed on a fresh array literal would set the error
 * again on every one of those renders, forever.
 */
const NO_ERRORS: readonly FieldError[] = [];
const EVERY_ERROR: readonly FieldError[] = [
  ['category', 'Pick a category'],
  ['payment_method', 'Pick a payment method'],
  ['bill_url', 'This is too long'],
  ['vendor_name', 'This is too long'],
];

/**
 * The fields with errors pushed onto them.
 *
 * The two dropdowns and the bill upload can only be wrong in ways the form
 * itself will not produce — a category is always one of eleven, and the upload
 * hands back a URL of its own — so the only honest way to see their error state
 * is to put one there.
 */
function FieldsHarness({ errors }: Readonly<{ errors: readonly FieldError[] }>) {
  const { control, setError } = useForm<PodExpenseFormValues, any, PodExpenseFormValues>({
    defaultValues: toFormValues(null),
  });
  useEffect(() => {
    for (const [name, message] of errors) {
      setError(name, { type: 'server', message });
    }
  }, [errors, setError]);
  return <PodExpenseFields control={control} currency="₹" />;
}

const noop = () => undefined;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('podExpenseSchema', () => {
  it('reads its messages out of the shipped copy when no translator is passed', () => {
    expect(messageFor({ ...VALID, amount: 0 }, 'amount')).toBe(
      'Enter an amount greater than 0',
    );
    expect(messageFor({ ...VALID, amount: 'lots' }, 'amount')).toBe(
      'Enter an amount greater than 0',
    );
    expect(messageFor({ ...VALID, date: null }, 'date')).toBe(
      'Pick the date the money was spent',
    );
    expect(messageFor({ ...VALID, category: '' }, 'category')).toBe('Pick a category');
    expect(messageFor({ ...VALID, payment_method: '' }, 'payment_method')).toBe(
      'Pick a payment method',
    );
  });

  it('refuses text longer than the column behind it holds', () => {
    expect(messageFor({ ...VALID, vendor_name: 'v'.repeat(201) }, 'vendor_name')).toBe(
      'This is too long',
    );
    expect(messageFor({ ...VALID, bill_number: 'b'.repeat(121) }, 'bill_number')).toBe(
      'This is too long',
    );
    expect(messageFor({ ...VALID, bill_url: 'u'.repeat(2049) }, 'bill_url')).toBe(
      'This is too long',
    );
    expect(messageFor({ ...VALID, reference: 'r'.repeat(201) }, 'reference')).toBe(
      'This is too long',
    );
    expect(messageFor({ ...VALID, description: 'd'.repeat(1001) }, 'description')).toBe(
      'This is too long',
    );
  });

  it('accepts a spend with no bill attached yet, trimming what was typed', () => {
    const parsed = podExpenseSchema().parse({ ...VALID, vendor_name: '  Smash Arena  ' });

    expect(parsed).toMatchObject({
      vendor_name: 'Smash Arena',
      bill_number: '',
      bill_url: '',
      reference: '',
      description: '',
    });
  });
});

describe('toFormValues / toPodExpenseInput', () => {
  it('starts a new entry on today, on the most common category and method', () => {
    const values = toFormValues(null);

    expect(values.category).toBe('VENUE_RENT');
    expect(values.payment_method).toBe('BANK_TRANSFER');
    // NaN, not 0: an untouched amount field has to read as empty, and 0 is a
    // number somebody could have meant.
    expect(Number.isNaN(values.amount)).toBe(true);
    expect(values.date.getTime()).toBeGreaterThan(0);
  });

  it('turns a saved row back into editable values, and those back into an input', () => {
    const values = toFormValues(makePodExpense());

    expect(values).toMatchObject({
      category: 'VENUE_RENT',
      amount: 2000,
      vendor_name: 'Smash Arena',
      payment_method: 'UPI',
      bill_number: 'INV-14',
      reference: 'txn-99',
      description: 'Court booking',
    });
    expect(toPodExpenseInput(values)).toMatchObject({
      date: '2026-08-20T00:00:00.000Z',
      amount: 2000,
    });
  });
});

describe('PodExpenseForm', () => {
  it('names the button after what pressing it does', () => {
    const { unmount } = renderWithProviders(
      <PodExpenseForm
        expense={null}
        currency="₹"
        busy={false}
        onCancel={noop}
        onSubmit={noop}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeInTheDocument();
    unmount();

    renderWithProviders(
      <PodExpenseForm
        expense={makePodExpense()}
        currency="₹"
        busy={false}
        onCancel={noop}
        onSubmit={noop}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('locks both actions while the write is in flight', () => {
    renderWithProviders(
      <PodExpenseForm
        expense={null}
        currency="₹"
        busy
        errorMessage="Expense amount must be greater than 0"
        onCancel={noop}
        onSubmit={noop}
      />,
    );

    expect(screen.getByText('Expense amount must be greater than 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('hands the typed values to its caller', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <PodExpenseForm
        expense={makePodExpense()}
        currency="₹"
        busy={false}
        onCancel={noop}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '2750' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ amount: 2750, vendor_name: 'Smash Arena' });
  });
});

describe('PodExpenseFields', () => {
  it('renders the currency the admin configured beside the amount', () => {
    renderWithProviders(<FieldsHarness errors={NO_ERRORS} />);

    expect(screen.getByText('₹')).toBeInTheDocument();
    expect(screen.getByText('Attach the supplier bill — image or PDF. You can add it later.')).toBeInTheDocument();
  });

  it('shows an error against the dropdowns, the upload and a text field alike', async () => {
    renderWithProviders(<FieldsHarness errors={EVERY_ERROR} />);

    expect(await screen.findByText('Pick a category')).toBeInTheDocument();
    expect(screen.getByText('Pick a payment method')).toBeInTheDocument();
    // The upload swaps its hint for the error rather than showing both.
    expect(
      screen.queryByText('Attach the supplier bill — image or PDF. You can add it later.'),
    ).toBeNull();
    expect(screen.getAllByText('This is too long')).toHaveLength(2);
  });
});
