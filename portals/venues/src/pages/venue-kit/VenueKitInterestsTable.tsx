import { useMemo, type MutableRefObject } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Chip, MenuItem, TextField } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useDateFormat } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import type { VenueKitInterestStatus } from '@duncit/gql-types';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { parseApiError } from '@duncit/utils';
import { SET_VENUE_KIT_INTEREST_STATUS, VENUE_KIT_INTERESTS_TABLE, type InterestRow } from './queries';

/** The follow-up states, in the order the team moves a venue through them. */
export const INTEREST_STATUSES: readonly VenueKitInterestStatus[] = ['NEW', 'CONTACTED', 'CONVERTED', 'NOT_INTERESTED'];
const SOURCES = ['WEBSITE', 'VENUES_PORTAL'] as const;

interface Props {
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Called after a status moves, so the counts above the table follow. */
  onChanged: () => void;
}

interface StatusSelectProps {
  row: InterestRow;
  labels: Record<VenueKitInterestStatus, string>;
  onPick: (row: InterestRow, status: VenueKitInterestStatus) => void;
}

/** The status cell: where the team records how far it has taken the venue. */
function StatusSelect({ row, labels, onPick }: Readonly<StatusSelectProps>) {
  const { t } = useTranslation();
  return (
    <TextField
      select
      size="small"
      variant="standard"
      value={row.status}
      onChange={(event) => {
        const next = INTEREST_STATUSES.find((status) => status === event.target.value);
        if (next) onPick(row, next);
      }}
      slotProps={{ htmlInput: { 'aria-label': `${t('venueKit.console.columns.status')}: ${row.name}` } }}
    >
      {INTEREST_STATUSES.map((status) => (
        <MenuItem key={status} value={status}>
          {labels[status]}
        </MenuItem>
      ))}
    </TextField>
  );
}

const getRowId = (row: InterestRow) => row.id;

/** Every venue that registered interest in the Venue Kit, paged and searched on the server. */
export default function VenueKitInterestsTable({ refetchRef, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();
  const fetchRows = useApolloTableFetch<InterestRow>(client, VENUE_KIT_INTERESTS_TABLE, 'venueKitInterestsTable');
  const [setStatus] = useMutation(SET_VENUE_KIT_INTEREST_STATUS);

  const columns = useMemo<DuncitColumn<InterestRow>[]>(() => {
    const statusLabels = Object.fromEntries(
      INTEREST_STATUSES.map((s) => [s, t(`venueKit.console.statuses.${s}`)])
    ) as Record<VenueKitInterestStatus, string>;
    const sourceLabels = Object.fromEntries(SOURCES.map((s) => [s, t(`venueKit.console.sources.${s}`)]));
    const col = (key: string) => t(`venueKit.console.columns.${key}`);

    const pick = (row: InterestRow, status: VenueKitInterestStatus) => {
      if (status === row.status) return;
      setStatus({ variables: { input: { id: row.id, status } } })
        .then(() => {
          notifySuccess(t('venueKit.console.statusUpdated'));
          refetchRef.current?.();
          onChanged();
        })
        .catch((err: unknown) => {
          const reason = parseApiError(err);
          notifyError(reason);
          logs.portal.venues.warn('venueKit', 'setStatus', { msg: 'Venue Kit status change failed', reason });
        });
    };

    return [
      { field: 'name', headerName: col('name'), type: 'text', filterable: false, flex: 1, minWidth: 180 },
      { field: 'email', headerName: col('email'), type: 'text', filterable: false, minWidth: 220 },
      {
        field: 'phone_number',
        headerName: col('phone'),
        type: 'text',
        filterable: false,
        minWidth: 150,
        valueGetter: (row) => `${row.phone_extension} ${row.phone_number}`,
      },
      {
        field: 'phone_verified',
        headerName: col('phoneVerified'),
        type: 'text',
        filterable: false,
        sortable: false,
        minWidth: 150,
        valueGetter: (row) => (row.phone_verified ? t('shell.common.yes') : t('shell.common.no')),
        cellRenderer: (row) =>
          row.phone_verified ? (
            <Chip size="small" color="success" icon={<VerifiedIcon />} label={t('shell.common.yes')} />
          ) : (
            <Chip size="small" variant="outlined" label={t('shell.common.no')} />
          ),
      },
      {
        field: 'source',
        headerName: col('source'),
        type: 'enum',
        options: SOURCES.map((s) => ({ value: s, label: sourceLabels[s] })),
        minWidth: 150,
        valueGetter: (row) => sourceLabels[row.source],
      },
      {
        field: 'status',
        headerName: col('status'),
        type: 'enum',
        options: INTEREST_STATUSES.map((s) => ({ value: s, label: statusLabels[s] })),
        minWidth: 170,
        valueGetter: (row) => statusLabels[row.status],
        cellRenderer: (row) => <StatusSelect row={row} labels={statusLabels} onPick={pick} />,
      },
      { field: 'submission_count', headerName: col('submissions'), type: 'number', filterable: false, sortable: false, minWidth: 120 },
      {
        field: 'created_at',
        headerName: col('created'),
        type: 'date',
        minWidth: 190,
        valueGetter: (row) => formatDateTime(row.created_at),
      },
      {
        field: 'last_submitted_at',
        headerName: col('lastSubmitted'),
        type: 'date',
        minWidth: 190,
        valueGetter: (row) => formatDateTime(row.last_submitted_at),
      },
    ];
  }, [formatDateTime, onChanged, refetchRef, setStatus, t]);

  return (
    <DuncitTable<InterestRow>
      ariaLabel={t('venueKit.console.interestsHeading')}
      tableId="venues-venue-kit-interests"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('venueKit.console.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('venueKit.console.search')}
      refetchRef={refetchRef}
    />
  );
}
