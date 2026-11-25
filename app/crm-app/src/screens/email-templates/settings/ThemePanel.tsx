import { useCallback, useState } from 'react';
import { YStack } from 'tamagui';

import { Notice } from '@/components/email-templates/Notice';
import type { EmailSettings } from '@/features/email-templates/useEmailSettings';
import { EmailThemeForm, type EmailThemeValues } from '@/forms/email-template-theme';
import { CrmAppEmailTemplateUpdateThemeDocument } from '@/graphql/emailTemplates';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { ThemePreview } from './ThemePreview';

interface Props {
  settings: EmailSettings;
  onSaved: (next: EmailSettings) => void;
}

/** Settings › Theme Configuration: the theme form above a live preview of a real CRM email. */
export function ThemePanel({ settings, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<EmailThemeValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const onPreview = useCallback((values: EmailThemeValues) => setPreview(values), []);

  const submit = async (values: EmailThemeValues) => {
    setError(null);
    setSaved(false);
    try {
      const { updateCrmEmailTheme } = await gqlRequest(CrmAppEmailTemplateUpdateThemeDocument, {
        input: values,
      });
      onSaved(updateCrmEmailTheme);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };

  return (
    <YStack gap="$3">
      <Notice tone="info">{t('crm.emailSettings.themeIntro')}</Notice>
      {saved ? (
        <Notice tone="success" onClose={() => setSaved(false)} testID="theme-saved">
          {t('crm.emailSettings.themeSaved')}
        </Notice>
      ) : null}
      {error ? (
        <Notice tone="error" onClose={() => setError(null)} testID="theme-error">
          {error}
        </Notice>
      ) : null}
      <EmailThemeForm
        initialValues={settings.theme}
        defaults={settings.defaults}
        fonts={settings.fonts}
        onSubmit={submit}
        onPreview={onPreview}
      />
      <ThemePreview theme={preview} />
    </YStack>
  );
}
