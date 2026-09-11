import type { ReactNode } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { VibeCategoryTab } from '@/components/home/VibeCategoryTab';
import type { VibeCategory } from '@/hooks/useHomeFeed';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface HomeVibeChipsProps {
  categories: VibeCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Admin-managed icon for the leading "All" chip (branding). */
  allIcon?: string | null;
  /** Optional trailing slot above the chips (Home's filter now sits beside the search bar). */
  action?: ReactNode;
}

interface VibeSubChipProps {
  testID: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}

/** A small pill used for the sub-category row below the category chips. */
function VibeSubChip({ testID, label, selected, onPress }: Readonly<VibeSubChipProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPress={onPress}
      height={32}
      paddingHorizontal={14}
      alignItems="center"
      borderRadius={999}
      borderWidth={1}
      backgroundColor={selected ? '$primary' : '$surface'}
      borderColor={selected ? '$primary' : '$cardBorder'}
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={12.5} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

/** The vibe row — top-level categories as icon pills (with a leading "All");
 * the selected category's sub-categories appear as smaller pills directly
 * below. mWeb twin: HomeVibeChips. */
export function HomeVibeChips({
  categories,
  selectedId,
  onSelect,
  allIcon,
  action,
}: Readonly<HomeVibeChipsProps>) {
  const { t } = useTranslation();
  const hasCategories = categories.length > 0;
  if (!hasCategories && !action) return null;

  const activeCategory =
    categories.find((c) => c.id === selectedId || c.subs.some((s) => s.id === selectedId)) ?? null;
  const subs = activeCategory?.subs ?? [];

  return (
    <YStack gap={10}>
      {action ? (
        <XStack justifyContent="flex-end" paddingHorizontal={16}>
          {action}
        </XStack>
      ) : null}

      {hasCategories ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          <VibeCategoryTab
            testID="vibe-chip-all"
            label={t('mweb.home.vibeAll')}
            icon={allIcon ?? undefined}
            fallback="apps"
            selected={selectedId === ''}
            onPress={() => onSelect('')}
          />
          {categories.map((category) => {
            const selected =
              category.id === selectedId || category.subs.some((s) => s.id === selectedId);
            return (
              <VibeCategoryTab
                key={category.id}
                testID={`vibe-chip-${category.id}`}
                label={category.name}
                icon={category.icon}
                selected={selected}
                onPress={() => onSelect(category.id === selectedId ? '' : category.id)}
              />
            );
          })}
        </ScrollView>
      ) : null}

      {activeCategory && subs.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          <VibeSubChip
            testID={`vibe-sub-all-${activeCategory.id}`}
            label={t('mweb.home.vibeAllOf', { vars: { name: activeCategory.name } })}
            selected={selectedId === activeCategory.id}
            onPress={() => onSelect(activeCategory.id)}
          />
          {subs.map((sub) => (
            <VibeSubChip
              key={sub.id}
              testID={`vibe-sub-${sub.id}`}
              label={sub.name}
              selected={selectedId === sub.id}
              onPress={() => onSelect(selectedId === sub.id ? activeCategory.id : sub.id)}
            />
          ))}
        </ScrollView>
      )}
    </YStack>
  );
}
