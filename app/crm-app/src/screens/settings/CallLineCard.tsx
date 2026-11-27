import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, XStack, YStack } from 'tamagui';

import { Card } from '@/components/Card';
import { StateView } from '@/components/StateView';
import { ToneChip } from '@/components/ToneChip';
import { CrmAppCallSetupDocument } from '@/graphql/call';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { ListRow } from '@/components/mobile/ListRow';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { TwilioSetupNotice } from '@/screens/call/TwilioSetupNotice';

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <XStack justifyContent="space-between" gap="$3">
      <Text color="$muted">{label}</Text>
      <Text fontWeight="600" flexShrink={1} textAlign="right">
        {value}
      </Text>
    </XStack>
  );
}

/**
 * Recorded calls: the CRM call line (Twilio rings this phone and joins the
 * contact in), whether it is set up, its numbers, and whether calls on it are
 * recorded and transcribed — the same setup the portal's call window reads.
 */
export function CallLineCard() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { data, loading, error, refetch } = useGqlQuery(
    CrmAppCallSetupDocument,
    {},
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const setup = data?.crmCallSetup;
  return (
    <Card title={t('crmApp.settings.callLine')} testID="settings-call-line">
      <Text color="$muted" fontSize="$2">
        {t('crmApp.settings.callLineHint')}
      </Text>
      {setup ? (
        <YStack gap="$2">
          {setup.configured ? null : (
            <TwilioSetupNotice missing={setup.missing} canConfigure={setup.can_configure} />
          )}
          <Row
            label={t('crm.call.fromLabel')}
            value={setup.from_number || t('crm.call.noNumberConfigured')}
          />
          <Row
            label={t('crm.call.agentLabel')}
            value={setup.agent_number || t('crmApp.common.dash')}
          />
          <XStack gap="$2" flexWrap="wrap">
            {setup.recording_enabled ? (
              <ToneChip label={t('crm.call.recordingOn')} tone="error" />
            ) : null}
            {setup.live_transcription ? (
              <ToneChip label={t('crm.call.transcriptionOn')} tone="info" />
            ) : null}
          </XStack>
          {setup.can_configure ? (
            <ListRow
              icon="settings-phone"
              title={t('crmApp.twilio.editSettings')}
              onPress={() => navigation.navigate('TwilioSetup')}
              testID="settings-twilio"
            />
          ) : null}
        </YStack>
      ) : (
        <StateView loading={loading} error={error} onRetry={refetch} inline />
      )}
    </Card>
  );
}
