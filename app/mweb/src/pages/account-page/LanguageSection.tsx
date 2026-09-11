import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { LanguageSelect } from '@duncit/ui';
import { LANGUAGE_PREFERENCE_FLAG, useTranslation } from '@duncit/app-settings';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

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
 * them to the native app and every portal. Hidden while the language_preference
 * flag is off.
 */
export default function LanguageSection() {
  const { t, locale, locales, setLocale } = useTranslation();
  const [save, { loading: saving }] = useMutation<any>(SET_MY_LOCALE);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enabled = useFeatureFlag(LANGUAGE_PREFERENCE_FLAG);

  if (!enabled || locales.length < 2) return null;

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
    <Card>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <Typography
              component="h2"
              sx={{
                fontSize: '1.05rem',
                fontWeight: 600,
                flex: 1
              }}>
              {t('mweb.account.preferences')}
            </Typography>
            {saving && <CircularProgress size={16} data-testid="language-saving" />}
          </Stack>
          <LanguageSelect
            value={locale}
            options={locales}
            onChange={change}
            label={t('mweb.common.language')}
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
