import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, YStack, useTheme } from 'tamagui';
import { crmCallStatusView, crmFormatDuration } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import type { CallSetup, ControlAction } from '@/features/calls/callLine';
import type { CallLine } from '@/features/calls/useCallLine';
import { useCallClock } from '@/features/calls/useCallClock';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import { CallControls } from './CallControls';
import { CallTranscript } from './CallTranscript';

const SCOPE = 'crm-app/LiveCallSection';

/**
 * During and after the call — the portal's live panel: Call from → Call to
 * with the status, the duration, Mute / Hold / End and the transcript. Once
 * it ends, where everything was saved and Call again.
 */
export function LiveCallSection({
  call,
  setup,
  to,
}: Readonly<{ call: CallLine; setup: CallSetup | null; to: string }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const seconds = useCallClock(call.answeredAt, call.live);
  const view = crmCallStatusView(call.status, call.onHold);
  const control = (action: ControlAction) =>
    fireAndForget(call.control(action), logs.mobileApp, SCOPE, action);

  return (
    <YStack gap="$3">
      {call.error ? <AuthAlert message={call.error} testID="call-error" /> : null}
      {call.live && call.connectionLost ? (
        <Text color="$muted" aria-live="polite" testID="call-connection-lost">
          {t('crm.call.connectionLost')}
        </Text>
      ) : null}
      <YStack {...SURFACE} alignItems="center" gap="$2" testID="call-stage">
        <Text color="$muted" fontSize="$2">
          {setup?.from_number ?? ''}
        </Text>
        <MaterialIcons
          name="south"
          size={18}
          color={theme.muted?.val}
          accessibilityElementsHidden
        />
        <Text fontWeight="700" fontSize="$6">
          {to}
        </Text>
        <ToneChip label={t(view.labelKey)} tone={view.tone} testID="call-status" />
        <Text color="$muted" testID="call-duration">
          {`${t('crm.call.duration')} ${crmFormatDuration(seconds)}`}
        </Text>
      </YStack>
      {call.live ? (
        <CallControls
          muted={call.muted}
          onHold={call.onHold}
          connected={call.status === 'IN_PROGRESS'}
          busy={call.busy}
          onControl={control}
        />
      ) : (
        <YStack gap="$2">
          <Text color="$muted">{t('crm.call.endedNote')}</Text>
          <DuncitButton
            label={t('crm.call.callAgain')}
            onPress={() => fireAndForget(call.start(), logs.mobileApp, SCOPE, 'callAgain')}
            variant="outline"
            icon={<MaterialIcons name="replay" size={20} color={theme.accentText?.val} />}
            fullWidth
            testID="call-again"
          />
        </YStack>
      )}
      <Separator borderColor="$borderColor" />
      <CallTranscript segments={call.segments} enabled={setup?.live_transcription ?? true} />
    </YStack>
  );
}
