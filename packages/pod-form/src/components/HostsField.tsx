import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { usePodFormData } from '../context';
import type { PodFormValues, PodHostOption } from '../types';

const hostLabel = (host: PodHostOption) => host.full_name || host.email || host.user_id;

/**
 * Server-search host picker (used when `searchHosts` is injected). Follows the
 * club-form AdminsSection pattern: seeds labelled chips from `users` (the
 * consumer passes the pod's current hosts there), merges in search results, and
 * never drops a selected id — an unknown id keeps an id-labelled chip.
 */
export default function HostsField() {
  const { config, users, searchHosts } = usePodFormData();
  const { control, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const hostIds = useWatch({ control, name: 'pod_hosts_id' }) ?? [];
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<PodHostOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<PodHostOption[]>([]);

  useEffect(() => {
    const id = setTimeout(() => setTerm(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input]);

  useEffect(() => {
    if (!searchHosts) return undefined;
    let active = true;
    setLoading(true);
    searchHosts(term)
      .then((hosts) => {
        if (active) setResults(hosts);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [term, searchHosts]);

  // Merge chosen + fetched + injected users so every id resolves to a label.
  const options = useMemo(() => {
    const map = new Map<string, PodHostOption>();
    for (const host of [...chosen, ...results, ...users]) map.set(host.user_id, host);
    return [...map.values()];
  }, [chosen, results, users]);

  const value = hostIds.map((id) => options.find((host) => host.user_id === id) ?? { user_id: id });
  const required = config.requireHosts ?? true;
  const requiredHint = required
    ? 'Search approved hosts by name or email.'
    : 'Optional — leave empty to be the host yourself.';

  return (
    <Autocomplete
      multiple
      options={options}
      value={value}
      loading={loading}
      filterOptions={(opts) => opts}
      getOptionLabel={hostLabel}
      isOptionEqualToValue={(option, val) => option.user_id === val.user_id}
      inputValue={input}
      onInputChange={(_, next) => setInput(next)}
      onChange={(_, next) => {
        setChosen(next);
        setValue('pod_hosts_id', next.map((host) => host.user_id), { shouldValidate: true });
      }}
      renderOption={(optionProps, option) => (
        <li {...optionProps} key={option.user_id}>
          <Stack>
            <Typography variant="body2">{option.full_name || '—'}</Typography>
            <Typography variant="caption" color="text.secondary">{option.email}</Typography>
          </Stack>
        </li>
      )}
      renderTags={(selected, getTagProps) =>
        selected.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return <Chip key={option.user_id} {...tagProps} size="small" label={hostLabel(option)} />;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Hosts"
          placeholder="Search hosts…"
          required={required}
          error={!!errors.pod_hosts_id}
          helperText={errors.pod_hosts_id?.message || requiredHint}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
