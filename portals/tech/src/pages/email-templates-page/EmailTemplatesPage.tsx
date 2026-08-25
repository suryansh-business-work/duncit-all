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
import EmailSidebarList from '../../components/EmailSidebarList';
import FillViewport from '../../components/FillViewport';
import CreateTemplateDialog from './CreateTemplateDialog';
import SendTestDialog from './SendTestDialog';
import { useEmailTemplateEditor } from './useEmailTemplateEditor';
import { useTranslation } from '@duncit/app-settings';

export default function EmailTemplatesPage() {
  const { t } = useTranslation();
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
    <FillViewport>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2
        }}>
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            Email Templates
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            Edit MJML on the left, see the rendered preview on the right. Templates are
            looked up by <code>slug</code> from server code.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New template
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <EmailSidebarList
          items={editor.list.map((tpl) => {
            const sent = editor.usageBySlug.get(tpl.slug)?.sent ?? 0;
            return {
              key: tpl.template_id,
              primary: tpl.name,
              secondary: tpl.slug,
              off: !tpl.is_active,
              // Every row carries its count, including the zeroes — a template
              // nothing has ever sent is the thing this list could not show.
              badge: {
                label: String(sent),
                title: t('tech.emailTemplates.sendsRecorded', { vars: { count: sent } }),
                muted: sent === 0,
              },
            };
          })}
          selected={editor.selected}
          onSelect={editor.setSelected}
          searchPlaceholder="Search name or slug"
          emptyText={t('tech.emailTemplates.noTemplatesYet')}
        />

        {editor.draft ? (
          <TemplateEditorPanel
            draft={editor.draft}
            setDraft={editor.setDraft}
            usage={editor.usageBySlug.get(editor.draft.slug) ?? null}
            dirty={editor.dirty}
            busy={editor.busy}
            tab={editor.tab}
            setTab={editor.setTab}
            previewHtml={editor.previewHtml}
            previewErrors={editor.previewErrors}
            detected={editor.detected}
            fragmentOptions={editor.fragmentOptions}
            fragmentsLoading={editor.fragmentsLoading}
            fragmentsError={editor.fragmentsError}
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
            <Typography sx={{
              color: "text.secondary"
            }}>{t('tech.emailTemplates.selectATemplateFromTheLeft')}</Typography>
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
        template={editor.draft}
        detected={editor.detected}
        varsJson={editor.varsJson}
        onClose={() => setTestOpen(false)}
        onResult={(kind, msg) => {
          editor.setSnack({ kind, msg });
          // A test send writes a log row like any other, so the count above it
          // is stale the moment the dialog closes.
          editor.refetchUsage().catch(() => undefined);
        }}
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
    </FillViewport>
  );
}
