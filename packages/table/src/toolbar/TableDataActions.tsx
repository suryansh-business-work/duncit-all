import { useState } from 'react';
import ApiIcon from '@mui/icons-material/Api';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CircularProgress from '@mui/material/CircularProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { DuncitIconButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { fetchAllRows, saveRows, type DownloadFormat, type DownloadScope } from '../export/tableExport';
import { useTranslation } from '../i18n';
import { tableApiSourceOf } from '../tableApi/source';
import { TableApiDialog } from '../tableApi/TableApiDialog';
import type { DuncitColumn, TableFetch, TableQueryState } from '../types';

const DOWNLOAD_OPTIONS: ReadonlyArray<{ scope: DownloadScope; format: DownloadFormat; labelKey: string }> = [
  { scope: 'page', format: 'csv', labelKey: 'shell.table.downloadPageCsv' },
  { scope: 'page', format: 'json', labelKey: 'shell.table.downloadPageJson' },
  { scope: 'all', format: 'csv', labelKey: 'shell.table.downloadAllCsv' },
  { scope: 'all', format: 'json', labelKey: 'shell.table.downloadAllJson' },
];

export interface TableDataActionsProps<T> {
  tableId: string;
  columns: ReadonlyArray<DuncitColumn<T>>;
  hiddenOverrides: Record<string, boolean>;
  fetchRows: TableFetch<T>;
  /** The query the grid last fetched — pinned external filters included. */
  query: TableQueryState;
  rows: readonly T[];
  total: number;
  loading: boolean;
}

/**
 * Download (this page or every matching row, CSV or JSON) and — for a table
 * backed by a server `<name>Table` query — the GET API dialog.
 */
export function TableDataActions<T>(props: Readonly<TableDataActionsProps<T>>) {
  const { tableId, columns, hiddenOverrides, fetchRows, query, rows, total, loading } = props;
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const apiSource = tableApiSourceOf(fetchRows);

  const download = async (scope: DownloadScope, format: DownloadFormat) => {
    setMenuAnchor(null);
    setDownloading(true);
    try {
      const data = scope === 'page' ? rows : await fetchAllRows(fetchRows, query, total);
      saveRows({ tableId, scope, format, page: query.page, rows: data, columns, hiddenOverrides, t });
    } catch {
      notify(t('shell.table.downloadFailed'), 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Tooltip title={t('shell.table.download')}>
        <DuncitIconButton
          size="small"
          aria-label={t('shell.table.download')}
          aria-haspopup="menu"
          aria-expanded={Boolean(menuAnchor)}
          disabled={loading || downloading}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
        >
          {downloading ? <CircularProgress size={18} /> : <FileDownloadIcon fontSize="small" />}
        </DuncitIconButton>
      </Tooltip>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {DOWNLOAD_OPTIONS.map((option) => (
          <MenuItem
            key={option.labelKey}
            disabled={option.scope === 'all' && total === 0}
            onClick={() => download(option.scope, option.format)}
          >
            {t(option.labelKey)}
          </MenuItem>
        ))}
      </Menu>
      {apiSource ? (
        <>
          <Tooltip title={t('shell.table.getApi')}>
            <DuncitIconButton
              size="small"
              aria-label={t('shell.table.getApi')}
              aria-haspopup="dialog"
              disabled={loading}
              onClick={() => setApiOpen(true)}
            >
              <ApiIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
          <TableApiDialog open={apiOpen} onClose={() => setApiOpen(false)} source={apiSource} query={query} />
        </>
      ) : null}
    </>
  );
}
