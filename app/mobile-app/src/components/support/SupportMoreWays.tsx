import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { SUPPORT_MORE_WAYS, type SupportSection } from './supportSections';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface MoreWayCardProps {
  section: SupportSection;
  onPress: () => void;
}

/** A single "More ways" tile — the icon on a soft disc, then the title. */
function MoreWayCard({ section, onPress }: Readonly<MoreWayCardProps>) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  // Sections added since rule 38 carry keys; the older literals still render.
  const title = section.titleKey ? t(section.titleKey) : section.title;
  return (
    <SurfaceCard
      testID={`support-more-${section.key}`}
      role="button"
      aria-label={title}
      onPress={onPress}
      flexBasis="45%"
      flexGrow={1}
      gap={12}
      pressStyle={PRESS_STYLE.surface}
    >
      <YStack
        width={44}
        height={44}
        borderRadius={22}
        backgroundColor="$soft"
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name={section.icon} size={22} color={colors[section.tone]} />
      </YStack>
      <Text fontSize={15} fontWeight="600" color="$color" lineHeight={19}>
        {title}
      </Text>
    </SurfaceCard>
  );
}

/** "More ways to reach us" — the non-chat support tools as a two-column tile
 * grid. RN twin of mWeb's SupportHubPage "More ways" grid. */
export function SupportMoreWays({
  onNavigate,
}: Readonly<{ onNavigate: (section: SupportSection) => void }>) {
  const { t } = useTranslation();
  return (
    <YStack gap={12}>
      <SectionHeader title={t('mweb.supportHub.moreWaysToReachUs')} />
      <XStack flexWrap="wrap" gap={12}>
        {SUPPORT_MORE_WAYS.map((section) => (
          <MoreWayCard key={section.key} section={section} onPress={() => onNavigate(section)} />
        ))}
      </XStack>
    </YStack>
  );
}
