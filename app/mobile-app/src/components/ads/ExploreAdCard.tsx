import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { ActiveAd } from '@/hooks/useActiveAds';
import { fireAndForget } from '@/utils/fire-and-forget';
import { AdMedia } from './AdMedia';
import { SponsoredBadge } from './AdCard';

interface ExploreAdCardProps {
  ad: ActiveAd;
  width: number;
  height: number;
  /** True while this card is the visible reel — gates video playback. */
  isActive: boolean;
}

/**
 * A full-screen sponsored reel woven between Explore pods: the ad media edge to
 * edge (video plays only while visible, like ExplorePodCard), a Sponsored
 * badge, the title and an optional Learn-more CTA opening the advertiser link.
 */
export function ExploreAdCard({ ad, width, height, isActive }: Readonly<ExploreAdCardProps>) {
  const insets = useSafeAreaInsets();
  const redirect = ad.redirect_url;
  return (
    <YStack width={width} height={height} backgroundColor="#000000" testID={`ad-reel-${ad.id}`}>
      <AdMedia ad={ad} isActive={isActive} testID={`ad-reel-${ad.id}`} />
      <YStack position="absolute" top={insets.top + 12} left={16}>
        <SponsoredBadge testID={`ad-reel-${ad.id}-sponsored`} />
      </YStack>
      <YStack position="absolute" left={16} right={16} bottom={insets.bottom + 96} gap={12}>
        <Text color="#ffffff" fontSize={18} fontWeight="900" numberOfLines={2}>
          {ad.ad_title}
        </Text>
        {redirect ? (
          <XStack
            testID={`ad-reel-${ad.id}-cta`}
            role="button"
            aria-label="Learn more"
            onPress={() => fireAndForget(Linking.openURL(redirect))}
            alignSelf="flex-start"
            alignItems="center"
            gap={6}
            backgroundColor="$primary"
            borderRadius={12}
            paddingHorizontal={14}
            paddingVertical={9}
            pressStyle={{ opacity: 0.85 }}
          >
            <Text color="$onPrimary" fontSize={13} fontWeight="900">
              Learn more
            </Text>
            <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
          </XStack>
        ) : null}
      </YStack>
    </YStack>
  );
}
