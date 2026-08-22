import { Box, Button, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import { useTranslation } from '@duncit/shell';

interface Props {
  dirty: boolean;
  busy: boolean;
  isActive: boolean;
  onToggleActive: (next: boolean) => void;
  onSave: () => void;
  onSendTest: () => void;
  onDelete: () => void;
}

export default function EditorActionsBar({ dirty, busy, isActive, onToggleActive, onSave, onSendTest, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Button variant="contained" startIcon={<SaveIcon />} onClick={onSave} disabled={!dirty || busy}>
        {busy ? 'Saving…' : t('shell.common.save')}
      </Button>
      <Button startIcon={<SendIcon />} onClick={onSendTest}>{t('crm.emailTemplates.sendTest')}</Button>
      <Button color="error" startIcon={<DeleteIcon />} onClick={onDelete}>{t('shell.common.delete')}</Button>
      <FormControlLabel
        control={<Switch checked={isActive} onChange={(e) => onToggleActive(e.target.checked)} />}
        label={t('crm.common.active')}
        sx={{ ml: 1 }}
      />
      <Box sx={{ flex: 1 }} />
      {dirty && <Typography variant="caption" color="warning.main">{t('crm.emailTemplates.unsavedChanges')}</Typography>}
    </Stack>
  );
}
