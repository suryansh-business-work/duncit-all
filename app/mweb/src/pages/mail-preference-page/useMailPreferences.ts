import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  MAIL_PREFERENCES_BY_TOKEN,
  MY_MAIL_PREFERENCES,
  SET_ALL_MY_MAIL_PREFERENCES,
  SET_MAIL_PREFERENCE_BY_TOKEN,
  SET_MY_MAIL_PREFERENCE,
  UNSUBSCRIBE_ALL_BY_TOKEN,
  type MailPreference,
} from './queries';

/** The signature carried by a link in an email, when that is how they arrived. */
export interface MailPreferenceToken {
  e: string;
  t: string;
}

/**
 * The Mail Preference screen's data, however the reader got to it.
 *
 * Two doors, one screen: signed in from Profile, or straight off an unsubscribe
 * link with no session at all. The difference is four GraphQL documents and
 * nothing else, so it is resolved here rather than in two near-identical pages —
 * the second copy is where the two would start behaving differently.
 */
export function useMailPreferences(token: MailPreferenceToken | null) {
  const byToken = token !== null;
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busyCategory, setBusyCategory] = useState<string | null>(null);

  const mine = useQuery<{ myMailPreferences: MailPreference }>(MY_MAIL_PREFERENCES, {
    skip: byToken,
    fetchPolicy: 'cache-and-network',
  });
  const linked = useQuery<{ mailPreferencesByToken: MailPreference | null }>(
    MAIL_PREFERENCES_BY_TOKEN,
    { skip: !byToken, variables: token ?? { e: '', t: '' }, fetchPolicy: 'network-only' },
  );

  const [setOne] = useMutation(byToken ? SET_MAIL_PREFERENCE_BY_TOKEN : SET_MY_MAIL_PREFERENCE);
  const [setEvery] = useMutation(byToken ? UNSUBSCRIBE_ALL_BY_TOKEN : SET_ALL_MY_MAIL_PREFERENCES);

  const active = byToken ? linked : mine;
  const preference = byToken
    ? (linked.data?.mailPreferencesByToken ?? null)
    : (mine.data?.myMailPreferences ?? null);

  const run = useCallback(
    async (category: string, work: () => Promise<unknown>) => {
      setBusyCategory(category);
      setError(null);
      try {
        await work();
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : null);
      } finally {
        setBusyCategory(null);
      }
    },
    [],
  );

  /** Toggle one category. The mutation returns the whole sheet, so the cache
   * lands on the same shape the query wrote and nothing needs refetching. */
  const setCategory = useCallback(
    (category: string, enabled: boolean) =>
      run(category, () => setOne({ variables: { ...token, category, enabled } })),
    [run, setOne, token],
  );

  /**
   * Everything optional, in one action.
   *
   * The token mutation only ever unsubscribes — there is no "turn it all back
   * on" from an email link, because that link is what an unsubscribe request
   * looks like. Signed in, both directions are available.
   */
  const setAll = useCallback(
    (enabled: boolean) =>
      run('__all__', () => setEvery({ variables: byToken ? token : { enabled } })),
    [byToken, run, setEvery, token],
  );

  return {
    preference,
    loading: active.loading && !preference,
    /** The link was tampered with, or the signing key was rotated. */
    linkInvalid: byToken && !active.loading && !preference,
    loadError: active.error ?? null,
    error,
    saved,
    dismissSaved: () => setSaved(false),
    busyCategory,
    canResubscribeAll: !byToken,
    setCategory,
    setAll,
  };
}
