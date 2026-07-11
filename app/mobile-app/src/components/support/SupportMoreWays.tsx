import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { SUPPORT_MORE_WAYS, type SupportSection } from './supportSections';

interface MoreWayCardProps {
  section: SupportSection;
  onPress: () => void;
}

/** A single "More ways" row card — coloured icon badge + title + description. */
function MoreWayCard({ section, onPress }: Readonly<MoreWayCardProps>) {
  const { muted } = useThemeColors();
  return (
    <XStack
      testID={`support-more-${section.key}`}
      role="button"
      aria-label={section.title}
      onPress={onPress}
      alignItems="center"
      gap={14}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.85 }}
    >
      <YStack
        width={44}
        height={44}
        borderRadius={14}
        backgroundColor={section.color}
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name={section.icon} size={22} color="#ffffff" />
      </YStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="900" color="$color">
          {section.title}
        </Text>
        <Text fontSize={12.5} color="$muted">
          {section.desc}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </XStack>
  );
}

/** "More ways to reach us" — the non-chat support tools as tappable row cards.
 * RN twin of mWeb's SupportHubPage "More ways" grid. */
export function SupportMoreWays({
  onNavigate,
}: Readonly<{ onNavigate: (section: SupportSection) => void }>) {
  return (
    <YStack gap={8}>
      <Text
        fontSize={12}
        fontWeight="900"
        color="$muted"
        textTransform="uppercase"
        letterSpacing={0.5}
      >
        More ways to reach us
      </Text>
      <YStack gap={12}>
        {SUPPORT_MORE_WAYS.map((section) => (
          <MoreWayCard key={section.key} section={section} onPress={() => onNavigate(section)} />
        ))}
      </YStack>
    </YStack>
  );
}
