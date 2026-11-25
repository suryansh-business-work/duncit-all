import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';

export interface Kpi {
  key: string;
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  /** A theme colour key: primary, info, success, warning — the portal tile's colour. */
  tone: 'accentText' | 'info' | 'success' | 'warning';
}

/** The portal Dashboard's KPI tiles, two to a row: an icon in its colour, the number, the label in capitals. */
export function KpiGrid({ items }: Readonly<{ items: Kpi[] }>) {
  const theme = useTheme();
  return (
    <XStack flexWrap="wrap" gap="$3">
      {items.map((kpi) => (
        <YStack
          key={kpi.key}
          flexBasis="46%"
          flexGrow={1}
          gap="$1"
          padding="$3"
          borderRadius={RADII.md}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          accessible
          aria-label={`${kpi.label}: ${kpi.value}`}
          testID={`kpi-${kpi.key}`}
        >
          <MaterialIcons
            name={kpi.icon}
            size={20}
            color={theme[kpi.tone]?.val}
            accessibilityElementsHidden
          />
          <Text fontSize="$8" fontWeight="800">
            {kpi.value}
          </Text>
          <Text
            color="$muted"
            fontSize="$1"
            fontWeight="700"
            letterSpacing={0.4}
            textTransform="uppercase"
          >
            {kpi.label}
          </Text>
        </YStack>
      ))}
    </XStack>
  );
}
