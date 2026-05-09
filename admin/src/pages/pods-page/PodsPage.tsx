import { useMemo, useState } from 'react';
import { notifyError } from '../../components/notify';
import { useMutation, useQuery } from '@apollo/client';
import { useSearchParams } from 'react-router-dom';
import { Alert, Snackbar, Stack } from '@mui/material';
import {
  PODS,
  CLUBS,
  LOCATIONS,
  USERS,
  FINANCE_FOR_PODS,
  CREATE,
  UPDATE,
  DELETE,
  PodForm,
} from './queries';
import { blankForm, buildEditValues, buildPayload } from './helpers';
import PodsTable from './PodsTable';
import PodFormDialog from './PodFormDialog';
import PodsToolbar from './PodsToolbar';

export default function PodsPage() {
  const [params, setParams] = useSearchParams();
  const clubFilter = params.get('club_id') ?? '';
  const [search, setSearch] = useState('');

  const { data, loading, error, refetch } = useQuery(PODS, {
    variables: {
      filter: {
        club_id: clubFilter || undefined,
        search: search || undefined,
      },
    },
    fetchPolicy: 'cache-and-network',
  });
  const { data: clubsData } = useQuery(CLUBS);
  const { data: locsData } = useQuery(LOCATIONS);
  const { data: usersData } = useQuery(USERS);
  const { data: financeData } = useQuery(FINANCE_FOR_PODS, { fetchPolicy: 'cache-first' });

  const [createMut] = useMutation(CREATE);
  const [updateMut] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);

  const [open, setOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<PodForm>(blankForm);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const clubs = clubsData?.clubs ?? [];
  const locations = locsData?.locations ?? [];
  const users = usersData?.users ?? [];

  const clubName = (id: string) => clubs.find((c: any) => c.id === id)?.club_name ?? '—';
  const locName = (id: string) => locations.find((l: any) => l.id === id)?.location_name ?? '—';
  const userName = (id: string) =>
    users.find((u: any) => u.user_id === id)?.full_name ??
    users.find((u: any) => u.user_id === id)?.email ??
    id.slice(0, 6);

  const openCreate = () => {
    setInitialValues({ ...blankForm, club_id: clubFilter || '' });
    setOpError(null);
    setOpen(true);
  };
  const openEdit = (p: any) => {
    setInitialValues(buildEditValues(p));
    setOpError(null);
    setOpen(true);
  };

  const submit = async (values: PodForm) => {
    setBusy(true);
    setOpError(null);
    try {
      const payload = buildPayload(values);
      if (values.id) {
        await updateMut({
          variables: { id: values.id, input: { ...payload, is_active: values.is_active } },
        });
      } else {
        await createMut({
          variables: { input: { ...payload, pod_id: values.pod_id || undefined } },
        });
      }
      setToast('Saved');
      setOpen(false);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: any) => {
    if (!confirm(`Delete pod "${p.pod_title}"?`)) return;
    try {
      await deleteMut({ variables: { id: p.id } });
      setToast('Deleted');
      await refetch();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const filteredLocations = useMemo(() => {
    const club = clubs.find((c: any) => c.id === initialValues.club_id);
    if (!club || !club.meetup_venues_id?.length) return locations;
    const venueSet = new Set(club.meetup_venues_id);
    return locations.filter(
      (l: any) => venueSet.has(l.location_id) || venueSet.has(l.id)
    );
  }, [locations, clubs, initialValues.club_id]);

  const selectedLocation = useMemo(
    () => locations.find((l: any) => l.id === initialValues.location_id),
    [locations, initialValues.location_id]
  );
  const zoneOptions: string[] =
    selectedLocation?.location_zones?.map((z: any) => z.zone_name) ?? [];

  return (
    <Stack spacing={3}>
      <PodsToolbar
        clubs={clubs}
        clubFilter={clubFilter}
        setClubFilter={(v) => (v ? setParams({ club_id: v }) : setParams({}))}
        search={search}
        setSearch={setSearch}
        onCreate={openCreate}
      />

      {error && <Alert severity="error">{error.message}</Alert>}

      <PodsTable
        loading={loading}
        pods={data?.pods ?? []}
        clubName={clubName}
        locName={locName}
        onEdit={openEdit}
        onDelete={remove}
      />

      <PodFormDialog
        open={open}
        onClose={() => setOpen(false)}
        initialValues={initialValues}
        busy={busy}
        opError={opError}
        clubs={clubs}
        filteredLocations={filteredLocations}
        zoneOptions={zoneOptions}
        users={users}
        userName={userName}
        onSubmit={submit}
        finance={financeData?.publicFinanceSettings}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
