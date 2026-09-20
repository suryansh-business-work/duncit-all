import type { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { BrandFormValues } from '../../schema';

/** What every form-backed step receives: the shared RHF handles and the read-only flag. */
export interface BrandStepProps {
  control: Control<BrandFormValues>;
  watch: UseFormWatch<BrandFormValues>;
  setValue: UseFormSetValue<BrandFormValues>;
  locked: boolean;
}
