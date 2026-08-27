import { Box, FormControlLabel, Stack, Switch, Tooltip, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

interface Props {
  dirty: boolean;
  busy: boolean;
  /** Whether edits save themselves once the typing stops. */
  autoSave: boolean;
  onAutoSaveChange: (next: boolean) => void;
  /** When the last save landed, or null if none has this session. */
  savedAt: number | null;
  onSave: () => void;
  onSendTest: () => void;
  onDelete: () => void;
}

/**
 * Where the draft stands, in words.
 *
 * "Saving…" is deliberately absent: the button already says it, and the same
 * word in two places reads as two things happening. What this line answers is
 * the question the button cannot — whether anything is still unwritten.
 */
function statusLine(t: Translate, dirty: boolean, savedAt: number | null): string {
  if (dirty) return t('tech.emailTemplates.unsavedChanges');
  if (savedAt) return t('tech.emailTemplates.allChangesSaved');
  return '';
}

export default function EditorActionsBar({
  dirty,
  busy,
  autoSave,
  onAutoSaveChange,
  savedAt,
  onSave,
  onSendTest,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const status = statusLine(t, dirty, savedAt);

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <DuncitButton
        variant="contained"
        startIcon={<SaveIcon />}
        onClick={onSave}
        disabled={!dirty || busy}
      >
        {busy ? t('shell.common.saving') : t('shell.common.save')}
      </DuncitButton>
      <DuncitButton startIcon={<SendIcon />} onClick={onSendTest}>
        Send test
      </DuncitButton>
      <DuncitButton color="error" startIcon={<DeleteIcon />} onClick={onDelete}>
        Delete
      </DuncitButton>
      <Tooltip title={t('tech.emailTemplates.autoSaveHint')}>
        <Box component="span" sx={{ display: 'inline-flex' }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={autoSave}
                onChange={(e) => onAutoSaveChange(e.target.checked)}
              />
            }
            label={t('tech.emailTemplates.autoSave')}
          />
        </Box>
      </Tooltip>
      <Box sx={{ flex: 1 }} />
      {status && (
        <Typography variant="caption" sx={{ color: dirty ? 'warning.main' : 'text.secondary' }}>
          {status}
        </Typography>
      )}
    </Stack>
  );
}
