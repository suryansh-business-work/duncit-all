import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import TemplateEditorPanel from './TemplateEditorPanel';
import EmailSidebarList from '../../components/EmailSidebarList';
import FillViewport from '../../components/FillViewport';
import CreateTemplateDialog from './CreateTemplateDialog';
import SendTestDialog from './SendTestDialog';
import { useEmailTemplateEditor } from './useEmailTemplateEditor';
import { fragmentFilterOptions, templateSidebarItems } from './sidebar-items';
import { useTranslation } from '@duncit/app-settings';

export default function EmailTemplatesPage() {
  const { t } = useTranslation();
  const editor = useEmailTemplateEditor();
  const [createOpen, setCreateOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  // The header/footer filter lives in the URL, because that is how the
  // Fragments page answers "where is this fragment consumed?" — it links to
  // /emails/templates?fragment=<key> and the list opens already narrowed.
  const [params, setParams] = useSearchParams();
  const fragmentFilter = params.get('fragment') ?? '';
  const setFragmentFilter = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) {
      next.set('fragment', value);
    } else {
      next.delete('fragment');
    }
    setParams(next, { replace: true });
  };

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
        <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New template
        </DuncitButton>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <EmailSidebarList
          items={templateSidebarItems(t, editor.list, editor.usageBySlug)}
          selected={editor.selected}
          onSelect={editor.setSelected}
          searchPlaceholder="Search name or slug"
          emptyText={t('tech.emailTemplates.noTemplatesYet')}
          filter={{
            label: t('tech.emailTemplates.headerFooter'),
            allLabel: t('tech.emailTemplates.anyHeaderFooter'),
            value: fragmentFilter,
            options: fragmentFilterOptions(editor.fragmentOptions),
            onChange: setFragmentFilter,
          }}
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
            previewLoading={editor.previewLoading}
            detected={editor.detected}
            fragmentOptions={editor.fragmentOptions}
            fragmentsLoading={editor.fragmentsLoading}
            fragmentsError={editor.fragmentsError}
            varsJson={editor.varsJson}
            setVarsJson={editor.setVarsJson}
            autoSave={editor.autoSave}
            onAutoSaveChange={editor.setAutoSave}
            savedAt={editor.savedAt}
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
