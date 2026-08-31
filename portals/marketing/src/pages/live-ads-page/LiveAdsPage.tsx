import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { ConfirmDialog, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import LiveAdsTable from './LiveAdsTable';
import LiveAdDetailsDialog from './LiveAdDetailsDialog';
import { DELETE_AD_REQUEST, LIVE_ADS_TABLE, STOP_AD_REQUEST } from './queries';
import type { AdRequestRow } from '../ads-approvals-page/helpers';

type Pending = { row: AdRequestRow; action: 'stop' | 'delete' } | null;

type Translate = ReturnType<typeof useTranslation>['t'];

const copy = (t: Translate) => (({
  stop: {
    title: t('marketing.liveAds.stopThisAd2'),
    confirmLabel: t('marketing.liveAds.stopAd'),
    busyLabel: 'Stopping…',
    body: (name: string) =>
      `“${name}” stops showing immediately. The record is kept for billing, and it cannot be restarted — the advertiser would need a new request.`,
  },

  delete: {
    title: t('marketing.liveAds.deleteThisAd2'),
    confirmLabel: t('shell.common.delete'),
    busyLabel: 'Deleting…',
    body: (name: string) => `“${name}” is removed permanently, along with its billing record.`,
  }
}) as const);

/** Everything showing right now, with the two things you need in a hurry:
 * stop it, or remove it. */
export default function LiveAdsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();
  const refetchRef = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState<AdRequestRow | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopAd, { loading: stopping }] = useMutation<any>(STOP_AD_REQUEST);
  const [deleteAd, { loading: deleting }] = useMutation<any>(DELETE_AD_REQUEST);

  const fetchRows = useApolloTableFetch<AdRequestRow>(client, LIVE_ADS_TABLE, 'liveAdsTable');

  const askStop = useCallback((row: AdRequestRow) => setPending({ row, action: 'stop' }), []);
  const askDelete = useCallback((row: AdRequestRow) => setPending({ row, action: 'delete' }), []);

  const busy = stopping || deleting;

  const confirm = async ({ row, action }: NonNullable<Pending>) => {
    setError(null);
    try {
      if (action === 'stop') await stopAd({ variables: { id: row.id } });
      else await deleteAd({ variables: { id: row.id } });
    } catch (e) {
      setError(parseApiError(e, `Could not ${action} the ad`));
      return;
    }
    notifySuccess(action === 'stop' ? `“${row.ad_title}” stopped` : `“${row.ad_title}” deleted`);
    setPending(null);
    setOpen(null);
    refetchRef.current?.();
  };

  const closeConfirm = () => {
    setPending(null);
    setError(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 2
        }}>
        <LiveTvIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            Live Ads
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Everything showing on the app right now. Open a row for the full detail, or stop it here.
          </Typography>
        </Box>
      </Stack>

      <LiveAdsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDate={formatDateTime}
        onOpen={setOpen}
        onStop={askStop}
        onDelete={askDelete}
      />

      <LiveAdDetailsDialog
        ad={open}
        busy={busy}
        formatDateTime={formatDateTime}
        onClose={() => setOpen(null)}
        onStop={askStop}
        onDelete={askDelete}
      />

      {pending && (
        <ConfirmDialog
          open
          title={copy(t)[pending.action].title}
          message={error ?? copy(t)[pending.action].body(pending.row.ad_title)}
          confirmLabel={copy(t)[pending.action].confirmLabel}
          confirmColor={pending.action === 'stop' ? 'warning' : 'error'}
          loading={busy}
          busyLabel={copy(t)[pending.action].busyLabel}
          onClose={closeConfirm}
          onConfirm={() => confirm(pending)}
        />
      )}
    </Box>
  );
}
