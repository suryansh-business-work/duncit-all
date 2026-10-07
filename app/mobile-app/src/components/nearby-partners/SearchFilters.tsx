import { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { Slider, Text, XStack, YStack } from 'tamagui';
import { POD_REQUEST_MAX_RADIUS_KM } from '@duncit/utils';

import { SelectChip } from '@/components/venue-availability/SelectChip';
import { useCategoryTree } from '@/hooks/useCategoryTree';
import type { NearbySearchState } from '@/hooks/useNearbySearch';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  state: NearbySearchState;
}

/**
 * The radius (0–10 km, half-km steps) and the category chips — several may be
 * on, none means all. The chips are the Category level, the one hosts and
 * venues are both tagged at. mWeb twin: nearby-partners-page/SearchFilters.
 */
export function SearchFilters({ state }: Readonly<Props>) {
  const { t } = useTranslation();
  const { categories } = useCategoryTree();
  const options = useMemo(
    () =>
      categories
        .filter((row) => row.level === 'CATEGORY')
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)),
    [categories],
  );
  const selected = useMemo(() => new Set(state.categoryIds), [state.categoryIds]);
  const kmLabel = t('podRequests.radiusValue', { vars: { km: state.radiusKm } });

  const toggle = (id: string) =>
    state.setCategoryIds(
      selected.has(id) ? state.categoryIds.filter((row) => row !== id) : [...state.categoryIds, id],
    );

  return (
    <YStack gap={14} testID="nearby-search-filters">
      <YStack gap={10}>
        <XStack justifyContent="space-between">
          <Text fontSize={14} fontWeight="600" color="$color">
            {t('podRequests.radiusLabel')}
          </Text>
          <Text fontSize={14} color="$muted" testID="nearby-radius-value">
            {kmLabel}
          </Text>
        </XStack>
        <Slider
          testID="nearby-radius"
          min={0}
          max={POD_REQUEST_MAX_RADIUS_KM}
          step={0.5}
          value={[state.radiusKm]}
          onValueChange={([next]) => state.setRadiusKm(next ?? state.radiusKm)}
          aria-label={t('podRequests.radiusLabel')}
          aria-valuetext={kmLabel}
        >
          <Slider.Track>
            <Slider.TrackActive />
          </Slider.Track>
          <Slider.Thumb index={0} circular size="$2" />
        </Slider>
      </YStack>
      <YStack gap={8}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {t('podRequests.categoryLabel')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap={8} role="group" aria-label={t('podRequests.categoryLabel')}>
            <SelectChip
              testID="nearby-category-all"
              role="checkbox"
              label={t('podRequests.allCategories')}
              selected={selected.size === 0}
              onPress={() => state.setCategoryIds([])}
            />
            {options.map((category) => (
              <SelectChip
                key={category.id}
                testID={`nearby-category-${category.id}`}
                role="checkbox"
                label={category.name}
                selected={selected.has(category.id)}
                onPress={() => toggle(category.id)}
              />
            ))}
          </XStack>
        </ScrollView>
      </YStack>
    </YStack>
  );
}
