import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { useApolloTableFetch } from '@duncit/table';
import type { FaqRow } from '../../components/FaqsTableBase';
import { CREATE_PARTNER_FAQ, DELETE_PARTNER_FAQ, PARTNER_FAQS_TABLE, UPDATE_PARTNER_FAQ } from './queries';
import PartnerFaqsTable from './PartnerFaqsTable';
import { PartnerFaqForm, emptyPartnerFaqForm, toPartnerFaqForm, toPartnerFaqInput, type PartnerFaqFormValues } from './partner-faq-form';
import { useTranslation } from '@duncit/shell';

export default function PartnerFaqsPage() {
  const { t } = useTranslation();
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
  const fetchRows = useApolloTableFetch<FaqRow>(client, PARTNER_FAQS_TABLE, 'faqsTable', {
    extraFilters: [{ field: 'audience', op: 'eq', value: 'PARTNERS' }],
  });

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
      const input = toPartnerFaqInput(values, t);
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
    setToast(t('admin.faqs.partnerDeleted'));
    refetchRef.current?.();
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <HandshakeIcon color="primary" />
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>{t('admin.faqs.partnerTitle')}</Typography>
      </Stack>
      <PartnerFaqsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>{t('admin.faqs.newFaq')}</Button>
        }
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />
      <PartnerFaqForm open={Boolean(editing)} editing={Boolean(editing?.id)} initialValues={form} saving={saving} error={error} onClose={() => setEditing(null)} onSubmit={submit} />
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('admin.faqs.partnerDeleteTitle')}</DialogTitle>
        <DialogContent><Typography variant="body2">{t('admin.faqs.deleteBody')}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('shell.common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>{t('shell.common.delete')}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} message={toast || ''} />
    </Box>
  );
}
