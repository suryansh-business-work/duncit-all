import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Controller, type Control } from 'react-hook-form';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { WA_USER_SEARCH, type WaUserOption } from '../queries';
import type { WaCampaignValues } from './wa-campaign.types';

/**
 * Pick the exact people a send goes to. Search runs on the server against name,
 * email and number, and only ever offers accounts that carry a number WhatsApp
 * can be given — an option that could not be messaged is not an option.
 */

interface Props {
  control: Control<WaCampaignValues>;
}

interface SearchData {
  waCampaignUserSearch: WaUserOption[];
}

/** A picked person, as the form stores them. */
type Picked = WaCampaignValues['users'][number];

const labelFor = (option: Picked) => option.name || option.id;

export default function UserPickerField({ control }: Readonly<Props>) {
  const [search, setSearch] = useState('');
  // Two characters is where the server starts answering; below that the query
  // would be a round trip that can only come back empty.
  const { data, loading } = useQuery<SearchData>(WA_USER_SEARCH, {
    variables: { search },
    skip: search.trim().length < 2,
    fetchPolicy: 'cache-and-network',
  });

  const options = useMemo<Picked[]>(
    () =>
      (data?.waCampaignUserSearch ?? []).map((user) => ({
        id: user.id,
        name: user.name ? `${user.name} · ${user.destination}` : user.destination,
      })),
    [data]
  );

  return (
    <Controller
      control={control}
      name="users"
      render={({ field, fieldState }) => (
        <Autocomplete
          multiple
          filterSelectedOptions
          value={field.value}
          options={options}
          loading={loading}
          getOptionLabel={labelFor}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText={
            search.trim().length < 2 ? 'Type a name, email or number' : 'Nobody matches that'
          }
          onInputChange={(_event, value) => setSearch(value)}
          onChange={(_event, value) => field.onChange(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="People"
              placeholder="Search by name, email or number"
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ' '}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading && <CircularProgress size={18} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      )}
    />
  );
}
