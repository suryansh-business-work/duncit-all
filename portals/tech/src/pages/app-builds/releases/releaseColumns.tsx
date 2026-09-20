import { Chip, Tooltip } from '@mui/material';
import type { useTranslation } from '@duncit/shell';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import { humanState, isOpen, type ReleaseStore, type StoreReleaseRow, type StoreReleaseStatus } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];
type ChipColor = 'default' | 'info' | 'success' | 'warning' | 'error';

/** Every status the table can show, with its copy key — literal, so the localization gate can read it. */
export const STATUS_KEY: Record<StoreReleaseStatus, string> = {
  PREPARING: 'tech.appBuilds.releaseStatusPreparing',
  WAITING: 'tech.appBuilds.releaseStatusWaiting',
  IN_REVIEW: 'tech.appBuilds.releaseStatusInReview',
  APPROVED: 'tech.appBuilds.releaseStatusApproved',
  LIVE: 'tech.appBuilds.releaseStatusLive',
  TESTING: 'tech.appBuilds.releaseStatusTesting',
  ROLLING_OUT: 'tech.appBuilds.releaseStatusRollingOut',
  HALTED: 'tech.appBuilds.releaseStatusHalted',
  REJECTED: 'tech.appBuilds.releaseStatusRejected',
  WITHDRAWN: 'tech.appBuilds.releaseStatusWithdrawn',
  REPLACED: 'tech.appBuilds.releaseStatusReplaced',
  REMOVED: 'tech.appBuilds.releaseStatusRemoved',
  OTHER: 'tech.appBuilds.releaseStatusOther',
};

export const STATUS_COLOR: Record<StoreReleaseStatus, ChipColor> = {
  PREPARING: 'default',
  WAITING: 'info',
  IN_REVIEW: 'info',
  APPROVED: 'success',
  LIVE: 'success',
  TESTING: 'info',
  ROLLING_OUT: 'warning',
  HALTED: 'warning',
  REJECTED: 'error',
  WITHDRAWN: 'default',
  REPLACED: 'default',
  REMOVED: 'default',
  OTHER: 'default',
};

const STATUSES = Object.keys(STATUS_KEY) as StoreReleaseStatus[];

/** The status chip: the folded status in colour, the store's own word in the tooltip. */
export const StatusChip = ({ row, label }: Readonly<{ row: Pick<StoreReleaseRow, 'status' | 'state'>; label: string }>) => (
  <Tooltip title={humanState(row.state)}>
    <Chip
      size="small"
      color={STATUS_COLOR[row.status]}
      variant={row.status === 'LIVE' || row.status === 'REJECTED' ? 'filled' : 'outlined'}
      label={label}
    />
  </Tooltip>
);

/** What the issue cell says: open rejection in red, an awaiting release in green, a closed one greyed. */
function issueChip(row: StoreReleaseRow, t: Translate) {
  const { issue } = row;
  if (!issue) return null;
  const open = isOpen(issue);
  const kind = t(issue.kind === 'REJECTION' ? 'tech.appBuilds.releaseIssueRejection' : 'tech.appBuilds.releaseIssueAwaiting');
  const label = open ? kind : t('tech.appBuilds.releaseIssueResolvedShort', { vars: { kind } });
  let color: ChipColor = 'default';
  if (open) color = issue.kind === 'REJECTION' ? 'error' : 'success';
  const tip = issue.advice?.summary || issue.reviewer_message || humanState(issue.state);
  return (
    <Tooltip title={tip}>
      <Chip size="small" color={color} variant={open ? 'filled' : 'outlined'} label={label} />
    </Tooltip>
  );
}

/** The Releases table's columns. Apple and Play share the shape; each hides the other's columns. */
export function makeReleaseColumns(t: Translate, store: ReleaseStore): DuncitColumn<StoreReleaseRow>[] {
  const apple = store === 'APP_STORE';
  return [
    dateColumn<StoreReleaseRow>({
      field: 'created_at',
      headerName: t('tech.appBuilds.releaseColCreated'),
      width: 165,
      hide: !apple,
    }),
    {
      field: 'version',
      headerName: t('tech.appBuilds.colVersion'),
      width: 120,
      type: 'text',
      valueGetter: (row) => row.version || '—',
    },
    {
      field: 'build_number',
      headerName: t('tech.appBuilds.releaseColBuild'),
      width: 130,
      type: 'text',
      valueGetter: (row) => row.build_number || '—',
    },
    {
      field: 'status',
      headerName: t('tech.appBuilds.colStatus'),
      width: 150,
      type: 'enum',
      options: STATUSES.map((status) => ({ value: status, label: t(STATUS_KEY[status]) })),
      cellRenderer: (row) => <StatusChip row={row} label={t(STATUS_KEY[row.status])} />,
      valueGetter: (row) => row.status,
    },
    {
      field: 'state',
      headerName: t('tech.appBuilds.releaseColStoreState'),
      minWidth: 190,
      type: 'text',
      valueGetter: (row) => humanState(row.state),
    },
    {
      field: 'review_state',
      headerName: t('tech.appBuilds.releaseColReview'),
      width: 160,
      type: 'text',
      hide: !apple,
      valueGetter: (row) => (row.review_state ? humanState(row.review_state) : '—'),
    },
    dateColumn<StoreReleaseRow>({
      field: 'submitted_at',
      headerName: t('tech.appBuilds.releaseColSubmitted'),
      width: 165,
      hide: !apple,
    }),
    {
      field: 'track',
      headerName: t('tech.appBuilds.releaseColTrack'),
      width: 150,
      type: 'text',
      hide: apple,
      valueGetter: (row) =>
        row.rollout_pct === null ? row.track || '—' : `${row.track} · ${row.rollout_pct}%`,
    },
    {
      field: 'issue.state',
      headerName: t('tech.appBuilds.releaseColIssue'),
      minWidth: 200,
      type: 'text',
      cellRenderer: (row) => issueChip(row, t),
      valueGetter: (row) => row.issue?.advice?.summary ?? row.issue?.state ?? '',
    },
    {
      field: 'issue.resubmitted_build_no',
      headerName: t('tech.appBuilds.releaseColResubmitted'),
      width: 150,
      type: 'text',
      valueGetter: (row) => row.issue?.resubmitted_build_no || '—',
    },
    {
      field: 'build_no',
      headerName: t('tech.appBuilds.releaseColBuildRow'),
      width: 150,
      type: 'text',
      valueGetter: (row) => row.build_no || '—',
    },
  ];
}
