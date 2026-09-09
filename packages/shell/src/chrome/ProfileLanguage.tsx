import { Alert, Divider, Stack, Typography } from '@mui/material';
import { LanguageSelect } from '@duncit/ui';
import { LANGUAGE_PREFERENCE_FLAG, useFeatureFlag } from '@duncit/app-settings';
import { useTranslation } from '../i18n/useTranslation';
import { useLocalePreference } from '../i18n/useLocalePreference';

/**
 * Language preference on the shared portal profile page — every MUI portal gets
 * it from mounting the shell, so there is one switcher, not seventeen.
 *
 * Renders nothing while the language_preference flag is off, or until the
 * platform has at least two active locales, so portals show no dead control
 * before any language is configured.
 *
 * The switch-then-save behaviour lives in useLocalePreference, which the
 * taskbar's clock tray offers as well — one mutation, two places to reach it.
 */
export function ProfileLanguage() {
  const { t } = useTranslation();
  const { locale, locales, change, saved, error } = useLocalePreference();
  const enabled = useFeatureFlag(LANGUAGE_PREFERENCE_FLAG);

  if (!enabled || locales.length < 2) return null;

  return (
    <>
      <Divider sx={{ my: 2.5 }} />
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 800,
          letterSpacing: 0.4
        }}>
        LANGUAGE
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1, maxWidth: 360 }}>
        <LanguageSelect
          value={locale}
          options={locales}
          onChange={change}
          label={t('mweb.common.language')}
          helperText={t('shell.profile.languageHint')}
        />
        {saved && <Alert severity="success">{t('mweb.common.languageSaved')}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </>
  );
}
