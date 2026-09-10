import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import BankAccountVerificationSection from '../BankAccountVerificationSection';
import { blankBankAccountValues } from '../../forms/validation/bankAccount';
import type { HostCreateValues, HostEditValues } from '../../forms/host.form';
import type { BankAccountValues } from '../../forms/validation/bankAccount';

type Values = HostCreateValues & Partial<HostEditValues>;

const getNested = (source: unknown, path: string) =>
  path.split('.').reduce<any>((acc, key) => acc?.[key], source);

export default function HostBankAccountSection() {
  const { control, setValue } = useFormContext<Values>();
  const { errors, touchedFields, submitCount } = useFormState({ control });
  const bankAccount =
    (useWatch({ control, name: 'step3.bank_account' }) as BankAccountValues | undefined) ??
    blankBankAccountValues();

  const errorFor = (field: keyof BankAccountValues) => {
    const path = `step3.bank_account.${field}`;
    const value = bankAccount[field];
    const hasValue = String(value ?? '').length > 0;
    const error = getNested(errors, path);
    const touched = getNested(touchedFields, path);
    return error && (submitCount > 0 || touched || hasValue) ? (error.message as string) : undefined;
  };

  return (
    <BankAccountVerificationSection
      value={bankAccount}
      onChange={(next) => setValue('step3.bank_account', next, { shouldValidate: true, shouldDirty: true })}
      errorFor={errorFor}
    />
  );
}
