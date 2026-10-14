import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { YourClubsSection } from '@/components/club-admin/clubs/YourClubsSection';
import { useClubStudioPods } from '@/components/studio';
import { ClubStudioChangeRequests } from '@/components/change-requests/ClubStudioChangeRequests';
import { useClubAdminClubs } from '@/hooks/useClubAdminClubs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { RefreshScrollView } from '@/components/PullToRefresh';

/**
 * Club Studio — the in-app home for a Club Admin, the twin of mWeb's
 * /clubs/manage.
 *
 * "Your clubs" — each with its pods and its page a tap away — and then "Your Pods":
 * every pod across the clubs this user administers, with the same figures
 * strip and the same rows Venue Studio shows for its own bookings. Scope is
 * decided server-side from the caller's club memberships, so the screen never
 * asks which clubs are theirs. The figures live on the Club dashboard;
 * monitoring and change requests have their own Club Options screens.
 */
export function ClubManageScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const podsState = useClubStudioPods();
  const [clubQuery, setClubQuery] = useState('');
  const clubsState = useClubAdminClubs(useDebouncedValue(clubQuery.trim()));

  return (
    <StackScreen header title={t('mweb.studioPods.clubStudio')} testID="club-manage-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={24} padding={16} paddingBottom={48}>
          <YourClubsSection
            state={clubsState}
            query={clubQuery}
            onQuery={setClubQuery}
            onOpenPods={(clubId) => navigation.navigate('ClubPods', { clubId })}
            onEdit={(clubId) => navigation.navigate('ClubEdit', { clubId })}
          />
          <ClubStudioChangeRequests state={podsState} />
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
