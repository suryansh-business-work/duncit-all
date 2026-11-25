import { MaterialIcons } from '@expo/vector-icons';
import { formatTime } from '@duncit/datetime';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { crmTranscriptLabelKey } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { ToneChip } from '@/components/ToneChip';
import { useTranslation } from '@/hooks/useTranslation';

export interface TranscriptSegment {
  seq: number;
  speaker: string;
  text: string;
  at?: string | null;
}

interface Props {
  transcript?: string | null;
  segments: readonly TranscriptSegment[];
}

/** A call's transcript: by speaker when it was transcribed live, otherwise the recording's text. */
export function CommsTranscript({ transcript, segments }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <YStack gap="$1" testID="comm-transcript">
      <XStack gap="$1" alignItems="center">
        <MaterialIcons
          name="graphic-eq"
          size={18}
          color={theme.accentText?.val}
          accessibilityElementsHidden
        />
        <Text fontWeight="700">{t('crm.components.transcript')}</Text>
      </XStack>
      {segments.length > 0 ? (
        <YStack gap="$1.5" role="list">
          {segments.map((s) => {
            const agent = s.speaker === 'AGENT';
            const who = agent ? t('crm.call.speakerAgent') : t('crm.call.speakerLead');
            const at = s.at ? ` · ${formatTime(new Date(s.at))}` : '';
            return (
              <YStack key={`${s.speaker}-${s.seq}`} role="listitem">
                <Text color={agent ? '$accentText' : '$info'} fontSize="$2" fontWeight="700">
                  {`${who}${at}`}
                </Text>
                <Text selectable>{s.text}</Text>
              </YStack>
            );
          })}
        </YStack>
      ) : (
        <Text selectable>{transcript}</Text>
      )}
    </YStack>
  );
}

interface StateProps {
  transcriptStatus: string;
  recordingUrl?: string | null;
  busy: boolean;
  onRequest: () => void;
}

/** A call with nothing to read yet: where its transcript stands, and Get (or Retry) transcript for a recorded call. */
export function CommsTranscriptState({
  transcriptStatus,
  recordingUrl,
  busy,
  onRequest,
}: Readonly<StateProps>) {
  const { t } = useTranslation();
  const failed = transcriptStatus === 'FAILED';
  const status =
    transcriptStatus === 'PENDING' && recordingUrl ? (
      <Text color="$muted" aria-live="polite">
        {t('crmApp.activity.transcribing')}
      </Text>
    ) : (
      <ToneChip
        label={t(
          crmTranscriptLabelKey({
            transcript_status: transcriptStatus,
            recording_url: recordingUrl,
          }),
        )}
        tone={failed ? 'error' : 'default'}
      />
    );
  return (
    <XStack gap="$2" alignItems="center" flexWrap="wrap">
      {status}
      {recordingUrl ? (
        <DuncitButton
          label={failed ? t('crm.call.retryTranscript') : t('crm.call.getTranscript')}
          onPress={onRequest}
          variant="outline"
          size="sm"
          loading={busy}
          testID="comm-request-transcript"
        />
      ) : null}
    </XStack>
  );
}
