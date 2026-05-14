import BankAccountVerificationSection from '../BankAccountVerificationSection';
import type { BankAccountValues } from '../../forms/validation/bankAccount';
import type { Step3 } from './queries';
import { getVenueError, type VenueValidationErrors } from './venue.form';

interface Props {
  s3: Step3;
  setS3: (next: Step3) => void;
  errors?: VenueValidationErrors;
}

export default function VenueBankAccountSection({ s3, setS3, errors }: Props) {
  const errorFor = (field: keyof BankAccountValues) =>
    getVenueError(errors, `step3.bank_account.${field}`) || undefined;

  return (
    <BankAccountVerificationSection
      value={s3.bank_account}
      onChange={(bank_account) => setS3({ ...s3, bank_account })}
      errorFor={errorFor}
    />
  );
}