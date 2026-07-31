import { Autocomplete, Chip, Stack, TextField, Typography } from '@mui/material';
import { Controller, type Control } from 'react-hook-form';
import { ownerLabel, type AudienceListFormValues, type OwnerOption } from './audience-list.types';

interface Props {
  control: Control<AudienceListFormValues>;
  options: OwnerOption[];
  loading: boolean;
}

/**
 * The list owner, picked from everybody who can actually open this portal —
 * admins and marketing managers. Free text would let a list be assigned to
 * somebody who cannot open it to act on it.
 */
export default function OwnerField({ control, options, loading }: Readonly<Props>) {
  return (
    <Controller
      control={control}
      name="owner_user_id"
      render={({ field, fieldState }) => (
        <Autocomplete<OwnerOption>
          options={options}
          loading={loading}
          value={options.filter((o) => o.id === field.value)[0] ?? null}
          onBlur={field.onBlur}
          getOptionLabel={ownerLabel}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_e, option) => field.onChange(option?.id ?? '')}
          noOptionsText="Nobody has access to this portal yet"
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {ownerLabel(option)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {option.email}
                  </Typography>
                </Stack>
                {option.is_admin && (
                  <Chip size="small" label="Admin" color="primary" variant="outlined" />
                )}
              </Stack>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="List owner"
              required
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? 'Anyone with access to this portal.'}
            />
          )}
        />
      )}
    />
  );
}
