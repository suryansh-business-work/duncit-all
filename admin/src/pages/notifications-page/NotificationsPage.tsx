import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { notifyError } from '../../components/notify';
import {
  CREATE_NOTIFICATION,
  DELETE_NOTIFICATION,
  LOCATIONS_FOR_NOTIF,
  NOTIFS,
  USERS_FOR_NOTIF,
} from './queries';
import { blankForm, type NotifForm } from './helpers';
import NotificationsTable from './NotificationsTable';
import NotificationFormDialog from './NotificationFormDialog';

export default function NotificationsPage() {
  const { data, loading, error, refetch } = useQuery(NOTIFS, {
    variables: { limit: 100 },
    fetchPolicy: 'cache-and-network',
  });
  const { data: locsData } = useQuery(LOCATIONS_FOR_NOTIF);
  const { data: usersData } = useQuery(USERS_FOR_NOTIF);

  const [createMut] = useMutation(CREATE_NOTIFICATION);
  const [deleteMut] = useMutation(DELETE_NOTIFICATION);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NotifForm>(blankForm);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const locations = locsData?.locations ?? [];
  const users = usersData?.users ?? [];
  const locName = (id?: string | null) =>
    locations.find((l: any) => l.id === id)?.location_name ?? '—';
  const selLoc = locations.find((l: any) => l.id === form.location_id);
  const zones: { zone_name: string }[] = selLoc?.location_zones ?? [];

  const openCreate = () => {
    setForm(blankForm);
    setOpError(null);
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setOpError(null);
    try {
      if (!form.title.trim()) throw new Error('Title required');
      if (!form.body.trim()) throw new Error('Body required');
      if (form.scope === 'LOCATION' && !form.location_id) throw new Error('Pick a location');
      if (form.scope === 'ZONE' && (!form.location_id || !form.zone_name))
        throw new Error('Pick location and zone');
      if (form.scope === 'USER' && form.target_user_ids.length === 0)
        throw new Error('Pick at least one user');

      const payload: any = {
        title: form.title,
        body: form.body,
        image_url: form.image_url || null,
        link_url: form.link_url || null,
        scope: form.scope,
        silent: form.silent,
        location_id:
          form.scope === 'GLOBAL' || form.scope === 'USER' ? null : form.location_id,
        zone_name: form.scope === 'ZONE' ? form.zone_name : null,
        target_user_ids: form.scope === 'USER' ? form.target_user_ids : [],
      };
      const res = await createMut({ variables: { input: payload } });
      const c = res.data?.createNotification;
      setToast(`Sent · delivered ${c?.delivered_count ?? 0} · failed ${c?.failed_count ?? 0}`);
      setOpen(false);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (n: any) => {
    if (!confirm(`Delete notification "${n.title}"?`)) return;
    try {
      await deleteMut({ variables: { id: n.id } });
      setToast('Deleted');
      await refetch();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <NotificationsActiveIcon color="primary" />
            <Typography variant="h5">Notifications</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Send push + in-app notifications to all users, a city, a zone, or specific users.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Notification
        </Button>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <NotificationsTable
        loading={loading}
        hasData={!!data}
        notifications={data?.notifications ?? []}
        locName={locName}
        onDelete={remove}
      />

      <NotificationFormDialog
        open={open}
        onClose={() => setOpen(false)}
        form={form}
        setForm={setForm}
        busy={busy}
        opError={opError}
        onSubmit={submit}
        locations={locations}
        zones={zones}
        users={users}
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
