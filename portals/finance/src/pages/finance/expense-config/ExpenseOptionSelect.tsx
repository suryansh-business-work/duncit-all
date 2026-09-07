import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { useExpenseOptions } from './useExpenseOptions';
import type { ExpenseOptionKind } from './queries';

interface Props {
  kind: ExpenseOptionKind;
  label: string;
  value: string;
  onChange: (key: string) => void;
  /** Adds a leading "Any / none" row — what a filter needs and a form does not. */
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  helperText?: string;
}

/**
 * A dropdown whose rows come from Finance > Settings > Expense Settings.
 *
 * Every category, payment method, Related From type and compensation method on
 * every Expense screen goes through this. There is no constant array left in
 * this portal to drift from the server's list.
 *
 * A value that is no longer offered — an option switched off after the expense
 * was filed — is added back as a disabled row rather than silently cleared, so
 * opening an old expense to fix a typo does not blank its category on save.
 */
export default function ExpenseOptionSelect({
  kind,
  label,
  value,
  onChange,
  allowEmpty,
  emptyLabel,
  disabled,
  helperText,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { options, loading } = useExpenseOptions(kind);
  const retired = value && !options.some((option) => option.key === value);

  return (
    <TextField
      select
      fullWidth
      label={label}
      value={value}
      disabled={disabled || loading}
      helperText={helperText ?? ' '}
      onChange={(event) => onChange(event.target.value)}
    >
      {allowEmpty && (
        <MenuItem value="">{emptyLabel ?? t('finance.expenseConfig.anyOption')}</MenuItem>
      )}
      {options.map((option) => (
        <MenuItem key={option.key} value={option.key}>
          {option.label}
        </MenuItem>
      ))}
      {retired && (
        <MenuItem value={value} disabled>
          {t('finance.expenseConfig.retiredOption', { vars: { key: value } })}
        </MenuItem>
      )}
    </TextField>
  );
}
