import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import { useTranslation } from '../i18n';
import type { DuncitColumn, TableFilterValue } from '../types';
import { FilterControl } from './filterControls';
import {
  draftToFilters,
  emptyDraft,
  filtersToDraft,
  type FilterDraft,
  type FilterDraftMap,
} from './filterState';

interface FilterPopoverProps<T> {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  columns: ReadonlyArray<DuncitColumn<T>>;
  filters: TableFilterValue[];
  setFilters: (filters: TableFilterValue[]) => void;
}

/**
 * One labelled control per filterable column; edits a local draft that only lands in the
 * query on Apply. Date controls read and write the admin's configured pattern,
 * inherited from the surface-level DuncitLocalizationProvider.
 */
export function FilterPopover<T>(props: Readonly<FilterPopoverProps<T>>) {
  const { open, anchorEl, onClose, columns, filters, setFilters } = props;
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<FilterDraftMap>({});
  const filterable = columns.filter((column) => column.filter);

  // Re-seed the draft from the applied filters each time the popover opens.
  useEffect(() => {
    if (open) setDrafts(filtersToDraft(columns, filters));
  }, [open, columns, filters]);

  const updateDraft = (field: string, patch: Partial<FilterDraft>) => {
    setDrafts((prev) => ({ ...prev, [field]: { ...(prev[field] ?? emptyDraft()), ...patch } }));
  };

  const handleApply = () => {
    setFilters(draftToFilters(columns, drafts));
    onClose();
  };

  const handleClearAll = () => {
    setFilters([]);
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <Stack spacing={2} sx={{ p: 2, minWidth: 280, maxWidth: 400 }}>
        {filterable.map((column) => (
          <FilterControl
            key={column.field}
            column={column}
            draft={drafts[column.field] ?? emptyDraft()}
            onChange={(patch) => updateDraft(column.field, patch)}
          />
        ))}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" onClick={handleClearAll}>
            {t('shell.table.clearAll')}
          </Button>
          <Button size="small" variant="contained" onClick={handleApply}>
            {t('shell.table.apply')}
          </Button>
        </Stack>
      </Stack>
    </Popover>
  );
}
