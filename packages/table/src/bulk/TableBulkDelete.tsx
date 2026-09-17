import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import Tooltip from '@mui/material/Tooltip';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation } from '../i18n';
import type { TableQueryState } from '../types';
import type { BulkDeleteMode } from './bulkDeleteContext';
import type { BulkDeleteBinding } from './useBulkDelete';

/** The confirm copy per mode — literal keys, so the localization gate can see them. */
const CONFIRM_COPY: Readonly<Record<BulkDeleteMode, { title: string; message: string }>> = {
  SELECTED: {
    title: 'shell.table.bulkDeleteSelectedTitle',
    message: 'shell.table.bulkDeleteSelectedMessage',
  },
  ALL: { title: 'shell.table.bulkDeleteAllTitle', message: 'shell.table.bulkDeleteAllMessage' },
};

export interface TableBulkDeleteProps {
  binding: BulkDeleteBinding;
  /** The query the grid last fetched — pinned external filters included. */
  query: TableQueryState;
  /** How many rows the server says match that query. */
  total: number;
  /** The ids ticked on this page. */
  selectedIds: readonly string[];
  loading: boolean;
  /** The grid's accessible name; the page title stands in when there is none. */
  label?: string;
  /** Clears the ticks once the server has taken the job. */
  onStarted: () => void;
}

/**
 * "Delete N selected" beside the toolbar's other actions while rows are
 * ticked, and "Delete all matching" always.
 *
 * Both confirm first and say how many rows go — "all matching" reaches pages
 * nobody has opened, so its count is the server's, not the page's. The delete
 * itself runs on the server; the header shows its progress.
 */
export function TableBulkDelete(props: Readonly<TableBulkDeleteProps>) {
  const { binding, query, total, selectedIds, loading, label, onStarted } = props;
  const { t } = useTranslation();
  const confirm = useConfirm();
  const selected = selectedIds.length;

  const run = async (mode: BulkDeleteMode, count: number) => {
    const copy = CONFIRM_COPY[mode];
    const ok = await confirm({
      title: t(copy.title, { count }),
      message: t(copy.message, { count }),
      confirmLabel: t('shell.table.bulkDeleteConfirm'),
      destructive: true,
    });
    if (!ok) return;
    const started = await binding.api.start({
      table: binding.table,
      mode,
      variables: binding.variablesOf(query),
      ids: mode === 'ALL' ? [] : [...selectedIds],
      label: label ?? document.title,
      url: globalThis.location.href,
    });
    if (started) onStarted();
  };

  const deleteAllLabel = t('shell.table.bulkDeleteAll');
  return (
    <>
      {selected > 0 && (
        <DuncitButton
          size="small"
          color="error"
          variant="outlined"
          startIcon={<DeleteOutlineIcon fontSize="small" />}
          disabled={loading}
          onClick={() => run('SELECTED', selected)}
          data-testid="table-bulk-delete-selected"
        >
          {t('shell.table.bulkDeleteSelected', { count: selected })}
        </DuncitButton>
      )}
      <Tooltip title={deleteAllLabel}>
        <span>
          <DuncitIconButton
            size="small"
            aria-label={deleteAllLabel}
            disabled={loading || total === 0}
            onClick={() => run('ALL', total)}
            data-testid="table-bulk-delete-all"
          >
            <DeleteSweepIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
    </>
  );
}
