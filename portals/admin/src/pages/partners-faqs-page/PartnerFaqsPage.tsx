import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import type { FaqRow } from '../../components/FaqsTableBase';
import { CREATE_PARTNER_FAQ, DELETE_PARTNER_FAQ, PARTNER_FAQS_TABLE, UPDATE_PARTNER_FAQ } from './queries';
import PartnerFaqsTable from './PartnerFaqsTable';
import { PartnerFaqForm, emptyPartnerFaqForm, toPartnerFaqForm, toPartnerFaqInput, type PartnerFaqFormValues } from './partner-faq-form';

export default function PartnerFaqsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<PartnerFaqFormValues>(emptyPartnerFaqForm);
  const [deleteTarget, setDeleteTarget] = useState<FaqRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [createFaq, createState] = useMutation(CREATE_PARTNER_FAQ);
  const [updateFaq, updateState] = useMutation(UPDATE_PARTNER_FAQ);
  const [deleteFaq] = useMutation(DELETE_PARTNER_FAQ);
  const saving = createState.loading || updateState.loading;

  // This page manages Partner FAQs only — pin the audience alongside the table's filters.
  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const filters = [...q.filters, { field: 'audience', op: 'eq' as const, value: 'PARTNERS' }];
      const { data } = await client.query({
        query: PARTNER_FAQS_TABLE,
        variables: tableQueryToGql({ ...q, filters }),
        fetchPolicy: 'network-only',
      });
      return { rows: data.faqsTable.rows as FaqRow[], total: data.faqsTable.total as number };
    },
    [client],
  );

  const openNew = () => {
    setEditing({});
    setForm({ ...emptyPartnerFaqForm });
    setError(null);
  };

  const openEdit = (item: FaqRow) => {
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
      refetchRef.current?.();
    } catch (submitError: any) {
      setError(submitError.message || 'Unable to save FAQ');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteFaq({ variables: { faq_doc_id: deleteTarget.id } });
    setDeleteTarget(null);
    setToast('Partner FAQ deleted');
    refetchRef.current?.();
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <HandshakeIcon color="primary" />
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>Partner FAQs</Typography>
      </Stack>
      <PartnerFaqsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>New FAQ</Button>
        }
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />
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
