import { DuncitDialog } from '@/components/DuncitDialog';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import { SEARCH_SORT_OPTIONS, type SearchSort } from '@/utils/search-sort';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  value: SearchSort;
  onClose: () => void;
  onSelect: (next: SearchSort) => void;
}

/**
 * Bottom-sheet single-select sort, mirroring mWeb's Sort Results dialog.
 *
 * Sheet chrome, scrim, scrolling body and safe-area handling come from
 * {@link DuncitDialog}; this file only declares the options.
 */
export function SearchSortSheet({ open, value, onClose, onSelect }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="search-sort"
      title={t('mweb.search.sortResults')}
      closeLabel="Close"
    >
      <OptionChipRow
        layout="column"
        testIDPrefix="search-sort"
        options={SEARCH_SORT_OPTIONS}
        value={value}
        onSelect={(next) => {
          onSelect(next);
          onClose();
        }}
      />
    </DuncitDialog>
  );
}
