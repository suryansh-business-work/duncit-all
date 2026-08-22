import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Alert, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import { LanguageSelect } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';

const SET_MY_LOCALE = gql`
  mutation SetMyLocale($locale: String!) {
    setMyLocale(locale: $locale) {
      user_id
      locale
    }
  }
`;

/**
 * Language preference. Switching re-renders mWeb immediately (the provider
 * swaps catalogues) and persists to the user's profile, so the choice follows
 * them to the native app and every portal.
 */
export default function LanguageSection() {
  const { t, locale, locales, setLocale } = useTranslation();
  const [save] = useMutation(SET_MY_LOCALE);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (locales.length < 2) return null;

  const change = async (code: string) => {
    // Switch the UI first: the language must change even if the write fails,
    // and the local choice is persisted by the provider regardless.
    setLocale(code);
    setError(null);
    try {
      await save({ variables: { locale: code } });
      setToast(t('mweb.common.languageSaved'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('mweb.account.couldNotSaveYourLanguage'));
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t('mweb.account.preferences')}
          </Typography>
          <LanguageSelect
            value={locale}
            options={locales}
            onChange={change}
            label={t('mweb.common.language')}
            helperText={t('mweb.common.languageHint')}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </CardContent>
      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Card>
  );
}
