import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { SURFACE } from '@/components/surface';
import { CrmAppCommLogsDocument } from '@/graphql/comms';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { formatCallDuration } from '@/features/calls/duration';
import { useTranslation } from '@/hooks/useTranslation';
import { CallDetails } from './CallDetails';

export type CommLog = ResultOf<typeof CrmAppCommLogsDocument>['communicationLogs']['items'][number];

/** One call or email on the lead: what, when, how it went, and for a call its recording, transcript and AI summary. */
export function CommLogItem({ log }: Readonly<{ log: CommLog }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isCall = log.type === 'CALL';
  let title = log.subject || t('crmApp.activity.email');
  if (isCall)
    title =
      log.direction === 'INBOUND' ? t('crmApp.activity.inbound') : t('crmApp.activity.outbound');
  const meta = [
    displayDateTime(log.created_at),
    t(`crmApp.activity.status.${log.status}`),
    isCall && log.duration_seconds ? formatCallDuration(log.duration_seconds) : '',
  ].filter(Boolean);

  return (
    <YStack {...SURFACE} gap="$2" testID={`comm-${log.id}`}>
      <XStack
        role="button"
        aria-expanded={open}
        onPress={() => setOpen((v) => !v)}
        justifyContent="space-between"
        gap="$2"
      >
        <YStack flex={1}>
          <Text fontWeight="700">{title}</Text>
          <Text color="$muted" fontSize="$2">
            {meta.join(' · ')}
          </Text>
        </YStack>
        <MaterialIcons
          name={open ? 'expand-less' : 'expand-more'}
          size={24}
          accessibilityElementsHidden
        />
      </XStack>
      {open && isCall ? <CallDetails log={log} /> : null}
    </YStack>
  );
}
