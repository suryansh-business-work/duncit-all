import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TemplateEditorPanel from './TemplateEditorPanel';
import TemplateList from './TemplateList';
import CreateTemplateDialog from './CreateTemplateDialog';
import SendTestDialog from './SendTestDialog';
import { useEmailTemplateEditor } from './useEmailTemplateEditor';

export default function EmailTemplatesPage() {
  const editor = useEmailTemplateEditor();
  const [createOpen, setCreateOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  if (editor.loading && !editor.hasData)
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Email Templates
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Edit MJML on the left, see the rendered preview on the right. Templates are
            looked up by <code>slug</code> from server code.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New template
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <TemplateList
          list={editor.list}
          selected={editor.selected}
          onSelect={editor.setSelected}
        />

        {editor.draft ? (
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
            varsJson={editor.varsJson}
            setVarsJson={editor.setVarsJson}
            onValidate={editor.validateMjml}
            onImportDetected={editor.importDetected}
            onSave={editor.save}
            onDelete={editor.onDelete}
            onSendTest={() => setTestOpen(true)}
          />
        ) : (
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <Typography color="text.secondary">Select a template from the left.</Typography>
          </Box>
        )}
      </Stack>

      <CreateTemplateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async (id) => {
          setCreateOpen(false);
          await editor.refetch();
          editor.setSelected(id);
          editor.setSnack({ kind: 'success', msg: 'Template created' });
        }}
        onError={(msg) => editor.setSnack({ kind: 'error', msg })}
      />

      <SendTestDialog
        open={testOpen}
        templateId={editor.draft?.template_id ?? null}
        varsJson={editor.varsJson}
        onClose={() => setTestOpen(false)}
        onResult={(kind, msg) => editor.setSnack({ kind, msg })}
      />

      {editor.snack && (
        <Alert
          severity={editor.snack.kind}
          onClose={() => editor.setSnack(null)}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1400 }}
        >
          {editor.snack.msg}
        </Alert>
      )}
    </Box>
  );
}
