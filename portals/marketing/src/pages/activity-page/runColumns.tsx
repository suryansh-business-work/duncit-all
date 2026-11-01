import { Tooltip } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { actionsColumn, dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { enumOptions } from '../social-accounts-page/copy';
import {
  ACTOR_KINDS,
  ACTOR_KIND_LABEL,
  STATUSES,
  STATUS_LABEL,
  TRIGGERS,
  TRIGGER_LABEL,
  WORKFLOWS,
  WORKFLOW_LABEL,
} from './copy';
import type { MarketingRunRow } from './queries';
import { actorLabel, durationMs, formatDuration, type Translate } from './runFormat';
import RunStatusChip from './RunStatusChip';

type FormatDateTime = (value: Date) => string;

interface OpenRunButtonProps {
  title: string;
  onClick: () => void;
}

/** The keyboard way into a row's details; clicking the row itself does the same. */
function OpenRunButton({ title, onClick }: Readonly<OpenRunButtonProps>) {
  return (
    <Tooltip title={title}>
      <DuncitIconButton size="small" aria-label={title} onClick={onClick} data-testid="open-run">
        <VisibilityOutlinedIcon fontSize="small" />
      </DuncitIconButton>
    </Tooltip>
  );
}

/**
 * Every run, with what it was, how it went and who ran it. Only the fields
 * the server orders by are sortable (created_at, finished_at, status,
 * workflow); the rest filter where the server can match them.
 */
export function getRunColumns(
  t: Translate,
  formatDateTime: FormatDateTime,
  onOpen: (row: MarketingRunRow) => void,
): DuncitColumn<MarketingRunRow>[] {
  const took = (row: MarketingRunRow) => {
    const ms = durationMs(row.started_at, row.finished_at);
    return ms === null ? EM_DASH : formatDuration(ms, t);
  };
  return [
    {
      field: 'name',
      headerName: t('marketing.runs.colName'),
      type: 'text',
      flex: 1,
      minWidth: 240,
      sortable: false,
      filterable: false,
    },
    {
      field: 'workflow',
      headerName: t('marketing.runs.colWorkflow'),
      type: 'enum',
      options: enumOptions(WORKFLOWS, WORKFLOW_LABEL, t),
      width: 160,
      valueGetter: (row) => t(WORKFLOW_LABEL[row.workflow]),
    },
    {
      field: 'status',
      headerName: t('marketing.runs.colStatus'),
      type: 'enum',
      options: enumOptions(STATUSES, STATUS_LABEL, t),
      width: 160,
      cellRenderer: (row) => <RunStatusChip status={row.status} />,
      valueGetter: (row) => t(STATUS_LABEL[row.status]),
    },
    {
      field: 'actor_kind',
      headerName: t('marketing.runs.colActor'),
      type: 'enum',
      options: enumOptions(ACTOR_KINDS, ACTOR_KIND_LABEL, t),
      width: 170,
      sortable: false,
      valueGetter: (row) => actorLabel(row.actor, t),
    },
    {
      field: 'trigger',
      headerName: t('marketing.runs.colTrigger'),
      type: 'enum',
      options: enumOptions(TRIGGERS, TRIGGER_LABEL, t),
      width: 140,
      sortable: false,
      valueGetter: (row) => t(TRIGGER_LABEL[row.trigger]),
    },
    dateColumn<MarketingRunRow>({
      field: 'started_at',
      headerName: t('marketing.runs.colStarted'),
      hide: false,
      width: 170,
      sortable: false,
      filterable: false,
      formatDate: formatDateTime,
    }),
    dateColumn<MarketingRunRow>({
      field: 'finished_at',
      headerName: t('marketing.runs.colFinished'),
      hide: false,
      width: 170,
      filterable: false,
      formatDate: formatDateTime,
    }),
    {
      field: 'duration',
      headerName: t('marketing.runs.colDuration'),
      type: 'text',
      width: 110,
      sortable: false,
      filterable: false,
      valueGetter: took,
    },
    // The key the server pages by. Hidden, so the two times above stay the ones a reader sees.
    dateColumn<MarketingRunRow>({ field: 'created_at', headerName: t('marketing.runs.colCreated'), formatDate: formatDateTime }),
    actionsColumn<MarketingRunRow>({
      width: 80,
      renderExtra: (row) => <OpenRunButton title={t('marketing.runs.openRun')} onClick={() => onOpen(row)} />,
    }),
  ];
}
