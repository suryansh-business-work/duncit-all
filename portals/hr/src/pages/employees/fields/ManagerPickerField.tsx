import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Controller, useFormContext, type FieldValues } from 'react-hook-form';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { HrEmployeeRef } from '@duncit/utils';
import { HR_MANAGER_OPTIONS, type ManagerOptionsData } from '../../../lib/employee-queries';

const labelOf = (option: HrEmployeeRef) => `${option.name} · ${option.employee_code}${option.job_title ? ` · ${option.job_title}` : ''}`;

/**
 * The reporting manager: a current employee, searched on the server by name,
 * code or title. The person being edited is never offered; the server also
 * refuses a manager who already reports to them.
 */
export default function ManagerPickerField({ name, excludeId }: Readonly<{ name: string; excludeId: string | null }>) {
  const { t } = useTranslation();
  const { control } = useFormContext<FieldValues>();
  const [search, setSearch] = useState('');
  const { data, loading } = useQuery<ManagerOptionsData>(HR_MANAGER_OPTIONS, {
    variables: { search, excludeId },
    fetchPolicy: 'cache-and-network',
  });

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Autocomplete<HrEmployeeRef>
          value={(field.value as HrEmployeeRef | null) ?? null}
          options={data?.hrManagerOptions ?? []}
          loading={loading}
          getOptionLabel={labelOf}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          filterOptions={(options) => options}
          noOptionsText={t('hrEmployee.hint.noManagers')}
          onInputChange={(_event, value, reason) => reason === 'input' && setSearch(value)}
          onChange={(_event, value) => field.onChange(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('hrEmployee.field.manager')}
              inputRef={field.ref}
              onBlur={field.onBlur}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? t('hrEmployee.hint.manager')}
              slotProps={{
                ...params.slotProps,
                htmlInput: { ...params.slotProps.htmlInput, 'data-testid': 'hr-manager' },
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
