import { FormControlLabel, Stack, Switch, TextField, Tooltip } from '@mui/material';
import type { FragmentOption, TemplateUsage, Tpl } from './queries';
import TemplateUsageStrip from './TemplateUsageStrip';
import MjmlEditorPane from './MjmlEditorPane';
import PreviewVariablesPane from './PreviewVariablesPane';
import EditorActionsBar from './EditorActionsBar';
import FragmentPicker from './FragmentPicker';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  draft: Tpl;
  setDraft: (t: Tpl) => void;
  /** This template's tally from the email log. Null while it is still loading. */
  usage: TemplateUsage | null;
  dirty: boolean;
  busy: boolean;
  tab: 'preview' | 'code';
  setTab: (v: 'preview' | 'code') => void;
  previewHtml: string;
  previewErrors: string[];
  /** True from the keystroke that changed the MJML until the render lands. */
  previewLoading: boolean;
  detected: string[];
  /** The nine header/footer fragments, fetched once by the page's hook. */
  fragmentOptions: FragmentOption[];
  fragmentsLoading?: boolean;
  fragmentsError?: string | null;
  varsJson: string;
  setVarsJson: (v: string) => void;
  onValidate: () => void;
  onImportDetected: () => void;
  onSave: () => void;
  onDelete: () => void;
  onSendTest: () => void;
  /** Whether edits save themselves once the typing stops. */
  autoSave: boolean;
  onAutoSaveChange: (next: boolean) => void;
  savedAt: number | null;
}

export default function TemplateEditorPanel(p: Readonly<Props>) {
  const { t } = useTranslation();
  const {
    draft,
    setDraft,
    usage,
    dirty,
    busy,
    tab,
    setTab,
    previewHtml,
    previewErrors,
    previewLoading,
    detected,
    fragmentOptions,
    fragmentsLoading,
    fragmentsError,
    varsJson,
    setVarsJson,
    onValidate,
    onImportDetected,
    onSave,
    onDelete,
    onSendTest,
    autoSave,
    onAutoSaveChange,
    savedAt,
  } = p;

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      {/* Above the fields, because "has anyone ever received this?" is the
          question that decides whether the rest of the panel is worth editing. */}
      <TemplateUsageStrip slug={draft.slug} usage={usage} />

      <Stack direction="row" spacing={1.5} useFlexGap sx={{
        flexWrap: "wrap"
      }}>
        <TextField
          size="small"
          label={t('shell.common.name')}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          sx={{ flex: '1 1 200px' }}
        />
        <TextField
          size="small"
          label={t('tech.emailTemplates.slug')}
          value={draft.slug}
          disabled
          sx={{ flex: '1 1 160px' }}
          helperText={t('tech.emailTemplates.usedByCodeCannotBeEdited')}
        />
        <TextField
          size="small"
          label={t('tech.common.subject')}
          value={draft.subject}
          onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
          sx={{ flex: '2 1 320px' }}
          helperText="Variables {{ name }} are interpolated."
        />
        <FragmentPicker
          value={draft.fragment_key}
          options={fragmentOptions}
          loading={fragmentsLoading}
          error={fragmentsError}
          onChange={(fragment_key) => setDraft({ ...draft, fragment_key })}
        />
      </Stack>

      <Tooltip title={t('tech.emailTemplates.aSwitchedOffTemplateSendsNothing')}>
        <FormControlLabel
          sx={{ alignSelf: 'flex-start' }}
          control={
            <Switch
              checked={draft.is_active}
              onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
            />
          }
          label={draft.is_active ? 'Active — this template sends' : 'Disabled — nothing will send'}
        />
      </Tooltip>

      <TextField
        size="small"
        label={t('tech.emailTemplates.footerNote')}
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
          previewLoading={previewLoading}
          detected={detected}
          varsJson={varsJson}
          setVarsJson={setVarsJson}
          onImportDetected={onImportDetected}
        />
      </Stack>

      <EditorActionsBar
        dirty={dirty}
        busy={busy}
        autoSave={autoSave}
        onAutoSaveChange={onAutoSaveChange}
        savedAt={savedAt}
        onSave={onSave}
        onSendTest={onSendTest}
        onDelete={onDelete}
      />
    </Stack>
  );
}
