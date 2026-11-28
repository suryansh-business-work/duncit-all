import { useFormContext, type FieldValues } from 'react-hook-form';
import { Box } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { HR_EMPLOYEE_LIMITS as L, type HrBankSummary } from '@duncit/utils';

interface Props {
  /** The group path ('bank.' or ''). */
  prefix?: string;
  /** The stored, masked details — when set, an empty secret box keeps the stored value. */
  stored?: HrBankSummary | null;
}

const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } };

/** Account holder, account number, IFSC, bank, PAN and UAN. The account number and PAN are stored encrypted. */
export default function BankFields({ prefix = '', stored = null }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = useFormContext<FieldValues>();
  const n = (field: string) => `${prefix}${field}`;
  const accountHint = stored?.account_number_masked ? t('hrEmployee.hint.accountNumberKeep', { vars: { masked: stored.account_number_masked } }) : undefined;
  const panHint = stored?.pan_masked ? t('hrEmployee.hint.panKeep', { vars: { masked: stored.pan_masked } }) : undefined;
  return (
    <Box sx={grid}>
      <RhfTextField control={control} name={n('account_holder_name')} label={t('hrEmployee.field.accountHolder')} slotProps={{ htmlInput: { maxLength: L.nameMax * 2, 'data-testid': 'hr-bank-holder' } }} />
      <RhfTextField
        control={control}
        name={n('account_number')}
        label={t('hrEmployee.field.accountNumber')}
        hint={accountHint}
        autoComplete="off"
        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 18, 'data-testid': 'hr-bank-account' } }}
      />
      <RhfTextField control={control} name={n('ifsc')} label={t('hrEmployee.field.ifsc')} slotProps={{ htmlInput: { maxLength: 11, 'data-testid': 'hr-bank-ifsc' } }} />
      <RhfTextField control={control} name={n('bank_name')} label={t('hrEmployee.field.bankName')} slotProps={{ htmlInput: { maxLength: L.bankNameMax, 'data-testid': 'hr-bank-name' } }} />
      <RhfTextField
        control={control}
        name={n('pan')}
        label={t('hrEmployee.field.pan')}
        hint={panHint}
        autoComplete="off"
        slotProps={{ htmlInput: { maxLength: 10, 'data-testid': 'hr-bank-pan' } }}
      />
      <RhfTextField control={control} name={n('uan')} label={t('hrEmployee.field.uan')} slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 12, 'data-testid': 'hr-bank-uan' } }} />
    </Box>
  );
}
