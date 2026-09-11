import type { ReactNode } from 'react';
import { XStack } from 'tamagui';

import { SearchPill } from '@/components/pod-list/SearchPill';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  testID: string;
  query: string;
  onQueryChange: (next: string) => void;
  /** Filter trigger rendered beside the box (category + price + date). */
  filterAction?: ReactNode;
}

/** Search pill + optional filter trigger above a full pod list. Extracted from
 * PodListView to keep that file under the 200-line cap. */
export function PodListSearchRow({ testID, query, onQueryChange, filterAction }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <XStack marginHorizontal={16} marginTop={12} alignItems="center" gap={8}>
      <SearchPill
        testID={`${testID}-search-input`}
        ariaLabel={t('mweb.home.searchPods')}
        placeholder={t('mweb.home.searchPods')}
        value={query}
        onChangeText={onQueryChange}
      />
      {filterAction}
    </XStack>
  );
}
