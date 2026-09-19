import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, YStack } from 'tamagui';
import { EARN_JOURNEYS } from '@duncit/onboarding';
import { launchSectionMedia, type LaunchPageMedia, type LaunchRoleDefinition } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

import { LAUNCH_BADGE_ICONS } from './launchIcons';
import {
  LAUNCH_INK,
  LaunchBadge,
  LaunchFooterLine,
  LaunchGlass,
  LaunchHeadline,
  LaunchTagline,
} from './LaunchGlass';
import { LaunchItemDiscs, LaunchItemPills, LaunchItemStrip } from './LaunchItems';
import { LaunchSection } from './LaunchSection';

const nativeRouteOf = (kind: string) =>
  EARN_JOURNEYS.find((journey) => journey.kind === kind)?.nativeRoute ?? 'Earn';

interface Props {
  role: LaunchRoleDefinition;
  media: LaunchPageMedia;
  minHeight: number;
}

/**
 * One of the three ways to help a city launch — hosting, a venue, running a
 * club — as a full screen: the aside and headline over the role's video, its
 * chips, then the glass card with the badge, the pitch, the stats and "Tell
 * me more", which opens the role's Earn journey. mWeb twin:
 * components/city-launch/CityLaunchRoleSection.
 */
export function CityLaunchRoleSection({ role, media, minHeight }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const title = t(role.titleKey);
  const cta = t('mweb.cityLaunch.tellMeMore');
  const chips =
    role.chips.length > 0 ? (
      <LaunchItemPills
        items={role.chips}
        testID={`${role.testId}-chips`}
        inline={role.section === 'club_admin'}
      />
    ) : null;
  const stats =
    role.statsLayout === 'strip' ? (
      <LaunchItemStrip items={role.stats} testID={`${role.testId}-stats`} />
    ) : (
      <LaunchItemDiscs items={role.stats} testID={`${role.testId}-stats`} />
    );

  return (
    <LaunchSection
      testID={role.testId}
      media={launchSectionMedia(media, role.section)}
      minHeight={minHeight}
    >
      <YStack gap={16}>
        <LaunchTagline>{t(role.taglineKey)}</LaunchTagline>
        <LaunchHeadline testID={`${role.testId}-title`}>{title}</LaunchHeadline>
        {role.subtitleKey ? (
          <Text fontSize={16} lineHeight={22} color={LAUNCH_INK} opacity={0.92}>
            {t(role.subtitleKey)}
          </Text>
        ) : null}
        {chips}
      </YStack>

      <YStack gap={16}>
        <YStack position="relative" paddingTop={18}>
          <YStack position="absolute" top={0} left={0} right={0} alignItems="center" zIndex={1}>
            <LaunchBadge
              icon={LAUNCH_BADGE_ICONS[role.section]}
              label={t(role.eyebrowKey)}
              testID={`${role.testId}-badge`}
            />
          </YStack>
          <LaunchGlass paddingTop={32} gap={16}>
            {role.cardTitleKey ? (
              <Text
                role="heading"
                fontSize={26}
                lineHeight={30}
                fontWeight="700"
                textAlign="center"
                color={LAUNCH_INK}
              >
                {t(role.cardTitleKey)}
              </Text>
            ) : null}
            {role.cardBodyKey ? (
              <Text
                fontSize={15}
                lineHeight={22}
                textAlign="center"
                color={LAUNCH_INK}
                opacity={0.92}
              >
                {t(role.cardBodyKey)}
              </Text>
            ) : null}
            {stats}
            <DuncitButton
              testID={`${role.testId}-cta`}
              size="lg"
              fullWidth
              elevated
              label={cta}
              iconAfter={<MaterialIcons name="arrow-forward" size={20} color={onPrimary} />}
              accessibilityLabel={t('mweb.a11y.actionFor', { vars: { action: cta, name: title } })}
              // The journeys list names its screens as strings, as EarnScreen reads them.
              onPress={() => navigation.navigate(nativeRouteOf(role.kind) as never)}
            />
          </LaunchGlass>
        </YStack>
        {role.footerKey ? (
          <LaunchFooterLine testID={`${role.testId}-footer`}>{t(role.footerKey)}</LaunchFooterLine>
        ) : null}
      </YStack>
    </LaunchSection>
  );
}
