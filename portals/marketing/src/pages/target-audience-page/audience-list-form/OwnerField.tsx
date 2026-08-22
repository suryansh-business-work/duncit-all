import { Autocomplete, Chip, Stack, TextField, Typography } from '@mui/material';
import { Controller, type Control } from 'react-hook-form';
import { ownerLabel, type AudienceListFormValues, type OwnerOption } from './audience-list.types';
import { useTranslation } from '@duncit/app-settings';

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
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="owner_user_id"
      render={({ field, fieldState }) => (
        <Autocomplete<OwnerOption>
          options={options}
          loading={loading}
          value={options.find((o) => o.id === field.value) ?? null}
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
                  <Chip size="small" label={t('marketing.targetAudience.admin')} color="primary" variant="outlined" />
                )}
              </Stack>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('marketing.targetAudience.listOwner')}
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
