import { Stack, TextField } from '@mui/material';
import type { FragmentOption, Tpl } from './queries';
import MjmlEditorPane from './MjmlEditorPane';
import PreviewVariablesPane from './PreviewVariablesPane';
import EditorActionsBar from './EditorActionsBar';
import FragmentPicker from './FragmentPicker';

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
  /** The nine header/footer fragments, fetched once by the page's hook. */
  fragmentOptions: FragmentOption[];
  varsJson: string;
  setVarsJson: (v: string) => void;
  onValidate: () => void;
  onImportDetected: () => void;
  onSave: () => void;
  onDelete: () => void;
  onSendTest: () => void;
}

export default function TemplateEditorPanel(p: Readonly<Props>) {
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
    fragmentOptions,
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
        <FragmentPicker
          value={draft.fragment_category}
          options={fragmentOptions}
          onChange={(fragment_category) => setDraft({ ...draft, fragment_category })}
        />
      </Stack>

      <TextField
        size="small"
        label="Footer note"
        value={draft.footer_note ?? ''}
        onChange={(e) => setDraft({ ...draft, footer_note: e.target.value })}
        placeholder="You're receiving this because…"
        helperText="The one line in the footer that is this template's own. Blank uses the category's generic note."
        fullWidth
      />

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
