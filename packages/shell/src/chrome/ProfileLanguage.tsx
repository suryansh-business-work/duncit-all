import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Alert, Divider, Stack, Typography } from '@mui/material';
import { LanguageSelect } from '@duncit/ui';
import { useTranslation } from '../i18n/useTranslation';

const SET_MY_LOCALE = gql`
  mutation SetMyLocale($locale: String!) {
    setMyLocale(locale: $locale) {
      user_id
      locale
    }
  }
`;

/**
 * Language preference on the shared portal profile page — every MUI portal gets
 * it from mounting the shell, so there is one switcher, not seventeen.
 *
 * Renders nothing until the platform has at least two active locales, so
 * portals show no dead control before any language is configured.
 */
export function ProfileLanguage() {
  const { t, locale, locales, setLocale } = useTranslation();
  const [save] = useMutation(SET_MY_LOCALE);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (locales.length < 2) return null;

  const change = async (code: string) => {
    // Switch first: the language must change even if the profile write fails.
    setLocale(code);
    setError(null);
    setSaved(false);
    try {
      await save({ variables: { locale: code } });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your language');
    }
  };

  return (
    <>
      <Divider sx={{ my: 2.5 }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: 0.4 }}>
        LANGUAGE
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1, maxWidth: 360 }}>
        <LanguageSelect
          value={locale}
          options={locales}
          onChange={change}
          label={t('mweb.common.language')}
          helperText={t('mweb.common.languageHint')}
        />
        {saved && <Alert severity="success">{t('mweb.common.languageSaved')}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </>
  );
}
