import { Text, XStack, YStack } from 'tamagui';
import { crmSurveyEntryStatus, crmSurveyLinkLive } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadSurveyEntry } from './SurveyState';
import { TabIconButton } from './TabIconButton';

export interface SurveyEntryActions {
  onFill: (entry: LeadSurveyEntry) => void;
  onShare: (entry: LeadSurveyEntry) => void;
  onRevoke: (entry: LeadSurveyEntry) => void;
  onView: (entry: LeadSurveyEntry) => void;
  onDelete: (entry: LeadSurveyEntry) => void;
}

interface Props extends SurveyEntryActions {
  entry: LeadSurveyEntry;
  busy: boolean;
}

/** When it happened, and who by. */
function Moment({
  label,
  at,
  by,
}: Readonly<{ label: string; at?: string | null; by?: string | null }>) {
  const { t } = useTranslation();
  return (
    <YStack flex={1}>
      <Text color="$muted" fontSize="$1">
        {label}
      </Text>
      <Text fontSize="$2">{displayDateTime(at) || t('crmApp.common.dash')}</Text>
      {by ? (
        <Text color="$muted" fontSize="$1">
          {t('crm.leadSurvey.byName', { vars: { name: by } })}
        </Text>
      ) : null}
    </YStack>
  );
}

/** One logged generation or response: where it came from, how it stands, and what can be done with it. */
export function SurveyEntryRow({ entry, busy, ...actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const status = crmSurveyEntryStatus(entry);
  const live = crmSurveyLinkLive(entry);
  return (
    <YStack
      {...SURFACE}
      gap="$2"
      role="button"
      aria-label={t('crm.components.openToFillEditThisSurvey')}
      onPress={() => actions.onFill(entry)}
      testID={`survey-entry-${entry.id}`}
    >
      <XStack gap="$2" alignItems="center" flexWrap="wrap">
        <ToneChip label={entry.source} tone={entry.source === 'LINK' ? 'default' : 'info'} />
        <ToneChip label={t(status.labelKey)} tone={status.tone} />
      </XStack>
      <XStack gap="$3">
        <Moment
          label={t('crm.components.generated')}
          at={entry.created_at}
          by={entry.generated_by}
        />
        <Moment
          label={t('crm.components.submitted')}
          at={entry.submitted_at}
          by={entry.submitted_by}
        />
      </XStack>
      <XStack justifyContent="flex-end" gap="$1">
        {live ? (
          <>
            <TabIconButton
              icon="share"
              label={t('crmApp.survey.shareLink')}
              onPress={() => actions.onShare(entry)}
              tone="accent"
              testID={`survey-share-${entry.id}`}
            />
            <TabIconButton
              icon="block"
              label={t('crm.components.revokeLink')}
              onPress={() => actions.onRevoke(entry)}
              disabled={busy}
              tone="warning"
              testID={`survey-revoke-${entry.id}`}
            />
          </>
        ) : null}
        {entry.filled ? (
          <TabIconButton
            icon="visibility"
            label={t('crm.components.viewAnswers')}
            onPress={() => actions.onView(entry)}
            tone="neutral"
            testID={`survey-view-${entry.id}`}
          />
        ) : null}
        <TabIconButton
          icon="delete"
          label={t('shell.common.delete')}
          onPress={() => actions.onDelete(entry)}
          disabled={busy}
          tone="danger"
          testID={`survey-delete-${entry.id}`}
        />
      </XStack>
    </YStack>
  );
}
