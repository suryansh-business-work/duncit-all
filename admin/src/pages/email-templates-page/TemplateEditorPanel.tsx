import { Stack, TextField } from '@mui/material';
import type { Tpl } from './queries';
import MjmlEditorPane from './MjmlEditorPane';
import PreviewVariablesPane from './PreviewVariablesPane';
import EditorActionsBar from './EditorActionsBar';

interface Props {
  draft: Tpl;
  setDraft: (t: Tpl) => void;
  dirty: boolean;
  busy: boolean;
  tab: 'preview' | 'code';
  setTab: (v: 'preview' | 'code') => void;
  previewHtml: string;
  previewErrors: string[];
  detected: string[];
  varsJson: string;
  setVarsJson: (v: string) => void;
  onValidate: () => void;
  onImportDetected: () => void;
  onSave: () => void;
  onDelete: () => void;
  onSendTest: () => void;
}

export default function TemplateEditorPanel(p: Props) {
  const {
    draft,
    setDraft,
    dirty,
    busy,
    tab,
    setTab,
    previewHtml,
    previewErrors,
    detected,
    varsJson,
    setVarsJson,
    onValidate,
    onImportDetected,
    onSave,
    onDelete,
    onSendTest,
  } = p;

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="Name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          sx={{ flex: '1 1 200px' }}
        />
        <TextField
          size="small"
          label="Slug"
          value={draft.slug}
          disabled
          sx={{ flex: '1 1 160px' }}
          helperText="Used by code; cannot be edited."
        />
        <TextField
          size="small"
          label="Subject"
          value={draft.subject}
          onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
          sx={{ flex: '2 1 320px' }}
          helperText="Variables {{ name }} are interpolated."
        />
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <MjmlEditorPane
          value={draft.mjml}
          onChange={(v) => setDraft({ ...draft, mjml: v })}
          onValidate={onValidate}
        />
        <PreviewVariablesPane
          draft={draft}
          setDraft={setDraft}
          tab={tab}
          setTab={setTab}
          previewHtml={previewHtml}
          previewErrors={previewErrors}
          detected={detected}
          varsJson={varsJson}
          setVarsJson={setVarsJson}
          onImportDetected={onImportDetected}
        />
      </Stack>

      <EditorActionsBar
        dirty={dirty}
        busy={busy}
        onSave={onSave}
        onSendTest={onSendTest}
        onDelete={onDelete}
      />
    </Stack>
  );
}
