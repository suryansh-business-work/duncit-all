/**
 * What the wallet-statement suites share: a key-echoing translator, a fixed
 * clock, a stand-in date picker and the dialog mounted against a fake query.
 * Not a suite itself — the `*.test.tsx` files beside it import from here.
 */
import { expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletStatementDialog, {
  type WalletStatementDialogProps,
  type WalletStatementQueryResult,
} from '../src/WalletStatementDialog';
import WalletStatementFields, {
  type WalletStatementDateFieldProps,
  type WalletStatementDateFormat,
  type WalletStatementFormFieldsProps,
} from '../src/WalletStatementFields';

/** A translator that shows the key and its vars, so assertions read the wiring. */
export const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key} ${JSON.stringify(options.vars)}` : key;

/** 11 October 2026, 11:30 in Kolkata — every preset below is counted from this day. */
export const dateFormat: WalletStatementDateFormat = {
  now: () => new Date('2026-10-11T06:00:00Z'),
  timeZone: 'Asia/Kolkata',
  formatDay: (value) => `day:${value}`,
};

/** Stands in for a surface's date picker: a text box that takes and emits `yyyy-MM-dd`. */
export function StubDateField(props: Readonly<WalletStatementDateFieldProps>) {
  const { maxDate } = props;
  return (
    <>
      <label>
        {props.label}
        <input
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          onBlur={props.onBlur}
          required={props.required}
          disabled={props.disabled}
          aria-invalid={props.error}
          data-max-day={[maxDate.getFullYear(), maxDate.getMonth() + 1, maxDate.getDate()].join('-')}
        />
      </label>
      {props.helperText ? <span data-testid={`${props.label}-helper`}>{props.helperText}</span> : null}
    </>
  );
}

export function StackedFields(props: Readonly<WalletStatementFormFieldsProps>) {
  return <WalletStatementFields {...props} t={t} dateFormat={dateFormat} DateField={StubDateField} />;
}

export const fileResult = (transaction_count: number): WalletStatementQueryResult => ({
  data: {
    myWalletStatementFile: {
      filename: 'wallet-statement.pdf',
      mime: 'application/pdf',
      content_base64: 'QUJD',
      transaction_count,
    },
  },
});

export type RunQuery = WalletStatementDialogProps['runQuery'];

export function setup(over: Partial<WalletStatementDialogProps> = {}) {
  const runQuery = vi.fn<RunQuery>().mockResolvedValue(fileResult(3));
  const onClose = vi.fn();
  const props = { runQuery, onClose, ...over };
  render(
    <WalletStatementDialog t={t} dateFormat={dateFormat} Fields={StackedFields} closeLabel="Close" {...props} />,
  );
  return { runQuery, onClose, user: userEvent.setup() };
}

/** A query that stays in flight until the test settles it. */
export function deferredQuery() {
  let settle: (result: WalletStatementQueryResult) => void = () => undefined;
  const runQuery = vi.fn<RunQuery>(
    () =>
      new Promise<WalletStatementQueryResult>((resolve) => {
        settle = resolve;
      }),
  );
  return { runQuery, settle: (result: WalletStatementQueryResult) => settle(result) };
}

export const submitButton = () => screen.getByTestId('statement-submit');
export const combobox = (testId: string) => within(screen.getByTestId(testId)).getByRole('combobox');

export async function choose(user: ReturnType<typeof userEvent.setup>, field: 'preset' | 'format', option: string) {
  // `find`, not `get`: while a previous menu is still closing, the dialog behind it is aria-hidden.
  await user.click(await within(screen.getByTestId(`statement-${field}`)).findByRole('combobox'));
  await user.click(await screen.findByTestId(`statement-${field}-${option}`));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
}
