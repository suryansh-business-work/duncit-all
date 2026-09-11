import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Alert,
  Autocomplete,
  Checkbox,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import { CLUB_ADMIN_MATCHING_CLUBS, type ClubOption } from '../queries';
import type { ClubAdminFormValues } from './types';

/**
 * Which clubs this admin runs.
 *
 * The options come from `clubAdminMatchingClubs`, which answers with the clubs in
 * THIS admin's Super → Category → Sub plus any club they already run from outside
 * it. That second half matters: a club that is assigned but not listed could
 * never be given back.
 *
 * Only offered while editing — the picker is keyed on the record's id, and a
 * record being appointed does not have one yet. Clubs are assigned on the next
 * save after that.
 */
export default function AssignClubsField({
  control,
  clubAdminId,
}: Readonly<{ control: Control<ClubAdminFormValues>; clubAdminId: string }>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const { data, loading } = useQuery<{ clubAdminMatchingClubs: ClubOption[] }>(
    CLUB_ADMIN_MATCHING_CLUBS,
    {
      variables: { id: clubAdminId, search },
      skip: !clubAdminId,
      fetchPolicy: 'cache-and-network',
    },
  );
  const options = data?.clubAdminMatchingClubs ?? [];

  if (!clubAdminId) {
    return (
      <Alert severity="info" variant="outlined">
        {t('directory.clubAdminEditor.assignAfterCreate')}
      </Alert>
    );
  }

  return (
    <Controller
      control={control}
      name="club_ids"
      render={({ field }) => {
        const picked = field.value ?? [];
        const chosen = options.filter((club) => picked.includes(club.id));
        return (
          <Stack spacing={0.5}>
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={options}
              loading={loading}
              value={chosen}
              filterOptions={(all) => all}
              getOptionLabel={(club) => club.club_name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              onInputChange={(_event, next) => setSearch(next)}
              onChange={(_event, next) => field.onChange(next.map((club) => club.id))}
              renderOption={(optionProps, club, { selected }) => {
                const { key: _key, ...rest } = optionProps;
                return (
                  <li key={club.id} {...rest}>
                    <Checkbox size="small" checked={selected} />
                    <Stack>
                      <Typography variant="body2">{club.club_name}</Typography>
                      {!club.matches_category && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {t('directory.clubAdminEditor.outsideCategory')}
                        </Typography>
                      )}
                    </Stack>
                  </li>
                );
              }}
              renderValue={(selected, getItemProps) =>
                selected.map((club, index) => {
                  const { key: _key, ...tagProps } = getItemProps({ index });
                  return <Chip key={club.id} {...tagProps} size="small" label={club.club_name} />;
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('directory.clubAdmins.assignedClubs')}
                  size="small"
                />
              )}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('directory.clubAdminEditor.assignHint')}
            </Typography>
          </Stack>
        );
      }}
    />
  );
}
