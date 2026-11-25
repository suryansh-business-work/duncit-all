import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import { crmCallHasTranscript } from '@duncit/utils';

import { CrmAppRequestTranscriptDocument, CrmAppSummarizeCallDocument } from '@/graphql/leadTabsB';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { CommsSummary } from './tabs/CommsSummary';
import { CommsTranscript, CommsTranscriptState } from './tabs/CommsTranscript';
import { TabAlert } from './tabs/TabAlert';
import type { CommLog } from './CommLogItem';

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
        color={theme.accentText?.val}
      />
      <Text color="$accent">{label}</Text>
    </XStack>
  );
}

type Busy = 'transcript' | 'summary' | null;

/**
 * A call's caller-ID number, its recording, its transcript (by speaker when
 * transcribed live) or where the transcript stands with Get / Retry, and its
 * AI summary with Generate / Retry — the portal's call log details.
 */
export function CallDetails({
  log,
  onChanged,
}: Readonly<{ log: CommLog; onChanged?: () => void }>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  // Logs from before live transcription carry no segments.
  const segments = log.transcript_segments ?? [];
  const hasTranscript = crmCallHasTranscript({ ...log, transcript_segments: segments });

  const run = async (kind: Exclude<Busy, null>) => {
    setBusy(kind);
    setError(null);
    try {
      const vars = { id: log.id };
      await (kind === 'transcript'
        ? gqlRequest(CrmAppRequestTranscriptDocument, vars)
        : gqlRequest(CrmAppSummarizeCallDocument, vars));
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setBusy(null);
    }
  };
  const start = (kind: Exclude<Busy, null>) =>
    fireAndForget(run(kind), logs.mobileApp, 'crm-app/CallDetails', kind);

  return (
    <YStack gap="$2">
      {log.from_number ? (
        <Text color="$muted" fontSize="$2">
          {t('crm.call.fromNumber', { vars: { number: log.from_number } })}
        </Text>
      ) : null}
      {log.recording_url ? <Recording url={log.recording_url} /> : null}
      {hasTranscript ? (
        <CommsTranscript transcript={log.transcript} segments={segments} />
      ) : (
        <CommsTranscriptState
          transcriptStatus={log.transcript_status}
          recordingUrl={log.recording_url}
          busy={busy === 'transcript'}
          onRequest={() => start('transcript')}
        />
      )}
      <CommsSummary
        summary={log.summary}
        canSummarize={hasTranscript}
        busy={busy === 'summary'}
        onSummarize={() => start('summary')}
      />
      {error ? (
        <TabAlert tone="danger" onClose={() => setError(null)} testID="comm-error">
          {error}
        </TabAlert>
      ) : null}
    </YStack>
  );
}
