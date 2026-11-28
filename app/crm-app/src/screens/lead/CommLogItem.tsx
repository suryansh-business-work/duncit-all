import { useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { crmCommsStatusTone } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { CrmAppLeadCommsDocument } from '@/graphql/leadTabsB';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { formatCallDuration } from '@/features/calls/duration';
import { useTranslation } from '@/hooks/useTranslation';
import { CallDetails } from './CallDetails';

export type CommLog = ResultOf<
  typeof CrmAppLeadCommsDocument
>['communicationLogs']['items'][number];

interface Props {
  log: CommLog;
  /** Re-read the log after a transcript or summary was asked for. */
  onChanged?: () => void;
  /** The email address's verification chip, for an email. */
  emailStatus?: ReactNode;
}

/**
 * One call or email on the lead: what, how it went, who, when, the provider
 * and any delivery error; a call opens to its recording, transcript and AI
 * summary — a row of the portal's Communication Log.
 */
export function CommLogItem({ log, onChanged, emailStatus }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const isCall = log.type === 'CALL';
  let title = log.subject || t('crm.comms.noSubject');
  if (isCall)
    title =
      log.direction === 'INBOUND' ? t('crmApp.activity.inbound') : t('crmApp.activity.outbound');
  const meta = [
    log.contact_name,
    log.contact_value,
    displayDateTime(log.created_at),
    isCall && log.duration_seconds ? formatCallDuration(log.duration_seconds) : '',
  ].filter(Boolean);

  return (
    <YStack {...SURFACE} gap="$2" testID={`comm-${log.id}`}>
      <XStack
        role="button"
        aria-expanded={isCall ? open : undefined}
        onPress={() => setOpen((v) => !v)}
        justifyContent="space-between"
        gap="$2"
      >
        <MaterialIcons
          name={isCall ? 'call' : 'email'}
          size={22}
          color={theme.muted?.val}
          accessibilityElementsHidden
        />
        <YStack flex={1} gap="$1">
          <Text fontWeight="700">{title}</Text>
          <XStack gap="$2" flexWrap="wrap" alignItems="center">
            <ToneChip
              label={t(`crmApp.activity.status.${log.status}`)}
              tone={crmCommsStatusTone(log.status)}
            />
            {log.provider_name ? <ToneChip label={log.provider_name} tone="default" /> : null}
            {emailStatus}
          </XStack>
          <Text color="$muted" fontSize="$2">
            {meta.join(' · ')}
          </Text>
          {log.error_message ? (
            <Text color="$danger" fontSize="$2">
              {log.error_message}
            </Text>
          ) : null}
        </YStack>
        {isCall ? (
          <MaterialIcons
            name={open ? 'expand-less' : 'expand-more'}
            size={24}
            color={theme.muted?.val}
            accessibilityElementsHidden
          />
        ) : null}
      </XStack>
      {open && isCall ? <CallDetails log={log} onChanged={onChanged} /> : null}
    </YStack>
  );
}
