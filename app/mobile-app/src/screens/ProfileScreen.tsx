import { useEffect, useRef, useState } from 'react';
import type { ScrollView as RNScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { EmailVerificationSection } from '@/components/account';
import { useGoBack } from '@/hooks/useGoBack';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfilePanels } from '@/components/profile/ProfilePanels';
import { ProfilePostsGrid } from '@/components/profile/ProfilePostsGrid';
import { DetailSkeleton } from '@/components/Skeleton';
import { useProfile } from '@/hooks/useProfile';
import { useProfilePostUpload } from '@/hooks/useProfilePostUpload';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

/** Profile — identity header, links/pet panels, host/venue shortcuts and the
 * user's posts grid. RN port of mWeb's ProfilePage (core). */
export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Profile'>>();
  const goBack = useGoBack();
  const { me, posts, isLoading, refetch } = useProfile();
  // The Home banner deep-links here to verify the email, so scroll that section
  // into view once it has reported its position — the RN twin of mWeb's
  // /profile?verifyEmail=1 scrolling to its #email-verification anchor.
  const scrollRef = useRef<RNScrollView>(null);
  const [verifyY, setVerifyY] = useState<number | null>(null);
  // On the Expo web build the param arrives from the URL as the string "true",
  // so a strict boolean check would silently disable the jump there.
  const jumpToVerify = String(route.params?.verifyEmail) === 'true';
  useEffect(() => {
    if (!jumpToVerify || verifyY === null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, verifyY - 12), animated: true });
  }, [jumpToVerify, verifyY]);
  const { color: ink } = useThemeColors();
  const { uploading, pickAndPost } = useProfilePostUpload();
  const isHost = me?.roles.includes('HOST') ?? false;
  const isVenue = me?.roles.includes('VENUE_OWNER') ?? false;

  const addPost = async () => {
    await pickAndPost();
    await refetch();
  };

  const body = me ? (
    <ScrollView ref={scrollRef} flex={1} contentContainerStyle={{ paddingBottom: 24 }}>
      <ProfileHeader me={me} onChanged={() => fireAndForget(refetch())} />
      <YStack
        paddingHorizontal={16}
        paddingBottom={4}
        onLayout={(e) => setVerifyY(e.nativeEvent.layout.y)}
      >
        <EmailVerificationSection
          email={me.email}
          verified={!!me.is_email_verified}
          autoSend={jumpToVerify}
          onVerified={() => fireAndForget(refetch())}
        />
      </YStack>
      <ProfilePanels
        me={me}
        onOpenHost={() => navigation.navigate(isHost ? 'HostManage' : 'BecomeHost')}
        onOpenVenue={() => navigation.navigate(isVenue ? 'VenueManage' : 'RegisterVenue')}
      />
      <ProfilePostsGrid
        posts={posts}
        meId={me.user_id}
        onChanged={() => fireAndForget(refetch())}
        onAddPost={() => fireAndForget(addPost())}
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
      {/* Pushed screen with no floating tab bar, so it owns both edges — the
          edge-to-edge window would otherwise clip the last row of the grid
          behind the Android navigation bar. */}
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
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
          <Text flex={1} fontSize={18} fontWeight="600" color="$color">
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
