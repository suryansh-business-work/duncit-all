import { Chip, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import type { Translate } from '../i18n/fallback';
import type { EventRequestRow, EventRequestStatus, EventRequestTarget } from './queries';

/** Every status's label — literal keys, so the translation gate sees each one. */
export const STATUS_KEY: Readonly<Record<EventRequestStatus, string>> = {
  OPEN: 'publicPage.eventRequests.statusOpen',
  FULFILLED: 'publicPage.eventRequests.statusFulfilled',
  DISMISSED: 'publicPage.eventRequests.statusDismissed',
};

const STATUS_COLOR: Readonly<Record<EventRequestStatus, 'warning' | 'success' | 'default'>> = {
  OPEN: 'warning',
  FULFILLED: 'success',
  DISMISSED: 'default',
};

export interface EventRequestColumnOptions {
  t: Translate;
  targetType: EventRequestTarget;
  /** The owner's own host list has one target — themself — so no target column. */
  showTarget: boolean;
  formatDateTime: (value: Date) => string;
  busyId: string | null;
  onUpdate: (row: EventRequestRow, status: Exclude<EventRequestStatus, 'OPEN'>) => void;
}

/** The request list's columns. Sort/filter fields match the server's allowlist. */
export function eventRequestColumns(options: Readonly<EventRequestColumnOptions>): DuncitColumn<EventRequestRow>[] {
  const { t, targetType, showTarget, formatDateTime, busyId, onUpdate } = options;
  const renderStatus = (row: EventRequestRow) => (
    <Chip size="small" color={STATUS_COLOR[row.status]} label={t(STATUS_KEY[row.status])} />
  );
  const renderActions = (row: EventRequestRow) =>
    row.status === 'OPEN' ? (
      <Stack direction="row" spacing={1}>
        <DuncitButton
          size="small"
          variant="outlined"
          disabled={busyId === row.id}
          onClick={() => onUpdate(row, 'FULFILLED')}
          data-testid={`event-request-fulfil-${row.id}`}
        >
          {t('publicPage.eventRequests.markFulfilled')}
        </DuncitButton>
        <DuncitButton
          size="small"
          color="inherit"
          disabled={busyId === row.id}
          onClick={() => onUpdate(row, 'DISMISSED')}
          data-testid={`event-request-dismiss-${row.id}`}
        >
          {t('publicPage.eventRequests.dismiss')}
        </DuncitButton>
      </Stack>
    ) : null;

  const target: DuncitColumn<EventRequestRow>[] = showTarget
    ? [
        {
          field: 'target_name',
          headerName:
            targetType === 'VENUE' ? t('publicPage.eventRequests.colVenue') : t('publicPage.eventRequests.colHost'),
          flex: 1,
          minWidth: 180,
          type: 'text',
        },
      ]
    : [];

  return [
    ...target,
    { field: 'requester_name', headerName: t('publicPage.eventRequests.colRequester'), minWidth: 170, type: 'text' },
    {
      field: 'note',
      headerName: t('publicPage.eventRequests.colNote'),
      flex: 1.5,
      minWidth: 220,
      type: 'text',
      sortable: false,
      filterable: false,
    },
    {
      field: 'status',
      headerName: t('publicPage.eventRequests.colStatus'),
      width: 140,
      type: 'enum',
      options: (Object.keys(STATUS_KEY) as EventRequestStatus[]).map((value) => ({ value, label: t(STATUS_KEY[value]) })),
      cellRenderer: renderStatus,
      valueGetter: (row) => t(STATUS_KEY[row.status]),
    },
    dateColumn<EventRequestRow>({
      field: 'created_at',
      headerName: t('publicPage.eventRequests.colRequested'),
      hide: false,
      minWidth: 180,
      formatDate: formatDateTime,
    }),
    dateColumn<EventRequestRow>({
      field: 'closed_at',
      headerName: t('publicPage.eventRequests.colClosed'),
      minWidth: 180,
      filterable: false,
      formatDate: formatDateTime,
    }),
    {
      field: 'actions',
      headerName: t('publicPage.eventRequests.colActions'),
      type: 'actions',
      width: 240,
      cellRenderer: renderActions,
    },
  ];
}
