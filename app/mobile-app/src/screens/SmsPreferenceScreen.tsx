import { ActivityIndicator, Switch } from 'react-native';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { buildCommPreferenceLabels, commRowState } from '@duncit/utils';

import { DetailSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { useCommPreference } from '@/hooks/useCommPreference';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * SMS Preference — RN twin of mWeb's SmsPreferencePage (rule 27), and Mail
 * Preference's and WhatsApp Preference's sibling for the one channel that has a
 * single use.
 *
 * There is deliberately no category list: a one-time code is the only text
 * Duncit sends today, so a list would be one row long and everything else on
 * the screen would be switches that control nothing. The screen says that out
 * loud instead — a preferences page with one switch reads as broken unless it
 * explains why there is one.
 */
export function SmsPreferenceScreen() {
  const { t } = useTranslation();
  const { primary, danger } = useThemeColors();
  const labels = buildCommPreferenceLabels(t);
  const state = useCommPreference();
  const sms = state.preference?.channels.find((c) => c.channel === 'SMS') ?? null;

  const failed = state.loadFailed || !sms;
  // Hoisted out of the JSX so each branch sits at nesting zero (S3776).
  const subtitle = sms?.reachable
    ? t('mweb.smsPreference.subtitle', { vars: { destination: sms.destination } })
    : t('mweb.smsPreference.noNumber');
  const row = sms ? commRowState(sms) : null;
  const caption = row?.locked ? labels.otpLocked : t('mweb.smsPreference.otpBody');

  const body = failed ? (
    <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
      <Text testID="sms-preference-error" color="$muted">
        {t('mweb.smsPreference.loadFailed')}
      </Text>
    </YStack>
  ) : (
    <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      <Text fontSize={12.5} color="$muted">
        {subtitle}
      </Text>

      {state.saveFailed ? (
        <Text testID="sms-preference-save-failed" fontSize={12.5} color={danger}>
          {labels.saveFailed}
        </Text>
      ) : null}

      <XStack
        padding={16}
        borderRadius={18}
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$borderColor"
        alignItems="flex-start"
        gap={12}
      >
        <YStack flex={1}>
          <Text fontSize={14.5} fontWeight="700" color="$color">
            {t('mweb.smsPreference.otpHeading')}
          </Text>
          <Text fontSize={12.5} color="$muted" paddingTop={2}>
            {caption}
          </Text>
        </YStack>
        {state.busyChannel === 'SMS' ? (
          <ActivityIndicator testID="sms-preference-busy" color={primary} />
        ) : (
          <Switch
            testID="sms-preference-switch"
            aria-label={t('mweb.smsPreference.otpHeading')}
            value={!!sms?.otp_enabled}
            disabled={!row?.canToggle}
            onValueChange={(next) => {
              state.setOtpChannel('SMS', next).catch(() => {
                /* reported through state.saveFailed */
              });
            }}
            trackColor={{ true: primary }}
          />
        )}
      </XStack>

      <Text fontSize={12.5} color="$muted">
        {t('mweb.smsPreference.onlyUse')}
      </Text>
    </ScrollView>
  );

  return (
    <StackScreen title={t('mweb.smsPreference.title')} testID="sms-preference-screen">
      {state.isLoading ? <DetailSkeleton testID="sms-preference-loading" /> : body}
    </StackScreen>
  );
}
