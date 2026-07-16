import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { useApolloTableFetch } from '@duncit/table';
import { DELETE, TEMPLATES, TEMPLATES_TABLE, type EmailTemplateRow } from '../../api/emailTemplates.gql';
import { parseApiError } from '@duncit/utils';
import { ConfirmDialog } from '@duncit/dialogs';
import TemplatesTable from './TemplatesTable';
import CreateTemplateDialog from './CreateTemplateDialog';

/** CRM → Email Templates. Table of CRM-owned templates with CRUD; edit opens the editor. */
export default function EmailTemplatesPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  // Also refresh the legacy list doc so the compose-window template picker stays warm.
  const [deleteMut, { loading: deleting }] = useMutation(DELETE, { refetchQueries: [{ query: TEMPLATES }] });
  const [createOpen, setCreateOpen] = useState(false);
  const [removing, setRemoving] = useState<EmailTemplateRow | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const fetchRows = useApolloTableFetch<EmailTemplateRow>(client, TEMPLATES_TABLE, 'crmEmailTemplatesTable');

  const confirmDelete = async () => {
    if (!removing) return;
    try {
      await deleteMut({ variables: { id: removing.template_id } });
      setSnack('Template deleted');
      refetchRef.current?.();
    } catch (e) {
      setSnack(parseApiError(e));
    }
    setRemoving(null);
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <MarkEmailReadIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={800}>Email Templates</Typography>
          <Typography variant="body2" color="text.secondary">
            CRM-owned MJML templates with variables. Open one to edit the source and preview.
          </Typography>
        </Box>
      </Stack>

      <TemplatesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New template
          </Button>
        }
        onEdit={(t) => navigate(`/email-templates/${t.template_id}`)}
        onDelete={setRemoving}
      />

      <CreateTemplateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(templateId) => {
          setCreateOpen(false);
          refetchRef.current?.();
          if (templateId) navigate(`/email-templates/${templateId}`);
        }}
      />

      <ConfirmDialog
        open={!!removing}
        title="Delete template"
        message={`Delete "${removing?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        busyLabel="Working…"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setRemoving(null)}
      />

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack ?? ''} />
    </Stack>
  );
}
