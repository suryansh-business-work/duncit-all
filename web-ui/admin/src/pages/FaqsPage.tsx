import { useMemo, useState } from 'react';
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
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const FAQS = gql`
  query AdminFaqs($filter: FaqFilterInput) {
    faqs(filter: $filter) {
      id
      super_category_id
      super_category {
        id
        name
      }
      question
      answer
      is_active
      sort_order
      updated_at
    }
  }
`;

const SUPERS = gql`
  query SuperCatsForFaq {
    categories(filter: { level: SUPER }) {
      id
      name
    }
  }
`;

const CREATE = gql`
  mutation CreateFaq($input: CreateFaqInput!) {
    createFaq(input: $input) {
      id
    }
  }
`;
const UPDATE = gql`
  mutation UpdateFaq($faq_doc_id: ID!, $input: UpdateFaqInput!) {
    updateFaq(faq_doc_id: $faq_doc_id, input: $input) {
      id
    }
  }
`;
const DELETE = gql`
  mutation DeleteFaq($faq_doc_id: ID!) {
    deleteFaq(faq_doc_id: $faq_doc_id)
  }
`;

interface FormState {
  super_category_id: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
}

const empty: FormState = {
  super_category_id: '',
  question: '',
  answer: '',
  is_active: true,
  sort_order: 0,
};

export default function FaqsPage() {
  const [filterSuper, setFilterSuper] = useState<string>('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [delTarget, setDelTarget] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filter = useMemo(() => {
    const f: any = {};
    if (filterSuper) f.super_category_id = filterSuper;
    if (search.trim()) f.search = search.trim();
    return Object.keys(f).length ? f : undefined;
  }, [filterSuper, search]);

  const { data, loading, refetch } = useQuery(FAQS, { variables: { filter }, fetchPolicy: 'cache-and-network' });
  const { data: scData } = useQuery(SUPERS);
  const supers: any[] = scData?.categories ?? [];
  const items: any[] = data?.faqs ?? [];

  const [createMut, { loading: creating }] = useMutation(CREATE);
  const [updateMut, { loading: updating }] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);
  const saving = creating || updating;

  const openNew = () => {
    setEditing({});
    setForm({ ...empty });
    setError(null);
  };

  const openEdit = (it: any) => {
    setEditing(it);
    setForm({
      super_category_id: it.super_category_id || '',
      question: it.question,
      answer: it.answer,
      is_active: it.is_active,
      sort_order: it.sort_order,
    });
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!form.question.trim() || !form.answer.trim()) {
      setError('Question and answer are required');
      return;
    }
    try {
      const input = {
        super_category_id: form.super_category_id || null,
        question: form.question,
        answer: form.answer,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing && editing.id) {
        await updateMut({ variables: { faq_doc_id: editing.id, input } });
        setToast('FAQ updated');
      } else {
        await createMut({ variables: { input } });
        setToast('FAQ created');
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
      await deleteMut({ variables: { faq_doc_id: delTarget.id } });
      setToast('Deleted');
      setDelTarget(null);
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <HelpOutlineIcon color="primary" />
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          FAQs
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          New FAQ
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Super Category"
          value={filterSuper}
          onChange={(e) => setFilterSuper(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All categories</MenuItem>
          {supers.map((sc) => (
            <MenuItem key={sc.id} value={sc.id}>
              {sc.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
        />
      </Stack>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : items.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              No FAQs yet. Create the first one.
            </Alert>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Question</TableCell>
                    <TableCell>Super Category</TableCell>
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
                          {it.question}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {it.answer}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {it.super_category ? (
                          <Chip size="small" label={it.super_category.name} variant="outlined" />
                        ) : (
                          <Chip size="small" label="General" />
                        )}
                      </TableCell>
                      <TableCell align="center">{it.sort_order}</TableCell>
                      <TableCell align="center">
                        <Chip size="small" color={it.is_active ? 'success' : 'default'} label={it.is_active ? 'Active' : 'Hidden'} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(it)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => setDelTarget(it)}>
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

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>{editing?.id ? 'Edit FAQ' : 'New FAQ'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Super Category"
              value={form.super_category_id}
              onChange={(e) => setForm({ ...form, super_category_id: e.target.value })}
              fullWidth
              helperText="Leave empty to make this a general FAQ"
            >
              <MenuItem value="">General (no category)</MenuItem>
              {supers.map((sc) => (
                <MenuItem key={sc.id} value={sc.id}>
                  {sc.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Question"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Answer"
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              multiline
              minRows={4}
              fullWidth
              required
            />
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Sort order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                sx={{ width: 160 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Stack>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)}>
        <DialogTitle>Delete this FAQ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} message={toast || ''} />
    </Box>
  );
}
