import { Stack, TextField } from '@mui/material';
import type { EmailAsset, EmailTemplate } from '../../api/emailTemplates.gql';
import MjmlEditorPane from './MjmlEditorPane';
import PreviewVariablesPane from './PreviewVariablesPane';
import EditorActionsBar from './EditorActionsBar';
import AttachmentsSection from './AttachmentsSection';
import { useTranslation } from '@duncit/shell';

interface Props {
  draft: EmailTemplate;
  setDraft: (t: EmailTemplate) => void;
  dirty: boolean;
  busy: boolean;
  tab: 'preview' | 'code';
  setTab: (v: 'preview' | 'code') => void;
  previewHtml: string;
  previewErrors: string[];
  detected: string[];
  onValidate: () => void;
  onImportDetected: () => void;
  onAddVariable: (slug: string) => void;
  onRemoveVariable: (slug: string) => void;
  onImagesChange: (next: EmailAsset[]) => void;
  onAttachmentsChange: (next: EmailAsset[]) => void;
  onSave: () => void;
  onDelete: () => void;
  onSendTest: () => void;
}

export default function TemplateEditorPanel(p: Readonly<Props>) {
  const { t } = useTranslation();
  const { draft, setDraft } = p;
  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1.5} useFlexGap sx={{
        flexWrap: "wrap"
      }}>
        <TextField size="small" label={t('shell.common.name')} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} sx={{ flex: '1 1 200px' }} />
        <TextField size="small" label={t('crm.emailTemplates.slug')} value={draft.slug} disabled sx={{ flex: '1 1 160px' }} helperText={t('crm.emailTemplates.usedByCodeCannotBeEdited')} />
        <TextField
          size="small"
          label={t('crm.common.subject')}
          value={draft.subject}
          onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
          sx={{ flex: '2 1 320px' }}
          helperText="Variables {{ name }} are interpolated."
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flex: 1, minHeight: 420 }}>
        <MjmlEditorPane
          value={draft.mjml}
          onChange={(v) => setDraft({ ...draft, mjml: v })}
          onValidate={p.onValidate}
          templateId={draft.template_id}
          images={draft.images}
          onImagesChange={p.onImagesChange}
        />
        <PreviewVariablesPane
          draft={draft}
          setDraft={setDraft}
          tab={p.tab}
          setTab={p.setTab}
          previewHtml={p.previewHtml}
          previewErrors={p.previewErrors}
          detected={p.detected}
          onImportDetected={p.onImportDetected}
          onAddVariable={p.onAddVariable}
          onRemoveVariable={p.onRemoveVariable}
        />
      </Stack>

      <AttachmentsSection attachments={draft.attachments} onChange={p.onAttachmentsChange} />

      <EditorActionsBar
        dirty={p.dirty}
        busy={p.busy}
        isActive={draft.is_active}
        onToggleActive={(next) => setDraft({ ...draft, is_active: next })}
        onSave={p.onSave}
        onSendTest={p.onSendTest}
        onDelete={p.onDelete}
      />
    </Stack>
  );
}
