import { XStack, YStack } from 'tamagui';

import { OptionChipRow } from '@/components/home/HomeFilterParts';
import { SearchPill } from '@/components/pod-list/SearchPill';
import type { CategoryOption } from '@/hooks/useClubsFilter';
import { useTranslation } from '@/hooks/useTranslation';

interface ClubsSearchFilterProps {
  query: string;
  onQueryChange: (value: string) => void;
  categoryId: string;
  categoryOptions: CategoryOption[];
  onCategoryChange: (id: string) => void;
}

/** Search pill + horizontal category rail above the Clubs list. mWeb twin:
 * ClubsPage's SearchPillField + clubs-page/ClubCategoryChips. */
export function ClubsSearchFilter({
  query,
  onQueryChange,
  categoryId,
  categoryOptions,
  onCategoryChange,
}: Readonly<ClubsSearchFilterProps>) {
  const { t } = useTranslation();
  const options: CategoryOption[] = [['', t('mweb.common.all')], ...categoryOptions];

  return (
    <YStack gap={16} paddingHorizontal={16} paddingTop={12} paddingBottom={4}>
      <XStack>
        <SearchPill
          testID="clubs-search-input"
          ariaLabel={t('mweb.common.searchClubs')}
          placeholder={t('mweb.common.searchClubs')}
          value={query}
          onChangeText={onQueryChange}
        />
      </XStack>

      {categoryOptions.length > 0 ? (
        <OptionChipRow
          testIDPrefix="clubs-filter-cat"
          options={options}
          value={categoryId}
          onSelect={onCategoryChange}
          layout="scroll"
          onPage
        />
      ) : null}
    </YStack>
  );
}
