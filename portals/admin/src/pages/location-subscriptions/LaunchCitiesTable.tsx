import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { Avatar, Stack, Tooltip, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, activeChipColumn, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { SEND_LOCATION_LAUNCH_MESSAGE, type LaunchCityRow } from './queries';

interface Props {
  rows: readonly LaunchCityRow[];
  /** Called once a send has been queued, so the page can re-read the counts. */
  onSent: () => void;
}

interface SendResult {
  sendLocationLaunchMessage: { queued: number };
}

const getRowId = (row: LaunchCityRow) => row.id;
const searchOf = (row: LaunchCityRow) => row.city;

const renderCity = (row: LaunchCityRow) => (
  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
    <Avatar variant="rounded" alt="" src={row.location_image || undefined} sx={{ width: 32, height: 32 }}>
      {row.city.charAt(0)}
    </Avatar>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {row.city}
    </Typography>
  </Stack>
);

interface SendCellProps {
  row: LaunchCityRow;
  onSend: (row: LaunchCityRow) => Promise<void>;
}

/** Send stays disabled, with the reason in its tooltip, until the city is live and someone is waiting. */
function SendLaunchCell({ row, onSend }: Readonly<SendCellProps>) {
  const { t } = useTranslation();
  let blocked = '';
  if (!row.is_launched) {
    blocked = t('admin.locationSubscriptions.sendNeedsLaunch');
  } else if (row.pending_count === 0) {
    blocked = t('admin.locationSubscriptions.sendNothingPending');
  }
  return (
    <Tooltip title={blocked}>
      {/* span keeps the Tooltip working when the button is disabled */}
      <span>
        <DuncitButton
          size="small"
          variant="contained"
          startIcon={<SendIcon fontSize="small" />}
          disabled={Boolean(blocked)}
          onClick={() => onSend(row)}
          data-testid="location-subscriptions-send"
        >
          {t('admin.locationSubscriptions.send')}
        </DuncitButton>
      </span>
    </Tooltip>
  );
}

/** One row per city with subscribers: the totals, and Send for its launch message. */
export default function LaunchCitiesTable({ rows, onSent }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const [sendMut] = useMutation<SendResult>(SEND_LOCATION_LAUNCH_MESSAGE);

  const send = useCallback(
    async (row: LaunchCityRow) => {
      const ok = await confirm({
        title: t('admin.locationSubscriptions.sendTitle'),
        message: t('admin.locationSubscriptions.sendConfirm', {
          count: row.pending_count,
          vars: { city: row.city },
        }),
        destructive: true,
        confirmLabel: t('admin.locationSubscriptions.send'),
      });
      if (!ok) return;
      try {
        const result = await sendMut({ variables: { location_doc_id: row.id } });
        // A resolved send always carries its non-null result; a failure throws instead.
        const { queued } = (result.data as SendResult).sendLocationLaunchMessage;
        notifySuccess(
          t('admin.locationSubscriptions.sendQueued', {
            count: queued,
            vars: { city: row.city },
          })
        );
        onSent();
      } catch (e: any) {
        notifyError(e.message);
      }
    },
    [confirm, sendMut, onSent, t]
  );

  const columns = useMemo<DuncitColumn<LaunchCityRow>[]>(
    () => [
      {
        field: 'city',
        headerName: t('admin.locations.city'),
        type: 'text',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderCity,
        valueGetter: (row) => row.city,
      },
      activeChipColumn<LaunchCityRow>({
        field: 'is_launched',
        headerName: t('admin.locations.launched'),
        width: 140,
        activeLabel: t('admin.locations.launched'),
        inactiveLabel: t('admin.locations.notLaunched'),
        outlineInactive: true,
        filterable: false,
      }),
      {
        field: 'subscriber_count',
        headerName: t('admin.locationSubscriptions.subscribers'),
        type: 'number',
        width: 130,
      },
      {
        field: 'notified_count',
        headerName: t('admin.locationSubscriptions.notified'),
        type: 'number',
        width: 120,
      },
      {
        field: 'pending_count',
        headerName: t('admin.locationSubscriptions.pending'),
        type: 'number',
        width: 120,
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        type: 'actions',
        minWidth: 220,
        cellRenderer: (row) => <SendLaunchCell row={row} onSend={send} />,
      },
    ],
    [send, t]
  );
  // Filters and sort compare each field the way its column's type says.
  const fetchRows = useMemo(
    () => clientTableFetch<LaunchCityRow>(rows, searchOf, columns),
    [rows, columns]
  );

  // The grid only re-reads its fetch on a query change, so fresh counts need a nudge.
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  return (
    <DuncitTable<LaunchCityRow>
      ariaLabel={t('admin.locationSubscriptions.citiesTitle')}
      tableId="admin-location-subscription-cities"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('admin.locationSubscriptions.citiesEmpty')}
      defaultSort={{ field: 'subscriber_count', dir: 'desc' }}
      searchPlaceholder={t('admin.locationSubscriptions.searchCity')}
      refetchRef={refetchRef}
    />
  );
}
