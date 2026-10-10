import { useMemo, type ReactNode } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, actionsColumn, activeChipColumn, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';
import type { PresetRow, ToolRow } from '../../graphql/engine';

interface Props {
  rows: PresetRow[];
  tools: ToolRow[];
  onEdit: (preset: PresetRow) => void;
  onDuplicate: (preset: PresetRow) => void;
  toolbarActions?: ReactNode;
}

type Row = PresetRow & { tool_name: string };

const rowId = (r: Row) => r.id;
const searchOf = (r: Row) => `${r.name} ${r.tool_name}`;

/** Every saved tool configuration, with the tool it configures. */
export default function PresetsTable({ rows, tools, onEdit, onDuplicate, toolbarActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const data = useMemo<Row[]>(() => {
    const names = new Map(tools.map((tool) => [tool.id, tool.name]));
    return rows.map((r) => ({ ...r, tool_name: names.get(r.tool_id) ?? '—' }));
  }, [rows, tools]);
  const columns = useMemo<DuncitColumn<Row>[]>(
    () => [
      { field: 'name', headerName: t('challenge.presets.colName'), type: 'text', flex: 1, minWidth: 200 },
      { field: 'tool_name', headerName: t('challenge.presets.colTool'), type: 'text', minWidth: 180 },
      { field: 'version', headerName: t('challenge.tools.colVersion'), type: 'number', width: 110 },
      activeChipColumn<Row>({ width: 120, outlineInactive: true }),
      dateColumn<Row>({ field: 'updated_at', hide: false }),
      actionsColumn<Row>({
        onEdit,
        edit: { ariaLabel: t('challenge.presets.editAria') },
        renderExtra: (r) => (
          <Tooltip title={t('challenge.presets.duplicate')}>
            <IconButton size="small" aria-label={t('challenge.presets.duplicate')} onClick={() => onDuplicate(r)}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      }),
    ],
    [onEdit, onDuplicate, t]
  );
  const fetchRows = useMemo(() => clientTableFetch<Row>(data, searchOf, columns), [data, columns]);

  return (
    <DuncitTable<Row>
      ariaLabel={t('shell.nav.toolPresets')}
      tableId="challenge-portal-presets"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={rowId}
      toolbarActions={toolbarActions}
      emptyText={t('challenge.presets.empty')}
      searchPlaceholder={t('challenge.presets.search')}
      defaultSort={{ field: 'name', dir: 'asc' }}
    />
  );
}
