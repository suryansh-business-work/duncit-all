import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import AiFillButton from '../components/AiFillButton';
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
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
import MediaListField from '../components/MediaListField';

const CLUBS = gql`
  query Clubs($filter: ClubFilterInput) {
    clubs(filter: $filter) {
      id
      club_id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
      club_whats_app_community_link
      club_whats_app_announcement_link
      club_whats_app_group_link
      club_moments {
        url
        type
      }
      meetup_venues_id
      category_id
      super_category_id
      is_active
      updated_at
    }
  }
`;
const CATEGORIES = gql`
  query AllCategories {
    categories {
      id
      name
      level
      parent_id
    }
  }
`;
const CREATE = gql`
  mutation CreateClub($input: CreateClubInput!) {
    createClub(input: $input) {
      id
    }
  }
`;
const UPDATE = gql`
  mutation UpdateClub($id: ID!, $input: UpdateClubInput!) {
    updateClub(club_doc_id: $id, input: $input) {
      id
    }
  }
`;
const DELETE = gql`
  mutation DeleteClub($id: ID!) {
    deleteClub(club_doc_id: $id)
  }
`;

interface ClubForm {
  id?: string;
  club_id: string;
  club_name: string;
  club_description: string;
  category_id: string;
  super_category_id: string;
  feature_text: string;
  moments_text: string;
  meetup_venues_text: string;
  community_link: string;
  announcement_link: string;
  group_link: string;
  is_active: boolean;
}
const blankForm: ClubForm = {
  club_id: '',
  club_name: '',
  club_description: '',
  category_id: '',
  super_category_id: '',
  feature_text: '',
  moments_text: '',
  meetup_venues_text: '',
  community_link: '',
  announcement_link: '',
  group_link: '',
  is_active: true,
};

const linesToMedia = (text: string) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => ({ url, type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE' }));

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
      feature_text: (c.club_feature_images_and_videos ?? []).map((m: any) => m.url).join('\n'),
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
      alert(e.message);
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
                      <Typography variant="body2">{c.meetup_venues_id?.length ?? 0}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {c.club_whats_app_community_link && <Chip size="small" label="C" />}
                        {c.club_whats_app_announcement_link && <Chip size="small" label="A" />}
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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <span>{form.id ? 'Edit Club' : 'New Club'}</span>
          <AiFillButton
            entity="CLUB"
            onFill={(d) =>
              setForm((prev) => ({
                ...prev,
                club_name: d.club_name ?? prev.club_name,
                club_description: d.club_description ?? prev.club_description,
                feature_text: d.feature_text ?? prev.feature_text,
                moments_text: d.moments_text ?? prev.moments_text,
                community_link: d.community_link ?? prev.community_link,
                announcement_link: d.announcement_link ?? prev.announcement_link,
                group_link: d.group_link ?? prev.group_link,
              }))
            }
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Club name"
                value={form.club_name}
                onChange={(e) => setForm({ ...form, club_name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Club ID"
                value={form.club_id}
                onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                disabled={!!form.id}
                helperText={form.id ? 'ID cannot be changed' : 'Auto from name if blank'}
                fullWidth
              />
            </Stack>
            <TextField
              label="Description"
              value={form.club_description}
              onChange={(e) => setForm({ ...form, club_description: e.target.value })}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Super Category"
                select
                value={form.super_category_id}
                onChange={(e) => setForm({ ...form, super_category_id: e.target.value })}
                fullWidth
                helperText="e.g. Human / Pet — drives the app feed grouping."
              >
                <MenuItem value="">None</MenuItem>
                {superCats.map((c: any) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Category (sub-category)"
                select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                fullWidth
              >
                <MenuItem value="">None</MenuItem>
                {subCats.map((c: any) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              {form.id && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Switch
                    checked={form.is_active}
                    onChange={(_, v) => setForm({ ...form, is_active: v })}
                  />
                  <Typography variant="body2">
                    {form.is_active ? 'Active' : 'Inactive'}
                  </Typography>
                </Stack>
              )}
            </Stack>
            <MediaListField
              label="Feature images & videos"
              value={form.feature_text}
              onChange={(v) => setForm({ ...form, feature_text: v })}
              folder="/clubs"
              helperText="Cover/header media shown on club page."
            />
            <MediaListField
              label="Club moments"
              value={form.moments_text}
              onChange={(v) => setForm({ ...form, moments_text: v })}
              folder="/clubs/moments"
              helperText="Past event photos."
            />
            <TextField
              label="Meetup venue IDs (one per line)"
              value={form.meetup_venues_text}
              onChange={(e) => setForm({ ...form, meetup_venues_text: e.target.value })}
              fullWidth
              multiline
              minRows={2}
              helperText="Use Location IDs or zone codes."
            />
            <TextField
              label="WhatsApp Community link"
              value={form.community_link}
              onChange={(e) => setForm({ ...form, community_link: e.target.value })}
              fullWidth
            />
            <TextField
              label="WhatsApp Announcement link"
              value={form.announcement_link}
              onChange={(e) => setForm({ ...form, announcement_link: e.target.value })}
              fullWidth
            />
            <TextField
              label="WhatsApp Group link"
              value={form.group_link}
              onChange={(e) => setForm({ ...form, group_link: e.target.value })}
              fullWidth
            />
            {opError && <Alert severity="error">{opError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={busy || !form.club_name.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
