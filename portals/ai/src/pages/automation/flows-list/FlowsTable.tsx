import { useMemo } from 'react';
import { Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitIconButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import { DuncitTable, actionsColumn, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';
import { useTranslation, type Translate } from '@duncit/shell';
import { FLOW_STATUS_KEYS, TRIGGER_LABEL_KEYS } from '../node-kinds';
import type { AutomationChannel, AutomationFlow } from '../types';

interface Props {
  channel: AutomationChannel;
  rows: readonly AutomationFlow[];
  onOpen: (flow: AutomationFlow) => void;
  onDuplicate: (flow: AutomationFlow) => void;
  onDelete: (flow: AutomationFlow) => void;
}

const getRowId = (row: AutomationFlow) => row.id;

const STATUS_COLORS = { DRAFT: 'default', ACTIVE: 'success', PAUSED: 'warning' } as const;

const statusOptions = (t: Translate) =>
  Object.entries(FLOW_STATUS_KEYS).map(([value, key]) => ({ value, label: t(key) }));

const triggerOptions = (t: Translate, channel: AutomationChannel) =>
  Object.entries(TRIGGER_LABEL_KEYS)
    .filter(([value]) => (channel === 'WHATSAPP' ? value !== 'INBOUND_EMAIL' : value !== 'INBOUND_MESSAGE'))
    .map(([value, key]) => ({ value, label: t(key) }));

const renderName = (row: AutomationFlow) => (
  <div>
    <Typography variant="body2" noWrap title={row.name}>
      {row.name}
    </Typography>
    {row.description ? (
      <Typography variant="caption" noWrap title={row.description} sx={{ color: 'text.secondary', display: 'block' }}>
        {row.description}
      </Typography>
    ) : null}
  </div>
);

export default function FlowsTable({ channel, rows, onOpen, onDuplicate, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<AutomationFlow>[]>(
    () => [
      { field: 'name', headerName: t('ai.automation.list.colName'), flex: 1, minWidth: 220, type: 'text', cellRenderer: renderName, valueGetter: (row) => row.name },
      {
        field: 'status',
        headerName: t('ai.automation.list.colStatus'),
        width: 120,
        type: 'enum',
        options: statusOptions(t),
        valueGetter: (row) => row.status,
        cellRenderer: (row) => (
          <StatusChip size="small" status={row.status} colorMap={STATUS_COLORS} label={t(FLOW_STATUS_KEYS[row.status])} />
        ),
      },
      {
        field: 'trigger',
        headerName: t('ai.automation.list.colTrigger'),
        width: 220,
        type: 'enum',
        options: triggerOptions(t, channel),
        valueGetter: (row) => row.trigger,
        cellRenderer: (row) => {
          const key = TRIGGER_LABEL_KEYS[row.trigger];
          return <span>{key ? t(key) : t('ai.automation.trigger.none')}</span>;
        },
      },
      { field: 'run_count', headerName: t('ai.automation.list.colRuns'), width: 90, type: 'number', valueGetter: (row) => row.run_count },
      dateColumn<AutomationFlow>({ field: 'last_run_at', headerName: t('ai.automation.list.colLastRun'), width: 165, hide: false }),
      dateColumn<AutomationFlow>({ field: 'updated_at', headerName: t('ai.automation.list.colUpdated'), width: 165, hide: false }),
      actionsColumn<AutomationFlow>({
        width: 140,
        onEdit: onOpen,
        onDelete,
        edit: { title: t('ai.automation.list.open'), ariaLabel: (row) => t('ai.automation.list.actionsFor', { vars: { name: row.name } }) },
        renderExtra: (row) => (
          <Tooltip title={t('ai.automation.list.duplicate')}>
            <span>
              <DuncitIconButton size="small" aria-label={t('ai.automation.list.duplicate')} onClick={() => onDuplicate(row)}>
                <ContentCopyIcon fontSize="small" />
              </DuncitIconButton>
            </span>
          </Tooltip>
        ),
      }),
    ],
    [t, channel, onOpen, onDuplicate, onDelete]
  );

  const fetchRows = useMemo(
    () => clientTableFetch(rows, (row) => `${row.name} ${row.description} ${row.trigger}`, columns),
    [rows, columns]
  );

  return (
    <DuncitTable
      tableId={`automation-flows-${channel.toLowerCase()}`}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText={t('ai.automation.list.empty')}
      searchPlaceholder={t('ai.automation.list.search')}
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      ariaLabel={channel === 'WHATSAPP' ? t('ai.automation.list.titleWhatsapp') : t('ai.automation.list.titleEmail')}
    />
  );
}
