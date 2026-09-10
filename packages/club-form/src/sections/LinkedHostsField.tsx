import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Autocomplete, Chip, Stack, TextField, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useFormContext, useWatch } from 'react-hook-form';
import { LINKABLE_HOSTS } from '../queries';
import type { ClubFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface HostOption {
  id: string;
  user_id: string;
  full_name?: string | null;
}

const hostLabel = (host: HostOption) => host.full_name || host.user_id;

/**
 * Hosts linked to this club by hand.
 *
 * The club page falls back to the hosts of the club's own pods when this is
 * empty, so leaving it empty is a real choice — which is why the field says so
 * rather than looking unfinished. Stored as ACCOUNT ids (`host_ids` refs User),
 * not host-record ids, because that is what the club document holds.
 */
export default function LinkedHostsField() {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<ClubFormValues>();
  const hostIds = useWatch({ control, name: 'host_ids' }) ?? [];

  const { data, loading } = useQuery<{ publicHosts: HostOption[] }>(LINKABLE_HOSTS, {
    fetchPolicy: 'cache-and-network',
  });
  const options = data?.publicHosts ?? [];

  // Never drop an id the list does not name — an unknown one keeps an id-labelled
  // chip rather than silently unlinking a host.
  const value = useMemo(
    () => hostIds.map((id) => options.find((host) => host.user_id === id) ?? { id, user_id: id }),
    [hostIds, options],
  );

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <PersonIcon fontSize="small" color="action" />
        <Typography variant="subtitle2">{t('clubForm.linkedHosts.title')}</Typography>
      </Stack>
      <Alert severity="info">{t('clubForm.linkedHosts.hint')}</Alert>
      <Autocomplete
        multiple
        disableCloseOnSelect
        options={options}
        loading={loading}
        value={value}
        getOptionLabel={hostLabel}
        isOptionEqualToValue={(option, val) => option.user_id === val.user_id}
        onChange={(_event, next) =>
          setValue(
            'host_ids',
            next.map((host) => host.user_id),
            { shouldValidate: true },
          )
        }
        renderValue={(selected, getItemProps) =>
          selected.map((host, index) => {
            const { key: _key, ...tagProps } = getItemProps({ index });
            return <Chip key={host.user_id} {...tagProps} size="small" label={hostLabel(host)} />;
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('clubForm.linkedHosts.label')}
            placeholder={t('clubForm.linkedHosts.placeholder')}
          />
        )}
      />
    </Stack>
  );
}
