import { Autocomplete, TextField } from '@mui/material';
import { POLICY_TYPE_OPTIONS, type PolicyTypeOption } from '../config/policyTypes';
import { useTranslation } from '@duncit/shell';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

/**
 * Grouped, searchable picker over the canonical policy-type list.
 *
 * `freeSolo`, because the catalogue is a suggestion rather than a rule: a
 * policy that needs a type nobody listed should not be blocked from having
 * one, and the dashboard counts whatever is stored.
 */
export default function PolicyTypeSelect({
  value,
  onChange,
  label,
  required,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fieldLabel = label ?? t('legal.policyTypeSelect.label');
  const selected = POLICY_TYPE_OPTIONS.find((o) => o.label === value) ?? null;
  return (
    <Autocomplete<PolicyTypeOption, false, false, true>
      freeSolo
      options={POLICY_TYPE_OPTIONS}
      groupBy={(o) => o.group}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.label)}
      isOptionEqualToValue={(o, v) => o.label === (typeof v === 'string' ? v : v.label)}
      value={selected ?? value ?? ''}
      onChange={(_e, v) => onChange(typeof v === 'string' ? v : (v?.label ?? ''))}
      onInputChange={(_e, v, reason) => {
        if (reason === 'input') onChange(v);
      }}
      fullWidth
      renderInput={(params) => (
        <TextField
          {...params}
          label={fieldLabel}
          placeholder={t('legal.policyTypeSelect.search')}
          required={required}
        />
      )}
    />
  );
}
