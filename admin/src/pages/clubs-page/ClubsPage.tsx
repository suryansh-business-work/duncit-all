import { useState } from 'react';
import { notifyError } from '../../components/notify';
import { useMutation, useQuery } from '@apollo/client';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import {
  CLUBS,
  CATEGORIES,
  CREATE,
  UPDATE,
  DELETE,
  ClubForm,
  blankForm,
  linesToMedia,
} from './queries';
import ClubFormDialog from './ClubFormDialog';

export default function ClubsPage() {
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useQuery(CLUBS, {
    variables: { filter: { search: search || undefined } },
    fetchPolicy: 'cache-and-network',
  });
  const { data: catData } = useQuery(CATEGORIES);
  const [createMut] = useMutation(CREATE);
  const [updateMut] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClubForm>(blankForm);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openCreate = () => {
    setForm({ ...blankForm });
    setOpError(null);
    setOpen(true);
  };
  const openEdit = (c: any) => {
    setForm({
      id: c.id,
      club_id: c.club_id,
      club_name: c.club_name,
      club_description: c.club_description ?? '',
      category_id: c.category_id ?? '',
      super_category_id: c.super_category_id ?? '',
      feature_text: (c.club_feature_images_and_videos ?? [])
        .map((m: any) => m.url)
        .join('\n'),
      moments_text: (c.club_moments ?? []).map((m: any) => m.url).join('\n'),
      meetup_venues_text: (c.meetup_venues_id ?? []).join('\n'),
      community_link: c.club_whats_app_community_link ?? '',
      announcement_link: c.club_whats_app_announcement_link ?? '',
      group_link: c.club_whats_app_group_link ?? '',
      is_active: c.is_active,
    });
    setOpError(null);
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setOpError(null);
    try {
      const payload = {
        club_name: form.club_name,
        club_description: form.club_description,
        club_feature_images_and_videos: linesToMedia(form.feature_text),
        club_moments: linesToMedia(form.moments_text),
        club_whats_app_community_link: form.community_link,
        club_whats_app_announcement_link: form.announcement_link,
        club_whats_app_group_link: form.group_link,
        meetup_venues_id: form.meetup_venues_text
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        category_id: form.category_id || null,
        super_category_id: form.super_category_id || null,
      };
      if (form.id) {
        await updateMut({
          variables: { id: form.id, input: { ...payload, is_active: form.is_active } },
        });
      } else {
        await createMut({
          variables: {
            input: { ...payload, club_id: form.club_id || undefined },
          },
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

  const remove = async (c: any) => {
    if (!confirm(`Delete club "${c.club_name}"?`)) return;
    try {
      await deleteMut({ variables: { id: c.id } });
      setToast('Deleted');
      await refetch();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const subCats = (catData?.categories ?? []).filter((c: any) => c.level === 'SUB');
  const superCats = (catData?.categories ?? []).filter((c: any) => c.level === 'SUPER');
  const allCats = catData?.categories ?? [];
  const catName = (id: string) => allCats.find((c: any) => c.id === id)?.name ?? '—';

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
            <GroupsIcon color="primary" />
            <Typography variant="h5">Clubs</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Manage clubs. Pods are organised inside a club.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <TextField
            size="small"
            placeholder="Search name or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Club
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading && !data ? (
            <Stack alignItems="center" sx={{ p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cover</TableCell>
                  <TableCell>Club</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Venues</TableCell>
                  <TableCell>WhatsApp</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.clubs ?? []).map((c: any) => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Avatar
                        variant="rounded"
                        src={c.club_feature_images_and_videos?.[0]?.url}
                        sx={{ width: 48, height: 48 }}
                      >
                        {c.club_name[0]}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {c.club_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.club_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {c.category_id ? (
                        <Chip size="small" label={catName(c.category_id)} />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {c.meetup_venues_id?.length ?? 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {c.club_whats_app_community_link && (
                          <Chip size="small" label="C" />
                        )}
                        {c.club_whats_app_announcement_link && (
                          <Chip size="small" label="A" />
                        )}
                        {c.club_whats_app_group_link && <Chip size="small" label="G" />}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={c.is_active ? 'Active' : 'Inactive'}
                        color={c.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Pods">
                        <IconButton
                          size="small"
                          component={RouterLink}
                          to={`/pods?club_id=${c.id}`}
                        >
                          <EventIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(c)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => remove(c)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.clubs?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          No clubs yet.{' '}
                          <Link component="button" onClick={openCreate}>
                            Create the first one
                          </Link>
                          .
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClubFormDialog
        open={open}
        form={form}
        setForm={setForm}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        busy={busy}
        opError={opError}
        superCats={superCats}
        subCats={subCats}
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
