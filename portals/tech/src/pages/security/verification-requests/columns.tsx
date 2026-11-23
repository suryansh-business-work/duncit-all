import { Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { rowMenuColumn, type DuncitColumn, type Translate } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import {
  LOCATION_ERROR_KEY,
  REQUEST_STATUS_COLOR,
  REQUEST_STATUS_KEY,
  enumLabel,
  enumOptions,
  orDash,
  timeOf,
} from '../labels';
import type { RequestRow } from './queries';

/** Chooses a request to decide, and which way. */
export type DecideHandler = (request: RequestRow, approve: boolean) => void;

/**
 * Who decided and when. Empty until somebody does, so a pending row reads as a
 * dash rather than as a decision that has been lost.
 */
const renderDecided = (t: Translate) => (row: RequestRow) => (
  <Stack sx={{ minWidth: 0 }}>
    <Typography variant="body2" noWrap>
      {timeOf(row.decided_at)}
    </Typography>
    {row.decided_by_name && (
      <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
        {t('tech.verificationRequests.decidedBy', { vars: { name: row.decided_by_name } })}
      </Typography>
    )}
  </Stack>
);

/**
 * The request table's columns.
 *
 * Person, reason and the decision are shown but not offered as filters: the
 * server filters on portal, status and date only, and a control it silently
 * ignores would read as a filter that matched nothing. Only a request that is
 * still waiting has actions — a decided one cannot be decided again.
 */
export function buildRequestColumns(t: Translate, onDecide: DecideHandler): DuncitColumn<RequestRow>[] {
  return [
    {
      field: 'created_at',
      headerName: t('tech.verificationRequests.colRequested'),
      width: 190,
      type: 'date',
      valueGetter: (row) => timeOf(row.created_at),
    },
    {
      field: 'user_name',
      headerName: t('tech.verificationRequests.colPerson'),
      flex: 1,
      minWidth: 180,
      type: 'text',
      filterable: false,
      valueGetter: (row) => orDash(row.user_name),
    },
    { field: 'portal_key', headerName: t('tech.verificationRequests.colPortal'), width: 140, type: 'text' },
    {
      field: 'reason',
      headerName: t('tech.verificationRequests.colReason'),
      flex: 2,
      minWidth: 260,
      type: 'text',
      sortable: false,
      filterable: false,
    },
    {
      field: 'status',
      headerName: t('shell.common.status'),
      width: 140,
      type: 'enum',
      options: enumOptions(t, REQUEST_STATUS_KEY),
      cellRenderer: (row) => (
        <StatusChip
          status={row.status}
          colorMap={REQUEST_STATUS_COLOR}
          label={enumLabel(t, REQUEST_STATUS_KEY, row.status)}
        />
      ),
      valueGetter: (row) => enumLabel(t, REQUEST_STATUS_KEY, row.status),
    },
    {
      field: 'location_error',
      headerName: t('tech.verificationRequests.colLocationProblem'),
      flex: 1,
      minWidth: 240,
      type: 'text',
      sortable: false,
      filterable: false,
      valueGetter: (row) => enumLabel(t, LOCATION_ERROR_KEY, row.location_error),
    },
    {
      field: 'decided_at',
      headerName: t('tech.verificationRequests.colDecided'),
      width: 200,
      type: 'date',
      sortable: false,
      filterable: false,
      cellRenderer: renderDecided(t),
    },
    {
      field: 'decision_note',
      headerName: t('tech.verificationRequests.colNote'),
      flex: 1,
      minWidth: 220,
      type: 'text',
      sortable: false,
      filterable: false,
      valueGetter: (row) => orDash(row.decision_note),
    },
    rowMenuColumn<RequestRow>({
      headerName: t('shell.common.actions'),
      width: 90,
      ariaLabel: (row) => t('tech.verificationRequests.rowMenu', { vars: { name: orDash(row.user_name) } }),
      items: (row) =>
        row.status === 'PENDING'
          ? [
              {
                key: 'approve',
                label: t('tech.verificationRequests.approve'),
                icon: <CheckIcon fontSize="small" />,
                onClick: () => onDecide(row, true),
              },
              {
                key: 'reject',
                label: t('tech.verificationRequests.reject'),
                icon: <CloseIcon fontSize="small" />,
                destructive: true,
                onClick: () => onDecide(row, false),
              },
            ]
          : [],
    }),
  ];
}
