import { StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useBranding } from '@/hooks/useBranding';
import type { MenuRoute } from '@/navigation/types';

const CARD_HEIGHT = 132;
/** Dark scrim so the big title stays readable over any video frame. */
const SCRIM = 'rgba(0,0,0,0.45)';

/** Muted looping background video (admin-managed Branding URL). */
function VenuesCardVideo({ url }: Readonly<{ url: string }>) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      testID="sidebar-venues-video"
      player={player}
      style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

/** Full-width "Venues" discovery card — an autoplaying muted video background
 * with a big venue title; tapping opens the location-scoped Venues page.
 * mWeb twin: profile-drawer/VenuesCard. */
export function SidebarVenuesCard({
  onNavigate,
}: Readonly<{ onNavigate: (route: MenuRoute) => void }>) {
  const { data } = useBranding();
  const videoUrl = data?.branding?.venues_card_video_url ?? '';
  return (
    <YStack paddingHorizontal={16} paddingBottom={10}>
      <YStack
        testID="sidebar-venues"
        role="button"
        aria-label="Explore venues"
        onPress={() => onNavigate('Venues')}
        height={CARD_HEIGHT}
        borderRadius={16}
        overflow="hidden"
        backgroundColor="$surface"
        pressStyle={{ opacity: 0.9 }}
      >
        {videoUrl ? <VenuesCardVideo url={videoUrl} /> : null}
        <YStack flex={1} padding={16} justifyContent="flex-end" style={{ backgroundColor: SCRIM }}>
          <XStack alignItems="center" justifyContent="space-between">
            <YStack>
              <Text fontSize={26} fontWeight="900" color="white">
                Venues
              </Text>
              <Text fontSize={12.5} fontWeight="700" color="rgba(255,255,255,0.85)">
                Discover spaces to meet near you
              </Text>
            </YStack>
            <MaterialIcons name="arrow-forward" size={22} color="white" />
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
