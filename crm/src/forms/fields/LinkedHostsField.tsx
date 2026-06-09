import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useField } from 'formik';
import { Autocomplete, Box, Chip, CircularProgress, TextField, Typography } from '@mui/material';
import { HOST_LEADS } from '../../api/crm.gql';
import type { HostLead } from '../../api/crm.types';

interface Props {
  /** Formik field path — value is `string[]` of host lead ids. */
  name: string;
  label?: string;
}

/**
 * Optional multi-select dropdown letting the user link existing Host leads
 * to a Venue lead. Backed by the full `hostLeads` query (small dataset; if
 * it ever balloons we can switch to a server-side `search` filter). Stays
 * optional — empty selection = no association.
 */
export default function LinkedHostsField({ name, label = 'Linked Host Leads' }: Readonly<Props>) {
  const [field, , helpers] = useField<string[]>(name);
  const selectedIds = field.value ?? [];

  const { data, loading } = useQuery<{ hostLeads: HostLead[] }>(HOST_LEADS, {
    variables: { filter: {} },
    fetchPolicy: 'cache-first',
  });
  const hosts = data?.hostLeads ?? [];

  const byId = useMemo(() => new Map(hosts.map((h) => [h.id, h])), [hosts]);
  const selectedValues = useMemo(
    () => selectedIds.map((id) => byId.get(id)).filter((h): h is HostLead => Boolean(h)),
    [selectedIds, byId]
  );

  return (
    <Autocomplete
      multiple
      filterSelectedOptions
      options={hosts}
      value={selectedValues}
      getOptionLabel={(h) => `${h.host_name}${h.city ? ` — ${h.city}` : ''}`}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      loading={loading}
      onChange={(_, next) => {
        helpers.setValue(next.map((h) => h.id));
      }}
      onBlur={() => helpers.setTouched(true)}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return (
            <Chip
              key={key}
              {...tagProps}
              label={option.host_name}
              size="small"
              variant="outlined"
              color="primary"
            />
          );
        })
      }
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" fontWeight={600}>
              {option.host_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[option.host_type, option.city, option.lead_status].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={label}
          placeholder={selectedIds.length ? 'Add another…' : 'Search host leads…'}
          helperText="Optional — link host leads who host events at this venue."
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
