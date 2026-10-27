import { useEffect, useState, type HTMLAttributes, type Key } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import {
  COIN_USER_SEARCH,
  USER_SEARCH_MIN_CHARS,
  type CoinUserOption,
} from '../../pages/duncit-coin/queries';

/** Keystrokes settle for this long before the server is asked. */
const DEBOUNCE_MS = 300;

export const memberLabel = (o: CoinUserOption) => (o.full_name ? `${o.full_name} — ${o.email}` : o.email);

/**
 * The member search behind every picker that hands coins or cards to someone.
 *
 * Nothing is listed until two characters are typed — a picker that offers the
 * first ten accounts on the platform before you have said who you mean is a
 * picker that hands value to the wrong person. Each option carries its current
 * coin balance, because that is the number that decides what is reasonable.
 */
export function useMemberSearch() {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [search, { data, loading }] = useLazyQuery<{ coinUserSearch: CoinUserOption[] }>(COIN_USER_SEARCH, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < USER_SEARCH_MIN_CHARS) return undefined;
    const id = globalThis.setTimeout(() => {
      search({ variables: { term: trimmed } }).catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => globalThis.clearTimeout(id);
  }, [term, search]);

  const noOptionsText =
    term.trim().length < USER_SEARCH_MIN_CHARS ? t('loyalty.members.typeToSearch') : t('loyalty.members.noMatch');

  const renderOption = (props: HTMLAttributes<HTMLLIElement> & { key?: Key }, option: CoinUserOption) => (
    <Box component="li" {...props} key={option.id}>
      <Box>
        <Typography variant="body2">{option.full_name || option.email}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('loyalty.members.optionHolds', { vars: { email: option.email, coins: option.balance } })}
        </Typography>
      </Box>
    </Box>
  );

  return {
    options: data?.coinUserSearch ?? [],
    loading,
    setTerm,
    noOptionsText,
    renderOption,
    // The server already ranked and capped the list; re-filtering it here
    // would hide matches that came back on name while the box holds an email.
    filterOptions: (x: CoinUserOption[]) => x,
  };
}
