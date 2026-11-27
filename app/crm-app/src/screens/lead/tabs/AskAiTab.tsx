import { Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { ChatLayout } from '@/components/mobile/ChatLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { AskAiActionCard } from './AskAiActionCard';
import { useAskAiActions } from './AskAiActions';
import { AskAiComposer } from './AskAiComposer';
import { AskAiContextPanel } from './AskAiContextPanel';
import { AskAiEmailSheet } from './AskAiEmailSheet';
import { AskAiMessages } from './AskAiMessages';
import { AskAiReminderSheet } from './AskAiReminderSheet';
import { useAskAiThread } from './AskAiState';
import { TabAlert } from './TabAlert';
import { TabIconButton } from './TabIconButton';
import type { LeadTabProps } from './TabsBTypes';

const SCOPE = 'crm-app/AskAiTab';

/**
 * Ask AI about this lead — the portal's drawer as a tab: a conversation
 * grounded in the lead's whole CRM history (what it read is listed), which
 * can draft emails and plan reminders for the agent to confirm, edit or
 * dismiss. Every lead kind has it. Laid out as a phone chat: only the
 * conversation scrolls, the question box stays at the bottom with the keyboard.
 */
export function AskAiTab({ kind, id, lead, onChanged }: Readonly<LeadTabProps>) {
  const { t } = useTranslation();
  const thread = useAskAiThread(kind, id);
  const actions = useAskAiActions({
    kind,
    id,
    setActionStatus: thread.setActionStatus,
    onChanged: () => {
      fireAndForget(thread.refresh(), logs.mobileApp, SCOPE, 'refresh');
      onChanged();
    },
  });
  const run = (work: Promise<unknown>, action: string) =>
    fireAndForget(work, logs.mobileApp, SCOPE, action);
  const leadEmail = lead.contacts.map((c) => (c.email ?? '').trim()).find(Boolean) ?? null;
  const error = actions.error ?? thread.error;

  return (
    <YStack flex={1} testID="ask-ai-tab">
      <ChatLayout
        composer={
          // Questions wait for the saved thread, so a late load cannot replace a fresh answer.
          <AskAiComposer busy={thread.asking || thread.loadingThread} onSend={thread.ask} />
        }
        testID="ask-ai-chat"
      >
        <XStack alignItems="center" gap="$2">
          <Text flex={1} color="$muted" fontSize="$2" numberOfLines={1}>
            {t('crm.askAi.about', { vars: { name: lead.name } })}
          </Text>
          <TabIconButton
            icon="restart-alt"
            label={t('crm.askAi.newConversation')}
            onPress={() => run(thread.clear(), 'clear')}
            disabled={thread.clearing || thread.messages.length === 0}
            testID="crm-ask-ai-clear"
          />
        </XStack>
        <AskAiContextPanel context={thread.context} loading={thread.loadingThread} />
        <AskAiMessages
          messages={thread.messages}
          pending={thread.pending}
          ready={!thread.loadingThread}
          onSuggestion={(text) => run(thread.ask(text), 'ask')}
          renderActions={(m) =>
            actions
              .refsOf(m)
              .map((ref) => (
                <AskAiActionCard
                  key={`${ref.messageId}-${ref.index}`}
                  action={ref.action}
                  busy={actions.isBusy(ref)}
                  onReviewEmail={() => actions.openEmail(ref)}
                  onCreateReminder={() => run(actions.createReminder(ref), 'createReminder')}
                  onEditReminder={() => actions.openReminder(ref)}
                  onApplyUpdate={() => run(actions.applyUpdate(ref), 'applyUpdate')}
                  onDismiss={() => run(actions.dismiss(ref), 'dismiss')}
                />
              ))
          }
        />
        {error ? (
          <TabAlert
            tone="danger"
            onClose={() => {
              actions.clearError();
              thread.clearError();
            }}
            testID="crm-ask-ai-error"
          >
            {error}
          </TabAlert>
        ) : null}
      </ChatLayout>
      <AskAiEmailSheet
        kind={kind}
        id={id}
        leadName={lead.name}
        leadEmail={leadEmail}
        draft={actions.emailFor?.action ?? null}
        onClose={actions.closeEmail}
        onResult={(message, ok) => run(actions.emailResult(message, ok), 'emailResult')}
      />
      <AskAiReminderSheet
        kind={kind}
        id={id}
        draft={actions.reminderFor?.action ?? null}
        onClose={actions.closeReminder}
        onSaved={() => run(actions.reminderSaved(), 'reminderSaved')}
      />
    </YStack>
  );
}
