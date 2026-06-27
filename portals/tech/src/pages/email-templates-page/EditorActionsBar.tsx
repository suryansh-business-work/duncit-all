import { Box, Button, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';

interface Props {
  dirty: boolean;
  busy: boolean;
  onSave: () => void;
  onSendTest: () => void;
  onDelete: () => void;
}

export default function EditorActionsBar({
  dirty,
  busy,
  onSave,
  onSendTest,
  onDelete,
}: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Button
        variant="contained"
        startIcon={<SaveIcon />}
        onClick={onSave}
        disabled={!dirty || busy}
      >
        {busy ? 'Saving…' : 'Save'}
      </Button>
      <Button startIcon={<SendIcon />} onClick={onSendTest}>
        Send test
      </Button>
      <Button color="error" startIcon={<DeleteIcon />} onClick={onDelete}>
        Delete
      </Button>
      <Box sx={{ flex: 1 }} />
      {dirty && (
        <Typography variant="caption" color="warning.main">
          Unsaved changes
        </Typography>
      )}
    </Stack>
  );
}
