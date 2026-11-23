import { Alert, Card, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { DuncitRichTextInput, type RichTextMentions } from '@duncit/rich-text';
import type { LogBody } from './types';
import { useTranslation } from '@duncit/shell';

interface Props {
  /** Editing an existing log rather than writing a new one. */
  editing: boolean;
  body: LogBody;
  error: string | null;
  saving: boolean;
  summary: string;
  /** Typing "@" tags a CRM teammate, who is emailed when the log is saved. */
  mentions: RichTextMentions;
  onBodyChange: (body: LogBody) => void;
  onCancel: () => void;
  onErrorClose: () => void;
  onSubmit: () => void;
  onSummaryChange: (summary: string) => void;
}

export function ManualLogComposer(props: Readonly<Props>) {
  const { t } = useTranslation();
  const { editing, body, error, saving, summary, mentions, onBodyChange, onCancel, onErrorClose, onSubmit } = props;
  let saveLabel = editing ? t('crm.manualLogs.saveChanges') : t('crm.manualLogs.save');
  if (saving) saveLabel = t('crm.manualLogs.saving');
  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        p: 2,
        borderColor: theme.palette.primary.main,
        bgcolor: alpha(theme.palette.primary.main, 0.04),
      })}
    >
      <Stack direction="row" sx={{ alignItems: 'center', mb: 1.5 }}>
        <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
          {editing ? t('crm.manualLogs.editTitle') : t('crm.manualLogs.newTitle')}
        </Typography>
        <DuncitIconButton size="small" aria-label={t('shell.common.cancel')} onClick={onCancel} disabled={saving}>
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
      <TextField
        fullWidth
        size="small"
        label={t('crm.components.titleOptional')}
        value={summary}
        onChange={(event) => props.onSummaryChange(event.target.value)}
        sx={{ mb: 1.5 }}
        slotProps={{ htmlInput: { 'data-testid': 'manual-log-title' } }}
      />
      <DuncitRichTextInput
        value={body.html}
        onChange={(html, text) => onBodyChange({ html, text })}
        aiContext="CRM activity note"
        mentions={mentions}
        placeholder={t('crm.manualLogs.placeholder')}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
        {t('crm.manualLogs.mentionHint')}
      </Typography>
      {error ? (
        <Alert severity="error" sx={{ mt: 1.5 }} onClose={onErrorClose}>
          {error}
        </Alert>
      ) : null}
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
        <DuncitButton onClick={onCancel} disabled={saving}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          startIcon={<SendIcon />}
          onClick={onSubmit}
          disabled={saving || !body.html.trim()}
          data-testid="manual-log-save"
        >
          {saveLabel}
        </DuncitButton>
      </Stack>
    </Card>
  );
}
