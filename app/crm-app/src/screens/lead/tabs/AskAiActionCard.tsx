import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { CRM_LEAD_AI_ACTION_HEADING, crmTextPreview } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';
import type { AskAiAction } from './AskAiState';
import { htmlToText } from './ManualLogsHtml';

export interface AskAiActionHandlers {
  onReviewEmail: () => void;
  onCreateReminder: () => void;
  onEditReminder: () => void;
  onApplyUpdate: () => void;
  onDismiss: () => void;
}

const ICON = {
  EMAIL_DRAFT: 'email',
  CREATE_REMINDER: 'alarm-add',
  UPDATE_REMINDER: 'edit-calendar',
} as const;

function Line({ label, value }: Readonly<{ label: string; value?: string | null }>) {
  if (!value) return null;
  return <Text fontSize="$2">{`${label}: ${value}`}</Text>;
}

/** What the proposal says: an email's recipient, subject and opening; a reminder's title, due time, notes and status. */
function Details({ action }: Readonly<{ action: AskAiAction }>) {
  const { t } = useTranslation();
  if (action.type === 'EMAIL_DRAFT') {
    return (
      <YStack gap="$1">
        <Line label={t('crm.askAi.to')} value={action.to || t('crm.askAi.noRecipient')} />
        <Line label={t('crm.common.subject')} value={action.subject} />
        <Text color="$muted" fontSize="$2">
          {crmTextPreview(htmlToText(action.body_html))}
        </Text>
      </YStack>
    );
  }
  let status: string | null = null;
  if (action.reminder_status === 'DONE') status = t('crm.askAi.markDone');
  else if (action.reminder_status === 'PENDING') status = t('crm.askAi.markPending');
  return (
    <YStack gap="$1">
      <Line label={t('shell.common.title')} value={action.title} />
      <Line label={t('crm.askAi.due')} value={displayDateTime(action.due_at)} />
      <Line label={t('crm.components.notes')} value={action.notes} />
      <Line label={t('shell.common.status')} value={status} />
    </YStack>
  );
}

/** One proposal under an answer. Nothing is sent or saved until the agent presses a button here. */
export function AskAiActionCard({
  action,
  busy,
  ...on
}: Readonly<AskAiActionHandlers & { action: AskAiAction; busy: boolean }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const proposed = action.status === 'PROPOSED';
  return (
    <YStack {...SURFACE} gap="$2" testID="crm-ask-ai-action">
      <XStack gap="$2" alignItems="center">
        <MaterialIcons
          name={ICON[action.type]}
          size={18}
          color={theme.accentText?.val}
          accessibilityElementsHidden
        />
        <Text flex={1} fontWeight="800" fontSize="$2">
          {t(CRM_LEAD_AI_ACTION_HEADING[action.type])}
        </Text>
        {action.status === 'DONE' ? (
          <ToneChip label={t('crm.components.done')} tone="success" />
        ) : null}
        {action.status === 'DISMISSED' ? (
          <ToneChip label={t('crm.askAi.dismissed')} tone="default" />
        ) : null}
      </XStack>
      <Details action={action} />
      {action.result_message ? (
        <Text color="$muted" fontSize="$2">
          {action.result_message}
        </Text>
      ) : null}
      {proposed ? (
        <XStack gap="$2" flexWrap="wrap">
          {action.type === 'EMAIL_DRAFT' ? (
            <DuncitButton
              label={t('crm.askAi.reviewAndSend')}
              onPress={on.onReviewEmail}
              size="sm"
              disabled={busy}
              testID="ask-ai-review"
            />
          ) : null}
          {action.type === 'CREATE_REMINDER' ? (
            <>
              <DuncitButton
                label={t('crm.askAi.createReminder')}
                onPress={on.onCreateReminder}
                size="sm"
                loading={busy}
                testID="ask-ai-create"
              />
              <DuncitButton
                label={t('shell.common.edit')}
                onPress={on.onEditReminder}
                variant="outline"
                size="sm"
                disabled={busy}
                testID="ask-ai-edit"
              />
            </>
          ) : null}
          {action.type === 'UPDATE_REMINDER' ? (
            <DuncitButton
              label={t('crm.askAi.applyChange')}
              onPress={on.onApplyUpdate}
              size="sm"
              loading={busy}
              testID="ask-ai-apply"
            />
          ) : null}
          <DuncitButton
            label={t('crm.askAi.dismiss')}
            onPress={on.onDismiss}
            variant="ghost"
            size="sm"
            disabled={busy}
            testID="ask-ai-dismiss"
          />
        </XStack>
      ) : null}
    </YStack>
  );
}
