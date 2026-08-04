import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  testID: string;
  query: string;
  onQueryChange: (next: string) => void;
  /** Filter trigger rendered beside the box (category + price + date). */
  filterAction?: ReactNode;
}

/** Search box + optional filter trigger above a full pod list. Extracted from
 * PodListView to keep that file under the 200-line cap. */
export function PodListSearchRow({ testID, query, onQueryChange, filterAction }: Readonly<Props>) {
  const { muted } = useThemeColors();
  const { t } = useTranslation();

  return (
    <XStack marginHorizontal={16} marginTop={12} alignItems="center" gap={8}>
      <XStack
        flex={1}
        alignItems="center"
        gap={8}
        paddingHorizontal={12}
        height={46}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
      >
        <MaterialIcons name="search" size={20} color={muted} />
        <Input
          testID={`${testID}-search-input`}
          aria-label={t('mweb.home.searchPods')}
          flex={1}
          unstyled
          value={query}
          onChangeText={onQueryChange}
          placeholder={t('mweb.home.searchPods')}
          placeholderTextColor="$muted"
          color="$color"
          fontSize={15}
          returnKeyType="search"
        />
      </XStack>
      {filterAction}
    </XStack>
  );
}
