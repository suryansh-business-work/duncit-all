import { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { MenuItem, TextField } from '@mui/material';
import { COMMS_PROVIDER_OPTIONS, type CommsProviderOption } from '../api/comms.gql';

interface Props {
  type: 'SMTP' | 'VOBIZ_EMAIL' | 'VOBIZ_CALL';
  value: string;
  onChange: (id: string) => void;
  label?: string;
  size?: 'small' | 'medium';
}

/**
 * Selects which configured comms provider to use for an email or call.
 * On first mount it auto-selects the active default for the requested
 * type so the user doesn't have to make a choice every time.
 */
export default function CommsProviderSelect({ type, value, onChange, label = 'Provider', size = 'small' }: Props) {
  const { data, loading } = useQuery<{ commsProviderOptions: CommsProviderOption[] }>(COMMS_PROVIDER_OPTIONS, {
    variables: { type },
    fetchPolicy: 'cache-first',
  });
  const options = data?.commsProviderOptions ?? [];

  useEffect(() => {
    if (!value && options.length) {
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
