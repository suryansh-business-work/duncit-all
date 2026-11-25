import { useEffect, useState } from 'react';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { HtmlPreview } from '@/components/email-templates/HtmlPreview';
import { Notice } from '@/components/email-templates/Notice';
import type { EmailThemeValues } from '@/forms/email-template-theme';
import { CrmAppEmailTemplateThemePreviewDocument } from '@/graphql/emailTemplates';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

/** Wait for typing to pause, so each keystroke is not a round trip (the portal's 450 ms). */
export const THEME_PREVIEW_DEBOUNCE_MS = 450;

/**
 * The shared starter email rendered by the server under the theme being
 * edited — the same render path a lead's email takes.
 */
export function ThemePreview({ theme }: Readonly<{ theme: EmailThemeValues | null }>) {
  const { t } = useTranslation();
  const [html, setHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!theme) return undefined;
    let cancelled = false;
    const render = async () => {
      setLoading(true);
      try {
        const { renderCrmEmailThemePreview: result } = await gqlRequest(
          CrmAppEmailTemplateThemePreviewDocument,
          { theme },
        );
        if (cancelled) return;
        setHtml(result.html);
        setError(result.errors[0] ?? null);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, t('crmApp.common.loadFailed')));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const timer = setTimeout(
      () => fireAndForget(render(), logs.mobileApp, 'crm-app/ThemePreview', 'render'),
      THEME_PREVIEW_DEBOUNCE_MS,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [theme, t]);

  return (
    <YStack gap="$2">
      <XStack alignItems="center" gap="$2">
        <Text flex={1} fontWeight="800" fontSize="$5" role="heading">
          {t('crm.emailSettings.livePreview')}
        </Text>
        {loading ? <Spinner color="$accentText" testID="theme-preview-loading" /> : null}
      </XStack>
      {error ? (
        <Notice tone="error" testID="theme-preview-error">
          {error}
        </Notice>
      ) : null}
      <HtmlPreview
        html={html}
        label={t('crm.emailSettings.livePreview')}
        testID="theme-preview-frame"
      />
    </YStack>
  );
}
