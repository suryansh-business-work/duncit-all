import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';
import { CHALLENGE_NOTIFICATIONS, type NotificationRow } from '../../graphql/pod-challenges';

const rowId = (r: NotificationRow) => r.id;
const searchOf = (r: NotificationRow) => `${r.challenge_name} ${r.pod_title}`;

/**
 * Challenge Portal > Notifications: what each challenge told its attendees.
 * Per-message delivery (sent, failed, why) lives in the Communications
 * Portal's WhatsApp and email logs; this is the challenge-side summary.
 */
export default function NotificationsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(CHALLENGE_NOTIFICATIONS, { fetchPolicy: 'cache-and-network' });
  const columns = useMemo<DuncitColumn<NotificationRow>[]>(
    () => [
      dateColumn<NotificationRow>({ field: 'last_sent_at', headerName: t('challenge.notices.colWhen'), hide: false, width: 170 }),
      { field: 'challenge_name', headerName: t('challenge.notices.colChallenge'), type: 'text', flex: 1, minWidth: 200 },
      { field: 'pod_title', headerName: t('challenge.notices.colPod'), type: 'text', flex: 1, minWidth: 200 },
      {
        field: 'kind',
        headerName: t('challenge.notices.colKind'),
        type: 'text',
        width: 170,
        valueGetter: (r) => t(r.kind === 'RESULT' ? 'challenge.notices.kindResult' : 'challenge.notices.kindLive'),
      },
      { field: 'recipients', headerName: t('challenge.notices.colRecipients'), type: 'number', width: 130 },
      { field: 'whatsapp', headerName: t('challenge.notices.colWhatsapp'), type: 'number', width: 130 },
      { field: 'email', headerName: t('challenge.notices.colEmail'), type: 'number', width: 110 },
    ],
    [t]
  );
  const rows = data?.challengeNotifications;
  const fetchRows = useMemo(() => clientTableFetch<NotificationRow>(rows ?? [], searchOf, columns), [rows, columns]);

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <NotificationsIcon color="primary" />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
          {t('challenge.notices.title')}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('challenge.notices.subtitle')}
      </Typography>
      {loading && !rows && <LinearProgress aria-label={t('challenge.notices.loading')} />}
      {error && !rows && <Alert severity="error">{t('challenge.notices.loadError')}</Alert>}
      {rows && (
        <DuncitTable<NotificationRow>
          ariaLabel={t('challenge.notices.title')}
          tableId="challenge-portal-notifications"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={rowId}
          emptyText={t('challenge.notices.empty')}
          searchPlaceholder={t('challenge.notices.search')}
          defaultSort={{ field: 'last_sent_at', dir: 'desc' }}
        />
      )}
    </Stack>
  );
}
