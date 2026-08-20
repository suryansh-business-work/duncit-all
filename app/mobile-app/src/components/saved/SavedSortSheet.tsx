import { DuncitDialog } from '@/components/DuncitDialog';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import { SAVED_SORTS, type SavedSort } from '@/utils/saved-filter';

interface Props {
  open: boolean;
  value: SavedSort;
  onClose: () => void;
  onSelect: (next: SavedSort) => void;
}

/**
 * Bottom-sheet single-select sort for Saved Items (date / price / name / saved).
 *
 * The sheet, its scrim, its header and its safe-area handling are
 * {@link DuncitDialog}'s — this used to hand-roll all four, with no scroll area
 * and no height cap, so a longer option list simply ran off the screen.
 */
export function SavedSortSheet({ open, value, onClose, onSelect }: Readonly<Props>) {
  return (
    <DuncitDialog open={open} onClose={onClose} testID="saved-sort" title="Sort" closeLabel="Close">
      <OptionChipRow
        layout="column"
        testIDPrefix="saved-sort"
        options={SAVED_SORTS}
        value={value}
        onSelect={(next) => {
          onSelect(next);
          onClose();
        }}
      />
    </DuncitDialog>
  );
}
