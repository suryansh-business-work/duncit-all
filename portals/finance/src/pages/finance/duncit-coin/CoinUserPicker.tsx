import { useEffect, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import { COIN_USER_SEARCH, USER_SEARCH_MIN_CHARS, type CoinUserOption } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  value: CoinUserOption | null;
  onChange: (next: CoinUserOption | null) => void;
  disabled?: boolean;
}

/** Keystrokes settle for this long before the server is asked. */
const DEBOUNCE_MS = 300;

const optionLabel = (o: CoinUserOption) => (o.full_name ? `${o.full_name} — ${o.email}` : o.email);

/**
 * Finds the ONE account an adjustment is meant for.
 *
 * Nothing is listed until two characters are typed — a picker that offers the
 * first ten accounts on the platform before you have said who you mean is a
 * picker that hands coins to the wrong person. Each option carries its current
 * balance, because that is the number that decides what is reasonable to type.
 */
export default function CoinUserPicker({ value, onChange, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [search, { data, loading }] = useLazyQuery<{ coinUserSearch: CoinUserOption[] }>(
    COIN_USER_SEARCH,
    { fetchPolicy: 'network-only' },
  );

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < USER_SEARCH_MIN_CHARS) return undefined;
    const id = globalThis.setTimeout(() => {
      search({ variables: { term: trimmed } }).catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => globalThis.clearTimeout(id);
  }, [term, search]);

  const options = data?.coinUserSearch ?? [];

  return (
    <Autocomplete<CoinUserOption>
      value={value}
      onChange={(_e, next) => onChange(next)}
      onInputChange={(_e, next) => setTerm(next)}
      options={options}
      loading={loading}
      disabled={disabled}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      // The server already ranked and capped the list; re-filtering it here
      // would hide matches that came back on name while the box holds an email.
      filterOptions={(x) => x}
      noOptionsText={
        term.trim().length < USER_SEARCH_MIN_CHARS
          ? 'Type a name or email to search'
          : 'No account matches that'
      }
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <Box>
            <Typography variant="body2">{option.full_name || option.email}</Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {option.email} · holds {option.balance} coins
            </Typography>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t('finance.duncitCoin.user')}
          required
          size="small"
          helperText={t('finance.duncitCoin.searchByNameOrEmail')}
        />
      )}
    />
  );
}
