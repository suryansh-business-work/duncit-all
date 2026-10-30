import { useMemo, type RefObject } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import {
  DuncitTable,
  dateColumn,
  entityIdColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import {
  HEALTH_APPEAL_REASONS,
  HEALTH_APPEAL_REASON_KEY,
  HEALTH_APPEAL_STATUSES,
  HEALTH_APPEAL_STATUS_COLOR,
  HEALTH_APPEAL_STATUS_KEY,
} from '@duncit/utils';
import type { HealthAppeal } from '../../graphql/healthAppeals';
import type { AppealDecision } from './appeal-decision-form';
import HealthAppealRowActions from './HealthAppealRowActions';

interface Props {
  fetchRows: TableFetch<HealthAppeal>;
  refetchRef: RefObject<(() => void) | null>;
  /** Admin-configured date + time, so every screen reads the same clock. */
  formatDateTime: (value: Date) => string;
  onDecide: (appeal: HealthAppeal, decision: AppealDecision) => void;
}

const getRowId = (r: HealthAppeal) => r.id;

const TYPE_KEY: Record<HealthAppeal['subject_type'], string> = {
  USER: 'healthAppeals.typeUser',
  VENUE: 'healthAppeals.typeVenue',
};

/** A column whose value is resolved or free text per row — nothing to order or match on. */
const READ_ONLY = { type: 'text' as const, sortable: false, filterable: false };

/**
 * The Legal queue of every appealed health deduction. Newest first, the handle
 * leads — Legal quotes APL-000123 back — and the deduction sits beside what the
 * person said about it, which is the comparison every decision is.
 */
export default function HealthAppealsTable({ fetchRows, refetchRef, formatDateTime, onDecide }: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<HealthAppeal>[]>(() => {
    const renderAccount = (r: HealthAppeal) => (
      <Stack sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
          {r.subject_label}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {t(TYPE_KEY[r.subject_type])}
        </Typography>
      </Stack>
    );

    const renderStatus = (r: HealthAppeal) => (
      <Chip
        size="small"
        variant={r.status === 'PENDING' ? 'outlined' : 'filled'}
        color={HEALTH_APPEAL_STATUS_COLOR[r.status]}
        label={t(HEALTH_APPEAL_STATUS_KEY[r.status])}
      />
    );

    // Sort and filter keys are allowlisted on the server (APPEAL_TABLE_CONFIG).
    return [
      entityIdColumn<HealthAppeal>({ field: 'appeal_no', headerName: t('healthAppeals.colAppealId') }),
      {
        field: 'subject_label',
        headerName: t('healthAppeals.colAccount'),
        flex: 1,
        minWidth: 200,
        type: 'text',
        cellRenderer: renderAccount,
      },
      {
        field: 'subject_type',
        headerName: t('healthAppeals.colType'),
        width: 120,
        type: 'enum',
        hide: true,
        options: (['USER', 'VENUE'] as const).map((value) => ({ value, label: t(TYPE_KEY[value]) })),
        valueGetter: (r) => t(TYPE_KEY[r.subject_type]),
      },
      { field: 'delta', headerName: t('healthAppeals.colDeduction'), width: 100, type: 'number' },
      { field: 'remark', headerName: t('healthAppeals.colRemark'), minWidth: 200, ...READ_ONLY },
      {
        field: 'reason',
        headerName: t('healthAppeals.colReason'),
        minWidth: 180,
        type: 'enum',
        options: HEALTH_APPEAL_REASONS.map((value) => ({ value, label: t(HEALTH_APPEAL_REASON_KEY[value]) })),
        valueGetter: (r) => t(HEALTH_APPEAL_REASON_KEY[r.reason]),
      },
      { field: 'message', headerName: t('healthAppeals.colMessage'), minWidth: 240, ...READ_ONLY },
      { field: 'appellant_name', headerName: t('healthAppeals.colAppellant'), minWidth: 150, ...READ_ONLY },
      {
        field: 'status',
        headerName: t('healthAppeals.colStatus'),
        width: 150,
        type: 'enum',
        options: HEALTH_APPEAL_STATUSES.map((value) => ({ value, label: t(HEALTH_APPEAL_STATUS_KEY[value]) })),
        cellRenderer: renderStatus,
        valueGetter: (r) => t(HEALTH_APPEAL_STATUS_KEY[r.status]),
      },
      dateColumn<HealthAppeal>({
        field: 'created_at',
        headerName: t('healthAppeals.colSubmitted'),
        hide: false,
        minWidth: 180,
        formatDate: formatDateTime,
      }),
      { field: 'decided_by_name', headerName: t('healthAppeals.colDecidedBy'), minWidth: 150, ...READ_ONLY },
      {
        field: 'actions',
        headerName: t('healthAppeals.colActions'),
        type: 'actions',
        width: 110,
        cellRenderer: (r: HealthAppeal) => <HealthAppealRowActions appeal={r} onDecide={onDecide} />,
      },
    ];
  }, [formatDateTime, onDecide, t]);

  return (
    <DuncitTable<HealthAppeal>
      tableId="legal-health-appeals"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('healthAppeals.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('healthAppeals.searchPlaceholder')}
      refetchRef={refetchRef}
    />
  );
}
