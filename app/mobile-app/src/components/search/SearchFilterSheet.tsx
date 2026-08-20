import { useMemo } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import type { SearchCategory } from '@/hooks/useSearch';

interface Props {
  open: boolean;
  categories: SearchCategory[];
  categoryId: string;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
}

/**
 * Bottom-sheet category filter, mirroring mWeb's Filter dialog.
 *
 * The chip grid is EVERY category the server publishes, wrapped — 40 of them is
 * ~14 rows. It used to render in a sheet with no height cap and no scroller, so
 * on any phone the sheet grew past the top of the screen and Apply sat under the
 * navigation bar, unreachable. {@link DuncitDialog} caps it against the live
 * window and keeps Apply pinned.
 */
export function SearchFilterSheet({
  open,
  categories,
  categoryId,
  onClose,
  onSelect,
}: Readonly<Props>) {
  const options = useMemo(
    () =>
      [
        ['', 'All'] as const,
        ...categories.map((c) => [c.id, c.name] as const),
      ] as readonly (readonly [string, string])[],
    [categories],
  );

  const footer = (
    <XStack
      testID="search-filter-apply"
      role="button"
      aria-label="Apply filters"
      onPress={onClose}
      flex={1}
      height={46}
      alignItems="center"
      justifyContent="center"
      borderRadius={12}
      backgroundColor="$primary"
      pressStyle={{ opacity: 0.85 }}
    >
      <Text fontSize={14} fontWeight="700" color="$onPrimary">
        Apply
      </Text>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="search-filter-sheet"
      title="Filter by Category"
      closeLabel="Close"
      footer={footer}
    >
      <YStack>
        {categories.length === 0 ? (
          <Text fontSize={13} color="$muted">
            No categories available yet.
          </Text>
        ) : (
          <OptionChipRow
            testIDPrefix="search-filter-cat"
            options={options}
            value={categoryId}
            onSelect={onSelect}
          />
        )}
      </YStack>
    </DuncitDialog>
  );
}
