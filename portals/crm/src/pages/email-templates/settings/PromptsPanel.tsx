import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { ConfirmDialog, notifySuccess } from '@duncit/dialogs';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import {
  CRM_EMAIL_AI_PROMPTS,
  RESET_CRM_EMAIL_AI_PROMPT,
  UPDATE_CRM_EMAIL_AI_PROMPT,
  type CrmEmailAiPrompt,
} from '../../../api/emailSettings.gql';
import { EmailPromptForm } from '../../../forms/email-prompt';

/**
 * Settings › Prompt Injection — the instructions behind "Seed MJML with AI".
 * These two prompts are the CRM's own (the AI Library lists them too); the
 * Communications and Marketing consoles write with a separate prompt, so
 * nothing changed here reaches their emails.
 */
export default function PromptsPanel() {
  const { t } = useTranslation();
  const refetchQueries = [{ query: CRM_EMAIL_AI_PROMPTS }];
  const { data, loading, error, refetch } = useQuery<{ crmEmailAiPrompts: CrmEmailAiPrompt[] }>(CRM_EMAIL_AI_PROMPTS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation(UPDATE_CRM_EMAIL_AI_PROMPT, { refetchQueries });
  const [resetMut] = useMutation(RESET_CRM_EMAIL_AI_PROMPT, { refetchQueries });
  const [busy, setBusy] = useState<{ key: string; action: 'save' | 'reset' } | null>(null);
  const [resetting, setResetting] = useState<CrmEmailAiPrompt | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (key: string, action: 'save' | 'reset', work: () => Promise<unknown>, done: string) => {
    setActionError(null);
    setBusy({ key, action });
    try {
      await work();
      notifySuccess(done);
    } catch (e) {
      setActionError(parseApiError(e));
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress aria-label={t('crm.emailSettings.loadingPrompts')} />
      </Stack>
    );
  }
  if (error) {
    return (
      <Alert
        severity="error"
        action={<DuncitButton size="small" onClick={() => refetch()}>{t('shell.common.retry')}</DuncitButton>}
      >
        {parseApiError(error)}
      </Alert>
    );
  }

  const prompts = data?.crmEmailAiPrompts ?? [];
  return (
    <Stack spacing={2}>
      <Alert severity="info">{t('crm.emailSettings.promptsIntro')}</Alert>
      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      {prompts.length === 0 && <Alert severity="warning">{t('crm.emailSettings.promptsMissing')}</Alert>}
      {prompts.map((prompt) => (
        <EmailPromptForm
          key={prompt.key}
          prompt={prompt}
          submitting={busy?.key === prompt.key && busy.action === 'save'}
          resetting={busy?.key === prompt.key && busy.action === 'reset'}
          onSubmit={({ content }) =>
            run(prompt.key, 'save', () => save({ variables: { key: prompt.key, content } }), t('crm.emailSettings.promptSaved'))
          }
          onReset={() => setResetting(prompt)}
        />
      ))}
      <ConfirmDialog
        open={!!resetting}
        title={t('crm.emailSettings.resetPromptTitle')}
        message={t('crm.emailSettings.resetPromptMessage')}
        confirmLabel={t('crm.emailSettings.resetPrompt')}
        destructive
        busyLabel={t('shell.common.saving')}
        loading={busy?.action === 'reset'}
        onConfirm={async () => {
          if (resetting) {
            const key = resetting.key;
            await run(key, 'reset', () => resetMut({ variables: { key } }), t('crm.emailSettings.promptReset'));
          }
          setResetting(null);
        }}
        onClose={() => setResetting(null)}
      />
    </Stack>
  );
}
