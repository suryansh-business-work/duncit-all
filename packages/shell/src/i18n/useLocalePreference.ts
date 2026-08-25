import { useCallback, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useTranslation } from './useTranslation';

const SET_MY_LOCALE = gql`
  mutation SetMyLocale($locale: String!) {
    setMyLocale(locale: $locale) {
      user_id
      locale
    }
  }
`;

export interface LocalePreference {
  locale: string;
  locales: ReturnType<typeof useTranslation>['locales'];
  /** Switch language now and remember it on the profile. */
  change: (code: string) => Promise<void>;
  saved: boolean;
  error: string | null;
}

/**
 * Change the reader's language and keep it.
 *
 * Two places offer this — the shared profile page and the taskbar's clock tray
 * — and both need the same two-step behaviour, so the mutation lives here once
 * rather than in each of them (rule 40).
 *
 * The switch happens FIRST and the write follows: the language must change even
 * if the profile write fails, because the person asking for it is looking at a
 * screen they cannot read.
 */
export function useLocalePreference(): LocalePreference {
  const { t, locale, locales, setLocale } = useTranslation();
  const [save] = useMutation(SET_MY_LOCALE);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const change = useCallback(
    async (code: string) => {
      setLocale(code);
      setError(null);
      setSaved(false);
      try {
        await save({ variables: { locale: code } });
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('shell.profile.languageSaveFailed'));
      }
    },
    [save, setLocale, t]
  );

  return { locale, locales, change, saved, error };
}
