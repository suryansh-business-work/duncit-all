import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { CREATE_POLICY, DELETE_POLICY, POLICIES, UPDATE_POLICY, type Policy } from '../../graphql/policies';
import RichTextEditor from '../../components/RichTextEditor';
import { slugify } from '../../lib/slug';

interface FormState {
  slug: string;
  title: string;
  content: string;
  is_active: boolean;
  sort_order: number;
}
const EMPTY: FormState = { slug: '', title: '', content: '', is_active: true, sort_order: 0 };

export default function PoliciesPage() {
  const [search, setSearch] = useState('');
  const filter = useMemo(() => (search.trim() ? { search: search.trim() } : undefined), [search]);

  const { data, loading, refetch } = useQuery<{ policies: Policy[] }>(POLICIES, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
  const items = data?.policies ?? [];

  const [editing, setEditing] = useState<Policy | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [delTarget, setDelTarget] = useState<Policy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [createMut, { loading: creating }] = useMutation(CREATE_POLICY);
  const [updateMut, { loading: updating }] = useMutation(UPDATE_POLICY);
  const [deleteMut] = useMutation(DELETE_POLICY);
  const saving = creating || updating;

  const openNew = () => {
    setIsNew(true);
    setEditing({} as Policy);
    setForm({ ...EMPTY });
    setSlugTouched(false);
    setError(null);
  };
  const openEdit = (p: Policy) => {
    setIsNew(false);
    setEditing(p);
    setForm({ slug: p.slug, title: p.title, content: p.content || '', is_active: p.is_active, sort_order: p.sort_order });
    setSlugTouched(true);
    setError(null);
  };

  const onTitle = (title: string) => {
    setForm((f) => ({ ...f, title, slug: isNew && !slugTouched ? slugify(title) : f.slug }));
  };

  const submit = async () => {
    setError(null);
    if (!form.title.trim()) return setError('Title is required');
    const slug = slugify(form.slug || form.title);
    if (!slug) return setError('Slug is required');
    const input = {
      slug,
      title: form.title.trim(),
      content: form.content,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    try {
      if (isNew) {
        await createMut({ variables: { input } });
        setToast('Policy created');
      } else {
        await updateMut({ variables: { id: editing!.id, input } });
        setToast('Policy updated');
      }
      setEditing(null);
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doDelete = async () => {
    /* v8 ignore next -- the confirm dialog only opens once a target is set */
    if (!delTarget) return;
    await deleteMut({ variables: { id: delTarget.id } });
    setToast('Policy deleted');
    setDelTarget(null);
    await refetch();
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Policies
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Website &amp; app policies — managed in one place.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title or slug"
            sx={{ minWidth: 200 }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            New Policy
          </Button>
        </Stack>
      </Stack>

      {loading && !items.length ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : !items.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No policies yet.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sort</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{p.title}</TableCell>
                <TableCell>{p.slug}</TableCell>
                <TableCell>
                  <Chip size="small" color={p.is_active ? 'success' : 'default'} label={p.is_active ? 'Active' : 'Hidden'} />
                </TableCell>
                <TableCell>{p.sort_order}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => openEdit(p)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => setDelTarget(p)}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!editing} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="md">
        <DialogTitle>{isNew ? 'New Policy' : `Edit · ${editing?.title}`}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Title" value={form.title} onChange={(e) => onTitle(e.target.value)} required fullWidth autoFocus />
              <TextField
                label="Slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: e.target.value });
                }}
                required
                fullWidth
                helperText="lowercase letters, numbers and dashes"
              />
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Sort order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                size="small"
                sx={{ width: 150 }}
              />
              <FormControlLabel
                control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
                label={form.is_active ? 'Active (visible in app)' : 'Hidden'}
              />
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary">Content</Typography>
              <RichTextEditor value={form.content} onChange={(v) => setForm({ ...form, content: v })} minHeight={260} />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {isNew ? 'Create' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)}>
        <DialogTitle>Delete policy?</DialogTitle>
        <DialogContent>
          <DialogContentText>This permanently deletes “{delTarget?.title}”.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
