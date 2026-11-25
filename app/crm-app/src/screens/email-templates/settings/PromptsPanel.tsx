import { useState } from 'react';
import { YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Notice } from '@/components/email-templates/Notice';
import { StateView } from '@/components/StateView';
import { EmailPromptForm, type EmailAiPrompt } from '@/forms/email-template-prompt';
import {
  CrmAppEmailTemplateAiPromptsDocument,
  CrmAppEmailTemplateResetAiPromptDocument,
  CrmAppEmailTemplateUpdateAiPromptDocument,
} from '@/graphql/emailTemplates';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

type Busy = { key: string; action: 'save' | 'reset' } | null;

/**
 * Settings › Prompt Injection — the instructions behind "Seed MJML with AI".
 * They are the CRM's own; the Communications and Marketing consoles write with
 * a separate prompt, so nothing changed here reaches their emails.
 */
export function PromptsPanel() {
  const { t } = useTranslation();
  const query = useGqlQuery(
    CrmAppEmailTemplateAiPromptsDocument,
    {},
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const [busy, setBusy] = useState<Busy>(null);
  const [resetting, setResetting] = useState<EmailAiPrompt | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const prompts: EmailAiPrompt[] = (query.data?.crmEmailAiPrompts ?? []).flatMap((p) =>
    p.key ? [{ ...p, key: p.key }] : [],
  );

  const run = async (
    key: string,
    action: 'save' | 'reset',
    work: () => Promise<unknown>,
    message: string,
  ) => {
    setActionError(null);
    setDone(null);
    setBusy({ key, action });
    try {
      await work();
      await query.refetch();
      setDone(message);
    } catch (err) {
      setActionError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setBusy(null);
    }
  };

  const reset = async (key: string) => {
    await run(
      key,
      'reset',
      () => gqlRequest(CrmAppEmailTemplateResetAiPromptDocument, { key }),
      t('crm.emailSettings.promptReset'),
    );
    setResetting(null);
  };

  if (!query.data)
    return <StateView loading={query.loading} error={query.error} onRetry={query.refetch} />;
  return (
    <YStack gap="$3">
      <Notice tone="info">{t('crm.emailSettings.promptsIntro')}</Notice>
      {done ? (
        <Notice tone="success" onClose={() => setDone(null)} testID="prompts-done">
          {done}
        </Notice>
      ) : null}
      {actionError ? (
        <Notice tone="error" onClose={() => setActionError(null)} testID="prompts-error">
          {actionError}
        </Notice>
      ) : null}
      {prompts.length === 0 ? (
        <Notice tone="warning">{t('crm.emailSettings.promptsMissing')}</Notice>
      ) : null}
      {prompts.map((prompt) => (
        <EmailPromptForm
          key={prompt.key}
          prompt={prompt}
          working={busy?.key === prompt.key ? busy.action : null}
          onSubmit={({ content }) =>
            run(
              prompt.key,
              'save',
              () =>
                gqlRequest(CrmAppEmailTemplateUpdateAiPromptDocument, { key: prompt.key, content }),
              t('crm.emailSettings.promptSaved'),
            )
          }
          onReset={() => setResetting(prompt)}
        />
      ))}
      {resetting ? (
        <ConfirmDialog
          open
          title={t('crm.emailSettings.resetPromptTitle')}
          message={t('crm.emailSettings.resetPromptMessage')}
          confirmLabel={t('crm.emailSettings.resetPrompt')}
          cancelLabel={t('shell.common.cancel')}
          danger
          busy={busy?.action === 'reset'}
          onConfirm={() =>
            fireAndForget(
              reset(resetting.key),
              logs.mobileApp,
              'crm-app/EmailPromptsPanel',
              'reset',
            )
          }
          onCancel={() => setResetting(null)}
          testID="prompt-reset-dialog"
        />
      ) : null}
    </YStack>
  );
}
