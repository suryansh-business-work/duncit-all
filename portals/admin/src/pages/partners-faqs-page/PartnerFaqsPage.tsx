import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Snackbar, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { CREATE_PARTNER_FAQ, DELETE_PARTNER_FAQ, PARTNER_FAQS, UPDATE_PARTNER_FAQ } from './queries';
import PartnerFaqsTable from './PartnerFaqsTable';
import { PartnerFaqForm, PARTNER_FAQ_TOPICS, emptyPartnerFaqForm, toPartnerFaqForm, toPartnerFaqInput, type PartnerFaqFormValues, type PartnerFaqTopic } from './partner-faq-form';

export default function PartnerFaqsPage() {
  const [topic, setTopic] = useState<PartnerFaqTopic | ''>('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<PartnerFaqFormValues>(emptyPartnerFaqForm);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filter = useMemo(() => ({ audience: 'PARTNERS', ...(topic ? { partner_topic: topic } : {}), ...(search.trim() ? { search: search.trim() } : {}) }), [topic, search]);
  const { data, loading, refetch } = useQuery(PARTNER_FAQS, { variables: { filter }, fetchPolicy: 'cache-and-network' });
  const [createFaq, createState] = useMutation(CREATE_PARTNER_FAQ);
  const [updateFaq, updateState] = useMutation(UPDATE_PARTNER_FAQ);
  const [deleteFaq] = useMutation(DELETE_PARTNER_FAQ);
  const saving = createState.loading || updateState.loading;
  const items = data?.faqs ?? [];

  const openNew = () => {
    setEditing({});
    setForm({ ...emptyPartnerFaqForm, partner_topic: topic || 'VENUE' });
    setError(null);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm(toPartnerFaqForm(item));
    setError(null);
  };

  const submit = async (values: PartnerFaqFormValues) => {
    setError(null);
    try {
      const input = toPartnerFaqInput(values);
      if (editing?.id) await updateFaq({ variables: { faq_doc_id: editing.id, input } });
      else await createFaq({ variables: { input } });
      setEditing(null);
      setToast(editing?.id ? 'Partner FAQ updated' : 'Partner FAQ created');
      await refetch();
    } catch (submitError: any) {
      setError(submitError.message || 'Unable to save FAQ');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteFaq({ variables: { faq_doc_id: deleteTarget.id } });
    setDeleteTarget(null);
    setToast('Partner FAQ deleted');
    await refetch();
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <HandshakeIcon color="primary" />
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>Partner FAQs</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>New FAQ</Button>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField select size="small" label="Topic" value={topic} onChange={(event) => setTopic(event.target.value as PartnerFaqTopic | '')} sx={{ minWidth: 220 }}>
          <MenuItem value="">All topics</MenuItem>
          {PARTNER_FAQ_TOPICS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Search" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ flex: 1 }} />
      </Stack>
      <PartnerFaqsTable loading={loading} items={items} onEdit={openEdit} onDelete={setDeleteTarget} />
      <PartnerFaqForm open={Boolean(editing)} editing={Boolean(editing?.id)} initialValues={form} saving={saving} error={error} onClose={() => setEditing(null)} onSubmit={submit} />
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete this partner FAQ?</DialogTitle>
        <DialogContent><Typography variant="body2">This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} message={toast || ''} />
    </Box>
  );
}