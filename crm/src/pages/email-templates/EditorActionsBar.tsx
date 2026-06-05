import { Box, Button, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';

interface Props {
  dirty: boolean;
  busy: boolean;
  isActive: boolean;
  onToggleActive: (next: boolean) => void;
  onSave: () => void;
  onSendTest: () => void;
  onDelete: () => void;
}

export default function EditorActionsBar({ dirty, busy, isActive, onToggleActive, onSave, onSendTest, onDelete }: Props) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Button variant="contained" startIcon={<SaveIcon />} onClick={onSave} disabled={!dirty || busy}>
        {busy ? 'Saving…' : 'Save'}
      </Button>
      <Button startIcon={<SendIcon />} onClick={onSendTest}>Send test</Button>
      <Button color="error" startIcon={<DeleteIcon />} onClick={onDelete}>Delete</Button>
      <FormControlLabel
        control={<Switch checked={isActive} onChange={(e) => onToggleActive(e.target.checked)} />}
        label="Active"
        sx={{ ml: 1 }}
      />
      <Box sx={{ flex: 1 }} />
      {dirty && <Typography variant="caption" color="warning.main">Unsaved changes</Typography>}
    </Stack>
  );
}
