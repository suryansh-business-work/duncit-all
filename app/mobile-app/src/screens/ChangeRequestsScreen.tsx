import { ScrollView, Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { ChangeRequestBoard } from '@/components/change-requests/ChangeRequestBoard';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Change Requests — the RN twin of mWeb's /change-requests page (rule 27).
 *
 * ONE screen for all three roles rather than three: a person can be a venue
 * owner AND a host, and the thing they came here for — "what is waiting on me"
 * — is the same list either way. It is also where the offer's push
 * notification, its email CTA and its WhatsApp link all land, so it must answer
 * for whoever taps it.
 */
export function ChangeRequestsScreen() {
  const { t } = useTranslation();

  return (
    <StackScreen title={t('changeRequest.sectionTitle')} testID="change-requests-screen">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <YStack gap={14}>
          <Text fontSize={12.5} color="$muted">
            {t('changeRequest.sectionSubtitle')}
          </Text>
          <ChangeRequestBoard />
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
