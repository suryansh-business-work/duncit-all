import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Controller, useFormContext } from 'react-hook-form';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { HR_ACCOUNT_OPTIONS, type AccountOptionsData, type HrAccountOption } from '../../../../lib/employee-queries';
import type { HireFormValues, PresetAccount } from './hire-employee.types';
import { splitName } from './hire-employee.schema';

const MIN_SEARCH = 2;
const labelOf = (option: PresetAccount) => [option.name, option.email].filter(Boolean).join(' · ');

/**
 * Picks the existing Duncit account to hire. The server searches active
 * accounts by name, email or phone; one that already has an HR record is
 * shown but cannot be picked (rehire it from its record instead). Picking an
 * account fills an empty name on the personal step.
 */
export default function AccountPickerField() {
  const { t } = useTranslation();
  const { control, getValues, setValue } = useFormContext<HireFormValues>();
  const [search, setSearch] = useState('');
  const { data, loading } = useQuery<AccountOptionsData>(HR_ACCOUNT_OPTIONS, {
    variables: { search },
    skip: search.trim().length < MIN_SEARCH,
    fetchPolicy: 'cache-and-network',
  });

  const pick = (account: HrAccountOption | PresetAccount | null, onChange: (value: PresetAccount | null) => void) => {
    onChange(account ? { id: account.id, name: account.name, email: account.email } : null);
    if (!account) return;
    const names = splitName(account.name);
    if (!getValues('personal.first_name')) setValue('personal.first_name', names.first_name);
    if (!getValues('personal.last_name')) setValue('personal.last_name', names.last_name);
  };

  return (
    <Controller
      control={control}
      name="account"
      render={({ field, fieldState }) => (
        <Autocomplete<HrAccountOption | PresetAccount>
          value={field.value}
          options={data?.hrAccountOptions ?? []}
          loading={loading}
          getOptionLabel={labelOf}
          getOptionDisabled={(option) => 'has_hr_record' in option && option.has_hr_record}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          filterOptions={(options) => options}
          noOptionsText={t('hrEmployee.hire.noAccounts')}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              {labelOf(option)}
              {'has_hr_record' in option && option.has_hr_record ? ` — ${t('hrEmployee.form.accountOnRecord')}` : ''}
            </li>
          )}
          onInputChange={(_event, value, reason) => reason === 'input' && setSearch(value)}
          onChange={(_event, value) => pick(value, field.onChange)}
          renderInput={(params) => (
            <TextField
              {...params}
              required
              label={t('hrEmployee.hire.accountSearch')}
              inputRef={field.ref}
              onBlur={field.onBlur}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? t('hrEmployee.hire.accountSearchHint')}
              slotProps={{
                ...params.slotProps,
                htmlInput: { ...params.slotProps.htmlInput, 'data-testid': 'hr-hire-account' },
                input: {
                  ...params.slotProps.input,
                  endAdornment: (
                    <>
                      {loading && <CircularProgress size={18} />}
                      {params.slotProps.input.endAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
        />
      )}
    />
  );
}
