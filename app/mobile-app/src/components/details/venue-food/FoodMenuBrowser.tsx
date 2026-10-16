import { useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import {
  foodMenuView,
  foodSectionsAfterSearch,
  toggleAllFoodSections,
  toggleFoodSection,
  type FoodMenuGroup,
  type VenueFoodItem,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SearchPill } from '@/components/pod-list/SearchPill';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { FoodMenuList } from './FoodMenuList';

interface Props {
  groups: FoodMenuGroup[];
  currency: string;
  onOpenDetails: (item: VenueFoodItem) => void;
  canOrder: boolean;
  quantityOf: (itemId: string) => number;
  cartReady: boolean;
  onQuantity: (itemId: string, quantity: number) => void;
}

/**
 * Finding a dish: a search over names and descriptions, and — on a menu with
 * categories — sections that fold, with one button to open or fold them all.
 * Typing a search opens every section, so a match is never hidden in a folded
 * one. The filtering is `@duncit/utils`, shared with mWeb.
 * Tamagui twin of mWeb's food/FoodMenuBrowser.
 */
export function FoodMenuBrowser({ groups, ...list }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const { shown, sectioned, allOpen } = useMemo(
    () => foodMenuView(groups, query, collapsed),
    [groups, query, collapsed],
  );

  const search = (next: string) => {
    setQuery(next);
    setCollapsed((prev) => foodSectionsAfterSearch(prev, next));
  };

  return (
    <YStack gap={12}>
      <XStack alignItems="center" gap={8}>
        <SearchPill
          testID="venue-food-search"
          ariaLabel={t('mweb.venueFood.menuSearch.label')}
          placeholder={t('mweb.venueFood.menuSearch.placeholder')}
          value={query}
          onChangeText={search}
        />
        {query ? (
          <XStack
            testID="venue-food-search-clear"
            role="button"
            tabIndex={0}
            aria-label={t('mweb.common.clearSearch')}
            hitSlop={8}
            onPress={() => search('')}
            width={44}
            height={44}
            alignItems="center"
            justifyContent="center"
            borderRadius={22}
            pressStyle={PRESS_STYLE.row}
          >
            <MaterialIcons name="close" size={20} color={muted} />
          </XStack>
        ) : null}
      </XStack>
      {sectioned && shown.length > 0 ? (
        <XStack justifyContent="flex-end">
          <DuncitButton
            testID="venue-food-toggle-all"
            label={
              allOpen
                ? t('mweb.venueFood.menuSearch.collapseAll')
                : t('mweb.venueFood.menuSearch.expandAll')
            }
            variant="ghost"
            size="sm"
            icon={
              <MaterialIcons
                name={allOpen ? 'unfold-less' : 'unfold-more'}
                size={18}
                color={muted}
              />
            }
            onPress={() => setCollapsed((prev) => toggleAllFoodSections(shown, prev))}
          />
        </XStack>
      ) : null}
      {shown.length === 0 ? (
        <Text
          testID="venue-food-search-empty"
          aria-live="polite"
          textAlign="center"
          paddingVertical={24}
          fontSize={14}
          color="$muted"
        >
          {t('mweb.venueFood.menuSearch.noResults', { vars: { query: query.trim() } })}
        </Text>
      ) : (
        <FoodMenuList
          {...list}
          groups={shown}
          sectioned={sectioned}
          collapsed={collapsed}
          onToggle={(key) => setCollapsed((prev) => toggleFoodSection(prev, key))}
        />
      )}
    </YStack>
  );
}
