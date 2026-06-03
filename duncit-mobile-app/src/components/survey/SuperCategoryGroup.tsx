import { Text, XStack, YStack } from 'tamagui';

import { colorForId, emojiFromIcon, withAlpha } from '@/constants/survey-palette';
import type { SurveyCategory } from '@/hooks/useSurvey';
import { SurveyChip } from './SurveyChip';

export interface SuperCategoryGroupProps {
  superCategory: SurveyCategory;
  childrenByParent: Map<string | null, SurveyCategory[]>;
  selected: Set<string>;
  onToggle: (id: string) => void;
}

/** A titled, tinted group of interest chips — RN port of mWeb's group card. */
export function SuperCategoryGroup({
  superCategory,
  childrenByParent,
  selected,
  onToggle,
}: SuperCategoryGroupProps) {
  const hue = colorForId(superCategory.id);
  const emoji = emojiFromIcon(superCategory.icon);
  const categories = childrenByParent.get(superCategory.id) ?? [];
  const items = categories.flatMap((c) => [c, ...(childrenByParent.get(c.id) ?? [])]);

  return (
    <YStack
      testID={`group-${superCategory.id}`}
      gap={12}
      borderRadius={16}
      backgroundColor="$surface"
      padding={16}
      borderWidth={1.5}
      borderColor={withAlpha(hue, 0.22)}
    >
      <XStack
        alignItems="center"
        gap={6}
        alignSelf="flex-start"
        borderRadius={999}
        paddingHorizontal={12}
        paddingVertical={4}
        backgroundColor={withAlpha(hue, 0.12)}
      >
        {emoji ? <Text fontSize={16}>{emoji}</Text> : null}
        <Text color={hue} fontWeight="800">
          {superCategory.name}
        </Text>
      </XStack>

      {items.length === 0 ? (
        <Text fontSize={12} color="$muted">
          No interests in this group yet.
        </Text>
      ) : (
        <XStack flexWrap="wrap" justifyContent="center" gap={8}>
          {items.map((item, index) => (
            <SurveyChip
              key={item.id}
              id={item.id}
              label={item.name}
              icon={item.icon}
              selected={selected.has(item.id)}
              onToggle={onToggle}
              large={index % 3 === 0}
            />
          ))}
        </XStack>
      )}
    </YStack>
  );
}
