import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import BankFields from '../../../fields/BankFields';
import { bankSchema } from '../../../fields/employee-fields.schema';
import { bankValuesFrom } from '../../../fields/employee-fields.defaults';
import FormShell from '../FormShell';
import type { BankFormProps, BankFormValues, BankOutput } from './bank.types';

/**
 * Edit bank and statutory details. The stored account number and PAN are
 * never sent to this form; an empty box keeps them, a new value replaces them.
 */
export default function BankForm({ bank, onSubmit, onCancel }: Readonly<BankFormProps>) {
  const { t } = useTranslation();
  const keepAccount = Boolean(bank.account_number_masked);
  const keepPan = Boolean(bank.pan_masked);
  const schema = useMemo(() => bankSchema(t, { account: keepAccount, pan: keepPan }), [t, keepAccount, keepPan]);
  const methods = useForm<BankFormValues, unknown, BankOutput>({ resolver: zodResolver(schema), defaultValues: bankValuesFrom(bank) });
  return (
    <FormShell methods={methods} onSubmit={onSubmit} onCancel={onCancel} submitLabel={t('shell.common.save')} testId="hr-bank-form">
      <Alert severity="info">{t('hrEmployee.hire.bankOptional')}</Alert>
      <BankFields stored={bank} />
    </FormShell>
  );
}
