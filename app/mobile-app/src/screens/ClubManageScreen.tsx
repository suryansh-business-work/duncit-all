import { ScrollView, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { StudioPodsSection, useClubStudioPods } from '@/components/studio';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Club Studio — the in-app home for a Club Admin, the twin of mWeb's
 * /clubs/manage.
 *
 * Its one section is "Your Pods": every pod across the clubs this user
 * administers, with the same figures strip and the same rows Venue Studio
 * shows for its own bookings. Scope is decided server-side from the caller's
 * club memberships, so the screen never asks which clubs are theirs.
 */
export function ClubManageScreen() {
  const { t } = useTranslation();
  const podsState = useClubStudioPods();

  return (
    <StackScreen header title={t('mweb.studioPods.clubStudio')} testID="club-manage-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={14} padding={16} paddingBottom={48}>
          <StudioPodsSection variant="CLUB" state={podsState} testID="club-studio-pods" />
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
