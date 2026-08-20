import { DuncitDialog } from '@/components/DuncitDialog';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import { podHistorySorts, type PodHistorySort } from '@/utils/pod-history';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  value: PodHistorySort;
  onClose: () => void;
  onSelect: (next: PodHistorySort) => void;
}

/**
 * Bottom-sheet single-select sort for Pod History (date / price).
 *
 * Sheet chrome, scrim, scrolling body and safe-area handling come from
 * {@link DuncitDialog}; this file only declares the options.
 */
export function PodHistorySortSheet({ open, value, onClose, onSelect }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="pod-history-sort"
      title={t('mweb.podHistory.sort')}
      closeLabel={t('mweb.podHistory.close')}
    >
      <OptionChipRow
        layout="column"
        testIDPrefix="ph-sort"
        options={podHistorySorts(t)}
        value={value}
        onSelect={(next) => {
          onSelect(next);
          onClose();
        }}
      />
    </DuncitDialog>
  );
}
