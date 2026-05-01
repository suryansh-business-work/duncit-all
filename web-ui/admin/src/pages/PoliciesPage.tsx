import { useEffect, useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
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
  FormControlLabel,
  IconButton,
  InputAdornment,
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
import DescriptionIcon from '@mui/icons-material/Description';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const POLICIES = gql`
  query AdminPolicies($filter: PolicyFilterInput) {
    policies(filter: $filter) {
      id
      slug
      title
      content
      is_active
      sort_order
      updated_at
    }
  }
`;

const CREATE = gql`
  mutation CreatePolicy($input: CreatePolicyInput!) {
    createPolicy(input: $input) {
      id
    }
  }
`;
const UPDATE = gql`
  mutation UpdatePolicy($id: ID!, $input: UpdatePolicyInput!) {
    updatePolicy(policy_doc_id: $id, input: $input) {
      id
    }
  }
`;
const DELETE = gql`
  mutation DeletePolicy($id: ID!) {
    deletePolicy(policy_doc_id: $id)
  }
`;

interface FormState {
  slug: string;
  title: string;
  content: string;
  is_active: boolean;
  sort_order: number;
}

const empty: FormState = {
  slug: '',
  title: '',
  content: '',
  is_active: true,
  sort_order: 0,
};

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
};
const QUILL_FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet', 'indent',
  'align',
  'blockquote', 'code-block',
  'link', 'image',
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function PoliciesPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [delTarget, setDelTarget] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filter = useMemo(() => {
    const f: any = {};
    if (search.trim()) f.search = search.trim();
    return Object.keys(f).length ? f : undefined;
  }, [search]);

  const { data, loading, refetch } = useQuery(POLICIES, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
  const items: any[] = data?.policies ?? [];

  const [createMut, { loading: creating }] = useMutation(CREATE);
  const [updateMut, { loading: updating }] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);
  const saving = creating || updating;

  // Auto-generate slug from title for new entries until user edits the slug field.
  useEffect(() => {
    if (editing && !editing.id && !slugTouched) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, editing, slugTouched]);

  const openNew = () => {
    setEditing({});
    setForm({ ...empty });
    setSlugTouched(false);
    setError(null);
  };

  const openEdit = (it: any) => {
    setEditing(it);
    setForm({
      slug: it.slug,
      title: it.title,
      content: it.content || '',
      is_active: it.is_active,
      sort_order: it.sort_order,
    });
    setSlugTouched(true);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    const slug = slugify(form.slug || form.title);
    if (!slug) {
      setError('Slug is required');
      return;
    }
    try {
      const input = {
        slug,
        title: form.title.trim(),
        content: form.content,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing && editing.id) {
        await updateMut({ variables: { id: editing.id, input } });
        setToast('Policy updated');
      } else {
        await createMut({ variables: { input } });
        setToast('Policy created');
      }
      setEditing(null);
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doDelete = async () => {
    if (!delTarget) return;
    try {
      await deleteMut({ variables: { id: delTarget.id } });
      setToast('Deleted');
      setDelTarget(null);
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copySlug = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(slug);
      setToast(`Copied "${slug}"`);
    } catch {
      setToast('Could not copy');
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <DescriptionIcon color="primary" />
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          Policies
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          New Policy
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: 420 }}
          placeholder="Title or slug"
        />
      </Stack>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading && !data ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : items.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              No policies yet. Create one — e.g. "Privacy Policy" with slug{' '}
              <code>privacy-policy</code>.
            </Alert>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Slug</TableCell>
                    <TableCell align="center">Sort</TableCell>
                    <TableCell align="center">Active</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {it.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Updated {new Date(it.updated_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip
                            size="small"
                            icon={<LinkIcon fontSize="small" />}
                            label={it.slug}
                            variant="outlined"
                          />
                          <Tooltip title="Copy slug">
                            <IconButton size="small" onClick={() => copySlug(it.slug)}>
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">{it.sort_order}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          color={it.is_active ? 'success' : 'default'}
                          label={it.is_active ? 'Active' : 'Hidden'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(it)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDelTarget(it)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editing}
        onClose={() => !saving && setEditing(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>{editing?.id ? `Edit · ${editing.title}` : 'New Policy'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                fullWidth
                autoFocus
              />
              <TextField
                label="Slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: e.target.value });
                }}
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LinkIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                helperText="lowercase letters, numbers and dashes (e.g. privacy-policy)"
              />
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Sort order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                size="small"
                sx={{ width: 160 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                }
                label={form.is_active ? 'Active (visible in app)' : 'Hidden'}
              />
            </Stack>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Content
              </Typography>
              <Box
                sx={{
                  '& .ql-toolbar': {
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  },
                  '& .ql-container': {
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                    borderColor: 'divider',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    minHeight: 320,
                    bgcolor: 'background.paper',
                  },
                  '& .ql-editor': { minHeight: 320 },
                }}
              >
                <ReactQuill
                  theme="snow"
                  value={form.content}
                  onChange={(v) => setForm({ ...form, content: v })}
                  modules={QUILL_MODULES}
                  formats={QUILL_FORMATS}
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editing?.id ? 'Save changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)}>
        <DialogTitle>Delete policy?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete <b>{delTarget?.title}</b> ({delTarget?.slug}). Pages in
            the app using this slug will no longer render.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Box>
  );
}
