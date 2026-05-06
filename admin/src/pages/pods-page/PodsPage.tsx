import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import {
  PODS,
  CLUBS,
  LOCATIONS,
  USERS,
  FINANCE_FOR_PODS,
  CREATE,
  UPDATE,
  DELETE,
  blankForm,
  linesToMedia,
  toLocalInput,
  PodForm,
} from './queries';
import PodsTable from './PodsTable';
import PodFormDialog from './PodFormDialog';

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
  const [form, setForm] = useState<PodForm>(blankForm);
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
    setForm({ ...blankForm, club_id: clubFilter || '' });
    setOpError(null);
    setOpen(true);
  };
  const openEdit = (p: any) => {
    setForm({
      id: p.id,
      pod_id: p.pod_id,
      pod_title: p.pod_title,
      pod_hosts_id: p.pod_hosts_id ?? [],
      location_id: p.location_id ?? '',
      club_id: p.club_id ?? '',
      zone_name: p.zone_name ?? '',
      pod_hashtag_text: (p.pod_hashtag ?? []).join(' '),
      media_text: (p.pod_images_and_videos ?? []).map((m: any) => m.url).join('\n'),
      pod_description: p.pod_description ?? '',
      pod_date_time: toLocalInput(p.pod_date_time),
      pod_end_date_time: toLocalInput(p.pod_end_date_time),
      pod_type: p.pod_type,
      pod_amount: p.pod_amount ?? 0,
      pod_occurrence: p.pod_occurrence ?? 'ONE_TIME',
      no_of_spots: p.no_of_spots ?? 0,
      pod_info: p.pod_info ?? '',
      is_active: p.is_active,
    });
    setOpError(null);
    setOpen(true);
  };

  const isFree = form.pod_type.endsWith('FREE');
  useEffect(() => {
    if (isFree && form.pod_amount !== 0) setForm((p) => ({ ...p, pod_amount: 0 }));
  }, [isFree]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setBusy(true);
    setOpError(null);
    try {
      if (!form.pod_title.trim()) throw new Error('Title required');
      if (!form.club_id) throw new Error('Select a club');
      if (!form.location_id) throw new Error('Select a location');
      if (form.pod_hosts_id.length === 0) throw new Error('Add at least one host');
      if (!form.pod_date_time) throw new Error('Start date/time required');

      const tags = form.pod_hashtag_text
        .split(/[\s,]+/)
        .map((s) => s.replace(/^#/, '').trim())
        .filter(Boolean);

      const payload: any = {
        pod_title: form.pod_title,
        pod_hosts_id: form.pod_hosts_id,
        location_id: form.location_id,
        club_id: form.club_id,
        zone_name: form.zone_name || null,
        pod_hashtag: tags,
        pod_images_and_videos: linesToMedia(form.media_text),
        pod_description: form.pod_description,
        pod_date_time: new Date(form.pod_date_time).toISOString(),
        pod_end_date_time: form.pod_end_date_time
          ? new Date(form.pod_end_date_time).toISOString()
          : null,
        pod_type: form.pod_type,
        pod_amount: Number(form.pod_amount) || 0,
        pod_occurrence: form.pod_occurrence,
        no_of_spots: Number(form.no_of_spots) || 0,
        pod_info: form.pod_info,
      };

      if (form.id) {
        await updateMut({
          variables: { id: form.id, input: { ...payload, is_active: form.is_active } },
        });
      } else {
        await createMut({
          variables: { input: { ...payload, pod_id: form.pod_id || undefined } },
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
      alert(e.message);
    }
  };

  const filteredLocations = useMemo(() => {
    const club = clubs.find((c: any) => c.id === form.club_id);
    if (!club || !club.meetup_venues_id?.length) return locations;
    const venueSet = new Set(club.meetup_venues_id);
    return locations.filter((l: any) => venueSet.has(l.location_id) || venueSet.has(l.id));
  }, [locations, clubs, form.club_id]);

  const selectedLocation = useMemo(
    () => locations.find((l: any) => l.id === form.location_id),
    [locations, form.location_id]
  );
  const zoneOptions: string[] =
    selectedLocation?.location_zones?.map((z: any) => z.zone_name) ?? [];

  useEffect(() => {
    if (!form.club_id || !form.location_id) return;
    if (!filteredLocations.some((l: any) => l.id === form.location_id)) {
      setForm((p) => ({ ...p, location_id: '', zone_name: '' }));
    }
  }, [form.club_id, filteredLocations]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (form.zone_name && !zoneOptions.includes(form.zone_name)) {
      setForm((p) => ({ ...p, zone_name: '' }));
    }
  }, [form.location_id]); // eslint-disable-line react-hooks/exhaustive-deps

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
            <EventIcon color="primary" />
            <Typography variant="h5">Pods</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Events organised inside a club. Hosts are attendees by default.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <TextField
            size="small"
            select
            label="Club"
            value={clubFilter}
            onChange={(e) => {
              const v = e.target.value;
              if (v) setParams({ club_id: v });
              else setParams({});
            }}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All clubs</MenuItem>
            {clubs.map((c: any) => (
              <MenuItem key={c.id} value={c.id}>
                {c.club_name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            placeholder="Search title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Pod
          </Button>
        </Stack>
      </Stack>

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
        form={form}
        setForm={setForm}
        isFree={isFree}
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
