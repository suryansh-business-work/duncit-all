import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { useGoBack } from '@/hooks/useGoBack';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfilePanels } from '@/components/profile/ProfilePanels';
import { ProfilePostsGrid } from '@/components/profile/ProfilePostsGrid';
import { DetailSkeleton } from '@/components/Skeleton';
import { useProfile } from '@/hooks/useProfile';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

/** Profile — identity header, links/pet panels, host/venue shortcuts and the
 * user's posts grid. RN port of mWeb's ProfilePage (core). */
export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const goBack = useGoBack();
  const { me, posts, isLoading, refetch } = useProfile();
  const { color: ink } = useThemeColors();
  const { uploading, pickAndUpload } = useStatusUpload();
  const isHost = me?.roles.includes('HOST') ?? false;
  const isVenue = me?.roles.includes('VENUE_OWNER') ?? false;

  const addPost = async () => {
    await pickAndUpload();
    await refetch();
  };

  const body = me ? (
    <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 24 }}>
      <ProfileHeader me={me} onChanged={() => void refetch()} />
      <ProfilePanels
        me={me}
        onOpenHost={() => navigation.navigate(isHost ? 'HostManage' : 'BecomeHost')}
        onOpenVenue={() => navigation.navigate(isVenue ? 'VenueManage' : 'RegisterVenue')}
      />
      <ProfilePostsGrid
        posts={posts}
        meId={me.user_id}
        onChanged={() => void refetch()}
        onAddPost={() => void addPost()}
        uploading={uploading}
      />
    </ScrollView>
  ) : (
    <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
      <Text testID="profile-error" color="$muted">
        Could not load your profile.
      </Text>
    </YStack>
  );

  return (
    <YStack flex={1} testID="profile-screen">
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <XStack alignItems="center" gap={8} paddingHorizontal={12} paddingVertical={8}>
          <XStack
            testID="profile-back"
            role="button"
            aria-label="Go back"
            onPress={goBack}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="arrow-back" size={22} color={ink} />
          </XStack>
          <Text flex={1} fontSize={18} fontWeight="800" color="$color">
            Profile
          </Text>
          <XStack
            testID="profile-settings"
            role="button"
            aria-label="Profile settings"
            onPress={() => navigation.navigate('Account')}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="settings" size={22} color={ink} />
          </XStack>
        </XStack>

        {isLoading && !me ? <DetailSkeleton testID="profile-loading" /> : body}
      </SafeAreaView>
    </YStack>
  );
}
