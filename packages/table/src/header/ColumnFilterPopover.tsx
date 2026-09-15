import { useState } from 'react';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n';
import { FilterControl } from '../toolbar/filterControls';
import { draftToFilter, filterToDraft, type FilterDraft } from '../toolbar/filterState';
import type { DuncitColumn } from '../types';
import { useTableHeaderState } from './headerState';

interface ColumnFilterPopoverProps<T> {
  column: DuncitColumn<T>;
  label: string;
  anchorEl: HTMLElement;
  onClose: () => void;
}

/**
 * One column's filter, edited as a draft that only reaches the query on Apply.
 *
 * Mounted only while open, so every opening starts from the filter the column
 * has applied right now. Date controls read the admin's configured pattern,
 * inherited from the surface-level DuncitLocalizationProvider.
 */
export function ColumnFilterPopover<T>(props: Readonly<ColumnFilterPopoverProps<T>>) {
  const { column, label, anchorEl, onClose } = props;
  const { t } = useTranslation();
  const { filters, setFilters } = useTableHeaderState();
  const [draft, setDraft] = useState<FilterDraft>(() =>
    filterToDraft(column, filters.find((filter) => filter.field === column.field)),
  );
  const others = filters.filter((filter) => filter.field !== column.field);

  const handleApply = () => {
    const applied = draftToFilter(column, draft);
    setFilters(applied ? [...others, applied] : others);
    onClose();
  };

  const handleClear = () => {
    setFilters(others);
    onClose();
  };

  return (
    <Popover
      open
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      // The opener announces a dialog; the surface is one, named for it.
      slotProps={{
        paper: { role: 'dialog', 'aria-label': t('shell.table.filterColumn', { vars: { label } }) },
      }}
    >
      <Stack spacing={2} sx={{ p: 2, width: 300, maxWidth: '100%' }}>
        <FilterControl
          column={column}
          label={label}
          draft={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton size="small" onClick={handleClear}>
            {t('shell.table.clearFilter')}
          </DuncitButton>
          <DuncitButton size="small" variant="contained" onClick={handleApply}>
            {t('shell.table.apply')}
          </DuncitButton>
        </Stack>
      </Stack>
    </Popover>
  );
}
