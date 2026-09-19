import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { LaunchItem } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { GLASS, LAUNCH_INK } from './LaunchGlass';
import { LAUNCH_ICONS } from './launchIcons';

const DIVIDER = 'rgba(255,255,255,0.18)';

interface Props {
  items: readonly LaunchItem[];
  testID: string;
}

/** A glass strip divided into equal cells, each a pictogram over a two-line caption. */
export function LaunchItemStrip({ items, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  return (
    <XStack testID={testID} {...GLASS} padding={8}>
      {items.map((item, index) => (
        <YStack
          key={item.labelKey}
          flex={1}
          alignItems="center"
          gap={4}
          paddingHorizontal={4}
          paddingVertical={8}
          borderLeftWidth={index === 0 ? 0 : 1}
          borderLeftColor={DIVIDER}
        >
          <MaterialIcons name={LAUNCH_ICONS[item.iconKey]} size={24} color={accent} />
          <Text
            fontSize={12}
            lineHeight={15}
            fontWeight="600"
            textAlign="center"
            color={LAUNCH_INK}
          >
            {t(item.labelKey)}
          </Text>
        </YStack>
      ))}
    </XStack>
  );
}

/** Round glass discs, each a pictogram with its caption under it, in one row. */
export function LaunchItemDiscs({ items, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  return (
    <XStack testID={testID} gap={8}>
      {items.map((item, index) => (
        <YStack
          key={item.labelKey}
          flex={1}
          alignItems="center"
          gap={8}
          borderLeftWidth={index === 0 ? 0 : 1}
          borderLeftColor={DIVIDER}
        >
          <YStack
            {...GLASS}
            borderRadius={28}
            width={56}
            height={56}
            alignItems="center"
            justifyContent="center"
          >
            <MaterialIcons name={LAUNCH_ICONS[item.iconKey]} size={26} color={accent} />
          </YStack>
          <Text
            fontSize={13}
            lineHeight={16}
            fontWeight="600"
            textAlign="center"
            paddingHorizontal={4}
            color={LAUNCH_INK}
          >
            {t(item.labelKey)}
          </Text>
        </YStack>
      ))}
    </XStack>
  );
}

/** Glass pills, a pictogram before each caption — stacked down the page, or in one wrapping row. */
export function LaunchItemPills({
  items,
  testID,
  inline = false,
}: Readonly<Props & { inline?: boolean }>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  return (
    <XStack
      testID={testID}
      flexDirection={inline ? 'row' : 'column'}
      flexWrap="wrap"
      gap={8}
      alignItems="flex-start"
    >
      {items.map((item) => (
        <XStack
          key={item.labelKey}
          {...GLASS}
          borderRadius={999}
          alignItems="center"
          gap={8}
          paddingHorizontal={14}
          paddingVertical={10}
        >
          <MaterialIcons name={LAUNCH_ICONS[item.iconKey]} size={20} color={accent} />
          <Text fontSize={14} lineHeight={18} fontWeight="600" color={LAUNCH_INK}>
            {t(item.labelKey)}
          </Text>
        </XStack>
      ))}
    </XStack>
  );
}
