import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Autocomplete, Stack, TextField, Typography } from '@mui/material';
import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import { OWNER_CANDIDATES, type OwnerCandidate } from '../queries';
import type { VenueFormValues } from '../types';

/**
 * Which account owns the new venue.
 *
 * Searched SERVER-side through `usersTable` rather than by pulling every user
 * and filtering in the browser: the owner of a venue is one account out of the
 * whole user base, and a client-side filter over that is a page that gets
 * slower every week.
 *
 * Picking somebody fills the owner contact fields from their account, which is
 * the point — an admin registering a venue on a partner's behalf should not be
 * retyping details Duncit already holds.
 */
const PAGE = 20;

const ownerLabel = (owner: OwnerCandidate) =>
  [owner.full_name, owner.email ?? owner.phone_number].filter(Boolean).join(' · ');

export default function OwnerPicker({
  control,
  setValue,
}: Readonly<{
  control: Control<VenueFormValues>;
  setValue: UseFormSetValue<VenueFormValues>;
}>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const { data, loading } = useQuery<{ usersTable: { rows: OwnerCandidate[] } }>(OWNER_CANDIDATES, {
    variables: { query: { page: 1, page_size: PAGE, search } },
    fetchPolicy: 'cache-and-network',
  });
  const options = data?.usersTable?.rows ?? [];

  return (
    <Controller
      control={control}
      name="owner_user_id"
      render={({ field, fieldState }) => {
        const chosen = options.find((owner) => owner.user_id === field.value) ?? null;
        return (
          <Stack spacing={0.5}>
            <Autocomplete
              options={options}
              loading={loading}
              value={chosen}
              filterOptions={(all) => all}
              getOptionLabel={ownerLabel}
              isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
              onInputChange={(_event, next) => setSearch(next)}
              onChange={(_event, owner) => {
                field.onChange(owner?.user_id ?? '');
                if (!owner) return;
                setValue('owner_name', owner.full_name ?? '', { shouldValidate: true });
                setValue('owner_email', owner.email ?? '', { shouldValidate: true });
                setValue('owner_phone', owner.phone_number ?? '', { shouldValidate: true });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('directory.venueEditor.ownerAccount')}
                  size="small"
                  required
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? ' '}
                />
              )}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('directory.venueEditor.ownerAccountHint')}
            </Typography>
          </Stack>
        );
      }}
    />
  );
}
