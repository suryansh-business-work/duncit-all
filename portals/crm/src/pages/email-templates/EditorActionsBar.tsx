import { Box, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
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
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        alignItems: "center",
        flexWrap: "wrap"
      }}>
      <DuncitButton variant="contained" startIcon={<SaveIcon />} onClick={onSave} disabled={!dirty || busy}>
        {busy ? 'Saving…' : t('shell.common.save')}
      </DuncitButton>
      <DuncitButton startIcon={<SendIcon />} onClick={onSendTest}>{t('crm.emailTemplates.sendTest')}</DuncitButton>
      <DuncitButton color="error" startIcon={<DeleteIcon />} onClick={onDelete}>{t('shell.common.delete')}</DuncitButton>
      <FormControlLabel
        control={<Switch checked={isActive} onChange={(e) => onToggleActive(e.target.checked)} />}
        label={t('crm.common.active')}
        sx={{ ml: 1 }}
      />
      <Box sx={{ flex: 1 }} />
      {dirty && <Typography variant="caption" sx={{
        color: "warning.main"
      }}>{t('crm.emailTemplates.unsavedChanges')}</Typography>}
    </Stack>
  );
}
