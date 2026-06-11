import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useEmailTemplateEditor } from './useEmailTemplateEditor';
import TemplateEditorPanel from './TemplateEditorPanel';
import SendTestDialog from './SendTestDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

/** CRM → Email Templates → editor (MJML source + live preview) for one template. */
export default function EmailTemplateEditorPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editor = useEmailTemplateEditor(id);
  const [testOpen, setTestOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const back = () => navigate('/email-templates');

  if (editor.loading && !editor.draft) {
    return <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>;
  }
  if (!editor.draft) {
    return (
      <Stack spacing={2}>
        <Button startIcon={<ArrowBackIcon />} onClick={back} size="small" sx={{ alignSelf: 'flex-start' }}>Back to templates</Button>
        <Alert severity="info">Template not found.</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ minHeight: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <Button startIcon={<ArrowBackIcon />} onClick={back} size="small">Back to templates</Button>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary">
          <code>{editor.draft.slug}</code>
        </Typography>
      </Stack>

      <TemplateEditorPanel
        draft={editor.draft}
        setDraft={editor.setDraft}
        dirty={editor.dirty}
        busy={editor.busy}
        tab={editor.tab}
        setTab={editor.setTab}
        previewHtml={editor.previewHtml}
        previewErrors={editor.previewErrors}
        detected={editor.detected}
        onValidate={editor.validateMjml}
        onImportDetected={editor.importDetected}
        onAddVariable={editor.addVariable}
        onRemoveVariable={editor.removeVariable}
        onImagesChange={editor.setImages}
        onAttachmentsChange={editor.setAttachments}
        onSave={editor.save}
        onDelete={() => setConfirmDelete(true)}
        onSendTest={() => setTestOpen(true)}
      />

      <SendTestDialog
        open={testOpen}
        templateId={editor.draft.template_id}
        varsJson={editor.varsJson}
        onClose={() => setTestOpen(false)}
        onResult={(kind, msg) => editor.setSnack({ kind, msg })}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete template"
        message={`Delete "${editor.draft.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={editor.deleting}
        onConfirm={async () => { await editor.remove(); setConfirmDelete(false); back(); }}
        onClose={() => setConfirmDelete(false)}
      />

      <Snackbar open={!!editor.snack} autoHideDuration={4000} onClose={() => editor.setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        {editor.snack ? <Alert severity={editor.snack.kind} onClose={() => editor.setSnack(null)}>{editor.snack.msg}</Alert> : undefined}
      </Snackbar>
    </Stack>
  );
}
