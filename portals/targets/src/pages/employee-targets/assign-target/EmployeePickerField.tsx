import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Controller } from 'react-hook-form';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { TARGET_ASSIGNABLE_EMPLOYEES, type AssignableData, type AssigneeOption } from '../../../lib/employee-target-queries';
import type { AssignTargetControl } from './assign-target.types';

/** Name, then what the HR directory adds (code, title, department), then the email. */
const labelOf = (option: AssigneeOption) =>
  [option.name, option.employee_code, option.job_title, option.department, option.email].filter(Boolean).join(' · ');

interface Props {
  control: AssignTargetControl;
  disabled: boolean;
}

/**
 * Picks the ONE active employee a target is for. The server searches by name
 * or email and only ever offers ACTIVE accounts holding the EMPLOYEE role, so
 * an option here is always someone a target can be assigned to.
 */
export default function EmployeePickerField({ control, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { data, loading } = useQuery<AssignableData>(TARGET_ASSIGNABLE_EMPLOYEES, {
    variables: { search },
    skip: disabled,
    fetchPolicy: 'cache-and-network',
  });

  return (
    <Controller
      control={control}
      name="employee"
      render={({ field, fieldState }) => (
        <Autocomplete<AssigneeOption>
          value={field.value}
          options={data?.targetAssignableEmployees ?? []}
          loading={loading}
          disabled={disabled}
          getOptionLabel={labelOf}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          filterOptions={(options) => options}
          noOptionsText={t('employeeTargets.form.noEmployees')}
          onInputChange={(_event, value) => setSearch(value)}
          onChange={(_event, value) => field.onChange(value)}
          onBlur={field.onBlur}
          renderInput={(params) => (
            <TextField
              {...params}
              inputRef={field.ref}
              required
              label={t('employeeTargets.form.employee')}
              placeholder={t('employeeTargets.form.employeeSearch')}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? t('employeeTargets.form.employeeHint')}
              slotProps={{
                ...params.slotProps,
                htmlInput: { ...params.slotProps.htmlInput, 'data-testid': 'assign-target-employee' },
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
