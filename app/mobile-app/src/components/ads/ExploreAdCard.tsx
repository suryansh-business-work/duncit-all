import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { ActiveAd } from '@/hooks/useActiveAds';
import { fireAndForget } from '@/utils/fire-and-forget';
import { AdMedia } from './AdMedia';
import { SponsoredBadge } from './AdCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const insets = useSafeAreaInsets();
  const redirect = ad.redirect_url;
  return (
    <YStack width={width} height={height} backgroundColor="#000000" testID={`ad-reel-${ad.id}`}>
      <AdMedia ad={ad} isActive={isActive} testID={`ad-reel-${ad.id}`} />
      <YStack position="absolute" top={insets.top + 12} left={16}>
        <SponsoredBadge testID={`ad-reel-${ad.id}-sponsored`} />
      </YStack>
      <YStack position="absolute" left={16} right={16} bottom={insets.bottom + 96} gap={12}>
        <Text color="#ffffff" fontSize={18} fontWeight="600" numberOfLines={2}>
          {ad.ad_title}
        </Text>
        {redirect ? (
          <XStack
            testID={`ad-reel-${ad.id}-cta`}
            role="button"
            aria-label={t('mweb.ads.learnMore')}
            onPress={() => fireAndForget(Linking.openURL(redirect))}
            alignSelf="flex-start"
            alignItems="center"
            gap={6}
            backgroundColor="$primary"
            borderRadius={999}
            paddingHorizontal={16}
            height={40}
            pressStyle={PRESS_STYLE.solid}
          >
            <Text color="$onPrimary" fontSize={13} fontWeight="600">
              {t('mweb.ads.learnMore')}
            </Text>
            <MaterialIcons name="arrow-forward" size={16} color={onPrimary} />
          </XStack>
        ) : null}
      </YStack>
    </YStack>
  );
}
