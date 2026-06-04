import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfilePanels } from '@/components/profile/ProfilePanels';
import { ProfilePostsGrid } from '@/components/profile/ProfilePostsGrid';
import { DetailSkeleton } from '@/components/Skeleton';
import { useProfile } from '@/hooks/useProfile';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

/** Profile — identity header, links/pet panels, host/venue shortcuts and the
 * user's posts grid. RN port of mWeb's ProfilePage (core). */
export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { me, posts, isLoading } = useProfile();
  const { color: ink } = useThemeColors();
  const isHost = me?.roles.includes('HOST') ?? false;
  const isVenue = me?.roles.includes('VENUE_OWNER') ?? false;

  return (
    <YStack flex={1} testID="profile-screen">
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <XStack alignItems="center" gap={8} paddingHorizontal={12} paddingVertical={8}>
          <XStack
            testID="profile-back"
            role="button"
            aria-label="Go back"
            onPress={() => navigation.goBack()}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="arrow-back" size={22} color={ink} />
          </XStack>
          <Text fontSize={18} fontWeight="800" color="$color">
            Profile
          </Text>
        </XStack>

        {isLoading && !me ? (
          <DetailSkeleton testID="profile-loading" />
        ) : !me ? (
          <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
            <Text testID="profile-error" color="$muted">
              Could not load your profile.
            </Text>
          </YStack>
        ) : (
          <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 24 }}>
            <ProfileHeader me={me} />
            <ProfilePanels
              me={me}
              onOpenHost={() => navigation.navigate(isHost ? 'HostManage' : 'BecomeHost')}
              onOpenVenue={() => navigation.navigate(isVenue ? 'VenueManage' : 'RegisterVenue')}
            />
            <ProfilePostsGrid posts={posts} />
          </ScrollView>
        )}
      </SafeAreaView>
    </YStack>
  );
}
