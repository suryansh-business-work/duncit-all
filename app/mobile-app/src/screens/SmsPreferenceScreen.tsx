import { ScrollView, Text, YStack } from 'tamagui';
import { findCommChannel } from '@duncit/utils';

import { AuthMessagesCard } from '@/components/comm-preference';
import { DetailSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { useCommPreference } from '@/hooks/useCommPreference';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * SMS Preference — RN twin of mWeb's SmsPreferencePage (rule 27), and Mail
 * Preference's and WhatsApp Preference's sibling for the one channel that has
 * a single use.
 *
 * There is deliberately no category list: an authentication message is the
 * only text Duncit sends today, so a list would be one row long and everything
 * else on the screen would be switches that control nothing. The screen says
 * that out loud instead — a preferences page with one switch reads as broken
 * unless it explains why there is one.
 */
export function SmsPreferenceScreen() {
  const { t } = useTranslation();
  const state = useCommPreference();
  const sms = findCommChannel(state.preference?.channels, 'SMS');

  const failed = state.loadFailed || !sms;
  // Hoisted out of the JSX so each branch sits at nesting zero (S3776).
  const subtitle = sms?.reachable
    ? t('mweb.smsPreference.subtitle', { vars: { destination: sms.destination } })
    : t('mweb.smsPreference.noNumber');

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

      <AuthMessagesCard channel="SMS" />

      <Text fontSize={12.5} color="$muted">
        {t('mweb.smsPreference.authOnly')}
      </Text>
    </ScrollView>
  );

  return (
    <StackScreen title={t('mweb.smsPreference.title')} testID="sms-preference-screen">
      {state.isLoading ? <DetailSkeleton testID="sms-preference-loading" /> : body}
    </StackScreen>
  );
}
