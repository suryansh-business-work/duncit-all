import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { MenuItem, TextField } from '@mui/material';
import { COMMS_PROVIDER_OPTIONS, type CommsProviderOption } from '../api/comms.gql';
import { useTranslation } from '@duncit/shell';
import { crmProviderToSelect } from '@duncit/utils';

interface Props {
  type: 'SMTP' | 'TWILIO_CALL';
  value: string;
  onChange: (id: string) => void;
  label?: string;
  size?: 'small' | 'medium';
}

/**
 * Selects which configured comms provider to use for an email or call. Only
 * ACTIVE providers from the Tech portal are listed (disabled ones never show).
 * It auto-selects the active default when nothing is chosen — and if the
 * current selection is no longer active (e.g. disabled in the Tech portal), it
 * falls back to the default so a disabled provider is never left selected.
 */
export default function CommsProviderSelect({ type, value, onChange, label, size = 'small' }: Readonly<Props>) {
  const { t } = useTranslation();
  const labelText = label ?? t('crm.components.provider');
  const { data, loading } = useQuery<{ commsProviderOptions: CommsProviderOption[] }>(COMMS_PROVIDER_OPTIONS, {
    variables: { type },
    fetchPolicy: 'cache-and-network',
  });
  const options = data?.commsProviderOptions ?? [];

  useEffect(() => {
    const next = crmProviderToSelect(options, value);
    if (next) onChange(next);
  }, [options, value, onChange]);

  return (
    <TextField
      select
      size={size}
      label={labelText}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading || options.length === 0}
      helperText={options.length === 0 ? t('crm.compose.noProviders') : ' '}
      fullWidth
    >
      {options.map((opt) => (
        <MenuItem key={opt.id} value={opt.id}>
          {opt.is_default ? t('crm.compose.providerDefault', { vars: { name: opt.name } }) : opt.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
