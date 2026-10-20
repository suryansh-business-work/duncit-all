import type { ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import type { Translate } from '../i18n/fallback';
import type { EventRequestRow, EventRequestStatus, EventRequestTarget } from './queries';

/** Every status's label — literal keys, so the translation gate sees each one. */
export const STATUS_KEY: Readonly<Record<EventRequestStatus, string>> = {
  OPEN: 'publicPage.eventRequests.statusOpen',
  ACCEPTED: 'publicPage.eventRequests.statusAccepted',
  COUNTERED: 'publicPage.eventRequests.statusCountered',
  REJECTED: 'publicPage.eventRequests.statusRejected',
  FULFILLED: 'publicPage.eventRequests.statusFulfilled',
  DISMISSED: 'publicPage.eventRequests.statusDismissed',
};

const STATUS_COLOR: Readonly<Record<EventRequestStatus, 'warning' | 'success' | 'info' | 'error' | 'default'>> = {
  OPEN: 'warning',
  ACCEPTED: 'success',
  COUNTERED: 'info',
  REJECTED: 'error',
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
  onUpdate: (row: EventRequestRow, status: 'FULFILLED' | 'DISMISSED') => void;
  /** Replaces the Mark fulfilled / Dismiss buttons — a venue owner answers with Accept / Reject / Counter offer. */
  renderActions?: (row: EventRequestRow) => ReactNode;
}

/** The request list's columns. Sort/filter fields match the server's allowlist. */
export function eventRequestColumns(options: Readonly<EventRequestColumnOptions>): DuncitColumn<EventRequestRow>[] {
  const { t, targetType, showTarget, formatDateTime, busyId, onUpdate, renderActions } = options;
  const renderStatus = (row: EventRequestRow) => (
    <Chip size="small" color={STATUS_COLOR[row.status]} label={t(STATUS_KEY[row.status])} />
  );
  /** The owner's answer: the offered window with its frozen price, and their note. */
  const renderOffer = (row: EventRequestRow) => {
    const offer = row.offer;
    if (!offer && !row.response_note) return null;
    return (
      <Stack spacing={0.25} sx={{ py: 0.5 }}>
        {offer && (
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {t('venuePricing.offer.window', { vars: { when: formatDateTime(new Date(offer.start_at)), pax: offer.pax } })}
          </Typography>
        )}
        {offer?.quote && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('venuePricing.offer.price', {
              vars: { total: formatMoney(offer.quote.total), payout: formatMoney(offer.quote.venue_payout) },
            })}
          </Typography>
        )}
        {row.response_note && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('venuePricing.offer.note', { vars: { note: row.response_note } })}
          </Typography>
        )}
      </Stack>
    );
  };
  const defaultActions = (row: EventRequestRow) =>
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
    {
      field: 'offer',
      headerName: t('publicPage.eventRequests.colOffer'),
      minWidth: 200,
      type: 'text',
      sortable: false,
      filterable: false,
      cellRenderer: renderOffer,
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
      width: renderActions ? 380 : 240,
      cellRenderer: renderActions ?? defaultActions,
    },
  ];
}
