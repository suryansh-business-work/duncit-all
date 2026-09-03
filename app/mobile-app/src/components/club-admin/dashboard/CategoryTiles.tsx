import { Text, XStack, YStack } from 'tamagui';
import { formatCount } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { MetricCell } from '../MetricCell';

/** One category the admin's clubs run under, as the dashboard answers it. */
interface CategoryTile {
  category_id: string;
  name: string;
  super_category?: string | null;
  clubs: number;
  pods: number;
}

interface Props {
  categories: readonly CategoryTile[];
}

/** "Your Categories" — a tile per category, biggest first (server order). */
export function CategoryTiles({ categories }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <YStack gap={10} testID="club-dashboard-categories">
      <YStack gap={2}>
        <Text fontSize={15} fontWeight="700" color="$color">
          {t('clubAdmin.dashboard.yourCategories')}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {t('clubAdmin.dashboard.yourCategoriesHint')}
        </Text>
      </YStack>
      {categories.length === 0 ? (
        <Text testID="club-dashboard-categories-empty" fontSize={13} color="$muted">
          {t('clubAdmin.dashboard.categoriesEmpty')}
        </Text>
      ) : null}
      <XStack gap={10} flexWrap="wrap">
        {categories.map((tile) => (
          <YStack
            key={tile.category_id}
            testID={`club-dashboard-category-${tile.category_id}`}
            flexBasis="47%"
            flexGrow={1}
            gap={6}
            padding={12}
            borderRadius={12}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
          >
            <Text fontSize={14} fontWeight="700" color="$color" numberOfLines={1}>
              {tile.name}
            </Text>
            {tile.super_category ? (
              <Text fontSize={11.5} color="$muted" numberOfLines={1}>
                {tile.super_category}
              </Text>
            ) : null}
            <XStack gap={8}>
              <MetricCell
                testID={`club-dashboard-category-${tile.category_id}-clubs`}
                label={t('clubAdmin.dashboard.clubs')}
                value={formatCount(tile.clubs)}
              />
              <MetricCell
                testID={`club-dashboard-category-${tile.category_id}-pods`}
                label={t('clubAdmin.dashboard.pods')}
                value={formatCount(tile.pods)}
              />
            </XStack>
          </YStack>
        ))}
      </XStack>
    </YStack>
  );
}
