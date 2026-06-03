import { Text, XStack } from 'tamagui';

import { colorForId, emojiFromIcon, withAlpha } from '@/constants/survey-palette';

export interface SurveyChipProps {
  id: string;
  label: string;
  icon?: string | null;
  selected: boolean;
  onToggle: (id: string) => void;
  large?: boolean;
}

/** Pill-shaped interest chip — RN port of mWeb's <SurveyChip/> (same hue map). */
export function SurveyChip({ id, label, icon, selected, onToggle, large }: SurveyChipProps) {
  const hue = colorForId(id);
  const emoji = emojiFromIcon(icon);

  return (
    <XStack
      testID={`chip-${id}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => onToggle(id)}
      alignItems="center"
      justifyContent="center"
      gap={6}
      height={large ? 52 : 46}
      paddingHorizontal={large ? 18 : 14}
      borderRadius={999}
      borderWidth={1.5}
      backgroundColor={selected ? hue : withAlpha(hue, 0.1)}
      borderColor={selected ? hue : withAlpha(hue, 0.4)}
      pressStyle={{ opacity: 0.85 }}
    >
      {emoji ? <Text fontSize={large ? 17 : 15}>{emoji}</Text> : null}
      <Text color={selected ? '#ffffff' : hue} fontWeight="700" fontSize={large ? 15 : 13.5}>
        {label}
      </Text>
    </XStack>
  );
}
