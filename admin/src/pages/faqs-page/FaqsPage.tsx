import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
  CREATE_FAQ,
  DELETE_FAQ,
  FAQS,
  SUPER_CATS_FOR_FAQ,
  UPDATE_FAQ,
} from './queries';
import { emptyForm, type FormState } from './helpers';
import FaqsTable from './FaqsTable';
import FaqEditDialog from './FaqEditDialog';

export default function FaqsPage() {
  const [filterSuper, setFilterSuper] = useState<string>('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [delTarget, setDelTarget] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filter = useMemo(() => {
    const f: any = {};
    if (filterSuper) f.super_category_id = filterSuper;
    if (search.trim()) f.search = search.trim();
    return Object.keys(f).length ? f : undefined;
  }, [filterSuper, search]);

  const { data, loading, refetch } = useQuery(FAQS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
  const { data: scData } = useQuery(SUPER_CATS_FOR_FAQ);
  const supers: any[] = scData?.categories ?? [];
  const items: any[] = data?.faqs ?? [];

  const [createMut, { loading: creating }] = useMutation(CREATE_FAQ);
  const [updateMut, { loading: updating }] = useMutation(UPDATE_FAQ);
  const [deleteMut] = useMutation(DELETE_FAQ);
  const saving = creating || updating;

  const openNew = () => {
    setEditing({});
    setForm({ ...emptyForm });
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

      <FaqsTable
        loading={loading}
        items={items}
        onEdit={openEdit}
        onDelete={setDelTarget}
      />

      <FaqEditDialog
        editing={editing}
        form={form}
        setForm={setForm}
        saving={saving}
        error={error}
        supers={supers}
        onClose={() => setEditing(null)}
        onSubmit={submit}
      />

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

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast || ''}
      />
    </Box>
  );
}
