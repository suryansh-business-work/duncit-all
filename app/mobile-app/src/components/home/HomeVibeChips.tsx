import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { VibeCategoryTab } from '@/components/home/VibeCategoryTab';
import type { VibeCategory, VibeIconLayout } from '@/hooks/useHomeFeed';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface HomeVibeChipsProps {
  categories: VibeCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Admin-managed icon for the leading "All" tab (branding). */
  allIcon?: string | null;
  /** Admin-managed icon layout (position + size) for the "All" tab (branding). */
  allLayout?: VibeIconLayout | null;
  /** Admin-managed heading (branding.home_vibe_heading); empty falls back to the bundled copy. */
  heading?: string | null;
  /** Admin-managed sub-heading (branding.home_vibe_subheading); empty falls back to the bundled copy. */
  subheading?: string | null;
  /** Right-aligned slot in the header (e.g. the Filters button). */
  action?: ReactNode;
}

interface VibeSubChipProps {
  testID: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}

/** A small pill used for the sub-category row below the tabber. */
function VibeSubChip({ testID, label, selected, onPress }: Readonly<VibeSubChipProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPress={onPress}
      height={36}
      paddingHorizontal={16}
      alignItems="center"
      borderRadius={14}
      borderWidth={1.5}
      backgroundColor={selected ? '$primary' : '$surface'}
      borderColor={selected ? '$primary' : '$borderColor'}
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={12.5} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

/** "What's your vibe today?" — top-level categories render as an icon+label TABBER
 * (with a leading "All" tab); the selected category's sub-categories appear as a
 * pill row directly below. */
export function HomeVibeChips({
  categories,
  selectedId,
  onSelect,
  allIcon,
  allLayout,
  heading,
  subheading,
  action,
}: Readonly<HomeVibeChipsProps>) {
  const { primary } = useThemeColors();
  const { t } = useTranslation();
  const hasCategories = categories.length > 0;
  if (!hasCategories && !action) return null;

  const headingText = heading?.trim() || t('mweb.home.vibeHeading');
  const subheadingText = subheading?.trim() || t('mweb.home.vibeSubheading');
  const activeCategory =
    categories.find((c) => c.id === selectedId || c.subs.some((s) => s.id === selectedId)) ?? null;
  const subs = activeCategory?.subs ?? [];

  return (
    <YStack gap={10}>
      <XStack alignItems="flex-start" justifyContent="space-between" gap={6} paddingHorizontal={16}>
        <YStack flex={1} minWidth={0}>
          <XStack alignItems="center" gap={6}>
            <MaterialIcons name="auto-awesome" size={18} color={primary} />
            <Text fontSize={16} fontWeight="700" color="$color" numberOfLines={1}>
              {headingText}
            </Text>
          </XStack>
          <Text fontSize={11.5} fontWeight="600" color="$muted" numberOfLines={1}>
            {subheadingText}
          </Text>
        </YStack>
        {action}
      </XStack>

      {hasCategories ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 4, paddingHorizontal: 12 }}
        >
          <VibeCategoryTab
            testID="vibe-chip-all"
            label={t('mweb.home.vibeAll')}
            icon={allIcon ?? undefined}
            iconLayout={allLayout}
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
                iconLayout={category.iconLayout}
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
