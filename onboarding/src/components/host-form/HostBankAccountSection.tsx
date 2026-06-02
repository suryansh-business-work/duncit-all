import { getIn, useFormikContext } from 'formik';
import BankAccountVerificationSection from '../BankAccountVerificationSection';
import { blankBankAccountValues } from '../../forms/validation/bankAccount';
import type { HostCreateValues, HostEditValues } from '../../forms/host.form';
import type { BankAccountValues } from '../../forms/validation/bankAccount';

type Values = HostCreateValues & Partial<HostEditValues>;

export default function HostBankAccountSection() {
  const { values, errors, touched, submitCount, setFieldValue } = useFormikContext<Values>();
  const bankAccount = getIn(values, 'step3.bank_account') ?? blankBankAccountValues();
  const errorFor = (field: keyof BankAccountValues) => {
    const path = `step3.bank_account.${field}`;
    const value = getIn(values, path);
    const hasValue = String(value ?? '').length > 0;
    return getIn(errors, path) && (submitCount > 0 || getIn(touched, path) || hasValue)
      ? (getIn(errors, path) as string)
      : undefined;
  };

  return (
    <BankAccountVerificationSection
      value={bankAccount}
      onChange={(next) => setFieldValue('step3.bank_account', next)}
      errorFor={errorFor}
    />
  );
}