import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, Stack } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { CRM_EMAIL_SETTINGS, UPDATE_CRM_EMAIL_THEME, type CrmEmailSettings } from '../../../api/emailSettings.gql';
import { EmailThemeForm, type EmailThemeFormValues } from '../../../forms/email-theme';
import ThemePreview from './ThemePreview';

interface Props {
  settings: CrmEmailSettings;
}

/** Settings › Theme Configuration: the theme form beside a live preview of a real CRM email. */
export default function ThemePanel({ settings }: Readonly<Props>) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<EmailThemeFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, { loading }] = useMutation(UPDATE_CRM_EMAIL_THEME, { refetchQueries: [{ query: CRM_EMAIL_SETTINGS }] });
  const onPreview = useCallback((values: EmailThemeFormValues) => setPreview(values), []);

  const submit = async (values: EmailThemeFormValues) => {
    setError(null);
    try {
      await save({ variables: { input: values } });
      notifySuccess(t('crm.emailSettings.themeSaved'));
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info">{t('crm.emailSettings.themeIntro')}</Alert>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ alignItems: { lg: 'flex-start' } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <EmailThemeForm
            initialValues={settings.theme}
            defaults={settings.defaults}
            fonts={settings.fonts}
            submitting={loading}
            onSubmit={submit}
            onPreview={onPreview}
          />
        </Box>
        <Box sx={{ width: { lg: 680 }, flexShrink: 0 }}>
          <ThemePreview theme={preview} />
        </Box>
      </Stack>
    </Stack>
  );
}
