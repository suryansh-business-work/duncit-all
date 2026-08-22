import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Box, Button, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useApolloTableFetch } from '@duncit/table';
import { notifyError, useConfirm } from '@duncit/dialogs';
import {
  CREATE_NOTIFICATION,
  DELETE_NOTIFICATION,
  LOCATIONS_FOR_NOTIF,
  NOTIFS_TABLE,
  USERS_FOR_NOTIF,
  AUDIENCE_LISTS_FOR_NOTIF,
  type NotificationRow,
} from './queries';
import { blankForm, type NotifForm } from './helpers';
import NotificationsTable from './NotificationsTable';
import NotificationFormDialog from './NotificationFormDialog';
import { notificationFormSchema, toCreateNotificationInput } from './notification.form';
import { useTranslation } from '@duncit/app-settings';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { data: locsData } = useQuery(LOCATIONS_FOR_NOTIF);
  const { data: usersData } = useQuery(USERS_FOR_NOTIF);
  const { data: listsData } = useQuery(AUDIENCE_LISTS_FOR_NOTIF, {
    fetchPolicy: 'cache-and-network',
  });

  const [createMut] = useMutation(CREATE_NOTIFICATION);
  const [deleteMut] = useMutation(DELETE_NOTIFICATION);
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NotifForm>(blankForm);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const locations = locsData?.locations ?? [];
  const users = usersData?.users ?? [];
  const audienceLists = listsData?.audienceLists ?? [];
  const locName = useCallback(
    (id?: string | null) =>
      (locsData?.locations ?? []).find((l: any) => l.id === id)?.location_name ?? '—',
    [locsData],
  );
  const locationOptions = useMemo(
    () =>
      (locsData?.locations ?? []).map((l: any) => ({
        value: l.id as string,
        label: l.location_name as string,
      })),
    [locsData],
  );

  const fetchRows = useApolloTableFetch<NotificationRow>(client, NOTIFS_TABLE, 'notificationsTable');

  const openCreate = () => {
    setForm(blankForm);
    setOpError(null);
    setOpen(true);
  };

  const submit = async (values: NotifForm) => {
    setBusy(true);
    setOpError(null);
    try {
      const valid = notificationFormSchema.parse(values);
      const payload = toCreateNotificationInput(valid);
      const res = await createMut({ variables: { input: payload } });
      const c = res.data?.createNotification;
      setToast(`Sent · delivered ${c?.delivered_count ?? 0} · failed ${c?.failed_count ?? 0}`);
      setOpen(false);
      refetchRef.current?.();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (n: NotificationRow) => {
    const ok = await confirm({
      title: t('marketing.notifications.deleteNotification'),
      message: `Delete notification "${n.title}"?`,
      destructive: true,
      confirmLabel: t('shell.common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { id: n.id } });
      setToast(t('shell.common.deleted'));
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <NotificationsActiveIcon color="primary" />
          <Typography variant="h5">{t('shell.nav.notifications')}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Send push + in-app notifications to all users, a city, a zone, or specific users.
        </Typography>
      </Box>

      <NotificationsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        locName={locName}
        locationOptions={locationOptions}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Notification
          </Button>
        }
        onDelete={remove}
      />

      <NotificationFormDialog
        open={open}
        onClose={() => setOpen(false)}
        form={form}
        busy={busy}
        opError={opError}
        onSubmit={submit}
        locations={locations}
        users={users}
        audienceLists={audienceLists}
        totalUsers={users.length}
      />

      <Snackbar
        open={!!toast}
        onClose={() => setToast(null)}
        autoHideDuration={3500}
        message={toast}
      />
    </Stack>
  );
}
