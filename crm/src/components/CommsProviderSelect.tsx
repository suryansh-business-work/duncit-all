import { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { MenuItem, TextField } from '@mui/material';
import { COMMS_PROVIDER_OPTIONS, type CommsProviderOption } from '../api/comms.gql';

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
export default function CommsProviderSelect({ type, value, onChange, label = 'Provider', size = 'small' }: Props) {
  const { data, loading } = useQuery<{ commsProviderOptions: CommsProviderOption[] }>(COMMS_PROVIDER_OPTIONS, {
    variables: { type },
    fetchPolicy: 'cache-and-network',
  });
  const options = data?.commsProviderOptions ?? [];

  useEffect(() => {
    if (!options.length) return;
    const selectable = !value || !options.some((opt) => opt.id === value);
    if (selectable) {
      const def = options.find((opt) => opt.is_default) ?? options[0];
      onChange(def.id);
    }
  }, [options, value, onChange]);

  return (
    <TextField
      select
      size={size}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading || options.length === 0}
      helperText={options.length === 0 ? 'No active providers — configure in Tech portal' : ' '}
      fullWidth
    >
      {options.map((opt) => (
        <MenuItem key={opt.id} value={opt.id}>
          {opt.name}{opt.is_default ? ' · default' : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}
