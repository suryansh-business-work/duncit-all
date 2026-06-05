import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { DELETE, TEMPLATES, type EmailTemplate } from '../../api/emailTemplates.gql';
import { parseApiError } from '../../utils/parseApiError';
import ConfirmDialog from '../../components/ConfirmDialog';
import TemplatesTable from './TemplatesTable';
import CreateTemplateDialog from './CreateTemplateDialog';

/** CRM → Email Templates. Table of CRM-owned templates with CRUD; edit opens the editor. */
export default function EmailTemplatesPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ emailTemplates: EmailTemplate[] }>(TEMPLATES, { fetchPolicy: 'cache-and-network' });
  const [deleteMut, { loading: deleting }] = useMutation(DELETE, { refetchQueries: [{ query: TEMPLATES }] });
  const [createOpen, setCreateOpen] = useState(false);
  const [removing, setRemoving] = useState<EmailTemplate | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const templates = data?.emailTemplates ?? [];

  const confirmDelete = async () => {
    if (!removing) return;
    try {
      await deleteMut({ variables: { id: removing.template_id } });
      setSnack('Template deleted');
    } catch (e) {
      setSnack(parseApiError(e));
    }
    setRemoving(null);
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
        <Stack direction="row" alignItems="center" spacing={1}>
          <MarkEmailReadIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={800}>Email Templates</Typography>
            <Typography variant="body2" color="text.secondary">
              CRM-owned MJML templates with variables. Open one to edit the source and preview.
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New template</Button>
      </Stack>

      <Card>
        <CardContent>
          {loading && templates.length === 0 ? (
            <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
          ) : templates.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No templates yet. Click "New template" to create your first one.
            </Typography>
          ) : (
            <TemplatesTable
              templates={templates}
              onEdit={(t) => navigate(`/email-templates/${t.template_id}`)}
              onDelete={setRemoving}
            />
          )}
        </CardContent>
      </Card>

      <CreateTemplateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async (templateId) => {
          setCreateOpen(false);
          await refetch();
          if (templateId) navigate(`/email-templates/${templateId}`);
        }}
      />

      <ConfirmDialog
        open={!!removing}
        title="Delete template"
        message={`Delete "${removing?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setRemoving(null)}
      />

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack ?? ''} />
    </Stack>
  );
}
