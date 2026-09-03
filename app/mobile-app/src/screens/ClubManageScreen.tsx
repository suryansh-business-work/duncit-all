import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { ClubQuickActions } from '@/components/club-admin/clubs/ClubQuickActions';
import { YourClubsSection } from '@/components/club-admin/clubs/YourClubsSection';
import { StudioPodsSection, useClubStudioPods } from '@/components/studio';
import { useClubAdminClubs } from '@/hooks/useClubAdminClubs';
import { useTranslation } from '@/hooks/useTranslation';
import type { MenuRoute, RootStackParamList } from '@/navigation/types';

/**
 * Club Studio — the in-app home for a Club Admin, the twin of mWeb's
 * /clubs/manage.
 *
 * The doors to the dashboard and the monitoring trail come first, then "Your
 * clubs" — each with its pods and its page a tap away — and then "Your Pods":
 * every pod across the clubs this user administers, with the same figures
 * strip and the same rows Venue Studio shows for its own bookings. Scope is
 * decided server-side from the caller's club memberships, so the screen never
 * asks which clubs are theirs.
 */
export function ClubManageScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // MenuRoute is a union of param-less screens; RN v7's distributive
  // `navigate` needs the narrower signature spelled out.
  const navigate: (screen: MenuRoute) => void = navigation.navigate;
  const podsState = useClubStudioPods();
  const clubsState = useClubAdminClubs();

  return (
    <StackScreen header title={t('mweb.studioPods.clubStudio')} testID="club-manage-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={14} padding={16} paddingBottom={48}>
          <ClubQuickActions onNavigate={navigate} />
          <YourClubsSection
            state={clubsState}
            onOpenPods={(clubId) => navigation.navigate('ClubPods', { clubId })}
            onEdit={(clubId) => navigation.navigate('ClubEdit', { clubId })}
          />
          <StudioPodsSection variant="CLUB" state={podsState} testID="club-studio-pods" />
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
