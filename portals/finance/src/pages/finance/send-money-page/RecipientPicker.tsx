import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Autocomplete, TextField } from '@mui/material';
import { useDebouncedValue } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { SEND_MONEY_RECIPIENTS } from './queries';

export interface RecipientOption {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Props {
  value: RecipientOption | null;
  onChange: (recipient: RecipientOption | null) => void;
  error?: string;
  disabled?: boolean;
}

/** A search shorter than this would match half the user base, so it is not sent. */
const MIN_SEARCH = 2;
const SEARCH_DELAY_MS = 300;

const labelOf = (option: RecipientOption) => (option.email ? `${option.name} · ${option.email}` : option.name);

/**
 * Pick who to pay: a searchable dropdown over every user, matched by name, email
 * or phone. Results arrive from the server as the Finance Manager types (after a
 * short pause), and only the matches are ever loaded — never the whole user list.
 */
export default function RecipientPicker({ value, onChange, error, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const search = useDebouncedValue(input.trim(), SEARCH_DELAY_MS);
  const enabled = search.length >= MIN_SEARCH;
  const { data, loading } = useQuery<{ sendMoneyRecipients: RecipientOption[] }>(SEND_MONEY_RECIPIENTS, {
    variables: { search },
    skip: !enabled,
    fetchPolicy: 'network-only',
  });
  const options = useMemo(() => {
    const found = enabled ? (data?.sendMoneyRecipients ?? []) : [];
    // Keep the chosen person selectable while the list for a newer search loads.
    return value && !found.some((o) => o.id === value.id) ? [value, ...found] : found;
  }, [data, enabled, value]);

  return (
    <Autocomplete<RecipientOption>
      options={options}
      value={value}
      disabled={disabled}
      loading={loading}
      filterOptions={(all) => all}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={labelOf}
      onChange={(_event, next) => onChange(next)}
      onInputChange={(_event, next, reason) => {
        if (reason === 'input') setInput(next);
        if (reason === 'clear') setInput('');
      }}
      noOptionsText={enabled ? t('finance.payouts.noUsersFound') : t('finance.payouts.typeToSearch')}
      loadingText={t('finance.payouts.searching')}
      renderInput={(params) => (
        <TextField
          {...params}
          required
          label={t('finance.payouts.recipient')}
          placeholder={t('finance.payouts.searchUsers')}
          error={!!error}
          helperText={error ?? t('finance.payouts.recipientHelp')}
        />
      )}
    />
  );
}
