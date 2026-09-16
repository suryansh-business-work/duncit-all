import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';
import { formatCount, imageSourceUrl, launchProgress } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { useTranslation } from '@/hooks/useTranslation';

/** Dark scrim over the city photo so the white copy reads on any image. */
const HERO_SCRIM = ['rgba(9,9,15,0.25)', 'rgba(9,9,15,0.88)'] as const;
/** The ground under the scrim when the city has no photo. */
const HERO_GROUND = 'rgba(9,9,15,0.92)';
const HERO_INK = 'white';
/** The widest the hero draws, device pixels included — mWeb asks for the same. */
const HERO_IMAGE_WIDTH = 1080;

interface Props {
  city: string;
  image: string;
  count: number;
  target: number;
}

/**
 * The top of the waitlist: the city's photo under a dark gradient, a Live
 * count tag, the big number of people in, the launch goal and how far along
 * it is. mWeb twin: components/city-launch/CityLaunchHero.
 */
export function CityLaunchHero({ city, image, count, target }: Readonly<Props>) {
  const { t } = useTranslation();
  const progress = launchProgress(count, target);
  const goal = t('mweb.cityLaunch.launchGoal', { vars: { target: formatCount(target) } });

  return (
    <YStack
      testID="city-launch-hero"
      minHeight={260}
      padding={20}
      gap={24}
      justifyContent="space-between"
      borderRadius={24}
      overflow="hidden"
      backgroundColor={HERO_GROUND}
    >
      {image ? (
        <AppImage
          source={{ uri: imageSourceUrl(image, HERO_IMAGE_WIDTH) }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
      <LinearGradient colors={HERO_SCRIM} style={StyleSheet.absoluteFill} />
      {/* Above the absolute photo: web paints positioned nodes last. */}
      <XStack
        zIndex={1}
        alignSelf="flex-start"
        alignItems="center"
        gap={6}
        paddingHorizontal={10}
        paddingVertical={4}
        borderRadius={999}
        backgroundColor="rgba(255,255,255,0.16)"
      >
        <YStack width={8} height={8} borderRadius={4} backgroundColor="$primary" />
        <Text fontSize={12} lineHeight={16} fontWeight="600" color={HERO_INK}>
          {t('mweb.cityLaunch.liveCount')}
        </Text>
      </XStack>
      <YStack zIndex={1} gap={8}>
        <Text
          testID="city-launch-count"
          fontSize={44}
          lineHeight={48}
          fontWeight="700"
          color={HERO_INK}
        >
          {formatCount(count)}
        </Text>
        <Text role="heading" fontSize={18} lineHeight={23} fontWeight="600" color={HERO_INK}>
          {t('mweb.cityLaunch.peopleInFor', { vars: { city } })}
        </Text>
        <YStack
          testID="city-launch-progress"
          height={8}
          marginTop={8}
          borderRadius={999}
          backgroundColor="rgba(255,255,255,0.24)"
          overflow="hidden"
          role="progressbar"
          aria-label={goal}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <YStack height={8} borderRadius={999} width={`${progress}%`} backgroundColor="$primary" />
        </YStack>
        <Text
          testID="city-launch-goal"
          fontSize={14}
          lineHeight={20}
          color={HERO_INK}
          opacity={0.9}
        >
          {goal}
        </Text>
      </YStack>
    </YStack>
  );
}
