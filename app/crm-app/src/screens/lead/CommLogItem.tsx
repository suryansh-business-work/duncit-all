import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { CrmAppCommLogsDocument } from '@/graphql/comms';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { formatCallDuration } from '@/features/calls/duration';
import { useTranslation } from '@/hooks/useTranslation';

export type CommLog = ResultOf<typeof CrmAppCommLogsDocument>['communicationLogs']['items'][number];

function Recording({ url }: Readonly<{ url: string }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const player = useAudioPlayer({ uri: url });
  const status = useAudioPlayerStatus(player);
  const label = status.playing ? t('crmApp.activity.pause') : t('crmApp.activity.play');
  return (
    <XStack
      role="button"
      aria-label={label}
      onPress={() => (status.playing ? player.pause() : player.play())}
      alignItems="center"
      gap="$2"
      testID="comm-play"
    >
      <MaterialIcons
        name={status.playing ? 'pause-circle' : 'play-circle'}
        size={30}
        color={theme.primary?.val}
      />
      <Text color="$accent">{label}</Text>
    </XStack>
  );
}

/** One call or email on the lead: what, when, how it went, and for a call its recording, transcript and AI summary. */
export function CommLogItem({ log }: Readonly<{ log: CommLog }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isCall = log.type === 'CALL';
  let title = log.subject || t('crmApp.activity.email');
  if (isCall)
    title =
      log.direction === 'INBOUND' ? t('crmApp.activity.inbound') : t('crmApp.activity.outbound');
  const summary = log.summary?.status === 'READY' ? log.summary : null;
  const meta = [
    displayDateTime(log.created_at),
    t(`crmApp.activity.status.${log.status}`),
    isCall && log.duration_seconds ? formatCallDuration(log.duration_seconds) : '',
  ].filter(Boolean);

  return (
    <YStack
      backgroundColor="$surface"
      borderRadius="$3"
      padding="$3"
      gap="$2"
      testID={`comm-${log.id}`}
    >
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
      {open && isCall ? (
        <YStack gap="$2">
          {log.recording_url ? <Recording url={log.recording_url} /> : null}
          {log.transcript_status === 'PENDING' && log.recording_url ? (
            <Text color="$muted">{t('crmApp.activity.transcribing')}</Text>
          ) : null}
          {log.transcript_status === 'FAILED' ? (
            <Text color="$danger">{t('crmApp.activity.transcriptFailed')}</Text>
          ) : null}
          {summary?.text ? (
            <YStack gap="$1">
              <Text fontWeight="700">{t('crmApp.activity.summary')}</Text>
              <Text>{summary.text}</Text>
              {summary.key_points.map((point) => (
                <XStack key={point} gap="$2" alignItems="center">
                  <MaterialIcons name="fiber-manual-record" size={8} accessibilityElementsHidden />
                  <Text color="$muted" flex={1}>
                    {point}
                  </Text>
                </XStack>
              ))}
            </YStack>
          ) : null}
          {log.transcript ? (
            <YStack gap="$1">
              <Text fontWeight="700">{t('crmApp.activity.transcript')}</Text>
              <Text selectable>{log.transcript}</Text>
            </YStack>
          ) : null}
        </YStack>
      ) : null}
    </YStack>
  );
}
