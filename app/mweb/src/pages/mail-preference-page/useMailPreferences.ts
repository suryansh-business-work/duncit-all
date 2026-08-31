import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
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
  const [saveFailed, setSaveFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [busyCategory, setBusyCategory] = useState<string | null>(null);

  const mine = useQuery<{ myMailPreferences: MailPreference }>(MY_MAIL_PREFERENCES, {
    skip: byToken,
    fetchPolicy: 'cache-and-network',
  });
  const linked = useQuery<{ mailPreferencesByToken: MailPreference | null }>(
    MAIL_PREFERENCES_BY_TOKEN,
    { skip: !byToken, variables: token ?? { e: '', t: '' }, fetchPolicy: 'network-only' },
  );

  const [setOne] = useMutation<any>(byToken ? SET_MAIL_PREFERENCE_BY_TOKEN : SET_MY_MAIL_PREFERENCE);
  const [setEvery] = useMutation<any>(byToken ? UNSUBSCRIBE_ALL_BY_TOKEN : SET_ALL_MY_MAIL_PREFERENCES);

  const active = byToken ? linked : mine;
  const preference = byToken
    ? (linked.data?.mailPreferencesByToken ?? null)
    : (mine.data?.myMailPreferences ?? null);

  /**
   * One save, whichever mutation it is.
   *
   * The failure is reported as a flag rather than the thrown message: a raw
   * Apollo string ("Response not successful: 500") is neither localized nor
   * anything the reader can act on (rule 38). It still reaches the log, where
   * somebody can actually use it.
   */
  const run = useCallback(
    async (category: string, enabled: boolean, work: () => Promise<unknown>) => {
      setBusyCategory(category);
      setSaveFailed(false);
      try {
        await work();
        setSaved(true);
        // The server confirms by email on the way OUT only — confirming an
        // opt-in would be another email somebody just asked for fewer of.
        setConfirmationSent(!enabled);
      } catch (error) {
        setSaveFailed(true);
        logs.mWeb.error('useMailPreferences', 'save', { error, category, enabled });
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
      run(category, enabled, () => setOne({ variables: { ...token, category, enabled } })),
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
      run('__all__', enabled, () => setEvery({ variables: byToken ? token : { enabled } })),
    [byToken, run, setEvery, token],
  );

  return {
    preference,
    loading: active.loading && !preference,
    /** The link was tampered with, or the signing key was rotated. */
    linkInvalid: byToken && !active.loading && !preference,
    loadError: active.error ?? null,
    saveFailed,
    saved,
    /** The last save was an opt-out, so a confirmation email is on its way. */
    confirmationSent,
    dismissSaved: () => setSaved(false),
    busyCategory,
    canResubscribeAll: !byToken,
    setCategory,
    setAll,
  };
}
