import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack, useTheme } from 'tamagui';
import { crmCanStartCall } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { ToneChip } from '@/components/ToneChip';
import type { CallLine } from '@/features/calls/useCallLine';
import type { CallSetup } from '@/features/calls/callLine';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import { TwilioSetupNotice } from './TwilioSetupNotice';

function NumberRow({
  label,
  value,
  missing,
}: Readonly<{ label: string; value: string | null | undefined; missing: string }>) {
  return (
    <YStack>
      <Text color="$muted" fontSize="$2" fontWeight="700">
        {label}
      </Text>
      <Text fontWeight="700" color={value ? '$color' : '$warning'}>
        {value || missing}
      </Text>
    </YStack>
  );
}

interface Props {
  setup: CallSetup | null;
  loading: boolean;
  setupError: string | null;
  call: CallLine;
  to: string;
  onSimCall: () => void;
}

/**
 * Before the call — the portal's call window: Call from, Call to and the phone
 * that will ring for you, what the call records, and Start Call, disabled until
 * Twilio and both numbers are set. Below it, the app's own way out: a normal
 * call from this phone, which Duncit does not record.
 */
export function CallSetupSection({
  setup,
  loading,
  setupError,
  call,
  to,
  onSimCall,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (loading && !setup) return <StateView loading />;
  const notConfigured = (setup && !setup.configured) || call.errorCode === 'TWILIO_NOT_CONFIGURED';
  const ready = crmCanStartCall(setup, to) && !call.starting;

  return (
    <YStack gap="$3">
      {setupError ? <AuthAlert message={setupError} testID="call-setup-error" /> : null}
      {notConfigured ? (
        <TwilioSetupNotice missing={setup?.missing ?? []} canConfigure={!!setup?.can_configure} />
      ) : null}
      {call.error && !notConfigured ? <AuthAlert message={call.error} testID="call-error" /> : null}
      <Text color="$muted">{t('crm.call.intro')}</Text>
      <YStack gap="$2">
        <NumberRow
          label={t('crm.call.fromLabel')}
          value={setup?.from_number}
          missing={t('crm.call.noNumberConfigured')}
        />
        <NumberRow
          label={t('crm.call.toLabel')}
          value={to}
          missing={t('crm.call.noNumberConfigured')}
        />
        <NumberRow
          label={t('crm.call.agentLabel')}
          value={setup?.agent_number}
          missing={t('crm.call.noAgentNumber')}
        />
      </YStack>
      {setup?.recording_enabled || setup?.live_transcription ? (
        <YStack gap="$1" testID="call-media">
          <XStack gap="$2" flexWrap="wrap">
            {setup.recording_enabled ? (
              <ToneChip label={t('crm.call.recordingOn')} tone="error" />
            ) : null}
            {setup.live_transcription ? (
              <ToneChip label={t('crm.call.transcriptionOn')} tone="info" />
            ) : null}
          </XStack>
          <Text color="$muted" fontSize="$2">
            {t('crm.call.consentNote')}
          </Text>
        </YStack>
      ) : null}
      <DuncitButton
        label={call.starting ? t('crm.call.starting') : t('crm.call.startCall')}
        onPress={() =>
          fireAndForget(call.start(), logs.mobileApp, 'crm-app/CallSetupSection', 'start')
        }
        disabled={!ready}
        loading={call.starting}
        icon={<MaterialIcons name="phone-in-talk" size={20} color={theme.onPrimary?.val} />}
        fullWidth
        testID="call-start"
      />
      <Separator borderColor="$borderColor" />
      <Text color="$muted" fontSize="$2">
        {t('crmApp.call.simHint')}
      </Text>
      <DuncitButton
        label={t('crmApp.call.simCall')}
        onPress={onSimCall}
        disabled={!to.trim()}
        variant="outline"
        icon={<MaterialIcons name="call" size={20} color={theme.accentText?.val} />}
        fullWidth
        testID="call-sim"
      />
    </YStack>
  );
}
