import { Stack, Tooltip, Typography } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import { actionsColumn, dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { Translate } from '@duncit/shell';
import { enumOptions } from '../social-accounts-page/copy';
import { PIPELINES, PIPELINE_LABEL, SOURCES, SOURCE_LABEL, STAGES, STAGE_COLORS, STAGE_LABEL } from './copy';
import type { MarketingLeadRow, MarketingLeadStage } from './queries';

type FormatDateTime = (value: Date) => string;

/** The stage as a coloured chip, the same everywhere a stage is shown. */
export function LeadStageChip({ stage, t }: Readonly<{ stage: MarketingLeadStage; t: Translate }>) {
  return <StatusChip size="small" status={stage} colorMap={STAGE_COLORS} label={t(STAGE_LABEL[stage])} />;
}

function NameCell({ row }: Readonly<{ row: MarketingLeadRow }>) {
  return (
    <Stack sx={{ minWidth: 0, justifyContent: 'center', height: '100%' }}>
      <Typography variant="body2" noWrap>
        {row.name}
      </Typography>
      {row.company && (
        <Typography variant="caption" color="text.secondary" noWrap>
          {row.company}
        </Typography>
      )}
    </Stack>
  );
}

function OpenLeadButton({ title, onClick }: Readonly<{ title: string; onClick: () => void }>) {
  return (
    <Tooltip title={title}>
      <DuncitIconButton size="small" aria-label={title} onClick={onClick} data-testid="open-lead">
        <VisibilityOutlinedIcon fontSize="small" />
      </DuncitIconButton>
    </Tooltip>
  );
}

/**
 * Every lead, with what it is, where it stands and who has it. Only the
 * fields the server orders by are sortable (name, score, created, updated);
 * the rest filter where the server can match them.
 */
export function getLeadColumns(t: Translate, formatDateTime: FormatDateTime, onOpen: (row: MarketingLeadRow) => void): DuncitColumn<MarketingLeadRow>[] {
  return [
    {
      field: 'name',
      headerName: t('marketing.leads.colName'),
      type: 'text',
      flex: 1,
      minWidth: 220,
      filterable: false,
      cellRenderer: (row) => <NameCell row={row} />,
      valueGetter: (row) => [row.name, row.company].filter(Boolean).join(' · '),
    },
    {
      field: 'pipeline',
      headerName: t('marketing.leads.colPipeline'),
      type: 'enum',
      options: enumOptions(PIPELINES, PIPELINE_LABEL, t),
      width: 130,
      sortable: false,
      valueGetter: (row) => t(PIPELINE_LABEL[row.pipeline]),
    },
    {
      field: 'stage',
      headerName: t('marketing.leads.colStage'),
      type: 'enum',
      options: enumOptions(STAGES, STAGE_LABEL, t),
      width: 140,
      cellRenderer: (row) => <LeadStageChip stage={row.stage} t={t} />,
      valueGetter: (row) => t(STAGE_LABEL[row.stage]),
    },
    {
      field: 'source',
      headerName: t('marketing.leads.colSource'),
      type: 'enum',
      options: enumOptions(SOURCES, SOURCE_LABEL, t),
      width: 140,
      sortable: false,
      valueGetter: (row) => t(SOURCE_LABEL[row.source]),
    },
    {
      field: 'score',
      headerName: t('marketing.leads.colScore'),
      type: 'number',
      width: 90,
      valueGetter: (row) => (row.score === null ? EM_DASH : String(row.score)),
    },
    {
      field: 'owner',
      headerName: t('marketing.leads.colOwner'),
      type: 'text',
      width: 160,
      sortable: false,
      filterable: false,
      valueGetter: (row) => row.owner_name || t('marketing.leads.unassigned'),
    },
    { field: 'city', headerName: t('marketing.leads.colCity'), type: 'text', width: 130, sortable: false },
    dateColumn<MarketingLeadRow>({ field: 'updated_at', headerName: t('marketing.leads.colUpdated'), hide: false, width: 170, filterable: false, formatDate: formatDateTime }),
    // The key the server pages by. Hidden, so Updated stays the time a reader sees.
    dateColumn<MarketingLeadRow>({ field: 'created_at', headerName: t('marketing.leads.colCreated'), formatDate: formatDateTime }),
    actionsColumn<MarketingLeadRow>({
      width: 80,
      renderExtra: (row) => <OpenLeadButton title={t('marketing.leads.openLead')} onClick={() => onOpen(row)} />,
    }),
  ];
}
