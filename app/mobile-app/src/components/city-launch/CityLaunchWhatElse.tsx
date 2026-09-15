import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';
import { EARN_JOURNEYS, type EarnJourney } from '@duncit/onboarding';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

interface WhatElseCard {
  testID: string;
  /** The Earn journey the card opens — its native screen comes from @duncit/onboarding. */
  kind: EarnJourney['kind'];
  icon: ComponentProps<typeof MaterialIcons>['name'];
  eyebrowKey: string;
  titleKey: string;
  bodyKey: string;
}

/** Keys are written out in full: the translation gate only sees literal keys. */
const CARDS: readonly WhatElseCard[] = [
  {
    testID: 'city-launch-card-host',
    kind: 'HOST',
    icon: 'groups',
    eyebrowKey: 'mweb.cityLaunch.hostEyebrow',
    titleKey: 'mweb.cityLaunch.hostTitle',
    bodyKey: 'mweb.cityLaunch.hostBody',
  },
  {
    testID: 'city-launch-card-venue',
    kind: 'VENUE',
    icon: 'storefront',
    eyebrowKey: 'mweb.cityLaunch.venueEyebrow',
    titleKey: 'mweb.cityLaunch.venueTitle',
    bodyKey: 'mweb.cityLaunch.venueBody',
  },
  {
    testID: 'city-launch-card-volunteer',
    kind: 'CLUB_ADMIN',
    icon: 'volunteer-activism',
    eyebrowKey: 'mweb.cityLaunch.volunteerEyebrow',
    titleKey: 'mweb.cityLaunch.volunteerTitle',
    bodyKey: 'mweb.cityLaunch.volunteerBody',
  },
];

const nativeRouteOf = (kind: string) =>
  EARN_JOURNEYS.find((journey) => journey.kind === kind)?.nativeRoute ?? 'Earn';

/**
 * "What else can you do?" — three ways to help a city launch, each opening
 * its Earn journey: hosting, a venue, or running a club. mWeb twin:
 * components/city-launch/CityLaunchWhatElse.
 */
export function CityLaunchWhatElse() {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <YStack testID="city-launch-what-else" gap={12}>
      <Text role="heading" fontSize={17} fontWeight="600" color="$color">
        {t('mweb.cityLaunch.whatElse')}
      </Text>
      {CARDS.map((card) => (
        <SurfaceCard key={card.testID} testID={card.testID} gap={8}>
          <XStack
            alignSelf="flex-start"
            alignItems="center"
            gap={4}
            height={24}
            paddingHorizontal={8}
            borderRadius={999}
            backgroundColor="$soft"
          >
            <MaterialIcons name={card.icon} size={16} color={muted} />
            <Text fontSize={13} color="$color" numberOfLines={1}>
              {t(card.eyebrowKey)}
            </Text>
          </XStack>
          <Text role="heading" fontSize={16} lineHeight={21} fontWeight="600" color="$color">
            {t(card.titleKey)}
          </Text>
          <Text fontSize={14} lineHeight={20} color="$muted">
            {t(card.bodyKey)}
          </Text>
          <YStack alignSelf="flex-start" paddingTop={4}>
            <DuncitButton
              testID={`${card.testID}-cta`}
              variant="outline"
              label={t('mweb.cityLaunch.tellMeMore')}
              accessibilityLabel={t('mweb.a11y.actionFor', {
                vars: { action: t('mweb.cityLaunch.tellMeMore'), name: t(card.titleKey) },
              })}
              // The journeys list names its screens as strings, as EarnScreen reads them.
              onPress={() => navigation.navigate(nativeRouteOf(card.kind) as never)}
            />
          </YStack>
        </SurfaceCard>
      ))}
    </YStack>
  );
}
