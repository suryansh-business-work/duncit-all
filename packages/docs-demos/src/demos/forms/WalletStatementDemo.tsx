import { useState } from 'react';
import { TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { flattenCatalogue, WITHDRAW_BUNDLE } from '@duncit/i18n';
import {
  WalletStatementDialog,
  WalletStatementFields,
  type WalletStatementDateFieldProps,
  type WalletStatementDateFormat,
  type WalletStatementFormFieldsProps,
  type WalletStatementQueryResult,
} from '@duncit/forms';

export interface WalletStatementMock {
  /** What the server answers: a statement with rows, a nil statement, or a failure. */
  answer: 'FILE' | 'EMPTY' | 'FAILURE';
  /** The partner console's look: custom days side by side, heavier title, a spinner on Download. */
  partnerConsole: boolean;
}

const WITHDRAW_TEXT = flattenCatalogue(WITHDRAW_BUNDLE);

/** The shipped English, with {placeholders} filled — what a surface's t() answers. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  Object.entries(options?.vars ?? {}).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    WITHDRAW_TEXT[key] ?? key,
  );

/** A fixed clock, so every preset shows the same days whenever the page is read. */
const dateFormat: WalletStatementDateFormat = {
  now: () => new Date('2026-10-11T06:00:00Z'),
  timeZone: 'Asia/Kolkata',
  formatDay: (value) => value.split('-').reverse().join('/'),
};

/** Stands in for a surface's own `DateField`: mWeb and the partner console each pass their picker. */
function DemoDateField({ maxDate, onChange, ...field }: Readonly<WalletStatementDateFieldProps>) {
  return (
    <TextField
      {...field}
      type="date"
      fullWidth
      onChange={(event) => onChange(event.target.value)}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: maxDate.toISOString().slice(0, 10) } }}
    />
  );
}

/** The fields as mWeb binds them: the two custom days stacked. */
function StackedFields(props: Readonly<WalletStatementFormFieldsProps>) {
  return <WalletStatementFields {...props} t={t} dateFormat={dateFormat} DateField={DemoDateField} />;
}

/** The fields as the partner console binds them: the two custom days side by side. */
function InlineFields(props: Readonly<WalletStatementFormFieldsProps>) {
  return <WalletStatementFields {...props} datesInline t={t} dateFormat={dateFormat} DateField={DemoDateField} />;
}

/** What `myWalletStatementFile` hands back: a tiny CSV, base64, with or without rows. */
const statementFile = (transaction_count: number): WalletStatementQueryResult => ({
  data: {
    myWalletStatementFile: {
      filename: 'wallet-statement.csv',
      mime: 'text/csv',
      content_base64: btoa('Date,Description,Amount\n2026-10-01,Opening balance,0\n'),
      transaction_count,
    },
  },
});

const ANSWERS: Record<WalletStatementMock['answer'], () => WalletStatementQueryResult> = {
  FILE: () => statementFile(1),
  EMPTY: () => statementFile(0),
  FAILURE: () => ({ error: new Error('The statement service did not answer.') }),
};

/** The dialog as a surface mounts it — only while open — against a stand-in clock and query. */
export function WalletStatementDemo({ mock }: Readonly<{ mock: WalletStatementMock }>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DuncitButton variant="outlined" onClick={() => setOpen(true)}>
        {t('withdraw.statement.title')}
      </DuncitButton>
      {open && (
        <WalletStatementDialog
          t={t}
          dateFormat={dateFormat}
          Fields={mock.partnerConsole ? InlineFields : StackedFields}
          runQuery={() => Promise.resolve(ANSWERS[mock.answer]())}
          closeLabel="Close"
          onClose={() => setOpen(false)}
          fontWeight={mock.partnerConsole ? 900 : undefined}
          spinner={mock.partnerConsole}
        />
      )}
    </>
  );
}
