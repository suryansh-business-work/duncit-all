import { Linking } from 'react-native';
import { Text, YStack } from 'tamagui';

import type { ActiveAd } from '@/hooks/useActiveAds';
import { fireAndForget } from '@/utils/fire-and-forget';
import { AdMedia } from './AdMedia';

export type AdVariant = 'banner' | 'card' | 'tile';

/** Dark caption scrim so the title stays readable over any media frame. */
const SCRIM = 'rgba(0,0,0,0.45)';
/** Matches SidebarVenuesCard so the sidebar rail stays visually consistent. */
const CARD_HEIGHT = 132;
const BANNER_HEIGHT = 120;

/** The small "Sponsored" pill every ad surface must carry. */
export function SponsoredBadge({ testID }: Readonly<{ testID: string }>) {
  return (
    <YStack
      testID={testID}
      paddingHorizontal={6}
      paddingVertical={2}
      borderRadius={999}
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
    >
      <Text fontSize={9} fontWeight="800" letterSpacing={0.4} color="rgba(255,255,255,0.92)">
        Sponsored
      </Text>
    </YStack>
  );
}

/** StatusTile-sized ad: a 63px media circle with the badge, label below. */
function AdTile({
  ad,
  testID,
  onPress,
}: Readonly<{ ad: ActiveAd; testID: string; onPress?: () => void }>) {
  return (
    <YStack
      testID={testID}
      role={onPress ? 'button' : undefined}
      aria-label={ad.ad_title}
      onPress={onPress}
      width={70}
      alignItems="center"
      gap={6}
      pressStyle={onPress ? { opacity: 0.8 } : undefined}
    >
      <YStack
        width={63}
        height={63}
        borderRadius={999}
        overflow="hidden"
        backgroundColor="$surface"
      >
        <AdMedia ad={ad} testID={testID} />
        <YStack position="absolute" bottom={2} alignSelf="center">
          <SponsoredBadge testID={`${testID}-sponsored`} />
        </YStack>
      </YStack>
      <Text fontSize={11} fontWeight="700" color="$color" numberOfLines={1}>
        {ad.ad_title}
      </Text>
    </YStack>
  );
}

/**
 * A rounded ad card with a Sponsored badge and title caption; tapping opens the
 * advertiser link when one is set. `banner` is a flush full-width rectangle,
 * `card` self-pads to sit in the sidebar rail (SidebarVenuesCard metrics) and
 * `tile` matches the StatusTile footprint for the story rail.
 */
export function AdCard({
  ad,
  variant,
  testID,
}: Readonly<{ ad: ActiveAd; variant: AdVariant; testID?: string }>) {
  const id = testID ?? `ad-card-${ad.id}`;
  const redirect = ad.redirect_url;
  const onPress = redirect ? () => fireAndForget(Linking.openURL(redirect)) : undefined;
  if (variant === 'tile') {
    return <AdTile ad={ad} testID={id} onPress={onPress} />;
  }

  const rect = (
    <YStack
      testID={id}
      role={onPress ? 'button' : undefined}
      aria-label={ad.ad_title}
      onPress={onPress}
      height={variant === 'card' ? CARD_HEIGHT : BANNER_HEIGHT}
      borderRadius={16}
      overflow="hidden"
      backgroundColor="$surface"
      pressStyle={onPress ? { opacity: 0.9 } : undefined}
    >
      <AdMedia ad={ad} testID={id} />
      <YStack position="absolute" top={8} left={8}>
        <SponsoredBadge testID={`${id}-sponsored`} />
      </YStack>
      <YStack
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        padding={10}
        style={{ backgroundColor: SCRIM }}
      >
        <Text fontSize={13} fontWeight="800" color="white" numberOfLines={1}>
          {ad.ad_title}
        </Text>
      </YStack>
    </YStack>
  );
  if (variant === 'card') {
    return (
      <YStack paddingHorizontal={16} paddingBottom={10}>
        {rect}
      </YStack>
    );
  }
  return rect;
}
