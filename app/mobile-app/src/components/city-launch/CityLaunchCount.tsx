import { Text, XStack, YStack } from 'tamagui';
import { formatCount, launchProgress } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { GLASS, LAUNCH_INK, LaunchGlass } from './LaunchGlass';

interface Props {
  city: string;
  count: number;
  target: number;
}

/**
 * The heart of the page: the Live count tag, the number of people in, the
 * city they are in for, and the bar from that number to the launch goal with
 * the goal line under it. mWeb twin: components/city-launch/CityLaunchCount.
 */
export function CityLaunchCount({ city, count, target }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const progress = launchProgress(count, target);
  const goal = t('mweb.cityLaunch.launchGoal', { vars: { target: formatCount(target) } });

  return (
    <YStack gap={12}>
      <LaunchGlass
        testID="city-launch-hero-card"
        alignSelf="center"
        alignItems="center"
        minWidth={240}
        gap={6}
      >
        <XStack
          alignItems="center"
          gap={6}
          paddingHorizontal={10}
          paddingVertical={4}
          borderRadius={999}
          backgroundColor="rgba(255,255,255,0.14)"
        >
          <YStack width={8} height={8} borderRadius={4} backgroundColor="$success" />
          <Text fontSize={12} lineHeight={16} fontWeight="600" color={LAUNCH_INK}>
            {t('mweb.cityLaunch.liveCount')}
          </Text>
        </XStack>
        <Text
          testID="city-launch-count"
          fontSize={56}
          lineHeight={60}
          fontWeight="700"
          letterSpacing={-1}
          color={accent}
        >
          {formatCount(count)}
        </Text>
        <Text
          role="heading"
          fontSize={16}
          lineHeight={20}
          fontWeight="700"
          letterSpacing={1}
          textTransform="uppercase"
          color={LAUNCH_INK}
        >
          {t('mweb.cityLaunch.peopleInFor')}
        </Text>
        <Text
          testID="city-launch-count-city"
          fontSize={36}
          lineHeight={40}
          fontWeight="700"
          letterSpacing={0.5}
          textTransform="uppercase"
          textAlign="center"
          color={LAUNCH_INK}
        >
          {city}
        </Text>
        <YStack width={96} height={4} borderRadius={999} backgroundColor="$primary" />
      </LaunchGlass>

      <YStack gap={4}>
        <YStack
          testID="city-launch-progress"
          height={10}
          borderRadius={999}
          backgroundColor="rgba(255,255,255,0.24)"
          overflow="hidden"
          role="progressbar"
          aria-label={goal}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <YStack
            height={10}
            borderRadius={999}
            width={`${progress}%`}
            backgroundColor="$primary"
          />
        </YStack>
        <XStack justifyContent="space-between">
          <Text fontSize={14} fontWeight="600" color={LAUNCH_INK}>
            {formatCount(count)}
          </Text>
          <Text fontSize={14} fontWeight="600" color={LAUNCH_INK}>
            {formatCount(target)}
          </Text>
        </XStack>
      </YStack>

      <YStack {...GLASS} alignSelf="center" paddingHorizontal={16} paddingVertical={8}>
        <Text
          testID="city-launch-goal"
          fontSize={14}
          lineHeight={20}
          textAlign="center"
          color={LAUNCH_INK}
        >
          {goal}
        </Text>
      </YStack>
    </YStack>
  );
}
